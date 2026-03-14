from rest_framework.viewsets import ModelViewSet

from .models import Berth, BerthCargo, BerthNeighbor, OperationalRule
from .serializers import (
    BerthCargoSerializer,
    BerthNeighborSerializer,
    BerthSerializer,
    OperationalRuleSerializer,
)


class BerthViewSet(ModelViewSet):
    queryset = Berth.objects.select_related("port").all()
    serializer_class = BerthSerializer


class BerthCargoViewSet(ModelViewSet):
    queryset = BerthCargo.objects.select_related("berth", "cargo_type").all()
    serializer_class = BerthCargoSerializer


class OperationalRuleViewSet(ModelViewSet):
    queryset = OperationalRule.objects.all()
    serializer_class = OperationalRuleSerializer


class BerthNeighborViewSet(ModelViewSet):
    queryset = BerthNeighbor.objects.select_related("berth", "neighbor").all()
    serializer_class = BerthNeighborSerializer
