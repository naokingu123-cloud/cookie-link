# Gelato Prism v297 validation

## Native rules remain unchanged

The complete geometry, probability and engine region of `assets/gelato-prism-v28.js` remains byte-identical to main `e829acc`. Its SHA-256 is `56264afb1ae0b48c50e2eb6b917347d44ae753162a874c1916b807b85927331d`.

`tests/gelato-v297-rules.mjs` checks this source identity as well as the native 19 intersections, 42 segments, 24 elementary triangles, 21 patterns and 12 orientations. Every pattern retains eight aqua panels and four each of green, yellow, red and purple. The initial seeded state and all 27 random calls per new board retain a baseline fingerprint.

The count table and the four collector awards remain exact. A complete board pays 100× for 24 panels plus 1×, 3×, 5× and 10× for the four collectors, for 119× in total. Completion is not added twice. Checkpoints whose saved pattern predates payout version 232 continue to use their historical count table until the next reset. An eight-ball round resets all acquired panels and hits before the next game.

## Reachable presentation witnesses

`tests/gelato-v297-fixture.mjs` extracts the actual shipped engine. Three fixed constructor-seed and node-order replays produce the following four witnesses in 15 native draws. CPU fixture construction skips only the engine's presentation waits. It never assigns manufactured hits, filled panels or payouts.

| Witness | Constructor seed | Prior draws | Next draw | Result | Incremental multiplier |
| --- | --- | --- | --- | --- | --- |
| Panel award | 2977919 | 2, 6, 10 | 24 | 10 panels, no new collector | 0.2× |
| One collector | 2977919 | 2, 6, 8, 13 | 24 | 20 panels, green complete | 5.3× |
| Multiple collectors | 277 | 4, 11, 25, 7 | 8 | 20 panels, green and red complete | 10.3× |
| Complete prism | 2977919 | 2, 6, 8, 13, 24 | 23 | All 24 panels; yellow, red and purple newly complete | 113.7× |

The full-prism witness already earned 5.3× on its preceding ball. The last ball therefore awards 113.7×, yielding exactly 119× cumulatively. The art must show the current incremental amount and distinguish it from a round-total summary.

Fixture construction has a five-second wall-time bound and a fixed 15-draw scope. Restoring each generated checkpoint into a fresh native engine must reproduce the same complete native state, event and amount. Old-checkpoint continuations are also tested against the legacy table.

## Browser matrix

The browser harness runs only in remote GitHub Actions. A local invocation without `CI` or `GITHUB_ACTIONS` is rejected before any server or Chromium starts. Locally, use `--fixtures-only` or `--list-cases`.

| CI shard | Case | Viewport | BET | Scope |
| --- | --- | --- | --- | --- |
| panel | panel-desktop | 1366 × 900 | 3,000 | Main board and panel award |
| panel | panel-320 | 320 × 568 | 300,000 | Narrow phone and payout fitting |
| collector | collector-390 | 390 × 844 | 300,000 | One completed native color and Sugar badge |
| collector | collector-multiple-mini | 390 × 844 | 300,000 | Two new colors in the real mini-board while Canyon is selected |
| full | full-430 | 430 × 932 | 300,000 | Full prism and a 34,110,000 WIN incremental award |
| full | full-reduced | 430 × 932 | 300,000 | Full prism with reduced motion |

Each browser restores the genuine pre-draw checkpoint with its versioned native state and clicks the normal manual-number control. No browser clock, engine wait, settlement or award function is replaced. The lexical test bridge exists only in the isolated HTTP server; it is not shipped in production assets.

Canvas instrumentation traces decoded source pixels through `drawImage`, cached canvases and data URLs. The checks require the generated material and furniture sheets to reach both the actual main and mini Gelato canvases, and the new paytable furniture to reach the live DOM. All 19 current native numerals must be painted at their actual socket positions in both views. The original `assets/gelato-ice-candy-kingdom-v41.webp` background, selected by the existing v249 surface theme, remains in the computed scene styles.

The harness samples acquired and unacquired faces of the same native grade to check visible contrast. Each face uses seven 5 × 5 pixel patches at bounded interior barycentric points, away from sockets and rails, so a single dark spoon ridge cannot dominate the measurement. The acquired-minus-unacquired mean luminance must exceed 15 for every grade present in both states; per-patch and centroid measurements remain in the report. It checks all four collector labels, filled pieces, actual bitmap grade, completion state, and exact amount. Every count-payout row is compared with the native versioned table, and long amounts must fit the live payout bay.

For each illustrated award, the real native event must match the displayed mode, newly completed colors, panel identities, count and exact incremental amount. The glyph crops actually drawn from the new raster digit sheet must spell that amount followed by WIN. The full illustration must fit the canvas; the native Sugar receipt must retain its label and tier icon without covering the plaque. The duplicate native center flash is hidden while the illustrated cue owns that space. Reduced-motion awards retain zero shared particles.

Each case records board, award, overlay and settled screenshots plus native-event and actual-paint evidence in `qa-gelato-v297/report.json`. Passing the CPU checks does not imply the browser cases have passed; the Actions result and its artifacts are the browser evidence.

## Commands

```sh
node tests/gelato-v297-rules.mjs
node tests/gelato-v297-awards.mjs
node tests/gelato-v297-browser.mjs --fixtures-only
node tests/gelato-v297-browser.mjs --list-cases
```

`.github/workflows/gelato-v297.yml` runs the native and shared-release checks, then the three browser shards. Existing award and HIT contracts remain gates alongside the coherent offline download manifest and release version.
