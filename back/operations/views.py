from decimal import Decimal

from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView

from berths.models import Berth
from lineup.models import BerthingRequest

from .services import calculate_operation_time
from .services import simulate_lineup as _simulate

from optimization.genetic_algorithm import run_genetic_algorithm
from optimization.simulator import simulate_scenario
from optimization.constraints import (
    ShipData, BerthData, RequestData,
    LOA_SAFETY_MARGIN,
)


class CalculateOperationTimeView(APIView):
    """POST /operations/calculate-time — { cargo_quantity, prancha } → { hours }"""

    def post(self, request):
        try:
            qty = Decimal(str(request.data.get("cargo_quantity", 0)))
            prancha = Decimal(str(request.data.get("prancha", 0)))
        except Exception:
            return Response(
                {"error": "Invalid numeric values."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        hours = calculate_operation_time(qty, prancha)
        if hours is None:
            return Response(
                {"error": "Prancha must be > 0."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        return Response({"hours": str(hours)})


class SimulateLineupView(APIView):
    """POST /operations/simulate — runs basic simulation on WAITING requests, returns proposed schedule"""

    def post(self, request):
        berths = list(Berth.objects.filter(active=True).order_by("number"))
        requests = list(
            BerthingRequest.objects.filter(status="WAITING")
            .select_related("ship", "cargo_type")
            .order_by("eta")
        )
        schedule = _simulate(berths, requests)
        result = [
            {
                "berth_id": str(s["berth_id"]),
                "ship_id": str(s["ship_id"]),
                "request_id": str(s["request_id"]),
                "start_time": s["start_time"].isoformat(),
                "end_time": s["end_time"].isoformat(),
                "position": s["position"],
            }
            for s in schedule
        ]
        return Response({"schedule": result})


# Helper to build optimization data from DB
def _build_optimization_data():
    """Load active berths and WAITING requests into optimization dataclasses."""
    from decimal import Decimal
    from berths.models import Berth, BerthCargo, OperationalRule
    from lineup.models import BerthingRequest

    berths_qs = Berth.objects.filter(active=True).prefetch_related(
        "cargo_configs__cargo_type", "neighbors"
    ).order_by("number")

    berth_data_list = []
    for b in berths_qs:
        allowed = [str(bc.cargo_type_id) for bc in b.cargo_configs.all()]
        neighbor_map = {str(n.neighbor_id): n.restriction_type for n in b.neighbors.all()}
        neighbor_min_distances = {
            str(n.neighbor_id): n.min_distance
            for n in b.neighbors.all()
            if n.restriction_type == "DISTANCE"
        }
        berth_data_list.append(BerthData(
            id=str(b.id),
            number=b.number,
            length=b.length or Decimal("0"),
            max_loa=b.max_loa or Decimal("0"),
            depth=b.depth or Decimal("0"),
            active=b.active,
            allowed_cargo_ids=allowed,
            neighbor_map=neighbor_map,
            neighbor_min_distances=neighbor_min_distances,
        ))

    # Load client preferences from OperationalRule
    prefs = {}  # client_name -> [berth_number]
    for rule in OperationalRule.objects.filter(rule_type="berth_preference", active=True):
        prefs.setdefault(rule.target, []).append(rule.value)

    # Build berth_number -> berth_id map
    berth_by_number = {b.number: b.id for b in berth_data_list}

    requests_qs = BerthingRequest.objects.filter(
        status="WAITING"
    ).select_related("ship", "client", "cargo_type").order_by("eta")

    request_data_list = []
    for req in requests_qs:
        ship = req.ship
        # Get prancha: from BerthCargo first, then CargoType default
        prancha = Decimal("1000")
        if req.cargo_type:
            prancha = req.cargo_type.default_prancha or prancha

        client_name = req.client.name if req.client else ""
        preferred_berth_ids = [
            berth_by_number[bnum]
            for bnum in prefs.get(client_name, [])
            if bnum in berth_by_number
        ]

        request_data_list.append(RequestData(
            id=str(req.id),
            ship=ShipData(
                id=str(ship.id),
                name=ship.name,
                loa=ship.loa or Decimal("0"),
                beam=ship.beam or Decimal("0"),
                dwt=ship.dwt or Decimal("0"),
            ),
            client_id=str(req.client_id),
            client_name=client_name,
            cargo_type_id=str(req.cargo_type_id) if req.cargo_type_id else None,
            cargo_quantity=req.cargo_quantity or Decimal("0"),
            prancha=prancha,
            eta=req.eta,
            operation_type=req.operation_type,
            preferred_berth_ids=preferred_berth_ids,
        ))

    return berth_data_list, request_data_list


class GenerateLineupView(APIView):
    """
    POST /operations/generate
    Runs genetic algorithm on WAITING requests, saves results as Lineup entries.
    """
    def post(self, request):
        from lineup.models import Lineup, BerthingRequest
        from berths.models import Berth
        from django.db import transaction

        pop_size = int(request.data.get("population_size", 50))
        generations = int(request.data.get("generations", 100))

        berth_data_list, request_data_list = _build_optimization_data()

        if not request_data_list:
            return Response({"detail": "No WAITING requests found."}, status=http_status.HTTP_200_OK)
        if not berth_data_list:
            return Response({"error": "No active berths configured."}, status=http_status.HTTP_400_BAD_REQUEST)

        result = run_genetic_algorithm(
            requests=request_data_list,
            berths=berth_data_list,
            population_size=pop_size,
            generations=generations,
        )

        saved = []
        with transaction.atomic():
            for i, assignment in enumerate(result["assignments"]):
                berth_obj = Berth.objects.get(pk=assignment.berth_id)
                req_obj = BerthingRequest.objects.get(pk=assignment.request_id)

                lineup_entry = Lineup.objects.create(
                    ship=req_obj.ship,
                    berth=berth_obj,
                    start_time=assignment.start_time,
                    end_time=assignment.end_time,
                    position=i + 1,
                    position_start=assignment.position_start,
                    position_end=assignment.position_end,
                    source="AUTOMATIC",
                    berthing_request=req_obj,
                )

                # Update request status
                req_obj.status = "SCHEDULED"
                req_obj.save(update_fields=["status"])

                saved.append({
                    "lineup_id": str(lineup_entry.id),
                    "request_id": assignment.request_id,
                    "berth": berth_obj.number,
                    "ship": req_obj.ship.name,
                    "start_time": assignment.start_time.isoformat(),
                    "end_time": assignment.end_time.isoformat(),
                })

        return Response({
            "generated": len(saved),
            "fitness": result["fitness"],
            "generations_run": result["generations"],
            "schedule": saved,
            "shiftings": [
                {
                    "ship_id": str(s.ship_id),
                    "from_berth_id": str(s.from_berth_id),
                    "to_berth_id": str(s.to_berth_id),
                    "reason": s.reason,
                }
                for s in result.get("shiftings", [])
            ],
        }, status=http_status.HTTP_201_CREATED)


class SimulateScenarioView(APIView):
    """
    POST /operations/simulate-scenario
    Simulates a scenario with perturbations WITHOUT saving to DB.
    Body: { "perturbations": [{"type": "delay_eta", "request_id": "...", "hours": 6}] }
    """
    def post(self, request):
        perturbations = request.data.get("perturbations", [])
        berth_data_list, request_data_list = _build_optimization_data()

        if not request_data_list:
            return Response({"detail": "No WAITING requests found."}, status=http_status.HTTP_200_OK)

        result = simulate_scenario(request_data_list, berth_data_list, perturbations)

        assignments_out = [
            {
                "request_id": a.request_id,
                "berth_id": a.berth_id,
                "ship_id": a.ship_id,
                "start_time": a.start_time.isoformat(),
                "end_time": a.end_time.isoformat(),
                "position_start": str(a.position_start),
                "position_end": str(a.position_end),
            }
            for a in result["assignments"]
        ]

        return Response({
            "assignments": assignments_out,
            "metrics": result["metrics"],
        })
