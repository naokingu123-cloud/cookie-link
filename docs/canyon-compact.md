# Compact chocolate terrain and brighter fantasy gems

2026-10-29 update, based on the user's Driller screenshot reference.

- Replaced the eight generated 256×256 WebP assets in `assets/canyon-geology/`:
  `cake-milk`, `cake-strawberry`, `cake-white`, `cake-bitter`, `ore-copper`,
  `ore-silver`, `ore-gold`, `ore-diamond`. They now use glossy rounded cartoon
  silhouettes, broad highlights and simple cream borders rather than realistic
  mineral clusters or ornate chocolate surfaces. Full built-in image_gen prompts:
  `canyon-compact-art-prompts.json`.
- Blue-grey exposed terrain contrasts with warm brown dark chocolate. Generated
  caramel edge highlights and lighter cocoa faces make the dark variant legible.
  The 47-state blob autotile renderer preserves merged outer contours, while
  sampling a plain part of the generated face avoids repeated ornate centres.
- Initial boards and refill rectangles are partitioned into compact 3–6-cell
  polyominoes: 35 rotations/reflections of I, L, O, T, S, compact P and 2×3 shapes.
  Backtracking rejects isolated 1–2-cell leftovers; a bounded fallback uses 3+4
  horizontal strips. Adjacent regions receive distinct colors where possible.
  Thin refills touching all four existing colors minimize boundary joins.
- Rewards replace only a non-articulation cell of a region of at least four cells,
  at most one per region. Thus a reward cannot create a 1–2-cell cake fragment.
  Shapes may grow after gameplay mergers, as required by the existing rules.
- Scrolling starts on the same immediate-empty-row event as before, but uses
  quintic easing with zero velocity/acceleration at both ends. Duration scales
  with distance (505–1100ms), including simultaneous collection/melting stages.
  Active animation rendering uses a 15ms gate instead of 32ms (~60 instead of
  ~30 frames/s on a 60Hz display), respecting pause/reduced motion.
- Strata powers, drill numbers, lucky effects, ore value ranges, singleton sugar,
  odds-up scope, instant four-cell melt and cart order remain unchanged.

## Verification

`canyon_shapes.cjs` checks 1,000 boards, IDs and generated refill shapes. All
21,574 initial cake components are 3–6 cells; none are 1–2 or above six.
`canyon_rules.cjs` retains the 80 seeded complete games and rule fixtures.
`canyon_drill_browser.py` checks five viewports, images/materials, all autotiles,
crack/melt frames, cart, sugar, sound cancellation and 101 scroll-easing samples.
Shared Six Drop/browser regressions passed; host code outside Canyon is unchanged.

Compact partitioning changes excavation reach and valid reward placement frequency.
Spawn rates were adjusted to retain approximately the previous direct-ore return
and sugar/odds frequency; individual ore payout values did not change. A separate
20,000-game sample returned 87.669% in direct ore value (sugar/JPC excluded), with
0.06025 sugar and 0.0767 odds-up per game. This is a simulation estimate, not a
per-game payout guarantee. Machine-readable results: `canyon-compact-verification.json`.
Physical iPhone hardware and speaker listening were not tested.
