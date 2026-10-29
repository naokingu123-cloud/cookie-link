# Canyon depth art and motion — v12

> Bonus rules and the 900/1000 m backgrounds are superseded by [v13](canyon-milestones-v13.md).

Ten generated opaque environment paintings are stored as 512 × 768 WebP images under `assets/canyon-depth/`.

| Cumulative depth | Environment |
|---|---|
| 0 m | Grassland and blue sky at a cave entrance |
| 30–160 m | White chocolate cave |
| 200 m | Strawberry chocolate cave |
| 300 m | Milk chocolate cave |
| 400 m | Bitter chocolate cave |
| 500 m | Sapphire chocolate cave |
| 600 m | Emerald chocolate cave |
| 700 m | Topaz chocolate cave |
| 800 m | Ruby chocolate cave |
| 900 m and deeper | Diamond chocolate cave |

The opening transitions over 0–30 m. Later transitions use a smoothstep crossfade over the 40 m approaching each listed depth. The same generated scene is visible behind the board through a cool translucent shade for tile contrast. Motion follows the camera and falling blocks at 18% of foreground travel. Mirrored repeated panels prevent position jumps. Additional fall travel remains accumulated after landing.

Cake fall segments use constant acceleration (`distance ∝ time²`), with duration `125 × sqrt(distance)` milliseconds: one metre 125 ms, eleven metres 415 ms. Consecutive row steps are joined before drawing; each section stops at its own landing position. Drilling still locks gravity and camera until all drills return.

Each game's 10 m progression generates a separate seven-cell, one-row fruit layer. Layer identities prevent adjoining fruit rows from merging. Awards in BET multipliers are 5, 20, 50, 100, 200, 300, 400, …; drilling or landing after a fall awards the layer once. Static fruit layers do not auto-clear. All-clear items preserve their previous no-fruit-bonus behavior. Generated-layer count travels through plans, checkpoints and save data; new games reset it while cumulative background depth continues.

## Generation prompts

Each image used this prompt, replacing `[theme]` with the corresponding description below:

> Use case: stylized-concept. Create one polished raster background for a cute Japanese fantasy chocolate mining arcade game. Scene: [theme]. Portrait composition, detailed sculpted chocolate formations along both sides, coherent gently receding rounded arch opening, atmospheric distant center kept spacious, quiet and lower contrast for a game board overlay. Hand-painted premium game art, tasteful glossy material, warm gold accents, soft volumetric light, no characters, no cart, no UI, no text, no numbers, no borders. This is one complete environment image, not a collage. Keep layout consistent with other cave environments: foreground side walls, recessed unobstructed middle, same frontal viewpoint. Full opaque background.

- `surface.webp`: bright grassy meadow and expansive blue sky, a small inviting white chocolate cave entrance low in the scene
- `white.webp`: ivory white chocolate cave interior, creamy limestone-like chocolate arches and stalactites
- `strawberry.webp`: strawberry pink chocolate cave interior, pink layered rock and soft rose crystals
- `milk.webp`: milk chocolate cave interior, warm caramel brown chocolate arches
- `bitter.webp`: bitter dark chocolate cave interior, deep cocoa stone with cool blue reflected light
- `sapphire.webp`: sapphire chocolate cave interior, midnight chocolate stone embedded with luminous rich blue sapphire crystals
- `emerald.webp`: emerald chocolate cave interior, dark chocolate stone embedded with glowing green emerald crystals
- `topaz.webp`: topaz chocolate cave interior, chocolate stone embedded with luminous honey golden topaz crystals
- `ruby.webp`: ruby chocolate cave interior, chocolate stone embedded with luminous crimson ruby crystals
- `diamond.webp`: diamond chocolate cave interior, deep chocolate stone embedded with translucent sparkling icy diamonds
