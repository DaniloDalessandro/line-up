from rest_framework import serializers

from .models import LineupSnapshot, OperationRecord, OperationalAlert, PortEvent, ShipETAUpdate


class ShipETAUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipETAUpdate
        fields = "__all__"


class OperationalAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationalAlert
        fields = "__all__"


class PortEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortEvent
        fields = "__all__"


class LineupSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = LineupSnapshot
        fields = "__all__"


class OperationRecordSerializer(serializers.ModelSerializer):
    ship_name = serializers.CharField(source="ship.name", read_only=True)
    berth_name = serializers.CharField(source="berth.name", read_only=True)
    cargo_type_name = serializers.CharField(source="cargo_type.name", read_only=True)

    class Meta:
        model = OperationRecord
        fields = "__all__"
