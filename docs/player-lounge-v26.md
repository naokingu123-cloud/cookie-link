# Player menu v26 (2026-10-30)

- MENU opens the high-payout ranking. Seven pages retain records, titles, own history and all-clears alongside ranking, profile and dress-up.
- Ranking: overall / Cookie / Canyon / Six, current month in Asia/Tokyo / all time, top ten with competition ties. Stable player IDs, not display names, deduplicate records. Overall is the highest single-game payout among the three games, not a sum of unrelated records.
- Ten explicitly marked demo players are generated for display only; they never enter saved achievements or economy. Demo display can be switched off. This static Pages release has browser-local identity and personal records; it does not implement cross-device accounts or a shared online leaderboard. A future service can supply rows to the same uniqueBest aggregator.
- `sweets-player-v1` stores UUID, NFC name (1–12 Unicode code points), validated cosmetics, per-game all-time bests and monthly bests (24 months). Old RecordBook best entries are imported once, retaining all existing RecordBook data. Unavailable/full/corrupt storage degrades to session state and reports save failures.
- Three.js already bundled in index.html is reused. A single offscreen 288×320 antialiased renderer at pixel ratio 1 draws the procedural smooth mochi rabbit. Shared 24×16 sphere geometry, no shadows, postprocessing or physics. Five flavors × four toppings × four outfits × five accent colors. All 80 geometric variants contain fewer than 50,000 triangles and 70 meshes.
- The dress-up view animates at approximately 30fps only while open and document-visible. Closing the menu, changing pages or hiding the tab cancels the RAF; reduced-motion requests render only as needed. Main-game/profile canvases and ranking portraits are snapshots, with existing CSS breathing on the main companion. Materials and nonshared geometry are disposed on rebuild. WebGL-disabled environments show the generated reference image with a visible explanation and preserve selected settings.
- Generated asset: `assets/pets/strawberry-mochi.png`, alpha PNG reduced to 256px for runtime (~60KB). Built-in image_gen, not API/CLI. Exact selected source: image-edit-target-20e2efcce0ce197a.png (ranking reference).

## Image prompt

Use case: stylized-concept. Transform the selected arcade ranking image's mascot feeling into one original sweets pet. Remove interface and text. Smooth glossy 3D strawberry-cream mochi bunny, pale-pink plump body, short rounded ears, chocolate button eyes with white highlights, smiling mouth, rosy cheeks, small arms and feet, whipped cream with a strawberry on the head. Front-facing slight three-quarter product render, full body, soft studio light, clear silhouette at 48 pixels, transparent background, no clothing, neck accessories, pedestal, ground, text or additional characters.

## Validation

`node .github/tests/player_lounge.cjs`: persistent identity and rename, reload, one row/user, per-game and monthly filtering including JST boundary, ties, invalid records, blocked/corrupt storage, 80 real Three.js model variants with GPU renderer stubbed, inline JS parse.

Existing `six_rounds_v4.cjs` and `canyon_rules.cjs` pass (80 Canyon games). Cloud browser UI checks: name save/reload, cosmetic selection/reload, 390×844 portrait and 844×390 landscape layout, unique demo rows and no horizontal overflow. The cloud browser has WebGL disabled (also affects the unmodified roulette); actual GPU appearance/frame rate and real iPhone performance are not visually verified here. Model construction is verified independently and the fallback was visibly checked.
