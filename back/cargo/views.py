from rest_framework.viewsets import ModelViewSet

from .models import CargoType
from .serializers import CargoTypeSerializer


class CargoTypeViewSet(ModelViewSet):
    queryset = CargoType.objects.all()
    serializer_class = CargoTypeSerializer
