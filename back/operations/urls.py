from django.urls import path

from .views import (
    CalculateOperationTimeView,
    SimulateLineupView,
    GenerateLineupView,
    SimulateScenarioView,
)

urlpatterns = [
    path("calculate-time", CalculateOperationTimeView.as_view(), name="calculate-time"),
    path("simulate", SimulateLineupView.as_view(), name="simulate-lineup"),
    path("generate", GenerateLineupView.as_view(), name="generate-lineup"),
    path("simulate-scenario", SimulateScenarioView.as_view(), name="simulate-scenario"),
]
