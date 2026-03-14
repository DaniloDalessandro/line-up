from decimal import Decimal

SAFETY_MARGIN = Decimal("30")  # 15m bow + 15m stern


def validate_loa(ship_loa: Decimal, berth_length: Decimal) -> bool:
    """Return True if ship fits in berth with safety margin."""
    return ship_loa + SAFETY_MARGIN <= berth_length


def loa_fit_error(ship_loa: Decimal, berth_length: Decimal) -> str:
    """Return human-readable error if ship does not fit."""
    required = ship_loa + SAFETY_MARGIN
    return (
        f"Ship LOA {ship_loa}m + 30m margin = {required}m "
        f"exceeds berth length {berth_length}m."
    )
