from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CargoTypeViewSet

router = DefaultRouter()
router.register(r"cargo-types", CargoTypeViewSet, basename="cargo-type")

urlpatterns = [
    path("", include(router.urls)),
]
