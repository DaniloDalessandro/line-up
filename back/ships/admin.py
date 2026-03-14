from django.contrib import admin

from .models import Ship


@admin.register(Ship)
class ShipAdmin(admin.ModelAdmin):
    list_display = ["name", "loa", "beam", "dwt"]
    search_fields = ["name"]
    ordering = ["name"]
