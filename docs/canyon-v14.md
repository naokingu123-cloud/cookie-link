# Canyon v14: readable gem cakes, counters, continuous cave walls

Six generated square cake faces replace the former fine layered jewel decoration. Each has one large jewel, two gold chocolate leaves, broad gem-coloured ganache and a single cocoa crumb body. Gem autotiles blend only the outer nine sprite pixels to a shared edge profile, avoiding the previous wide repeated vertical-column sample that made horizontal stripes. Ordinary cake autotiles are unchanged. Assets: `assets/canyon-cakes/{sapphire,emerald,topaz,ruby,amethyst,diamond}.webp` (256×256). Built-in image generation was used, followed by downsampling for the existing sprite pipeline.

## Generation prompt

For each gem use its corresponding blue/green/amber/red/violet/pale-cyan colour:

> Square game texture asset, GEM luxury chocolate cake, readable at 35 pixels square. Straight-on flat orthographic face completely filling square edge to edge, no perspective, no background, no text. Match warm hand-painted confectionery game material. Upper 30 percent thick glossy COLOUR chocolate ganache with broad rounded downward drips. Lower 70 percent one uninterrupted dark cocoa chocolate cake crumb surface, moist rich softly mottled texture. ONE large simple faceted COLOUR edible jewel centered in upper half, surrounded by only two broad golden chocolate leaves. Luxury conveyed by broad gloss, rich chocolate and large jewel, not fine detail. NO horizontal cream stripes, NO stacked layers, NO thin bands, NO filigree, NO rows of tiny jewels. Left and right edges same chocolate material for horizontal autotiling. Square filled texture, not a standalone cake object.

## Presentation

Board depth and tab depth share an animated seven-segment counter (650ms easing, reset-safe). Logical depth is unchanged. Wall images are pre-baked into periodic textures with a broad smooth seam crossfade; no upside-down reflected scenery. Ground remains fixed. Depth colour transitions still affect both wall and ground every 100m. Wall travel uses a 65ms frame-time-dependent filter across animation-stage boundaries; rendering no longer discards high-refresh-rate animation frames. Texture and mask caches are bounded per viewport.

## Economy

Clear rate .0012 → .002, random-three-section rate .0018 → .003 per eligible candidate; region/cell eligibility remains unchanged. These are candidate probabilities, not final observed tile proportions. Ore candidate rates and the per-round-depth rarity curve are multiplied by .56; the copper/silver/gold/diamond payout ranges, odds-up, transmutation and absolute-depth bonus amounts remain unchanged.

Measurement: `.github/tests/canyon_rtp.cjs` runs production plans with eight uniformly sampled distinct numbers, resets to 0m after no payout, continues cumulative depth after positive payout, and generates fresh next-round terrain. It includes ore values, odds-up, power items and cumulative milestone bonuses. It measures direct Canyon payout at constant BET; shared Sugar/JPC payouts and deliberate number selection are outside this estimate. Individual rounds and conditional high-depth returns are not constrained to 90%.

Final validation: 50,000 games, draw seed 174913, direct payout **88.6406%**, including milestone-bonus contribution **6.964 percentage points**; winning rounds 73.294%, maximum naturally reached depth 423m. This is a finite-sample estimate near the requested 90%, not a per-game guarantee. The 500–1200m bonus amounts are covered separately by deterministic rule tests, rather than claiming those rare depths occurred in this sample. Before tuning, 10,000 games returned 151.913%. With increased power-item rates and ore factor .57, a 50,000-game trial returned 91.251%; final ore factor is .56.

Validation also passed: 80-game rule regression, 1,000-board compact shapes, five browser viewports, 1,024 normal autotiles, 12 gem edge pairs, ten ground-theme transitions, fixed floor and periodic wall continuity, seven-segment depth count/reset, manual eight-number queue/reset, and shared host-game browser regression. No physical iPhone or speaker listening test.

Milestone cake rows show a single centred `BONUS n WIN` overlay. BONUS uses a gold gloss gradient with a dark embossed outline; WIN uses the existing payout typography and current BET conversion. It follows the complete row during falling/refill/scroll and disappears when the cake melts. The isolated tutorial uses the same renderer. Tests verify 3× and 300× conversions.
