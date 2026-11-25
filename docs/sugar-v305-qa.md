# Sugar v305 artwork and acceptance QA

The new crystal bottle, scale, cabinet, furniture, workshop background and two outcome illustrations remain presentation assets. Current and saved Sugar rules, server/local ownership, the six original opaque multiplier cards and the six approved transparent multiplier emblems are unchanged. The native render gate protects their exact SHA-256 values.

## Independent fixes

- The original furniture extraction left nonzero alpha in every pixel. It produced visible rectangular haze even after tight runtime cropping on a dark background. A second built-in `image_gen` background extraction produces genuine clear margins and gutters. The production WebP is 1152 × 768, 226,318 bytes. Its source, prompt, hashes and rejected prior extraction remain in `assets/sugar-art-v305/generation-provenance.json`; provenance uses portable basenames. No alpha was manually painted or thresholded away.
- The digit atlas does not place every glyph strictly within mathematical thirds. The bottom tip of `0` reaches y=342, so cutting at y=341 truncated it and inserted a small fragment above `4`. The production helper now uses measured clear gutters y=350 and y=690 in the original 1536 × 1024 source. Each crop is bounded within those gutters; 0–9, comma and WIN were visually reviewed after the correction.
- A successful generated number hides both the original `.gold-number` child and plain-text fallback color/shadow. The number remains in the DOM for accessibility and fallback semantics; absent artwork never adds the raster class. Animated bottle sum, scale count-up and JP header keep their existing number path.
- Existing multiplier tests recognize v305 without dropping their exact original artwork hashes, no-plate checks, reel/timing assertions, legacy rule checks, base/multiplier separation or wallet assertions. The original Sugar panel browser test waits for the actual active revision's entrance animation and verifies its exact expected JPC source.

## Local verified evidence

Run from the repository root:

```sh
node tests/sugar-v305-render.mjs
node tests/sugar-v270-presentation.mjs
node tests/sugar-v271-rules.mjs
node tests/sugar-challenge-v254-ledger.mjs
```

All passed. Changed JavaScript syntax, workflow YAML and `git diff --check` also passed.

`tests/sugar-v305-render.mjs` uses `@napi-rs/canvas` 0.1.100. It executes the production crop, live amount and DOM-raster helpers. It checks all eight asset provenance hashes, genuine transparent corners, twelve complete glyph crops, zero/ordinary/nine-digit/maximum-safe values, generated WIN, and amount bounds. Rule-derived JPC previews retain the unmultiplied base and place the original transparent multiplier separately. Native cash previews render the accepted 999,999,900 payout.

The exact shipped acceptance function is also exercised with real rules: cached fake `phase`/`cashWin` fields are rederived, incomplete states cannot award cash, duplicate snapshots do not replay, stale revisions and shorter same-ID histories are rejected, JPC remains cash-zero, and native wallet/BET/draw fields remain unchanged. The generated raster cache remains capped at 128 entries; 1,000 warmed repaints and 1,000 remount hits allocate no new canvas or pixel readback and consume no RNG.

The original transparent PNGs carry caBX/C2PA ancillary metadata that this native Canvas build rejects. The test strips only that ancillary chunk from its in-memory decoder input, retaining original image-data chunks verbatim. Repository images and all their hashes remain untouched; Chrome receives the original files. This is a native decoder compatibility measure, not alternate artwork.

Locally produced, visually reviewed files under `qa-sugar-v305/`:

- `native-assets-dark.png`
- `native-furniture-dark.png`
- `native-glyphs-dark.png`
- `native-money-dark.png`
- `native-awards-dark.png`
- `native-render-report.json`

These are actual Canvas material/amount previews composited on dark plum, **not browser screenshots**. The local managed environment blocks Chromium's singleton socket. No security change or repeated browser launch was attempted. The server browser fixture also requires the repository `ws` dependency; it is installed by CI.

## Required browser gate

`.github/workflows/sugar-v305.yml` installs existing dependencies plus ephemeral `@napi-rs/canvas@0.1.100`, uses the runner's installed Chrome and Japanese fonts, and uploads artifact `qa-sugar-v305` even after a test failure. It runs native rendering, existing rules/ledger/server guards, the new browser test and the retained transparent multiplier browser test.

```sh
node tests/sugar-v305-browser.mjs
node tests/sugar-v279-browser.mjs
node tests/sugar-challenge-v254-browser.mjs
```

The new browser test uses the real isolated `createUiFixture` and rule-derived snapshots. At widths 320, 390 and 430 it checks actual main/intro art, all six live payout rows, nonempty raster ink inside its physical cells, a nine-digit payout, JPC base/multiplier separation, exact accepted cash, minimize/dock/reopen, pause, duplicate suppression including after expiry, and native wallet/BET/draw state preservation. Original multiplier/reel paths and timings are asserted. It captures main, intro, dock, JPC, cash and all six multiplier screenshots.

**Completion requires the combined-tree browser runs and visual inspection of their screenshots.** In particular, inspect compact cabinet header alignment, clear outer furniture alpha, amount legibility, the full JPC multiplier, and the absence of overlap with history/controls. This patch intentionally does not claim browser CSS success before those artifacts exist.

### First combined-tree Chrome result and correction

At PR head `54f23fdd48df14adcbfd29a6ea1ba2d95120251e`, workflow run `45532806936` passed the new 320/390/430 browser step, including nine-digit payouts, JPC/cash amounts, original multipliers, dock, pause and unchanged native state. Run `45532806722` passed the retained transparent multiplier suite, rules/migration and recorded download/offline-resume settlement.

The original panel browser suite retained its stricter horizontal-overflow check and found the generated JP decoration extended a 420px header to 426px, while the cabinet extended its 147px table to 150px. The exact excess matched their new `:before` negative horizontal insets: 6px and 3px. The correction gives both decorative backgrounds zero horizontal inset inside their existing owners, including the mobile override. Vertical positioning, original table geometry, amounts and rules stay unchanged. The same strict overflow assertion is now included in the new width suite. This CSS correction requires a fresh combined-tree Chrome run; the first head's success does not verify the correction.

## Integration requirements

The parent integration owns build/cache revisions and the offline asset manifest. Rebuild the manifest after this commit, because the furniture WebP and its provenance changed. Preserve all eight `sugar-art-v305` assets, the existing six v270 cards and six v279 transparent emblems, both new helper scripts, the new presentation CSS, and the current view script. Await both helper `ready` promises before mounting the view, as the v305 loader already does.
