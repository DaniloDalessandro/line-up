from django.contrib import admin

from .models import OperationalAlert, PortEvent, ShipETAUpdate


@admin.register(ShipETAUpdate)
class ShipETAUpdateAdmin(admin.ModelAdmin):
    list_display = ["id", "ship", "old_eta", "new_eta", "source", "updated_at"]
    list_filter = ["source"]
    search_fields = ["ship__name"]
    ordering = ["-updated_at"]


@admin.register(OperationalAlert)
class OperationalAlertAdmin(admin.ModelAdmin):
    list_display = ["id", "type", "severity", "ship", "berth", "resolved", "created_at"]
    list_filter = ["type", "severity", "resolved"]
    search_fields = ["message", "ship__name", "berth__name"]
    ordering = ["-created_at"]


@admin.register(PortEvent)
class PortEventAdmin(admin.ModelAdmin):
    list_display = ["id", "event_type", "ship", "berth", "timestamp"]
    list_filter = ["event_type"]
    search_fields = ["description", "ship__name", "berth__name"]
    ordering = ["-timestamp"]
