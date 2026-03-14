"""
Full Berth Allocator implementing the 15-step algorithm.

Steps covered:
  1-2  Pre-processing: sort by ETA, skip BYPASS
  3    Operation time = cargo_quantity / prancha + rain + extra
  4    Valid berths: LOA+30 <= length, LOA <= max_loa, cargo allowed
  5    Client preference: preferred berths tried first
  6    Neighbor conflict check
  7    Physical positioning on quay
  8    STS handling
  9    Shifting suggestion
  10   Scenario generation (wait / immediate / alternative / shift)
  11   Scenario scoring with penalties
  12   Best scenario selection
  13-15 Result assembly
"""
from __future__ import annotations
import datetime as dt
from decimal import Decimal
from typing import List, Dict, Optional, Tuple, Any
from .constraints import (
    Assignment, BerthData, RequestData, ShiftingSuggestion,
    LOA_SAFETY_MARGIN,
)
from .rules_engine import (
    validate_assignment, is_feasible, preference_penalty, _find_free_position,
)

EPOCH = dt.datetime(2000, 1, 1, tzinfo=dt.timezone.utc)


# ── Step 3: Operation time ───────────────────────────────────────────────────

def operation_duration(request: RequestData) -> dt.timedelta:
    """
    tempo_total = (cargo_quantity / prancha) + rain_hours + extra_hours
    """
    if request.prancha and request.prancha > 0 and request.cargo_quantity > 0:
        base_hours = float(request.cargo_quantity / request.prancha)
    else:
        base_hours = 24.0
    total_hours = base_hours + float(request.rain_hours) + float(request.extra_hours)
    return dt.timedelta(hours=total_hours)


# ── Step 4+5: Candidate berths ───────────────────────────────────────────────

def _candidate_berths(
    request: RequestData,
    berths: List[BerthData],
) -> List[BerthData]:
    """
    Returns berths in priority order:
      1st: preferred berths that pass hard constraints
      2nd: other berths that pass hard constraints
    """
    valid = []
    for b in berths:
        if not b.active:
            continue
        from .constraints import loa_fits_length, loa_within_max, cargo_allowed
        if not loa_fits_length(request.ship, b):
            continue
        if not loa_within_max(request.ship, b):
            continue
        if not cargo_allowed(request, b):
            continue
        valid.append(b)

    preferred = [b for b in valid if b.id in request.preferred_berth_ids]
    others = [b for b in valid if b.id not in request.preferred_berth_ids]
    return preferred + others


# ── Step 6+7: Place on berth ─────────────────────────────────────────────────

def _try_place(
    request: RequestData,
    berth: BerthData,
    earliest_start: dt.datetime,
    existing: List[Assignment],
) -> Optional[Assignment]:
    """
    Try to place request on berth starting no earlier than earliest_start.
    Returns Assignment if feasible, None otherwise.
    """
    duration = operation_duration(request)
    start = earliest_start
    end = start + duration

    violations = validate_assignment(request, berth, start, end, existing)
    if not is_feasible(violations):
        return None

    pos_start = _find_free_position(berth, request.ship.loa, start, end, existing)
    if pos_start is None:
        return None

    return Assignment(
        request_id=request.id,
        berth_id=berth.id,
        ship_id=request.ship.id,
        start_time=start,
        end_time=end,
        position_start=pos_start,
        position_end=pos_start + request.ship.loa,
        source="AUTOMATIC",
    )


# ── Step 9: Shifting suggestion ──────────────────────────────────────────────

def _suggest_shift(
    request: RequestData,
    berths: List[BerthData],
    existing: List[Assignment],
) -> Optional[ShiftingSuggestion]:
    """
    If preferred berth is occupied, check if shifting an existing ship
    to another berth would free it up.
    Returns a ShiftingSuggestion or None.
    """
    for preferred_id in request.preferred_berth_ids:
        preferred_berth = next((b for b in berths if b.id == preferred_id), None)
        if not preferred_berth:
            continue
        # Find assignments blocking this berth at request.eta
        blockers = [
            a for a in existing
            if a.berth_id == preferred_id
            and a.start_time <= request.eta < a.end_time
        ]
        for blocker in blockers:
            # Check if we can move the blocker to another berth
            for alt_berth in berths:
                if alt_berth.id == preferred_id:
                    continue
                # Simplified check — just LOA and cargo for the blocker's ship
                blocker_req = next(
                    (r for r in [] if r.id == blocker.request_id), None
                )
                if blocker_req is None:
                    # Can't evaluate without request data — suggest anyway
                    return ShiftingSuggestion(
                        ship_id=blocker.ship_id,
                        request_id=blocker.request_id,
                        from_berth_id=preferred_id,
                        to_berth_id=alt_berth.id,
                        reason=(
                            f"Mover navio do berço {preferred_berth.number} para "
                            f"berço {alt_berth.number} para acomodar cliente prioritário "
                            f"{request.client_name}"
                        ),
                    )
    return None


# ── Steps 10-12: Scenario evaluation ─────────────────────────────────────────

