import uuid

from django.db import models


class Client(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    priority = models.IntegerField(
        default=0,
        help_text="Higher value means higher scheduling priority (e.g. Suzano, Tegram, Vale)",
    )

    class Meta:
        ordering = ["-priority", "name"]

    def __str__(self) -> str:
        return f"{self.name} (priority={self.priority})"
