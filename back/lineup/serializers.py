from rest_framework import serializers

from .models import BerthingRequest, Lineup, OperationAdjustment, Shifting


class BerthingRequestSerializer(serializers.ModelSerializer):
    operation_type_display = serializers.CharField(
        source="get_operation_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = BerthingRequest
        fields = [
            "id",
            "ship",
            "client",
            "cargo_type",
            "cargo_quantity",
            "eta",
            "operation_type",
            "operation_type_display",
            "status",
            "status_display",
            "bypass",
            "mother_ship",
            "daughter_ship",
            "bypass_reason",
            "bypass_time",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class LineupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lineup
        fields = "__all__"


class OperationAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationAdjustment
        fields = "__all__"


class ShiftingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shifting
        fields = "__all__"
