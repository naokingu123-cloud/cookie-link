# Chocolate Canyon — strata, melting and exposed rewards

Seven columns / twelve visible rows. Drill materials and labels remain iron, copper,
silver, gold and diamond. Levels 1–5 now excavate 1–5 connected cake strata.
A stratum spans an orthogonally connected same-color component; simultaneous drill
contacts on one component count once. Each layer has an approach, impact sound,
contact-origin crack wave, and molten collapse. Ordinary cascades use melting only.

A four-or-more component clears after its first falling step, including midair.
Every merger reaching four clears on contact. Static pre-existing fours stay until
hit, moved or merged. New refill tiles joining an existing four trigger the same rule.
Every empty top row scrolls immediately, including during melts and collection flights.

Rewards are singletons, never cake components. “Exposed” means no occupied cell
above in that column. Exposed rewards collect immediately, including in a cascade.
Copper 0.1–0.2 and silver 0.5–1.0 use 0.1 steps; gold 2–4 and diamond 5–10 use 1 steps.
The four explicitly named materials take precedence over the request's “three types”.
Odds-up multiplies only ores currently on the board, before simultaneously exposed
ore is collected. Refills generated after that upgrade retain their base value.
Multiple upgrades stack multiplicatively. Collected ore values remain fixed.
Sugar is a singleton exposed reward and awards its BET-valued bank token once;
the former automatic ten-metre sugar award has been removed.
The trolley shows acquisition order, five items per bottom-up row.

## Art and autotiles

Eight independently generated transparent bitmap assets, resized to 256×256 WebP,
are in `assets/canyon-geology/`. Exact generation prompts and mode are recorded in
`canyon-geology-asset-prompts.json`. Those generated textures are embedded in the
shipping JS and HTML, so the standalone page needs no new asset network requests.
Diamond adds alpha transparency and animated highlights; all ores fit square cells.

Terrain uses the standard 47-case blob autotile topology, with quadrant assembly.
Neighbour bits: N=1, E=2, S=4, W=8, NW=16, NE=32, SE=64, SW=128.
Diagonal bits apply only when both adjoining cardinal neighbours are connected.
`chocoCanonicalMask` maps all 256 inputs to 47 valid states. Exterior edges,
convex/concave corners and textured centres use the generated source artwork;
mirrored periodic centre sampling removes internal seams. This is runtime blob
compatibility, not a claim of an RPG Maker-specific import sheet layout.

## Verification

- Production resolver fixtures: component layers, unique multi-column impact,
  propagated cracks, midair four, contact merger, static four, singleton items,
  odds timing, no future-ore boost, immediate collection+scroll, deterministic
  trace/no-trace results, input immutability.
- 80 seeded eight-ball engine runs; queueing, duplicate rejection, zero BET,
  persistence/migration, checkpoint restoration and reset cancellation.
- Chromium: 320/390/430px, landscape and desktop; five drill materials, labels,
  generated images, all 1,024 color/neighbour inputs, six effect frames,
  seven-item trolley layout, single sugar award, two non-silent sound buffers,
  and cancellation of pending sound voices.
- Existing Six Drop rules and browser regressions, real 3D initialization,
  three-game totals and credit settlement passed. Shared host code is unchanged
  apart from the Canyon-specific sugar status text.
- See `canyon-geology-verification.json` for browser evidence and payout sample.
  The payout sample covers direct ore return only, excluding sugar/JPC value.
- Not tested on physical iPhone hardware or through physical speakers.
