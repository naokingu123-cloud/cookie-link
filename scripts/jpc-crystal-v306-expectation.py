#!/usr/bin/env python3
"""Crystal JPC: unlimited-horizon moments for independent uniform pockets.

Python standard library only. No game state, files outside --out, or simulator
settings are changed. --check verifies the checked-in design evidence quickly.
See docs/jpc-crystal-v306.md for the probability-generating-function derivation.
"""

import argparse
import itertools
import json
import math
from pathlib import Path


RULES = {
    "version": 306,
    "pocketCount": 25,
    "initialBalls": 30,
    "jpPocket": 1,
    "bonusPockets": [6, 11, 16, 21],
    "bonuses": [1, 1, 4, 8],
    "payouts": [0, 1, 2, 3, 4, 6, 8, 10, 15],
    "jpThreshold": 5,
    "jpMultiplierStep": 5,
    "referenceJP": 500,
    "hasDrawLimit": False,
}
BOOSTS = tuple(RULES["bonuses"])
ORIGINAL_BOOSTS = (3, 3, 5, 10)
PAY = tuple(RULES["payouts"])
EVIDENCE = Path(__file__).resolve().parents[1] / "docs/jpc-crystal-v306-math.json"


def mul(a, b, degree):
    """Multiply Taylor polynomials, retaining only the required coefficients."""
    out = [0.0] * (degree + 1)
    for i in range(min(len(a), degree + 1)):
        for j in range(min(len(b), degree + 1 - i)):
            out[i + j] += a[i] * b[j]
    return out


def power(a, exponent, degree):
    out = [1.0] + [0.0] * degree
    while exponent:
        if exponent & 1:
            out = mul(out, a, degree)
        exponent //= 2
        if exponent:
            a = mul(a, a, degree)
    return out


def pgf_coefficients(boosts, unmarked_zero_pockets, degree):
    """Coefficients of F(z)**30, F=(unmarked+z+sum(F**b))/25.

    Fixed-point iteration starts at the zero polynomial and takes the smallest
    nonnegative solution. The tolerance is a numerical convergence tolerance;
    degree truncation does not truncate the number of draws in a play.
    """
    f = [0.0] * (degree + 1)
    for _ in range(10000):
        nxt = [0.0] * (degree + 1)
        nxt[0] = unmarked_zero_pockets / 25
        if degree:
            nxt[1] = 1 / 25
        for b in boosts:
            term = power(f, b, degree)
            for j in range(degree + 1):
                nxt[j] += term[j] / 25
        error = max(abs(a - b) for a, b in zip(nxt, f))
        f = nxt
        if error < 2e-17:
            return power(f, RULES["initialBalls"], degree)
    raise RuntimeError("PGF coefficient iteration did not converge")


def exact(boosts):
    """Expected payout to floating-point precision, with no draw/JP limit."""
    if len(boosts) != 4 or any(not isinstance(b, int) or b < 0 for b in boosts):
        raise ValueError("exactly four nonnegative integer bonuses are required")
    if sum(boosts) >= 25:
        raise ValueError("the offspring mean must be below one")
    initial = RULES["initialBalls"]
    threshold = RULES["jpThreshold"]
    jp_multiplier = RULES["jpMultiplierStep"]
    cap = len(PAY) - 1
    deficits = [PAY[-1] - value for value in PAY[:-1]]
    p = pgf_coefficients(boosts, 20, cap)
    q = pgf_coefficients(boosts, 19, cap + threshold - 2)
    mean_j = initial / (25 - sum(boosts))
    mean_g = PAY[-1] - sum(d * p[h] for h, d in enumerate(deficits))
    mean_gj = PAY[-1] * mean_j - sum(
        d * (h + 1) * p[h + 1] for h, d in enumerate(deficits)
    )
    # Above the threshold f(J)=5*(J-4). Correct its low-J values to 1.
    payout_per_normal = jp_multiplier * (mean_gj - (threshold - 1) * mean_g)
    no_jp_base_per_normal = 0.0
    for j in range(threshold):
        gj = PAY[-1] * p[j] - sum(
            d * math.comb(h + j, h) * q[h + j] for h, d in enumerate(deficits)
        )
        payout_per_normal += (1 - jp_multiplier * (j - threshold + 1)) * gj
        no_jp_base_per_normal += gj
    jp_probability = 1 - sum(p[:threshold])
    total = 20 * payout_per_normal
    no_jp_component = 20 * no_jp_base_per_normal
    off_mean = sum(boosts) / 25
    off_var = sum(b * b for b in boosts) / 25 - off_mean**2
    return {
        "boosts": list(boosts),
        "expected_payout": total,
        "jp_probability": jp_probability,
        "expected_base": 20 * mean_g,
        "mean_balls": 25 * mean_j,
        "sd_balls": math.sqrt(initial * off_var / (1 - off_mean)**3),
        "mean_jp_hits": mean_j,
        "conditional_jp_payout": (total - no_jp_component) / jp_probability,
        "conditional_no_jp_payout": no_jp_component / (1 - jp_probability),
        "jp_ev_component": total - no_jp_component,
        "no_jp_ev_component": no_jp_component,
    }


