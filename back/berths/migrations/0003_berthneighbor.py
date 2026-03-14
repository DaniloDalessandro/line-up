import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("berths", "0002_operationalrule_berth_active_berth_position_end_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="BerthNeighbor",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "restriction_type",
                    models.CharField(
                        choices=[
                            ("BLOCKS", "Bloqueia"),
                            ("PARTIAL", "Restrição Parcial"),
                        ],
                        default="BLOCKS",
                        max_length=20,
                    ),
                ),
                (
                    "berth",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="neighbors",
                        to="berths.berth",
                    ),
                ),
                (
                    "neighbor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="neighbor_of",
                        to="berths.berth",
                    ),
                ),
            ],
            options={
                "ordering": ["berth"],
                "unique_together": {("berth", "neighbor")},
            },
        ),
    ]
