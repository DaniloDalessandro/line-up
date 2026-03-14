from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import LineupSnapshot, OperationRecord, OperationalAlert, PortEvent, ShipETAUpdate
from .serializers import (
    LineupSnapshotSerializer,
    OperationRecordSerializer,
    OperationalAlertSerializer,
    PortEventSerializer,
    ShipETAUpdateSerializer,
)


class ShipETAUpdateViewSet(ModelViewSet):
    queryset = ShipETAUpdate.objects.select_related("ship", "berthing_request").all()
    serializer_class = ShipETAUpdateSerializer


class OperationalAlertViewSet(ModelViewSet):
    queryset = OperationalAlert.objects.select_related("ship", "berth").all()
    serializer_class = OperationalAlertSerializer


class PortEventViewSet(ModelViewSet):
    queryset = PortEvent.objects.select_related("ship", "berth").all()
    serializer_class = PortEventSerializer


class LineupSnapshotViewSet(ModelViewSet):
    queryset = LineupSnapshot.objects.all()
    serializer_class = LineupSnapshotSerializer
    http_method_names = ["get", "post", "head", "options"]  # immutable — no PUT/DELETE


class OperationRecordViewSet(ModelViewSet):
    queryset = OperationRecord.objects.select_related(
        "ship", "berth", "cargo_type", "berthing_request"
    ).all()
    serializer_class = OperationRecordSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]  # no DELETE


class RecalculateLineupView(APIView):
    """POST /monitoring/recalculate — { dry_run: true/false }"""

    def post(self, request):
        dry_run = request.data.get("dry_run", True)
        from .services import recalculate_lineup
        result = recalculate_lineup(dry_run=dry_run)
        return Response(result)


class DetectAlertsView(APIView):
    """POST /monitoring/detect-alerts — detect idle berths and delays"""

    def post(self, request):
        from .services import detect_idle_berths
        alerts = detect_idle_berths()
        return Response({"new_alerts": len(alerts), "alerts": [str(a) for a in alerts]})


class PredictOperationEndView(APIView):
    """GET /monitoring/predict-end/{lineup_id}"""

    def get(self, request, lineup_id):
        from .services import predict_operation_end
        result = predict_operation_end(lineup_id)
        return Response(result)
