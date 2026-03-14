from django.db.models import Max
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from berths.models import Berth
from ships.models import Ship

from .models import BerthingRequest, Lineup, OperationAdjustment, Shifting
from .serializers import (
    BerthingRequestSerializer,
    LineupSerializer,
    OperationAdjustmentSerializer,
    ShiftingSerializer,
)


class LineupTimelineView(APIView):
    """
    GET /lineup/timeline?start=<date>&end=<date>
    Returns lineup entries grouped by berth for the Gantt chart.
    """

    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        qs = Lineup.objects.select_related(
            "ship", "berth", "berthing_request"
        ).order_by("berth__number", "start_time")
        if start:
            qs = qs.filter(start_time__gte=start)
        if end:
            qs = qs.filter(end_time__lte=end)

        berths = Berth.objects.filter(active=True).order_by("number")
        result = []
        for berth in berths:
            entries = [e for e in qs if str(e.berth_id) == str(berth.id)]
            result.append(
                {
                    "berth_id": str(berth.id),
                    "berth_number": berth.number,
                    "port": str(berth.port_id),
                    "entries": LineupSerializer(entries, many=True).data,
                }
            )
        return Response(result)


class BerthingRequestViewSet(ModelViewSet):
    queryset = BerthingRequest.objects.select_related("ship", "client").all()
    serializer_class = BerthingRequestSerializer


class LineupViewSet(ModelViewSet):
    queryset = Lineup.objects.select_related("ship", "berth").all()
    serializer_class = LineupSerializer


class OperationAdjustmentViewSet(ModelViewSet):
    queryset = OperationAdjustment.objects.select_related("request").all()
    serializer_class = OperationAdjustmentSerializer


class ShiftingViewSet(ModelViewSet):
    queryset = Shifting.objects.select_related("ship", "from_berth", "to_berth").all()
    serializer_class = ShiftingSerializer


class BerthMapView(APIView):
    """
    GET /lineup/berth-map?date=YYYY-MM-DD
    Returns berths with their lineup entries for the given date (or today).
    Used by the berth map / Gantt screen.
    """

    def get(self, request):
        from django.utils import timezone
        from berths.models import Berth
        from .models import Lineup

        date_str = request.query_params.get("date")
        if date_str:
            try:
                from datetime import datetime
                day = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            day = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        day_end = day.replace(hour=23, minute=59, second=59)

        berths = Berth.objects.filter(active=True).order_by("number")
        lineup_qs = (
            Lineup.objects
            .filter(start_time__lte=day_end, end_time__gte=day)
            .select_related("ship", "berth", "berthing_request__client", "berthing_request__cargo_type")
            .order_by("berth__number", "start_time")
        )

        result = []
        for berth in berths:
            entries = [l for l in lineup_qs if l.berth_id == berth.id]
            ships = []
            for l in entries:
                req = l.berthing_request
                ships.append({
                    "lineup_id": str(l.id),
                    "ship_id": str(l.ship_id),
                    "ship_name": l.ship.name,
                    "client": req.client.name if req and req.client else "",
                    "cargo": req.cargo_type.name if req and req.cargo_type else "",
                    "cargo_category": req.cargo_type.category if req and req.cargo_type else "",
                    "operation_type": req.operation_type if req else "",
                    "eta": l.start_time.isoformat(),
                    "etd": l.end_time.isoformat(),
                    "source": l.source,
                    "position_start": str(l.position_start) if l.position_start else "0",
                    "position_end": str(l.position_end) if l.position_end else "0",
                })
            result.append({
                "berth_id": str(berth.id),
                "berth_number": berth.number,
                "berth_length": str(berth.length) if berth.length else "0",
                "ships": ships,
            })

        return Response(result)


class DashboardStatsView(APIView):
    """GET /lineup/dashboard-stats"""

    def get(self, request):
        from django.utils import timezone
        from berths.models import Berth
        from .models import Lineup, BerthingRequest

        now = timezone.now()
        berths_total = Berth.objects.filter(active=True).count()
        berths_occupied = Lineup.objects.filter(
            start_time__lte=now, end_time__gte=now
        ).values("berth").distinct().count()

        return Response({
            "berths": {
                "total": berths_total,
                "occupied": berths_occupied,
                "free": berths_total - berths_occupied,
            },
            "ships": {
                "waiting": BerthingRequest.objects.filter(status="WAITING").count(),
                "scheduled": BerthingRequest.objects.filter(status="SCHEDULED").count(),
                "operating": BerthingRequest.objects.filter(status="OPERATING").count(),
                "finished_today": BerthingRequest.objects.filter(
                    status="FINISHED",
                    created_at__date=now.date()
                ).count(),
            },
        })


class CreateLineupView(APIView):
    """
    POST /lineup/create

    Body: { "ship": "<uuid>", "berth": "<uuid>", "start_time": "<datetime>", "end_time": "<datetime>" }

    Creates a Lineup entry with position auto-set as (current max position for that berth + 1).
    """

    def post(self, request) -> Response:
        ship_id = request.data.get("ship")
        berth_id = request.data.get("berth")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")

        errors: dict = {}

        if not ship_id:
            errors["ship"] = "This field is required."
        if not berth_id:
            errors["berth"] = "This field is required."
        if not start_time:
            errors["start_time"] = "This field is required."
        if not end_time:
            errors["end_time"] = "This field is required."

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            ship = Ship.objects.get(pk=ship_id)
        except Ship.DoesNotExist:
            return Response(
                {"ship": f"Ship with id '{ship_id}' does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            berth = Berth.objects.get(pk=berth_id)
        except Berth.DoesNotExist:
            return Response(
                {"berth": f"Berth with id '{berth_id}' does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        aggregate = Lineup.objects.filter(berth=berth).aggregate(max_pos=Max("position"))
        next_position: int = (aggregate["max_pos"] or 0) + 1

        serializer = LineupSerializer(
            data={
                "ship": str(ship.pk),
                "berth": str(berth.pk),
                "start_time": start_time,
                "end_time": end_time,
                "position": next_position,
            }
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
