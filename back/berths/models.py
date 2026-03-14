import uuid

from django.db import models


class Berth(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    port = models.ForeignKey(
        "ports.Port",
        on_delete=models.CASCADE,
        related_name="berths",
    )
    number = models.CharField(max_length=50)
    name = models.CharField(max_length=255, blank=True, default="", help_text="Nome do berço")
    length = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Berth length in meters",
    )
    max_loa = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Maximum Length Overall accepted (meters)",
    )
    depth = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Water depth at berth in meters",
    )
    position_start = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Cais start coordinate in meters",
    )
    position_end = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Cais end coordinate in meters",
    )
    class Status(models.TextChoices):
        ATIVO = "ATIVO", "Ativo"
        INATIVO = "INATIVO", "Inativo"
        OCIOSO = "OCIOSO", "Ocioso"
        MANUTENCAO = "MANUTENCAO", "Em Manutenção"

    active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ATIVO,
        help_text="Status operacional do berço",
    )
    max_draft = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Calado máximo de entrada/saída em metros",
    )
    max_beam = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Boca máxima aceita em metros",
    )
    max_air_draft = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Calado aéreo máximo em metros",
    )
    max_dwt = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        help_text="DWT máximo em toneladas",
    )
    max_ship_age = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Idade máxima do navio em anos",
    )
    default_ship_type = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Tipo de navio padrão (ex: Bulk Carrier, Tanker)",
    )
    crane_capacity_min = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Capacidade mínima do guindaste em toneladas",
    )

    class Meta:
        ordering = ["port", "number"]

    def __str__(self) -> str:
        return f"{self.number} ({self.port})"


class OperationalRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule_type = models.CharField(max_length=50)
    target = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["rule_type", "target"]

    def __str__(self) -> str:
        return f"{self.rule_type}: {self.target} = {self.value}"


class BerthCargo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    berth = models.ForeignKey(
        Berth,
        on_delete=models.CASCADE,
        related_name="cargo_configs",
    )
    cargo_type = models.ForeignKey(
        "cargo.CargoType",
        on_delete=models.CASCADE,
        related_name="berth_configs",
    )
    max_prancha = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    priority = models.IntegerField(default=0)

    class Meta:
        unique_together = [["berth", "cargo_type"]]
        ordering = ["-priority"]

    def __str__(self) -> str:
        return f"{self.berth} - {self.cargo_type} (Priority: {self.priority})"


class BerthNeighbor(models.Model):
    RESTRICTION_CHOICES = [
        ("NONE", "Nenhuma"),
        ("DISTANCE", "Distância Mínima"),
        ("FORBIDDEN", "Proibido"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    berth = models.ForeignKey(
        Berth,
        on_delete=models.CASCADE,
        related_name="neighbors",
    )
    neighbor = models.ForeignKey(
        Berth,
        on_delete=models.CASCADE,
        related_name="neighbor_of",
    )
    restriction_type = models.CharField(
        max_length=20,
        choices=RESTRICTION_CHOICES,
        default="NONE",
    )
    min_distance = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Distância mínima em metros entre os navios",
    )

    class Meta:
        unique_together = [["berth", "neighbor"]]
        ordering = ["berth"]

    def __str__(self) -> str:
        return f"{self.berth} ↔ {self.neighbor} ({self.restriction_type})"
