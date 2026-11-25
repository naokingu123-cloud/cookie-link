# Payout fitting follow-up

This addresses concrete failures observed on main
`dbb7bfd1457995dcdefe90b3d9915fa9706ab2d3`. No rule, payout, random source, game
clock, browser timeout, build version, or offline manifest is changed.

## Integration and isolated Dango checks

Cookie, Choco, Gelato and celebration contract jobs stopped in
`tests/v290-themed-effects.mjs` because it required the obsolete literal
`dango-bingo-view.js?v=290`. The test now requires one exact named script with
an explicit numeric cache revision. All theme, near-white FREE, source and
offline hash assertions remain.

The isolated Dango page did not load the production `paytable-fit-v301.css`.
It combined the new centered transform with the old right-anchor CSS, then
asserted right alignment. The page now loads that production stylesheet and
checks the centered bay, horizontal and vertical containment, every value
against the native payout table, available row-height readability, and caption
separation. Existing cell, hit, FREE, reach, color and geometry checks remain.

## Browser failures and layout work

The downloaded main celebration artifact from run
[45526027463](https://github.com/naokingu123-cloud/cookie-link/actions/runs/45526027463)
shows Winery still in `wineryPour` when its 30-second award watcher expired.
It contains no page error or missing asset; the expected award had not yet
been emitted. This is not reclassified as an assertion-only failure.

The v301 change read each Winery row's height after writing the previous row's
amount. Geometry is now read as one batch before any live label changes.
The unchanged native HUD function is exercised with a layout-invalidating DOM
witness: the previous source forces 13 layout flushes; this source forces one,
while preserving all 12 exact interpolated native amounts and per-row fit sizes.
Final browser CI must determine whether this removes the observed delay.

Six Drop similarly appends all five rows for a role, reads their dimensions,
then fits the labels. Its layout witness improves from 17 flushes to three
across all 15 rows and preserves native cumulative quotes and row classes.
Unchanged updates remain cached. The witness uses actual extracted production
functions and was verified to reject the pre-fix versions.

The failing Six Drop artifact from run
[45526027880](https://github.com/naokingu123-cloud/cookie-link/actions/runs/45526027880)
contained screenshots through ball seven but no JSON report. Its all-clear
capture promise rejected before it was awaited, terminating Node early. The
promise now owns that rejection immediately and rethrows at the same assertion
boundary, allowing normal failure diagnostics and artifact writing. The same
45-second timeout and native all-clear/source/WIN assertions are retained.
The celebration diagnostic now records native phase time, pause state, speed
and effect progress to distinguish future delays from missing emissions.

Main playfield run `45526027824` passed all three widths (320/390/430px), so its
assertions are unchanged.

## Validation and release work

- `node tests/payout-fit-v302-layout.mjs`: passed; native values, 12/15 rows,
  per-row sizes, state preservation and unchanged-update caches verified.
- Negative controls against pre-fix production source failed with 13 Winery
  and 17 Six Drop layout flushes, as expected.
- Winery payout rule checks and the shared ten-game award-owner tests passed.
- Changed JavaScript syntax, workflow YAML and diff whitespace checks passed.
- The new layout witness is included in both relevant dedicated workflows.

Local Chromium remains unavailable because the environment rejects its
process-singleton socket. Run the Dango display, Winery, shared celebration,
Six Drop and width browser gates on the final combined feature branch. Review
the actual new artifacts; older screenshots do not verify this tree.

Root must update cache revisions for the changed Winery and Six Drop scripts
and regenerate the final offline manifest before running full release integrity
checks. No final browser or publication success is asserted here.
