"""
Pure-Python data structures and primitive constraint checks.
No Django imports.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Dict

BOW_MARGIN   = Decimal("15")   # 15 m bow clearance (proa)
STERN_MARGIN = Decimal("15")   # 15 m stern clearance (popa)
LOA_SAFETY_MARGIN = BOW_MARGIN + STERN_MARGIN  # 30 m total — for loa_fits_length


# ── Input dataclasses ────────────────────────────────────────────────────────

@dataclass
class ShipData:
    id: str
    name: str
    loa: Decimal
    beam: Decimal
    dwt: Decimal


@dataclass
class BerthData:
    id: str
    number: str
    length: Decimal          # total quay length in metres
    max_loa: Decimal         # hard LOA limit stated by port authority
    depth: Decimal
    active: bool
    allowed_cargo_ids: List[str] = field(default_factory=list)
    # neighbor_map: {neighbor_berth_id: restriction_type}
    # restriction_type: "BLOCKS" | "PARTIAL"
    neighbor_map: Dict[str, str] = field(default_factory=dict)
    neighbor_min_distances: Dict[str, Decimal] = field(default_factory=dict)


@dataclass
class RequestData:
    id: str
    ship: ShipData
    client_id: str
    client_name: str
    cargo_type_id: Optional[str]
    cargo_quantity: Decimal
    prancha: Decimal            # t/day effective rate
    eta: datetime
    operation_type: str         # LOAD | DISCHARGE | STS
    preferred_berth_ids: List[str] = field(default_factory=list)
    rain_hours: Decimal = Decimal("0")       # hours lost to rain
    extra_hours: Decimal = Decimal("0")      # other operational additions
    # STS fields
    mother_ship_id: Optional[str] = None
    daughter_ship_id: Optional[str] = None


@dataclass
class BerthSlot:
    """Represents a physical occupation window on a berth."""
    request_id: str
    ship_id: str
    position_start: Decimal
    position_end: Decimal
    start_time: datetime
    end_time: datetime


@dataclass
class Assignment:
    request_id: str
    berth_id: str
    ship_id: str
    start_time: datetime
    end_time: datetime
    position_start: Decimal
    position_end: Decimal
    source: str = "AUTOMATIC"
    # STS pairing
    paired_request_id: Optional[str] = None
    # Shifting suggestion (populated after allocation)
    shifting_from: Optional[str] = None   # berth_id
    shifting_to: Optional[str] = None     # berth_id


@dataclass
class ShiftingSuggestion:
    ship_id: str
    request_id: str
    from_berth_id: str
    to_berth_id: str
    reason: str


@dataclass
class ConstraintViolation:
    request_id: str
    rule: str
    message: str
    severity: str = "ERROR"   # ERROR | WARNING


# ── Primitive constraint functions ──────────────────────────────────────────

def loa_fits_length(ship: ShipData, berth: BerthData) -> bool:
    """LOA + 30 m safety margin must fit within berth length."""
    if berth.length <= 0:
        return True
    return ship.loa + LOA_SAFETY_MARGIN <= berth.length


def loa_within_max(ship: ShipData, berth: BerthData) -> bool:
    """Ship LOA must not exceed berth's declared max LOA."""
    if berth.max_loa <= 0:
        return True
    return ship.loa <= berth.max_loa


def cargo_allowed(request: RequestData, berth: BerthData) -> bool:
    """Cargo type must be in berth's allowed list (if list is configured)."""
    if not berth.allowed_cargo_ids:
        return True
    if not request.cargo_type_id:
        return True
    return request.cargo_type_id in berth.allowed_cargo_ids


def position_fits(ship: ShipData, berth: BerthData, pos_start: Decimal) -> bool:
    """Physical position end must stay within berth length."""
    pos_end = pos_start + ship.loa
    return pos_end <= berth.length


def neighbor_is_blocked(
    berth: BerthData,
    ship: ShipData,
    occupied_berth_ids: List[str],
) -> bool:
    for neighbor_id, restriction in berth.neighbor_map.items():
        if restriction == "FORBIDDEN" and neighbor_id in occupied_berth_ids:
            return True
    return False
