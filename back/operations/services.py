from decimal import Decimal
from typing import Optional

from django.utils import timezone


def calculate_operation_time(cargo_quantity: Decimal, prancha: Decimal) -> Optional[Decimal]:
    """
    Returns operation time in hours.
    tempo_operacao = cargo_quantity / prancha
    Returns None if prancha is zero or None.
    """
    if not prancha or prancha == 0:
        return None
    return cargo_quantity / prancha


def calculate_end_time(start_time, operation_hours: Decimal):
    """Returns end datetime given start and operation duration in hours."""
    from datetime import timedelta

    delta = timedelta(hours=float(operation_hours))
    return start_time + delta


def simulate_lineup(berths, requests):
    """
    Basic simulation: sort requests by ETA, assign to first available berth slot.

    Args:
        berths: queryset of Berth objects
        requests: queryset of BerthingRequest objects (status=WAITING), ordered by eta

    Returns:
        list of dicts: [{berth_id, ship_id, request_id, start_time, end_time, position}]
    """
    from berths.utils import validate_loa

    schedule = []
    # Track when each berth is next available
    berth_available = {str(b.id): timezone.now() for b in berths}
    berth_position = {str(b.id): 0 for b in berths}

    for req in requests:
        ship = req.ship
        ship_loa = ship.loa or Decimal("0")

        assigned = False
        for berth in berths:
            bid = str(berth.id)
            berth_length = berth.length or Decimal("0")

            # LOA check
            if berth_length > 0 and not validate_loa(ship_loa, berth_length):
                continue

            start = max(berth_available[bid], req.eta)

            # Calculate duration
            prancha = Decimal("1000")  # fallback default
            if hasattr(req, "cargo_type") and req.cargo_type and req.cargo_type.default_prancha:
                prancha = req.cargo_type.default_prancha

            duration_hours = (
                calculate_operation_time(req.cargo_quantity or Decimal("0"), prancha)
                or Decimal("24")
            )
            end = calculate_end_time(start, duration_hours)

            berth_available[bid] = end
            berth_position[bid] += 1

            schedule.append(
                {
                    "berth_id": berth.id,
                    "ship_id": ship.id,
                    "request_id": req.id,
                    "start_time": start,
                    "end_time": end,
                    "position": berth_position[bid],
                }
            )
            assigned = True
            break

        if not assigned:
            # Assign to first berth ignoring LOA
            berth = berths[0] if berths else None
            if berth:
                bid = str(berth.id)
                start = max(berth_available[bid], req.eta)
                prancha = Decimal("1000")
                duration_hours = Decimal("24")
                end = calculate_end_time(start, duration_hours)
                berth_available[bid] = end
                berth_position[bid] += 1
                schedule.append(
                    {
                        "berth_id": berth.id,
                        "ship_id": ship.id,
                        "request_id": req.id,
                        "start_time": start,
                        "end_time": end,
                        "position": berth_position[bid],
                    }
                )

    return schedule
