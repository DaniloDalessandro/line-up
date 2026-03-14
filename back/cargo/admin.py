from django.contrib import admin

from .models import CargoType


@admin.register(CargoType)
class CargoTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "default_prancha"]
    list_filter = ["category"]
    search_fields = ["name"]
