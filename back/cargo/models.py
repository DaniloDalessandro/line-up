import uuid

from django.db import models


class CargoType(models.Model):
    class Category(models.TextChoices):
        SOLID_BULK = "solid_bulk", "Granel Sólido"
        LIQUID_BULK = "liquid_bulk", "Granel Líquido"
        GENERAL_CARGO = "general_cargo", "Carga Geral"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, choices=Category.choices)
    default_prancha = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_category_display()})"
