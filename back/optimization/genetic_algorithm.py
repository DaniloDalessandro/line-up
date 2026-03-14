"""
Genetic Algorithm — optimises berth assignment over multiple generations.

Chromosome: list of (request_index, berth_index) — one gene per request.
Fitness:    total_wait_hours + w_violation * hard_violations + w_preference * soft_violations
"""
from __future__ import annotations
import random
from copy import deepcopy
from decimal import Decimal
from datetime import timedelta
from typing import List, Tuple, Dict, Any

import numpy as np

from .constraints import Assignment, BerthData, RequestData
from .rules_engine import validate_assignment, is_feasible, preference_penalty
from .berth_allocator import operation_duration, EPOCH

Gene = Tuple[int, int]
Chromosome = List[Gene]


# ── Decode ────────────────────────────────────────────────────────────────────

def decode_chromosome(
    chromosome: Chromosome,
    requests: List[RequestData],
    berths: List[BerthData],
) -> List[Assignment]:
    """Decode chromosome into assignments using greedy time-slot filling."""
    import datetime as dt
    berth_free: Dict[int, dt.datetime] = {i: EPOCH for i in range(len(berths))}
    assignments: List[Assignment] = []

    for req_idx, berth_idx in chromosome:
        if req_idx >= len(requests) or berth_idx >= len(berths):
            continue
        req = requests[req_idx]
        berth = berths[berth_idx]
        dur = operation_duration(req)
        start = max(berth_free[berth_idx], req.eta)
        end = start + dur

        from .rules_engine import _find_free_position
        pos = _find_free_position(berth, req.ship.loa, start, end, assignments) or Decimal("0")

        assignments.append(Assignment(
            request_id=req.id,
            berth_id=berth.id,
            ship_id=req.ship.id,
            start_time=start,
            end_time=end,
            position_start=pos,
            position_end=pos + req.ship.loa,
            source="AUTOMATIC",
        ))
        berth_free[berth_idx] = end
    return assignments


# ── Fitness ───────────────────────────────────────────────────────────────────

def fitness(
    chromosome: Chromosome,
    requests: List[RequestData],
    berths: List[BerthData],
    w_wait: float = 1.0,
    w_hard: float = 20.0,
    w_soft: float = 3.0,
    w_idle: float = 0.2,
) -> float:
    """Lower = better."""
    assignments = decode_chromosome(chromosome, requests, berths)

    total_wait = 0.0
    hard_violations = 0
    soft_violations = 0

    for req_idx, berth_idx in chromosome:
        if req_idx >= len(requests) or berth_idx >= len(berths):
            continue
        req = requests[req_idx]
        berth = berths[berth_idx]
        a = next((x for x in assignments if x.request_id == req.id), None)
        if a is None:
            hard_violations += 1
            continue

        viols = validate_assignment(req, berth, a.start_time, a.end_time, [
            x for x in assignments if x.request_id != req.id
        ])
        hard_violations += sum(1 for v in viols if v.severity == "ERROR")
        soft_violations += preference_penalty(viols)

        wait_h = max(0.0, (a.start_time - req.eta).total_seconds() / 3600)
        total_wait += wait_h

    # Idle time across berths
    if assignments:
        t_span = (max(a.end_time for a in assignments) - min(a.start_time for a in assignments)).total_seconds() / 3600
        max_possible = t_span * len(berths)
        used = sum((a.end_time - a.start_time).total_seconds() / 3600 for a in assignments)
        idle = max(0.0, max_possible - used)
    else:
        idle = 0.0

    return w_wait * total_wait + w_hard * hard_violations + w_soft * soft_violations + w_idle * idle


# ── GA Operators ──────────────────────────────────────────────────────────────

def random_chromosome(n_requests: int, n_berths: int) -> Chromosome:
    return [(i, random.randint(0, n_berths - 1)) for i in range(n_requests)]


