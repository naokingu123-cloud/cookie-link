# Six Candy Stage v5

Game commit: af4e2ceb290d03a5b65e723d407d7fe329a3f030

- BET ready: an 18-second, four-scene tutorial, not a pre-generated playable board. The miniature uses the same demonstration. Only START assigns the live board.
- Round transition: launch remaining candies outward, then drop rows from above, filling the lowest row first. Render-only motion does not award false all-clears or consume gameplay random numbers. Pending drawn numbers remain queued.
- PNG-derived candy-frame image, enlarged WIN reels with candy-shaped icons, previous/current/next Round cards outside the board, all-clear WIN above the board. Existing 35-unit candy diameter and rules retained.
- Local browser integration and game regression results: docs/six-stage-v5-verification.json.
- Read-only public check: .github/tests/six_stage_v5_public.py. It compares deployed file hashes and checks the automatic transition from the tutorial to the playable board.
- Limitations: no physical iPhone or listening test; the regression suite controls hit numbers. No claim of complete natural eight-ball trajectory verification.
