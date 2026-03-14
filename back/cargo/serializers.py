from rest_framework import serializers

from .models import CargoType


class CargoTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CargoType
        fields = "__all__"
