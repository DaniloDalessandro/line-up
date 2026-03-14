from rest_framework.viewsets import ModelViewSet

from .models import Port
from .serializers import PortSerializer


class PortViewSet(ModelViewSet):
    queryset = Port.objects.all()
    serializer_class = PortSerializer
