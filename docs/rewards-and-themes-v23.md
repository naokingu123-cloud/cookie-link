# Rewards and game themes v23

- Exposed ore/sugar is eligible for immediate collection, without waiting for its own fall. Existing clear-column-above eligibility is retained.
- Acquired WIN remains at its confirmed amount during the 2s TOTAL transfer, then becomes zero in one step. Concurrent arrivals retarget while counting and wait during fixed/transfer phases. Bonus cakes still pay directly to TOTAL.
- Per-mineral rarity uses hundredths: copper 30 / 100, silver 70 / 500, gold 400 / 2000, diamond 1500 / 10000 (rare / ultra). Sum of ordinary ores never becomes rare. 700ms red or 1100ms rainbow anticipation precedes counting; highest batch rarity persists until zero. Existing record/big-bonus sounds accompany the anticipation, with fixed BGM gain.
- Ore payout table uses larger left-aligned numerals and smaller WIN～. The six-digit acquired display uses per-segment rainbow colors for ultra rewards.
- Final payout waiting advances the presentation clock independently of canvas RAF. Removed the 100ms elapsed cap that made low-frame-rate payout clocks lag wall time; one monotonic clock is shared by RAF and waiter, and pause resets timestamps. Final bonus interpolation clamps exactly to its target. Prediction errors invalidate only previews and release pending status; they do not prevent final completion.
- Observed regression fixture: processed=8, phase=settled, counter still transferring at t=5600 after a 15s test wait under software rendering. Updated three-game final test reaches the actual Arcade result and paid state, retains final reach/refill presentation, and checks no-RAF payout and injected preview error paths.
- Tab palettes: caramel #e9b85e, chocolate #b47a60, soda #7fd3e9. Reward balloon period 5.8s (was 3.3), lower and larger, palette applied to tab and reward bubble. Sugar tab position and depth-above-sugar alignment preserved.
- Existing five hexagon sugar wells remain live DOM elements, positioned in generated flower cradles.

## Generated asset

Built-in image_gen used; transparent PNG converted to WebP preserving alpha, no repainting. Project asset: `assets/wonder-sugar-vine-v23.webp`. Theme stylesheet: `assets/reward-themes.css` (also embedded in index).

Final prompt:

Use case: stylized-concept. Asset type: transparent 2D game UI ornament for a Japanese cute confectionery arcade game. Create a polished, luxurious candy botanical vine to frame five existing hexagonal collectible slots, a horizontal wide ornament, aspect about 3:1. Front-facing, crisp hand-painted arcade illustration, warm biscuit stems and curling chocolate branches, mint-green marzipan leaves, pink strawberry cream buds, small sugar crystal flowers, golden caramel accents. Exactly five evenly spaced open flower cradles in one horizontal row across the middle, each with an empty roughly hexagonal center where the game will overlay its own hexagon frame; all five centers remain unobstructed and transparent. Make centers at x 12%,31%,50%,69%,88%, y 52%. Candy foliage and stem runs below and between these five empty centers, with small leaves above, naturally connecting the flowers into one plant. Graceful compact silhouette, meaningful detail readable when reduced to 160 pixels wide. No lettering, no numbers, no logo, no background, no external border. True transparent background. Original illustration, festive Japanese medal arcade aesthetic.

## Validation

- canyon_rules.cjs: 80 games, immediate exposed collection, weighted distributions, drill/cascade rules.
- canyon_scale_counter.cjs: transfer stays fixed then zero, conservation, all rare threshold boundaries, anticipation hold, color-tier lifecycle, retarget, loading hold, direct bonuses, reset/reduced motion.
- final_board_browser.py: all three final-board reach checks, eighth-ball refill, actual Arcade result, no-RAF payout, failed forecast release.
- canyon_drill_browser.py: five viewports, depth/sugar layout, larger left-aligned table, crane and payout regression.
- reward_presentation_browser.py: actual red/rainbow segment pixels, three theme colors, five existing wells, rare UI screenshots.
