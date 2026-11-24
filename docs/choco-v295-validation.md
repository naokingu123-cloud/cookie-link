# Choco Canyon v295: rules and bounded validation

Only Choco Canyon changes in this release. New worlds use revision 9 and six native fruit identities. Explicit stored revision 7/8 worlds retain their former schema, random sequence, grouping and payout semantics.

## Rules and event contract

- Adjacent same-color cake cells join orthogonally across their original section IDs. The connected group falls rigidly, and contact supports the whole group.
- A gravity-triggered group clears only after landing and only with at least four cells. Groups of one to three persist. A static group of four or more does not clear merely because it exists.
- A broken cake shell retains the fruit's identity and exact value until it is actually collected or ranked up. Earlier visual/checkpoint snapshots retain their captured identity after a later rank-up.
- Revision 9 `canyonMelt` identifies `cause: 'drill' | 'power' | 'gravity'`. Only gravity carries `chainIndex`, starting at 1 for each resolved ball. `drill:false` alone is not evidence of a gravity chain.
- Revision 9 `canyonBonus` includes sorted unique `bonusDepths`, the highest actual `bonusDepth`, its `bonusIndex` (depth/100), and canonical `bonusKind`. These describe awarded milestone layers, not the camera's eventual depth. A power that destroys a milestone without a bonus cannot create an award event.
- Coalesced falls preserve shared travel capped by each tile's landing distance. Revision 9 also exposes `motionContacts: [{distance, ids}]`. Revision 7/8 traced records do not gain new fields.

## Final six-tier parameters

Values below are hundredths of BET (100 = 1×BET). These are permitted tier ranges, not uniform distributions. Base rates are generation parameters; depth adjustments, placement and collection affect observed frequency. The existing drill-material upgrade ladder remains separate.

| Tier | Native key | Value range | Step | Base fruit rate |
|---|---|---:|---:|---:|
| りんご | `apple` | 10–100 | 10 | .09000 |
| みかん | `mandarin` | 20–200 | 10 | .03800 |
| レモン | `lemon` | 50–500 | 10 | .01200 |
| ブルーベリー | `blueberry` | 100–1,000 | 50 | .00400 |
| ぶどう | `grape` | 200–2,000 | 50 | .00045 |
| メロン | `melon` | 500–10,000 | 100 | .00010 |

Revision 9 multiplies the existing economy profile's within-tier value power by 1.5. This changes only the reward-value quantile; it consumes no extra random values and leaves fruit identities, placement and geometry unchanged. Legacy revisions retain their original power and mineral distributions. Sugar, odds, clear, random-clear and transmute base-rate parameters are unchanged.

## Earlier raw-core calibration (not the served runtime)

The following earlier comparison used 12,000 rounds, seed 619218 and target setting 90, before the browser-only source loader was included in the fixture. It is retained solely as the historical basis for the value-power choice. It does **not** describe the final served runtime: that loader defers scrolling until settlement and changes refill seam connections. Each round selected eight distinct numbers uniformly from 1–25, using a draw RNG independent of board RNG. The same cohort was used for the power adjustment; it is a calibration comparison, not an independent confirmation or an exact RTP guarantee.

| Variant | Direct return / BET | Approximate block 95% interval | Milestone bonus contribution | Winning rounds | Sugar items / round |
|---|---:|---:|---:|---:|---:|
| Published v8 reference | 82.2850% | 78.75–85.82% | 21.4250 points | 94.4083% | .06950 |
| Six-tier v9, original value power | 88.2325% | 84.50–91.97% | 17.7083 points | 88.5417% | .10758 |
| Final v9, value power ×1.5 | **84.6458%** | **80.99–88.30%** | **17.7083 points** | **88.5417%** | **.10758** |

The final value adjustment reduced the measured direct-return difference from +5.9475 to +2.3608 percentage points relative to v8. The two v9 runs had identical collected fruit counts, initial inventories, fall/merge counts, maximum depth, winning-round count, bonus contribution and Sugar count. Collected fruit mix was approximately 62.03% apple, 26.22% mandarin, 8.44% lemon, 2.90% blueberry, .33% grape and .08% melon.

**Scope and limits of that earlier calibration:** direct return includes fruit and milestone bonuses. Shared Sugar Challenge/JPC payouts are excluded. Sugar occurrence increased from 834 to 1,291 items in this raw-core cohort even though its base-rate parameter did not change. The maximum observed depth was 618 m for v8 and 655 m for v9. The served-runtime comparison below supersedes these figures as release evidence. No parameters were retuned after that final production check.

## Final served-runtime comparison

The final bounded pair uses the exact Canyon core extracted from the browser bundle **after** the real `CookieUpgradePatch.patch` loader, including scroll deferral and the existing limited refill-seam connection algorithm. The historical reference uses both the v294 bundle and its v294 loader from commit `423787724ff00ab4e06040b205ef08a968b86907`. Each run uses 12,000 rounds, seed 619218, target setting 90, independent uniform eight-of-25 draws and native depth continuation.

