# Six Candy v4 release — 2026-10-26

This release retains the existing application and GitHub Pages URL. It does not create a second app or introduce a paid service.

## Verified game revision

- Source game blob: `c0c02ed3a56eb395881fe2ae8cdd00632a5da8a9`
- Updated game blob: `ac55547cf7b3db0d6e68f757b7d84e2592fe684c`
- Updated index.html SHA-256: `ab7c635c3018d5eb5f33df0c90edf9b3d1e85e4588b957544adb540b6448e86c`
- Rules and browser report: `docs/six-rounds-v4-verification.json`
- Deployment verifier: `.github/tests/six_rounds_v4_public.py`

The integration validates a fixed 10-row tray, six symmetric stable gap patterns, 25 unique numbers, PNG-derived round variants, independent role/round/all-clear payouts, sugar collection, three sliding tables, common reach presentation, audio cancellation and the other two games. The shared host code outside the Six Candy bundle and scoped styles is unchanged.

## Working publication method

1. Read the current main and exact source blob through the connected GitHub tools.
2. Generate and test the changed source locally. Do not replace original PNG textures with an unapproved simple drawing and do not reduce candy size.
3. Transfer only text deltas using GitHub create_blob/create_tree/create_commit/update_ref. Verify before/after hashes; a direct local git connection is not required.
4. GitHub Actions applies the guarded delta and runs rule and real HTTP/browser tests before committing game files.
5. Workflow changes are made through the connected GitHub tools. The Actions GITHUB_TOKEN can write game files but its attempt to update a workflow was explicitly rejected for missing workflows permission.
6. Remove the one-time updater, activate the read-only verification workflow, and trigger the existing Pages deployment through a connector-authored commit.
7. Require the public index.html and original candy atlas to match the checkout hashes; open the actual public URL in mobile and desktop browser contexts. A successful source commit alone is not publication evidence.

Future cookie-link updates should include implementation, regression checks, main persistence and existing Pages verification before being reported as complete. Public verification evidence is retained by the `Verify Six Candy Round v4 and public Pages` workflow as `six-candy-v4-verified-pages`.

## Test limits

Browser tests use Chromium mobile emulation and a native desktop context. Draw numbers are controlled test notifications; they are not a natural-physics eight-ball run. Physical iPhone and speaker listening checks are not claimed.
