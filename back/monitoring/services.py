from django.utils import timezone
from decimal import Decimal


def detect_idle_berths():
    """
    Returns list of berths that are active but have no ongoing lineup entry,
    while there are WAITING berthing requests.
    """
    from berths.models import Berth
    from lineup.models import Lineup, BerthingRequest
    from .models import OperationalAlert

    now = timezone.now()
    waiting_count = BerthingRequest.objects.filter(status="WAITING").count()
    if waiting_count == 0:
        return []

    alerts = []
    active_berths = Berth.objects.filter(active=True)
    for berth in active_berths:
        occupied = Lineup.objects.filter(
            berth=berth, start_time__lte=now, end_time__gte=now
        ).exists()
        if not occupied:
            alert, created = OperationalAlert.objects.get_or_create(
                type="IDLE_BERTH",
                berth=berth,
                resolved=False,
                defaults={
                    "message": f"Berço {berth.number} ocioso com {waiting_count} navios aguardando",
                    "severity": "WARNING",
                }
            )
            if created:
                alerts.append(alert)
    return alerts


def predict_operation_end(lineup_entry_id: str) -> dict:
    """
    Predict operation end time based on remaining cargo, prancha, and adjustments.
    """
    from lineup.models import Lineup, BerthingRequest
    try:
        entry = Lineup.objects.select_related("berthing_request__cargo_type").get(pk=lineup_entry_id)
    except Lineup.DoesNotExist:
        return {"error": "Lineup entry not found"}

    req = entry.berthing_request
    if not req:
        return {"predicted_end": entry.end_time.isoformat(), "basis": "original"}

    cargo_qty = req.cargo_quantity or Decimal("0")
    prancha = req.cargo_type.default_prancha if req.cargo_type else Decimal("1000")
    if not prancha or prancha == 0:
        prancha = Decimal("1000")

    # Sum adjustment hours
    from lineup.models import OperationAdjustment
    extra_hours = sum(
        float(adj.hours)
        for adj in req.adjustments.all()
    )

    base_hours = float(cargo_qty / prancha)
    total_hours = base_hours + extra_hours

    from datetime import timedelta
    predicted_end = entry.start_time + timedelta(hours=total_hours)

    return {
        "lineup_id": str(entry.id),
        "original_end": entry.end_time.isoformat(),
        "predicted_end": predicted_end.isoformat(),
        "base_hours": round(base_hours, 2),
        "extra_hours": round(extra_hours, 2),
        "total_hours": round(total_hours, 2),
    }


def recalculate_lineup(dry_run: bool = True) -> dict:
    """
    Re-run the optimization algorithm on all WAITING requests.
    If dry_run=True, returns proposed schedule without saving.
    If dry_run=False, saves new Lineup entries (does not touch existing SCHEDULED ones).
    """
    from optimization.genetic_algorithm import run_genetic_algorithm
    from operations.views import _build_optimization_data

    berth_data_list, request_data_list = _build_optimization_data()

    if not request_data_list:
        return {"detail": "Sem pedidos WAITING para reprocessar."}

    result = run_genetic_algorithm(request_data_list, berth_data_list, population_size=40, generations=80)

    schedule = [
        {
            "request_id": a.request_id,
            "berth_id": str(a.berth_id),
            "ship_id": str(a.ship_id),
            "start_time": a.start_time.isoformat(),
            "end_time": a.end_time.isoformat(),
            "position_start": str(a.position_start),
            "position_end": str(a.position_end),
        }
        for a in result["assignments"]
    ]

    if not dry_run:
        from lineup.models import Lineup, BerthingRequest
        from berths.models import Berth
        from django.db import transaction
        with transaction.atomic():
            for i, a in enumerate(result["assignments"]):
                try:
                    berth_obj = Berth.objects.get(pk=a.berth_id)
                    req_obj = BerthingRequest.objects.get(pk=a.request_id)
                    Lineup.objects.create(
                        ship=req_obj.ship, berth=berth_obj,
                        start_time=a.start_time, end_time=a.end_time,
                        position=i + 1, position_start=a.position_start,
                        position_end=a.position_end, source="AUTOMATIC",
                        berthing_request=req_obj,
                    )
                    req_obj.status = "SCHEDULED"
                    req_obj.save(update_fields=["status"])
                except Exception:
                    pass

    return {"proposed_schedule": schedule, "fitness": result["fitness"], "dry_run": dry_run}