| Served runtime | Direct return / BET | Approximate block 95% interval | Milestone bonus contribution | Winning rounds | Sugar items / round |
|---|---:|---:|---:|---:|---:|
| Published v294, revision 8 | 79.1200% | 76.06–82.18% | 17.9500 points | 94.5750% | .06275 |
| Final v295, revision 9 | 80.2500% | 77.87–82.63% | 12.1417 points | 88.8583% | .09325 |

The measured direct-return difference is +1.1300 percentage points. Sugar occurrence changes from 753 to 1,119 items; its eventual shared Sugar Challenge/JPC value remains excluded. These finite direct-return samples are not total-system RTP, are not an exact 90% guarantee, and do not establish a statistically resolved long-run difference. Intervals use sixty 200-round block means. Maximum observed depth was 620 m for v8 and 544 m for v9.

Served-core SHA256 values are `280b5852d0bd0b3a48e1254ed98895fd3ea8bed623446e46769a485e99dbbee7` (v294) and `6e019603006ec9fbb79f18629d3660c297ddd43f6e223c8c76f1d0b04a3478b4` (v295). The loader's shared base-Engine edits affect Cookie methods that Canyon overrides or does not use; native replay parity additionally checks this boundary.

The production sampler is reproducible with:

```sh
node tests/choco-v295-sample.mjs --rounds 12000 --seed 619218 --target 90
```

The default sampler uses the served post-loader core. For a historical comparison, apply that commit's loader to its own `optimized/app-01.js`, extract the Canyon rules block before `const chocoSprites=`, and supply that local file with `--source`. Supplying an unpatched standalone source intentionally measures raw rules only and does not reproduce the published browser runtime.

## Focused verification

```sh
node --check assets/choco-dig.js
node tests/choco-v295-rules.mjs
node tests/choco-v295-runtime-patch.mjs
node tests/choco-v295-recording.mjs
node tests/choco-v288-gravity-fruit.mjs
node tests/choco-v289-bundle.mjs
```

The v295 rules test covers orthogonal/diagonal contacts, rigid support and overhang, early landing and later side contact with actual intermediate positions, retained sizes 1–3, landed 4+, no midair clearing, cascades, encased collection, exact tier distributions/rank-up, frozen fruit identity, authoritative event metadata, immutable caller grids, and native asynchronous engine completion. It also checks 80 deterministic v9 worlds and six fixed full-world/full-trace revision 7/8 golden replays. Traced and untraced plans produce identical state, RNG and reward results.

The recording test uses the actual `recorded-round-v255.js` and `server-offline-settlement-worker-v3.js` restore functions. Each resumes six native remaining balls from explicit revision 7, 8 and 9 checkpoints (six consumer/revision cases), preserving frozen checkpoint data and exact final state/payout. The checked generic recording, download-worker, server-offline, server-core and download-ledger paths do not use a Canyon-world version allowlist. Their envelope version 255 is a separate contract and remains unchanged.

The retained v288 test continues exercising explicit historical 7/8 physics; only its renderer-threshold assertion now uses the stable fruit revision 8. The v289 workflow entry point checks the current standalone and browser Canyon block for full parity after normalizing only three deliberately externalized legacy image declarations, validates those media files, parses both scripts, and checks native 9 plus explicit 7/8 compatibility. This gate requires the production bundle to be synchronized after renderer changes.

Browser screenshots, public asset delivery and deployment are separate release gates; the engine results above do not substitute for them.

## Continuation fixes

- The real chunked main/tab reach predictor now forwards `rulesRevision` explicitly instead of confusing the saved world's `version` field with planner options. Forty-eight actual predictions across revisions 7, 8 and 9 match native plans without changing the world or RNG.
- The three scroll-deferral source substitutions now apply atomically. The new declaration had prevented just the initializer from matching, leaving an undeclared `scrollDeferred` and stopping the first browser draw. Refill seam patches also accept revision-aware grouping while retaining their existing probability and two-connection cap.
- Award diagnostics expose the native draw number, allowing browser witnesses to associate a visible popup with the actual triggering draw. Canyon errors now retain their cause in the existing status text.
- Browser fixture generation and the sampler use the transformed production core; historical raw golden cases remain explicitly raw. No fixture replaces a browser result or payout.
- The short 320px phone case exposed collapsed manual-number rows and a history label intercepting the last row. The manual grid now retains its row height inside a scrollable panel, preserving the cabinet geometry and real native clicks. The browser gate verifies a usable row height.
- A real Sugar receipt could cover the simultaneous depth illustration. During an active loaded Canyon award, the existing Sugar receipt becomes a compact top-right crown and SUGAR GET badge, retaining its native earned tier, accessible label, timing and audio. Browser evidence checks its visible bounds against the painted Canyon plaque. The award-wait failure path also retains click diagnostics without an unhandled rejected promise.

The historical `canyon-autotile-v276.mjs --source-only` fallback-art test fails its vertical-join assertion (material 0, neighbourhood 8, x=4, delta=13) on the unchanged v294 HEAD as well as v295. That pre-existing fallback result is not included as a new v295 release gate. The new generated cake adapter was separately rendered at native resolution; all four materials had zero RGBA difference at their straight joined edges. The optional v295 art hook now also resolves safely when an independent Node painter has no `window` object.
