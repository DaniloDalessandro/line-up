import uuid

from django.db import models


class Ship(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    loa = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Length Overall in meters",
    )
    beam = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Ship beam (width) in meters",
    )
    dwt = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Deadweight tonnage",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