def direct_zero_bonus_payout():
    """Independent control: exactly 30 draws, direct multinomial summation."""
    n = RULES["initialBalls"]
    total = 0.0
    for h in range(n + 1):
        for j in range(n - h + 1):
            probability = (
                math.comb(n, h) * math.comb(n - h, j)
                * 0.04**(h + j) * 0.92**(n - h - j)
            )
            total += 20 * PAY[min(h, 8)] * (1 if j < 5 else 5 * (j - 4)) * probability
    return total


def check(report):
    """Fast deterministic check; the five-million-play simulation is separate."""
    selected = report["selected"]
    original = report["original"]
    zero = exact((0, 0, 0, 0))["expected_payout"]
    direct_zero = direct_zero_bonus_payout()
    for actual, expected, label in (
        (selected["expected_payout"], 251.70108590454686, "selected EV"),
        (original["expected_payout"], 5675.653254726682, "original EV"),
        (zero, direct_zero, "zero-bonus multinomial control"),
    ):
        if not math.isclose(actual, expected, rel_tol=0, abs_tol=1e-7):
            raise AssertionError(f"{label}: {actual} != {expected}")
    saved = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    if saved["rules"] != RULES:
        raise AssertionError("saved rules differ from the model configuration")
    for name in ("selected", "original"):
        for key, actual in report[name].items():
            expected = saved[name][key]
            if isinstance(actual, list):
                matches = actual == expected
            else:
                matches = math.isclose(actual, expected, rel_tol=0, abs_tol=1e-7)
            if not matches:
                raise AssertionError(f"saved {name}.{key} differs: {actual} != {expected}")
    simulation = saved["monte_carlo"]["selected"]
    lo, hi = simulation["ci95"]
    if simulation["runs"] != 5_000_000 or simulation["boosts"] != list(BOOSTS):
        raise AssertionError("saved simulation uses a different trial/configuration")
    if not lo <= selected["expected_payout"] <= hi:
        raise AssertionError("the exact expectation lies outside the saved simulation CI")
    return {
        "ok": True,
        "selected_expected_payout": selected["expected_payout"],
        "original_expected_payout": original["expected_payout"],
        "zero_bonus_expected_payout": zero,
        "zero_bonus_direct_multinomial": direct_zero,
        "zero_bonus_absolute_error": abs(zero - direct_zero),
        "saved_rules_and_statistics_match": True,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify model and saved evidence")
    parser.add_argument("--scan", action="store_true", help="compare all positive bonuses 1..10")
    parser.add_argument("--out", type=Path, help="also write the JSON statistics to this path")
    args = parser.parse_args()
    if args.check and args.scan:
        parser.error("--check and --scan are separate operations")
    report = {
        "rules": RULES,
        "assumption": "Independent draws; each of 25 pockets has probability 1/25.",
        "selected": exact(BOOSTS),
        "original": exact(ORIGINAL_BOOSTS),
    }
    if args.check:
        report = check(report)
    elif args.scan:
        candidates = [
            exact(b) for b in itertools.combinations_with_replacement(range(1, 11), 4)
            if sum(b) < 25
        ]
        candidates.sort(key=lambda item: abs(item["expected_payout"] - 250))
        report["search"] = {
            "candidate_count": len(candidates),
            "bonus_range": [1, 10],
            "bonus_sum_strictly_below": 25,
            "closest": candidates[:12],
        }
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        args.out.write_text(output, encoding="utf-8")
    print(output, end="")


if __name__ == "__main__":
    main()
