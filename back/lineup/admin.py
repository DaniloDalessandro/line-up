from django.contrib import admin

from .models import BerthingRequest, Lineup, OperationAdjustment, Shifting


@admin.register(BerthingRequest)
class BerthingRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "ship", "client", "cargo_type", "eta", "status", "bypass")
    list_filter = ("status", "bypass", "operation_type")
    search_fields = ("ship__name", "client__name", "cargo_type")
    ordering = ("eta",)


@admin.register(Lineup)
class LineupAdmin(admin.ModelAdmin):
    list_display = ("id", "ship", "berth", "position", "start_time", "end_time")
    list_filter = ("berth",)
    search_fields = ("ship__name", "berth__number")
    ordering = ("berth", "position")


@admin.register(OperationAdjustment)
class OperationAdjustmentAdmin(admin.ModelAdmin):
    list_display = ("id", "request", "type", "hours")
    list_filter = ("type",)
    search_fields = ("request__id",)


@admin.register(Shifting)
class ShiftingAdmin(admin.ModelAdmin):
    list_display = ("id", "ship", "from_berth", "to_berth", "time")
    list_filter = ("from_berth", "to_berth")
    search_fields = ("ship__name",)
    ordering = ("time",)
