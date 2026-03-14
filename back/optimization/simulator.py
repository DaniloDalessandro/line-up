"""
Scenario Simulator — applies perturbations then runs the allocator.
"""
from __future__ import annotations
from decimal import Decimal
from datetime import timedelta
from typing import List, Dict, Any
from .constraints import RequestData, BerthData
from .berth_allocator import allocate_greedy


def apply_perturbation(
    requests: List[RequestData],
    perturbation: Dict[str, Any],
) -> List[RequestData]:
    """
    Supported perturbations:
      { "type": "delay_eta",  "request_id": "...", "hours": 6 }
      { "type": "rain",       "request_id": "...", "hours": 3 }
      { "type": "cancel",     "request_id": "..." }
    """
    from dataclasses import replace
    result = []
    for req in requests:
        if perturbation.get("request_id") == req.id:
            ptype = perturbation.get("type")
            if ptype == "delay_eta":
                req = replace(req, eta=req.eta + timedelta(hours=float(perturbation.get("hours", 0))))
            elif ptype == "rain":
                req = replace(req, rain_hours=req.rain_hours + Decimal(str(perturbation.get("hours", 0))))
            elif ptype == "cancel":
                continue
        result.append(req)
    return result


def simulate_scenario(
    requests: List[RequestData],
    berths: List[BerthData],
    perturbations: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Apply perturbations then run full allocator. Returns schedule + metrics."""
    perturbed = list(requests)
    for p in (perturbations or []):
        perturbed = apply_perturbation(perturbed, p)

    result = allocate_greedy(perturbed, berths)
    assignments = result["assignments"]

    total_wait = timedelta()
    for req in perturbed:
        a = next((x for x in assignments if x.request_id == req.id), None)
        if a:
            wait = a.start_time - req.eta
            if wait.total_seconds() > 0:
                total_wait += wait

    return {
        "assignments": assignments,
        "shiftings": result["shiftings"],
        "sts_pairs": result["sts_pairs"],
        "unassigned": result["unassigned"],
        "metrics": {
            "total_assignments": len(assignments),
            "total_wait_hours": round(total_wait.total_seconds() / 3600, 2),
            "unassigned_count": len(result["unassigned"]),
            "shifting_suggestions": len(result["shiftings"]),
        },
    }
