from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BerthingRequestViewSet,
    BerthMapView,
    CreateLineupView,
    DashboardStatsView,
    LineupTimelineView,
    LineupViewSet,
    OperationAdjustmentViewSet,
    ShiftingViewSet,
)

router = DefaultRouter()
router.register("requests", BerthingRequestViewSet, basename="berthing-request")
router.register("lineups", LineupViewSet, basename="lineup")
router.register("adjustments", OperationAdjustmentViewSet, basename="adjustment")
router.register("shiftings", ShiftingViewSet, basename="shifting")

urlpatterns = [
    path("create", CreateLineupView.as_view(), name="lineup-create"),
    path("timeline", LineupTimelineView.as_view(), name="lineup-timeline"),
    path("berth-map", BerthMapView.as_view(), name="berth-map"),
    path("dashboard-stats", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("", include(router.urls)),
]
