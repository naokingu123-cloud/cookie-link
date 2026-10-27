# Six Drop: fixed positions and miss refill

Number-bearing starting cells are a fixed, left-right symmetric 25-cell mask in rows 6–10. Values 1–25 are shuffled across this mask. Surviving numbered drops move with gravity. Newly added drops receive as many missing undrawn labels as their available slots allow, excluding already drawn numbers and labels still on the board. The fixed symmetric mask applies to new-round starting boards.

For each incoming batch (3, 2, 1, 1, 1 draws), record which numbers were absent before processing. Resolve hits and all cascades first. If any number was absent and no role advanced the round, refill only top-accessible empty cells up to the original ten-row height. Existing drops block entry into internal gaps; these gaps remain empty. The resulting board may therefore contain fewer than 75 drops. A round advance instead creates its new starting board. Filling itself awards no payout and triggers no cascade.

Refill coloring uses bounded backtracking. In rare impossible remnants it changes a surviving color while preserving identity, number and sugar; a proper lattice coloring is the final fallback. The result must have no connected group of four or more. Existing labels are never duplicated. The 1,400 ms top-up animation is protected from presentation fast-forward and reset cancels it.

Clear bonuses: R1 0.2×, R2 0.4×, R3 1.0×, R4 3.0×, R5 10.0×. Role payouts remain line 0.1×, triangle 0.3×, hexagon 0.5×; all-clear remains 100×. Minimum payout increment remains 0.1×.

Initial-board coloring now favors a less adjacent color on 37.5% of placement choices. This is a fixed generation parameter, not player-dependent or outcome-dependent adjustment. The 12% chance-round selection is unchanged.

The 18-second demonstration uses the actual 5/4/5 miniature rules: ordinary connected clearing followed by an absent 25 and top-entry refill with undrawn labels (6 seconds), then line, triangle and hexagon (4 seconds each). It does not consume gameplay random numbers. A persistent note explains that a number absent from the board triggers a refill, including undrawn numbered drops. The refill uses its own descending shower sound.

Validation: symmetric mask and cascade-free top-refill and retained internal-gap checks; preserved tile IDs, labels and sugar; unique labels/IDs; production forecasts; miss/refill and reset tests; main/mini demo isolation; responsive browser checks and public-site auto-BET start.

RTP methodology: seeded Monte Carlo of all eight unique draws, matching batch processing, chance-round choice, sugar placement RNG, round transitions and miss refill. It includes role, round-clear and all-clear payouts, but excludes the separate JPC value and medal rounding. `node .github/tests/six_payout_sample.cjs 10000 882731` reproduces the independent final validation sample. Results are estimates, not an exact mathematical 90% guarantee.

Historical validation of the earlier full-gap-fill rule: 10,000 games, seed 882731, estimated return **89.994%** (approximate 95% interval 87.44%–92.55%). Roles contributed 27.152 percentage points and round bonuses 62.842 points; no all-clear occurred in this sample. There were 3,823 top-ups; four required recoloring. The calibration sample used a different seed (91237), 5,000 games and returned 87.904%.

Sparkles are captured once before draws 1, 4, 5, 6, 7 and 8 (draw counts 0, 3, 4, 5, 6 and 7 on a settled board). Their tile IDs are separate from paid-reach predictions and survive incoming balls and reach invalidation. They include drops that trigger a clearing chain. At the next scheduled capture they are recomputed; removed drops do not transfer their sparkle to replacements. Paid reach remains restricted to after draws 2, 4, 5, 6, 7 and 8.

Current top-entry validation: 10,000 games with seed 882731 returned **91.509%**, approximate 95% interval 87.33%–95.68%, including three all-clear awards. There were 3,212 refill attempts and no recoloring repairs. The earlier 89.994% result applies to the superseded full-gap-fill rule. The fixed color-spread parameter remains 0.375; the new estimate is consistent with the 90% target within sampling error.
