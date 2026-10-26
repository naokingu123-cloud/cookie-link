# Six Candy update transport

This update uses the connected GitHub Git Data API for staged text patches, followed by a guarded GitHub Actions build. Direct git networking from the local runtime is not required.

Source main: 20f3c7eaef0390f891c5c013170554d6a173c10a
Source game blob: c0c02ed3a56eb395881fe2ae8cdd00632a5da8a9

Do not treat staging as publication. The live game may only be committed after the syntax, deterministic rules, and browser regression checks pass. Check the existing Pages deployment separately.
