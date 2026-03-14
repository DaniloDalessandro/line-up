import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("berths", "0006_berth_status"),
        ("cargo", "0001_initial"),
        ("lineup", "0001_initial"),
        ("monitoring", "0001_initial"),
        ("ships", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LineupSnapshot",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "reason",
                    models.CharField(
                        choices=[
                            ("GENERATED", "Gerado pelo otimizador"),
                            ("MANUAL_EDIT", "Edição manual"),
                            ("REPLANNING", "Replanejamento"),
                        ],
                        default="GENERATED",
                        max_length=20,
                    ),
                ),
                ("label", models.CharField(blank=True, max_length=255)),
                ("data", models.JSONField()),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="OperationRecord",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("operation_type", models.CharField(max_length=20)),
                (
                    "cargo_quantity",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=12,
                        null=True,
                    ),
                ),
                ("scheduled_start", models.DateTimeField()),
                ("scheduled_end", models.DateTimeField()),
                ("actual_start", models.DateTimeField(blank=True, null=True)),
                ("actual_end", models.DateTimeField(blank=True, null=True)),
                (
                    "delay_hours",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=8,
                        null=True,
                    ),
                ),
                (
                    "prancha_realizada",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("recorded_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "berthing_request",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="operation_record",
                        to="lineup.berthingrequest",
                    ),
                ),
                (
                    "berth",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="operation_records",
                        to="berths.berth",
                    ),
                ),
                (
                    "cargo_type",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="operation_records",
                        to="cargo.cargotype",
                    ),
                ),
                (
                    "ship",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="operation_records",
                        to="ships.ship",
                    ),
                ),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
    ]
