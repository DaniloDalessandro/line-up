"""
Rules Engine — validates a proposed berth assignment against all operational rules.
Returns a list of ConstraintViolation. Caller checks is_feasible().
"""
from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import List
from .constraints import (
    Assignment, BerthData, RequestData,
    ConstraintViolation,
    loa_fits_length, loa_within_max, cargo_allowed,
    neighbor_is_blocked,
    BOW_MARGIN, STERN_MARGIN, LOA_SAFETY_MARGIN,
)


def _windows_overlap(s1: datetime, e1: datetime, s2: datetime, e2: datetime) -> bool:
    """True if two time windows overlap (exclusive end)."""
    return s1 < e2 and s2 < e1


def _find_free_position(
    berth: BerthData,
    ship_loa: Decimal,
    start_time: datetime,
    end_time: datetime,
    existing: List[Assignment],
) -> Decimal | None:
    """
    Find first available position_start on the quay for the given time window.
    Physical rules:
      - Ship bow must be >= BOW_MARGIN (15 m) from berth start
      - Ship stern must be <= berth.length - STERN_MARGIN (15 m)
      - Gap between adjacent ships: BOW_MARGIN + STERN_MARGIN = 30 m
    Returns None if no space available.
    """
    SHIP_GAP = BOW_MARGIN + STERN_MARGIN  # 30 m between two ships
    needed = ship_loa

    occupying = [
        a for a in existing
        if a.berth_id == berth.id
        and _windows_overlap(start_time, end_time, a.start_time, a.end_time)
    ]

    if not occupying:
        # Must fit: BOW_MARGIN + LOA + STERN_MARGIN <= berth.length
        if BOW_MARGIN + needed + STERN_MARGIN <= berth.length:
            return BOW_MARGIN
        return None

    occupying.sort(key=lambda a: a.position_start)

    # Slot before first ship: start at BOW_MARGIN
    candidate = BOW_MARGIN
    if candidate + needed + SHIP_GAP <= occupying[0].position_start:
        return candidate

    # Slots between consecutive ships
    for i in range(len(occupying) - 1):
        candidate = occupying[i].position_end + SHIP_GAP
        if candidate + needed + SHIP_GAP <= occupying[i + 1].position_start:
            return candidate

    # Slot after last ship
    candidate = occupying[-1].position_end + SHIP_GAP
    if candidate + needed + STERN_MARGIN <= berth.length:
        return candidate

    return None


def validate_assignment(
    request: RequestData,
    berth: BerthData,
    start_time: datetime,
    end_time: datetime,
    existing_assignments: List[Assignment],
) -> List[ConstraintViolation]:
    violations: List[ConstraintViolation] = []

    # Rule 1 — Berth active
    if not berth.active:
        violations.append(ConstraintViolation(
            request_id=request.id,
            rule="BERTH_INACTIVE",
            message=f"Berço {berth.number} está inativo",
        ))

    # Rule 2 — LOA + 30 m safety margin vs berth length
    if not loa_fits_length(request.ship, berth):
        violations.append(ConstraintViolation(
            request_id=request.id,
            rule="LOA_LENGTH",
            message=(
                f"LOA {request.ship.loa}m + 15m proa + 15m popa = "
                f"{request.ship.loa + LOA_SAFETY_MARGIN}m > comprimento {berth.length}m"
            ),
        ))

    # Rule 3 — LOA vs berth max_loa
    if not loa_within_max(request.ship, berth):
        violations.append(ConstraintViolation(
            request_id=request.id,
            rule="LOA_MAX",
            message=(
                f"LOA {request.ship.loa}m excede LOA máximo do berço {berth.max_loa}m"
            ),
        ))

    # Rule 4 — Cargo compatibility
    if not cargo_allowed(request, berth):
        violations.append(ConstraintViolation(
            request_id=request.id,
            rule="CARGO_NOT_ALLOWED",
            message=(
                f"Tipo de carga não permitido no berço {berth.number}"
            ),
        ))

    # Rule 5 — Physical space availability on quay
    free_pos = _find_free_position(
        berth, request.ship.loa, start_time, end_time, existing_assignments
    )
    if free_pos is None:
        violations.append(ConstraintViolation(
            request_id=request.id,
            rule="NO_SPACE",
            message=f"Sem espaço físico disponível no berço {berth.number} no período",
        ))

    # Rule 6 — Neighbor berth conflict (BLOCKS)
    occupied_berth_ids = list({a.berth_id for a in existing_assignments
                               if _windows_overlap(start_time, end_time, a.start_time, a.end_time)})
    if neighbor_is_blocked(berth, request.ship, occupied_berth_ids):
        violations.append(ConstraintViolation(
            request_id=request.id,
            rule="NEIGHBOR_CONFLICT",
            message=f"Berço vizinho bloqueado pela restrição operacional",
        ))

    # Rule 6b — Neighbor DISTANCE warning (soft constraint)
    for neighbor_id, restriction in berth.neighbor_map.items():
        if restriction == "DISTANCE" and neighbor_id in occupied_berth_ids:
            min_dist = berth.neighbor_min_distances.get(neighbor_id, Decimal("0"))
            violations.append(ConstraintViolation(
                request_id=request.id,
                rule="NEIGHBOR_DISTANCE",
                message=(
                    f"Berço vizinho requer distância mínima de {min_dist}m — verificar posicionamento"
                ),
                severity="WARNING",
            ))

    # Rule 7 — Client preference (WARNING only — soft constraint)
    if request.preferred_berth_ids and berth.id not in request.preferred_berth_ids:
        violations.append(ConstraintViolation(
            request_id=request.id,
            rule="CLIENT_PREFERENCE",
            message=(
                f"Berço {berth.number} não é preferencial do cliente {request.client_name}"
            ),
            severity="WARNING",
        ))

    return violations


def is_feasible(violations: List[ConstraintViolation]) -> bool:
    """No ERROR-level violations = feasible."""
    return all(v.severity != "ERROR" for v in violations)


def preference_penalty(violations: List[ConstraintViolation]) -> int:
    """Count WARNING violations (used as soft penalty in scoring)."""
    return sum(1 for v in violations if v.severity == "WARNING")
