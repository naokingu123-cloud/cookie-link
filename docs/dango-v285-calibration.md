# Dango v285: numbered +FREE and exact AUTO calibration

Revision 285 starts with **one placement FREE**. Three of the 25 numbered cells carry the temporary cyan `+FREE` effect. Each distinct cyan number hit during balls 1–5 adds one placement FREE, so thinking begins with 1–4 placements. The cyan effect expires immediately after ball five. Completing a line no longer adds FREE.

The three initial green FREE cells remain. A yellow placement on one of those green cells raises ODDS by one; a later numbered HIT on a placed yellow FREE also raises ODDS by one. Ordinary HITs, completed lines, and cyan awards do not raise ODDS. A cyan cell can become a normal yellow placement after its cyan effect has expired, and that yellow cell then follows the usual numbered-HIT odds rule.

The full previous revision 268 implementation is unchanged and exported as `legacy268`. Explicit historical revision requests continue through the same dispatch chain. Unsupported creation revisions retain the previous `RangeError`; saved older states retain their existing engines.

## Payouts and the 50–150% control

The new placement budget changes the game substantially, so the old calibration constants could not be reused. With the old payout table, the three old layouts returned 77.866990820%, 140.139059094%, and 130.319774656% under the new AUTO mechanics. A bounded search of 20 additional legal layouts did not produce a layout below 50%. Revision 285 therefore adjusts ordinary payouts and recalibrates the initial-layout mixture.

The payout table is fixed across payout settings. Values below are multiples of BET before the current ODDS multiplier:

| Line length | 1 completed | 2 completed | 3 completed |
| --- | ---: | ---: | ---: |
| 2 | 0 | 0.1 | 5 |
| 3 | 0.1 | 0.4 | 10 |
| 4 | 0.2 | 0.6 | 25 |
| 5 | 0.4 | 1.5 | 50 |
| 6 | 0.8 | **30** | 250 |
| 7 | 1 | **50** | — |

The 30× and 50× awards for two six-cell and two seven-cell lines remain. The unreachable seven-cell triple keeps its historical numeric entry internally for table compatibility, but revision 285 marks its row `possible:false`, displays a dash, and excludes it from highest-role detection. Historical revision 268 still uses its original table and permits its original seven-cell triple.

All three production initial layouts are legal: none starts with a completed line or three consecutive green FREE along a skewer. Number shuffling, number draws, the cyan count, the uniform cyan selection algorithm, and the payout table remain independent of the payout setting. The setting changes only the mixture of initial green layouts.

| Initial green cell IDs | AUTO expected return |
| --- | ---: |
| `[0,21,27]` | 39.067151894027326% |
| `[1,20,22]` | 312.2316124762269% |
| `[3,4,10]` | 70.29560335506808% |

The third layout has a fixed 1.5% probability. The other two probabilities are chosen to make their weighted AUTO expectation equal the requested setting:

| Setting | `[0,21,27]` | `[1,20,22]` | `[3,4,10]` | AUTO expectation |
| --- | ---: | ---: | ---: | ---: |
| 50% | 94.669186390% | 3.830813610% | 1.5% | 50% |
| 75% | 85.517190575% | 12.982809425% | 1.5% | 75% |
| 90% | 80.025993086% | 18.474006914% | 1.5% | 90% |
| 100% | 76.365194760% | 22.134805240% | 1.5% | 100% |
| 125% | 67.213198945% | 31.286801055% | 1.5% | 125% |
| 150% | 58.061203131% | 40.438796869% | 1.5% | 150% |

The displayed mixture probabilities above are rounded. The report contains exact rational identities for all 101 integer settings from 50 through 150; runtime weights use JavaScript doubles. Fractional settings are also supported.

### Scope of the percentages

These are **AUTO expectations**, using the existing sequential placement policy: each FREE maximizes the exact conditional expected payout of the resulting board, and ties choose the lowest cell ID. The policy never consults the last three numbers. It is not claimed to be the globally optimal multi-placement strategy. Other manual placement choices can produce different returns.

The calculation uses payout in hundredths of BET, excluding Sugar. All revision 285 awards are multiples of 0.1 BET, so the existing whole-medal conversion introduces no rounding loss when BET is a multiple of 10, including BET 10, 100, and 3000. At other BET values, the existing `floor(BET * totalHundredths / 100)` settlement can reduce the actual paid return. No correction for those small-BET rounding losses is claimed. An exact expectation also does not guarantee a particular short session's outcome.