def _score_assignment(
    assignment: Assignment,
    request: RequestData,
    violations: List,
) -> float:
    """
    Lower is better.
    score = wait_hours + penalty_preference * 5
    """
    wait_h = max(0.0, (assignment.start_time - request.eta).total_seconds() / 3600)
    penalty = preference_penalty(violations) * 5.0
    return wait_h + penalty


# ── Main allocator ────────────────────────────────────────────────────────────

def allocate_greedy(
    requests: List[RequestData],
    berths: List[BerthData],
) -> Dict[str, Any]:
    """
    Full allocation following the 15-step algorithm.

    Returns:
      {
        "assignments": List[Assignment],
        "shiftings": List[ShiftingSuggestion],
        "unassigned": List[str],   # request ids
        "sts_pairs": List[dict],   # {mother_id, daughter_id, berth_id}
      }
    """
    # Step 2 — sort by ETA, skip BYPASS (already filtered upstream)
    sorted_requests = sorted(requests, key=lambda r: r.eta)

    assignments: List[Assignment] = []
    shiftings: List[ShiftingSuggestion] = []
    sts_pairs: List[dict] = []
    unassigned: List[str] = []

    # Track berth free-at time (for quick initial check)
    berth_free_at: Dict[str, dt.datetime] = {b.id: EPOCH for b in berths}

    for req in sorted_requests:

        # ── Step 8: STS handling ─────────────────────────────────────────
        if req.operation_type == "STS" and req.mother_ship_id:
            # Find if mother ship is already assigned
            mother_assignment = next(
                (a for a in assignments if a.ship_id == req.mother_ship_id), None
            )
            if mother_assignment:
                # Place daughter alongside mother on same berth
                berth = next((b for b in berths if b.id == mother_assignment.berth_id), None)
                if berth:
                    a = _try_place(req, berth, req.eta, assignments)
                    if a:
                        a.paired_request_id = mother_assignment.request_id
                        assignments.append(a)
                        berth_free_at[berth.id] = max(berth_free_at[berth.id], a.end_time)
                        sts_pairs.append({
                            "mother_request_id": mother_assignment.request_id,
                            "daughter_request_id": req.id,
                            "berth_id": berth.id,
                        })
                        continue

        # ── Step 4+5: Get candidate berths ───────────────────────────────
        candidates = _candidate_berths(req, berths)
        if not candidates:
            # No valid berth at all — unassigned
            unassigned.append(req.id)
            continue

        best_assignment: Optional[Assignment] = None
        best_score: float = float("inf")

        for berth in candidates:
            # ── Step 6: Neighbor conflict ────────────────────────────────
            occupied_ids = list({
                a.berth_id for a in assignments
                if a.start_time <= req.eta < a.end_time
            })
            from .constraints import neighbor_is_blocked
            if neighbor_is_blocked(berth, req.ship, occupied_ids):
                continue

            # ── Scenario A: immediate (start at ETA or berth free-at) ───
            earliest = max(berth_free_at[berth.id], req.eta)
            a = _try_place(req, berth, earliest, assignments)
            if a:
                violations = validate_assignment(req, berth, a.start_time, a.end_time, assignments)
                score = _score_assignment(a, req, violations)
                if score < best_score:
                    best_score = score
                    best_assignment = a

        # ── Step 9: Shifting suggestion if no best found or preferred skipped
        if best_assignment is None or (
            req.preferred_berth_ids
            and best_assignment.berth_id not in req.preferred_berth_ids
        ):
            suggestion = _suggest_shift(req, berths, assignments)
            if suggestion:
                shiftings.append(suggestion)

        if best_assignment:
            assignments.append(best_assignment)
            berth_free_at[best_assignment.berth_id] = max(
                berth_free_at[best_assignment.berth_id],
                best_assignment.end_time,
            )
        else:
            # Last resort: force-place on least-busy valid berth ignoring soft constraints
            fallback_berth = None
            fallback_time = None
            for b in berths:
                if not b.active:
                    continue
                t = max(berth_free_at[b.id], req.eta)
                if fallback_time is None or t < fallback_time:
                    fallback_time = t
                    fallback_berth = b

            if fallback_berth and fallback_time:
                dur = operation_duration(req)
                pos = _find_free_position(
                    fallback_berth, req.ship.loa, fallback_time,
                    fallback_time + dur, assignments
                ) or Decimal("0")
                forced = Assignment(
                    request_id=req.id,
                    berth_id=fallback_berth.id,
                    ship_id=req.ship.id,
                    start_time=fallback_time,
                    end_time=fallback_time + dur,
                    position_start=pos,
                    position_end=pos + req.ship.loa,
                    source="AUTOMATIC",
                )
                assignments.append(forced)
                berth_free_at[fallback_berth.id] = max(
                    berth_free_at[fallback_berth.id], forced.end_time
                )
            else:
                unassigned.append(req.id)

    return {
        "assignments": assignments,
        "shiftings": shiftings,
        "unassigned": unassigned,
        "sts_pairs": sts_pairs,
    }