def tournament_select(population: List[Chromosome], fitnesses: np.ndarray, k: int = 3) -> Chromosome:
    idx = random.sample(range(len(population)), k)
    best = min(idx, key=lambda i: fitnesses[i])
    return deepcopy(population[best])


def crossover(p1: Chromosome, p2: Chromosome) -> Tuple[Chromosome, Chromosome]:
    if len(p1) < 2:
        return deepcopy(p1), deepcopy(p2)
    pt = random.randint(1, len(p1) - 1)
    return p1[:pt] + p2[pt:], p2[:pt] + p1[pt:]


def mutate(chrom: Chromosome, n_berths: int, rate: float = 0.1) -> Chromosome:
    result = deepcopy(chrom)
    for i in range(len(result)):
        if random.random() < rate:
            result[i] = (result[i][0], random.randint(0, n_berths - 1))
    return result


# ── Main GA ───────────────────────────────────────────────────────────────────

def run_genetic_algorithm(
    requests: List[RequestData],
    berths: List[BerthData],
    population_size: int = 60,
    generations: int = 120,
    mutation_rate: float = 0.12,
    crossover_rate: float = 0.8,
    elite_size: int = 6,
) -> Dict[str, Any]:
    if not requests or not berths:
        return {"assignments": [], "shiftings": [], "sts_pairs": [],
                "unassigned": [], "fitness": 0.0, "generations": 0, "history": []}

    n_req, n_berths = len(requests), len(berths)

    # Seed with greedy solution
    from .berth_allocator import allocate_greedy
    greedy_result = allocate_greedy(requests, berths)
    greedy_assignments = greedy_result["assignments"]

    berth_id_to_idx = {b.id: i for i, b in enumerate(berths)}
    req_id_to_idx = {r.id: i for i, r in enumerate(requests)}

    greedy_chrom: Chromosome = []
    assigned_ids = set()
    for a in greedy_assignments:
        ri = req_id_to_idx.get(a.request_id)
        bi = berth_id_to_idx.get(a.berth_id, 0)
        if ri is not None:
            greedy_chrom.append((ri, bi))
            assigned_ids.add(a.request_id)
    for i, r in enumerate(requests):
        if r.id not in assigned_ids:
            greedy_chrom.append((i, 0))

    population: List[Chromosome] = [greedy_chrom] + [
        random_chromosome(n_req, n_berths) for _ in range(population_size - 1)
    ]

    best_chrom = greedy_chrom
    best_fit = float("inf")
    history: List[float] = []

    for gen in range(generations):
        fits = np.array([fitness(c, requests, berths) for c in population])
        gen_best_idx = int(np.argmin(fits))
        gen_best_fit = float(fits[gen_best_idx])
        history.append(gen_best_fit)

        if gen_best_fit < best_fit:
            best_fit = gen_best_fit
            best_chrom = deepcopy(population[gen_best_idx])

        elites = [deepcopy(population[i]) for i in np.argsort(fits)[:elite_size]]
        new_pop: List[Chromosome] = elites

        while len(new_pop) < population_size:
            p1 = tournament_select(population, fits)
            p2 = tournament_select(population, fits)
            c1, c2 = crossover(p1, p2) if random.random() < crossover_rate else (deepcopy(p1), deepcopy(p2))
            new_pop.append(mutate(c1, n_berths, mutation_rate))
            if len(new_pop) < population_size:
                new_pop.append(mutate(c2, n_berths, mutation_rate))

        population = new_pop

    best_assignments = decode_chromosome(best_chrom, requests, berths)

    # Combine with greedy metadata (shiftings, sts_pairs)
    return {
        "assignments": best_assignments,
        "shiftings": greedy_result.get("shiftings", []),
        "sts_pairs": greedy_result.get("sts_pairs", []),
        "unassigned": greedy_result.get("unassigned", []),
        "fitness": best_fit,
        "generations": generations,
        "history": history,
    }