## Exact enumeration

For each of the three initial layouts, the evaluator enumerates all `C(25,5) = 53,130` possible early HIT sets. For each early set it computes sequential AUTO placements for budgets 1, 2, 3, and 4. The conditional payout for each placement integrates all `C(20,3) = 1,140` possible late HIT sets using integer inclusion/exclusion over completed line unions, including both sources of ODDS.

Because cyan cells are a uniform triplet among the 25 numbered cells, their count among any fixed early set has this distribution:

| Cyan HITs in the first five | Placement budget | Triplet count | Probability |
| --- | ---: | ---: | ---: |
| 0 | 1 | 1,140 | 49.5652173913% |
| 1 | 2 | 950 | 41.3043478261% |
| 2 | 3 | 200 | 8.6956521739% |
| 3 | 4 | 10 | 0.4347826087% |

The denominator is `C(25,3) = 2,300`, and the mean budget is 1.6. Cyan identities have no further function after thinking starts, so weighting the four budget-specific expectations is sufficient. The full expectation denominator per layout is:

`53,130 × 1,140 × 2,300 = 139,306,860,000`.

The three exact payout numerators are `5,442,322,259,500`, `43,496,005,526,800`, and `9,792,659,775,200`. Dividing each by that denominator yields its expected return percentage. These are exact integer calculations under the stated uniform-draw model, so a Monte Carlo confidence interval is not applicable.

## Reachability

The minimum numbers of distinct marked cells needed for one, two, and three equal-length lines are:

| Length | One line | Two lines | Three lines |
| --- | ---: | ---: | ---: |
| 2 | 2 | 4 | 6 |
| 3 | 3 | 6 | 9 |
| 4 | 4 | 7 | 9 |
| 5 | 5 | 9 | 13 |
| 6 | 6 | 11 | 15 |
| 7 | 7 | 13 | 18 |

Revision 285 can mark at most `3 initial + 8 HIT + 4 placed = 15` distinct cells. Thus a seven-cell triple is impossible. A direct legal-round test constructs all other 17 line/count combinations using production layouts, including five-cell triples and six-cell triples. In particular:

- **Five-cell triple:** initial `[3,4,10]`; early HIT cells `[11,12,13,14,5]`; yellow placements `[8,17,23,3]`; late HIT cells `[7,18,25]`.
- **Six-cell triple:** initial `[1,20,22]`; early HIT cells `[15,16,17,18,19]`; yellow placements `[2,4,7,11]`; late HIT cells `[8,13,26]`.

In both examples, set the cyan triplet to the first three listed early HIT cells. All three are hit before thinking, yielding the required four yellow placements. These are existence proofs of legal play, not promises that AUTO selects those placements.

## Evidence and reproduction

The final machine-readable report is `docs/dango-v285-calibration.json`. Its raw final profiles are `docs/qa-v285/dango-final-profiles.json`. The separate `dango-exact-profiles.json` and `dango-layout-search.json` files in that QA directory are preliminary diagnostics using the old payout table; their status is identified in the final report.

`tests/dango-v285-calibration.mjs` checks all 101 exact rational mixture identities, four fractional settings, all 84 recorded AUTO vectors, and 153 independently counted sets of 1,140 late outcomes: 174,420 direct final-outcome checks. The direct checker counts final lines and ODDS without reusing the runtime inclusion/exclusion formula. `tests/dango-v285-rules.mjs` verifies the new FREE/ODDS conditions, cyan expiry, legal role routes, deterministic target-independent cyan sampling, and historical/unknown revision routing.

```sh
g++ -O3 -std=c++20 scripts/dango-v285-enumerate.cpp -o /tmp/dango-v285-enumerate
/tmp/dango-v285-enumerate > /tmp/dango-v285-fresh.json
node tests/dango-v285-calibration.mjs /tmp/dango-v285-fresh.json
node tests/dango-v285-rules.mjs
```

The C++ evaluator reuses the older standalone integer geometry and scoring helpers, then replaces its payout table and placement-budget enumeration. It does not import the JavaScript runtime. The report records hashes of both C++ sources and the final JavaScript source. `scripts/dango-v285-report.mjs` rebuilds the report from the stored final profiles and current runtime constants.
