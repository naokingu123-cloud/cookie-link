# Six Candy Stage v5

Game commit: a3f1f309569f07879ba46af752dfc3fa3e542efd

- BET ready: an 18-second, four-scene tutorial, not a pre-generated playable board. It follows the real BET countdown, independent of rendering frame rate, and holds its final scene during the last two seconds. The miniature uses the same demonstration. Only START assigns the live board.
- Round transition: launch remaining candies outward, then drop rows from above, filling the lowest row first. Render-only motion does not award false all-clears or consume gameplay random numbers. Pending drawn numbers remain queued.
- PNG-derived candy-frame image, enlarged WIN reels with candy-shaped icons, previous/current/next Round cards outside the board, all-clear WIN above the board. Existing 35-unit candy diameter and rules retained. The all-clear heading is fitted inside its header.
- Browser integration and game regression results: docs/six-stage-v5-verification.json. Includes explicit BET-clock synchronization checks.
- Read-only public check: .github/tests/six_stage_v5_public.py. It compares deployed file hashes and checks the automatic transition from the tutorial to the playable board.
- Limitations: no physical iPhone or listening test; the regression suite controls hit numbers. No claim of complete natural eight-ball trajectory verification.
