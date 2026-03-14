from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DetectAlertsView,
    LineupSnapshotViewSet,
    OperationRecordViewSet,
    OperationalAlertViewSet,
    PortEventViewSet,
    PredictOperationEndView,
    RecalculateLineupView,
    ShipETAUpdateViewSet,
)

router = DefaultRouter()
router.register("eta-updates", ShipETAUpdateViewSet, basename="eta-update")
router.register("alerts", OperationalAlertViewSet, basename="alert")
router.register("events", PortEventViewSet, basename="port-event")
router.register("snapshots", LineupSnapshotViewSet, basename="lineup-snapshot")
router.register("operation-records", OperationRecordViewSet, basename="operation-record")

urlpatterns = [
    path("recalculate", RecalculateLineupView.as_view(), name="monitoring-recalculate"),
    path("detect-alerts", DetectAlertsView.as_view(), name="monitoring-detect-alerts"),
    path("predict-end/<str:lineup_id>", PredictOperationEndView.as_view(), name="monitoring-predict-end"),
    path("", include(router.urls)),
]
