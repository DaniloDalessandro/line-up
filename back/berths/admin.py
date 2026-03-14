from django.contrib import admin

from .models import Berth, BerthCargo, BerthNeighbor, OperationalRule


@admin.register(Berth)
class BerthAdmin(admin.ModelAdmin):
    list_display = ["number", "name", "port", "active", "length", "depth", "max_draft", "max_loa"]
    list_filter = ["active", "port"]
    search_fields = ["number", "name"]
    ordering = ["port", "number"]


@admin.register(BerthCargo)
class BerthCargoAdmin(admin.ModelAdmin):
    list_display = ["berth", "cargo_type", "max_prancha", "priority"]


@admin.register(OperationalRule)
class OperationalRuleAdmin(admin.ModelAdmin):
    list_display = ["rule_type", "target", "value", "active"]
    list_filter = ["rule_type", "active"]


@admin.register(BerthNeighbor)
class BerthNeighborAdmin(admin.ModelAdmin):
    list_display = ["berth", "neighbor", "restriction_type", "min_distance"]
