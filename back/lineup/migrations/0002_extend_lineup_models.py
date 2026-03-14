import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("berths", "0002_operationalrule_berth_active_berth_position_end_and_more"),
        ("cargo", "0001_initial"),
        ("lineup", "0001_initial"),
        ("ships", "0001_initial"),
    ]

    operations = [
        # ── BerthingRequest: status choices extended ──────────────────────────
        migrations.AlterField(
            model_name="berthingrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("WAITING", "Waiting"),
                    ("SCHEDULED", "Scheduled"),
                    ("COMPLETED", "Completed"),
                    ("CANCELLED", "Cancelled"),
                    ("OPERATING", "Operating"),
                    ("FINISHED", "Finished"),
                    ("BYPASS", "Bypass"),
                ],
                default="WAITING",
                max_length=20,
            ),
        ),
        # ── BerthingRequest: operation_type → TextChoices CharField ───────────
        migrations.AlterField(
            model_name="berthingrequest",
            name="operation_type",
            field=models.CharField(
                choices=[
                    ("LOAD", "Carga"),
                    ("DISCHARGE", "Descarga"),
                    ("STS", "Ship-to-Ship"),
                ],
                default="DISCHARGE",
                max_length=20,
            ),
        ),
        # ── BerthingRequest: cargo_type CharField → ForeignKey ────────────────
        migrations.RemoveField(
            model_name="berthingrequest",
            name="cargo_type",
        ),
        migrations.AddField(
            model_name="berthingrequest",
            name="cargo_type",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="berthing_requests",
                to="cargo.cargotype",
            ),
        ),
        # ── BerthingRequest: new FK fields ────────────────────────────────────
        migrations.AddField(
            model_name="berthingrequest",
            name="mother_ship",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sts_mother_requests",
                to="ships.ship",
            ),
        ),
        migrations.AddField(
            model_name="berthingrequest",
            name="daughter_ship",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sts_daughter_requests",
                to="ships.ship",
            ),
        ),
        # ── BerthingRequest: new scalar fields ───────────────────────────────
        migrations.AddField(
            model_name="berthingrequest",
            name="bypass_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="berthingrequest",
            name="bypass_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="berthingrequest",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        # ── Lineup: new fields ────────────────────────────────────────────────
        migrations.AddField(
            model_name="lineup",
            name="position_start",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Physical start on quay in meters",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="lineup",
            name="position_end",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Physical end on quay in meters",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="lineup",
            name="source",
            field=models.CharField(
                choices=[
                    ("MANUAL", "Manual"),
                    ("AUTOMATIC", "Automático"),
                    ("SHIFTING", "Shifting"),
                ],
                default="MANUAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="lineup",
            name="berthing_request",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="lineups",
                to="lineup.berthingrequest",
            ),
        ),
        # ── OperationAdjustment: add WEATHER choice ───────────────────────────
        migrations.AlterField(
            model_name="operationadjustment",
            name="type",
            field=models.CharField(
                choices=[
                    ("RAIN", "Rain"),
                    ("MAINTENANCE", "Maintenance"),
                    ("OTHER", "Other"),
                    ("WEATHER", "Weather"),
                ],
                max_length=20,
            ),
        ),
        # ── Shifting: new fields + verbose_name ──────────────────────────────
        migrations.AddField(
            model_name="shifting",
            name="start_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="shifting",
            name="end_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="shifting",
            name="reason",
            field=models.TextField(blank=True),
        ),
        migrations.AlterModelOptions(
            name="shifting",
            options={"ordering": ["time"], "verbose_name": "ShiftingOperation"},
        ),
    ]
