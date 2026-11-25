# Waffle upgrade integration after payout fitting

## Scope

This integrates the Waffle artwork from PR #19, head
`20d6ddde343bddae8e6230195696259c2aeb6810`, onto main's payout-fit commit
`dbb7bfd1457995dcdefe90b3d9915fa9706ab2d3`.

The eight generated assets and their provenance, board materials, live payout
cabinet, eight pastry turn markers, native POW grade display, lesson, and FLIP /
REVERSAL BONUS artwork are carried forward. Real WIN uses the difference of
the two rounded cumulative native values, including zero and fractional carry.

The payout-fit helper remains loaded. Waffle's generated numbers use its bound
native `fitGoldenNumber`; the plain-text payout fitter remains available for
the fallback artwork. This prevents the generic fitter from resizing a wrapper
that already contains separately fitted native number spans. Waffle's amount
flex rule explicitly wins over the generic plain-text rule. Other games' payout
fitting and cache-busting query values are preserved.

Native core, host, RNG, payouts, the POW rule prefix, 64 positions, 13 payout rows,
and flip/knock/drop timing are unchanged.

## Verification of this integrated tree

- `node tests/waffle-v301-rules.mjs`: passed; seven histories, 56 native draws,
  132 openings, 1,204 payout previews, 56 saves, 49 wrapper reinstalls, 728 timing
  checks and 728 table checks.
- `node tests/waffle-v301-awards.mjs`: passed; 23 monetary cues, legitimate zero,
  low-BET carry and 900,600,000 WIN; immutable native snapshots.
- `node tests/award-presentation-v277.mjs`: passed; all ten games, unchanged
  state and payout, no game RNG calls, duplicate/restore suppression, and workers.
- `node tests/waffle-v301-render.mjs`: passed; 13 monetary composites, nine native
  boards, six pastry crops, 15 grade displays, 39 quotes and four lesson scenes.
- Syntax checks and `git diff --check`: passed.
- Current native Canvas contact sheets were visually inspected: full generated
  figures fit in the award artwork; black/white pastries and all numbered cells
  retain their layout.

Local Chromium 156 was invoked using the installed Playwright and `/usr/bin/chromium`.
It could not start because this execution environment rejects its process-singleton
socket (`socket() failed: Operation not permitted`). No browser assertion ran on
the integrated tree. No security setting was changed.

## Prior browser evidence, explicitly on the source branch

All 13 workflows passed on exact source head `20d6ddde`. The dedicated run
[45463369421](https://github.com/naokingu123-cloud/cookie-link/actions/runs/45463369421)
passed all eight scenarios in three groups. Its ordinary and reversal artifacts
were downloaded and visually reviewed during this integration: desktop, 390px
zero WIN, 320px 900,600,000 WIN, 430px reduced motion, and the unselected all-ten
miniature. Japanese text, full digits, all 13 payout rows and board positions
are visible. Those artifacts verify the source branch, not this merged tree.

## Release integration still required

Root owns the final combined build/version and offline inventory. This commit
does not change `app-version.json`, edition/download versions, service worker,
or `download-assets-v255.json`.

Keep the index's Waffle stylesheet and both early scripts, and await
`WaffleArtV301.ready` and `WaffleAwardV301.ready` before loading game extensions.
Ensure the updated bingo view, lesson, POW extension and shared award owner use
fresh query values. Include all new scripts, CSS, eight WebPs and provenance in
the final offline inventory with current sizes and SHA-256 hashes.

Run the dedicated Waffle browser workflow on the final combined tree and review
its actual screenshots before claiming the upgrade publicly complete.
