import uuid

from django.db import models
from django.utils import timezone


class BerthingRequest(models.Model):
    class Status(models.TextChoices):
        WAITING = "WAITING", "Waiting"
        SCHEDULED = "SCHEDULED", "Scheduled"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        OPERATING = "OPERATING", "Operating"
        FINISHED = "FINISHED", "Finished"
        BYPASS = "BYPASS", "Bypass"

    class OperationType(models.TextChoices):
        LOAD = "LOAD", "Carga"
        DISCHARGE = "DISCHARGE", "Descarga"
        STS = "STS", "Ship-to-Ship"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.PROTECT,
        related_name="berthing_requests",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="berthing_requests",
    )
    cargo_type = models.ForeignKey(
        "cargo.CargoType",
        on_delete=models.PROTECT,
        related_name="berthing_requests",
        null=True,
        blank=True,
    )
    cargo_quantity = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    eta = models.DateTimeField()
    operation_type = models.CharField(
        max_length=20,
        choices=OperationType.choices,
        default=OperationType.DISCHARGE,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.WAITING,
    )
    bypass = models.BooleanField(
        default=False,
        help_text="True means the ship left the queue.",
    )
    mother_ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sts_mother_requests",
    )
    daughter_ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sts_daughter_requests",
    )
    bypass_reason = models.TextField(blank=True)
    bypass_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["eta"]

    def __str__(self) -> str:
        return f"BerthingRequest {self.id} — {self.ship} [{self.status}]"


class Lineup(models.Model):
    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AUTOMATIC = "AUTOMATIC", "Automático"
        SHIFTING = "SHIFTING", "Shifting"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.PROTECT,
        related_name="lineups",
    )
    berth = models.ForeignKey(
        "berths.Berth",
        on_delete=models.PROTECT,
        related_name="lineups",
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    position = models.PositiveIntegerField()
    position_start = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Physical start on quay in meters",
    )
    position_end = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Physical end on quay in meters",
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )
    berthing_request = models.ForeignKey(
        "lineup.BerthingRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lineups",
    )

    class Meta:
        ordering = ["berth", "position"]

    def __str__(self) -> str:
        return f"Lineup pos={self.position} — {self.ship} @ {self.berth}"


class OperationAdjustment(models.Model):
    class Type(models.TextChoices):
        RAIN = "RAIN", "Rain"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        OTHER = "OTHER", "Other"
        WEATHER = "WEATHER", "Weather"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        "lineup.BerthingRequest",
        on_delete=models.CASCADE,
        related_name="adjustments",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    reason = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"Adjustment {self.type} ({self.hours}h) for request {self.request_id}"


class Shifting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.PROTECT,
        related_name="shiftings",
    )
    from_berth = models.ForeignKey(
        "berths.Berth",
        on_delete=models.PROTECT,
        related_name="shiftings_from",
    )
    to_berth = models.ForeignKey(
        "berths.Berth",
        on_delete=models.PROTECT,
        related_name="shiftings_to",
    )
    time = models.DateTimeField()
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(blank=True)

    class Meta:
        ordering = ["time"]
        verbose_name = "ShiftingOperation"

    def __str__(self) -> str:
        return f"Shifting {self.ship} from {self.from_berth} to {self.to_berth} at {self.time}"
