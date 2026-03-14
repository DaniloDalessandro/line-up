from rest_framework.viewsets import ModelViewSet

from .models import Ship
from .serializers import ShipSerializer


class ShipViewSet(ModelViewSet):
    queryset = Ship.objects.all()
    serializer_class = ShipSerializer
