# Party Castella copper bakery v303

Dedicated generated raster art now supplies the 61-hole and saved 37-hole griddles, empty/raw/baked castella wells, injection/fire/sugar tokens, nozzle-aligned dispenser, phase and power plaques, payout cabinet, and BAKE COMPLETE / ALL BAKED illustrations. Seven original imagegen assets are recorded with prompts, source hashes and shipped WebP hashes in `assets/castella-art-v303/generation-provenance.json`.

## Native behavior preserved

`party-castella-rules.js` and `party-castella-host.js` are unchanged. The existing cell coordinates, native passages, heat regions, fill waves, nozzle trajectory, 1,500 ms animation, gauges, 61/37-hole compatibility and payout calculations still own all play. Every number and WIN is live. The new award snapshot is frozen at the existing settled eighth-ball event, so restore/repaint cannot invent a receipt. Only source registration and cached layers are added; repeated painting performs no image readback or canvas allocation.

The existing v301 payout fitting is retained. A stronger Castella-scoped skin is necessary because older arcade/cartoon styles use important backgrounds; it replaces those obsolete opaque backgrounds with the actual generated furniture while leaving native row measurements intact.

## Verification

- `node tests/castella-v250-rules.mjs`: passed; 720 native replays, 41,040 forecasts, full-bake witness and legacy replay.
- `node tests/castella-v250-checkpoint.mjs`: passed; eighth-ball restore, Sugar collection and one-award guards.
- `node tests/award-presentation-v277.mjs`: passed; all ten game observer forwarding, native state and payout preservation, zero gameplay RNG, duplicate/restore suppression.
- `node tests/castella-v303-render.mjs`: passed; eight native board/geometry/material cases, six monetary artwork cases including 60,000,000 WIN, main/mini, reduced motion and legacy 37. Output: `qa-castella-v303-render/` (not committed).
- `node tests/castella-v303-browser.mjs`: current-tree browser gate with 320/390/430 layouts, source provenance, live eight-ball full-bake sequence, native final receipt, mini award, ordinary reduced-motion settlement and legacy renderer. Workflow: `.github/workflows/castella-v303.yml`.

The local executor cannot launch Chromium because its process singleton socket is denied. This is not counted as a browser pass. Native Canvas images also expose the pre-existing Skia parsing limitation for legacy 1000-weight HIT labels; production fonts are deliberately unchanged, and those later-board captures are not presented as browser evidence. The initial board and both dedicated awards were visually reviewed. Current-tree Chrome CI and its screenshots must be reviewed before release.

## Final integration

Load `castella-art-v303.js` and `castella-award-v303.js` before composing the private app and await both ready promises. Include `castella-skin-v303.css`; request `party-castella.js`, `castella-lesson.js` and the shared award owner at a fresh query version. The integrating release must refresh the app/edition/offline versions and cache manifest. No version/cache globals are changed by this scoped commit.
