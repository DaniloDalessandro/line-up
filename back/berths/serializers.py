from rest_framework import serializers

from .models import Berth, BerthCargo, BerthNeighbor, OperationalRule


class BerthSerializer(serializers.ModelSerializer):
    class Meta:
        model = Berth
        fields = [
            "id", "port", "number", "name", "length", "max_loa", "depth",
            "position_start", "position_end", "active", "status",
            "max_draft", "max_beam", "max_air_draft", "max_dwt",
            "default_ship_type", "crane_capacity_min", "max_ship_age",
        ]


class BerthCargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BerthCargo
        fields = "__all__"


class OperationalRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationalRule
        fields = "__all__"


class BerthNeighborSerializer(serializers.ModelSerializer):
    class Meta:
        model = BerthNeighbor
        fields = "__all__"
