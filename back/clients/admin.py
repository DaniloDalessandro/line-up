from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["name", "priority"]
    search_fields = ["name"]
    ordering = ["-priority", "name"]
