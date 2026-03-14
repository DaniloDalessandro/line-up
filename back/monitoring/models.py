import uuid
from django.db import models
from django.utils import timezone


class ShipETAUpdate(models.Model):
    class Source(models.TextChoices):
        AIS = "AIS", "AIS"
        MANUAL = "MANUAL", "Manual"
        AGENT = "AGENT", "Agente"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ship = models.ForeignKey("ships.Ship", on_delete=models.CASCADE, related_name="eta_updates")
    berthing_request = models.ForeignKey(
        "lineup.BerthingRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eta_updates",
    )
    old_eta = models.DateTimeField()
    new_eta = models.DateTimeField()
    updated_at = models.DateTimeField(default=timezone.now)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"ETA update {self.ship} {self.old_eta} → {self.new_eta}"


class OperationalAlert(models.Model):
    class AlertType(models.TextChoices):
        DELAYED_SHIP = "DELAYED_SHIP", "Navio Atrasado"
        IDLE_BERTH = "IDLE_BERTH", "Berço Ocioso"
        BERTH_CONFLICT = "BERTH_CONFLICT", "Conflito de Berço"
        RULE_VIOLATION = "RULE_VIOLATION", "Violação de Regra"

    class Severity(models.TextChoices):
        INFO = "INFO", "Informação"
        WARNING = "WARNING", "Atenção"
        CRITICAL = "CRITICAL", "Crítico"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=30, choices=AlertType.choices)
    ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )
    berth = models.ForeignKey(
        "berths.Berth",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.WARNING)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]


class PortEvent(models.Model):
    class EventType(models.TextChoices):
        ATRACACAO = "ATRACACAO", "Atracação"
        DESATRACACAO = "DESATRACACAO", "Desatracação"
        SHIFTING = "SHIFTING", "Shifting"
        CHUVA = "CHUVA", "Chuva"
        PARADA = "PARADA", "Parada de Operação"
        ETA_UPDATE = "ETA_UPDATE", "Atualização de ETA"
        MANUAL_OVERRIDE = "MANUAL_OVERRIDE", "Ajuste Manual"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="port_events",
    )
    berth = models.ForeignKey(
        "berths.Berth",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="port_events",
    )
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp"]


class LineupSnapshot(models.Model):
    """Immutable snapshot of a complete lineup schedule at a point in time."""

    class Reason(models.TextChoices):
        GENERATED = "GENERATED", "Gerado pelo otimizador"
        MANUAL_EDIT = "MANUAL_EDIT", "Edição manual"
        REPLANNING = "REPLANNING", "Replanejamento"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(default=timezone.now)
    reason = models.CharField(max_length=20, choices=Reason.choices, default=Reason.GENERATED)
    label = models.CharField(max_length=255, blank=True, help_text="Descrição opcional do snapshot")
    data = models.JSONField(help_text="Serialização completa do lineup em JSON")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Snapshot {self.reason} — {self.created_at:%Y-%m-%d %H:%M}"


class OperationRecord(models.Model):
    """
    Immutable record of a completed berth operation.
    Created when a BerthingRequest transitions to FINISHED.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    berthing_request = models.OneToOneField(
        "lineup.BerthingRequest",
        on_delete=models.PROTECT,
        related_name="operation_record",
        null=True,
        blank=True,
    )
    ship = models.ForeignKey(
        "ships.Ship",
        on_delete=models.PROTECT,
        related_name="operation_records",
    )
    berth = models.ForeignKey(
        "berths.Berth",
        on_delete=models.PROTECT,
        related_name="operation_records",
    )
    cargo_type = models.ForeignKey(
        "cargo.CargoType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operation_records",
    )
    operation_type = models.CharField(max_length=20)
    cargo_quantity = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Tonelagem operada",
    )
    scheduled_start = models.DateTimeField(help_text="Início conforme lineup")
    scheduled_end = models.DateTimeField(help_text="Fim conforme lineup")
    actual_start = models.DateTimeField(null=True, blank=True, help_text="Atracação real")
    actual_end = models.DateTimeField(null=True, blank=True, help_text="Desatracação real")
    delay_hours = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Horas de atraso vs ETA (negativo = antecipação)",
    )
    prancha_realizada = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Prancha efetiva t/dia",
    )
    notes = models.TextField(blank=True)
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self) -> str:
        return f"OperationRecord {self.ship} @ {self.berth} ({self.recorded_at:%Y-%m-%d})"
