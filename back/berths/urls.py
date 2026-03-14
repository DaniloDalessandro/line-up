from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BerthCargoViewSet, BerthNeighborViewSet, BerthViewSet, OperationalRuleViewSet

router = DefaultRouter()
router.register(r"berth-cargo", BerthCargoViewSet, basename="berth-cargo")
router.register(r"berth-neighbors", BerthNeighborViewSet, basename="berth-neighbor")
router.register(r"operational-rules", OperationalRuleViewSet, basename="operational-rule")
router.register(r"", BerthViewSet, basename="berth")

urlpatterns = [
    path("", include(router.urls)),
]
