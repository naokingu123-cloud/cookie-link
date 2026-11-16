# v234 — server roulette HD video, adaptive 60fps

## Goal
Improve the *server-hosted* roulette video without changing the physical physics time scale, draw sequence, server-driven 20-second BET TIME, CREDIT or payout logic. The player page continues to display only server video, with no local roulette.

## Actual transport
- **WebRTC primary:** target up to 1280×720, 60fps, maximum 3Mbps, keeping the source canvas native resolution (no fake upscaling). The browser may use its hardware video encoder if supported.
- **Adaptive safety:** poll connected outbound RTP stats every five seconds. After two consecutive slow/CPU-limited/bandwidth-limited measurements, limit video to 30fps/1.6Mbps. After ten healthy measurements, try 60fps again. This changes RTCRtpSender parameters and the manual video-capture cadence, **never the Three.js render clock or ball physics**. Actual output FPS is hardware and network dependent.
- **Capture:** remove redundant 24fps+30fps manual capture pulses. Use just the keepalive worker, at 24fps when idle, 60fps with WebRTC viewers, 30fps under pressure. If the worker fails to start, keep a single guarded main-thread pulse. Retain existing no-per-frame setPaused behavior.
- **Fallback (iPhone/NAT):** JPEG remains limited to 15fps with one shared encode at a time, 960×540 (JPEG quality 0.77) for one uncongested viewer. For multiple viewers, slow encode (>90ms), large JPEG (>140KB) or buffered WebSocket, revert to the existing 720×405 budget for 12 seconds. Preserve the 180KB packet cap, bounded client decoder, JPEG delivery and the older WebM fallback; no resolution boost can compensate for a lower native source.
- **WebM legacy fallback:** increase codec rate moderately from 0.6 to 1Mbps, preserving the existing chunk and reconnect constraints.

## Observability
On the host browser, `window.SweetsRouletteHostV224.fps` reads the currently requested video cap (60 or 30). `window.SweetsHostKeepAliveV206.captureFps` reads the manual capture worker rate (24, 30 or 60). These are **requested caps**, not a promise of measured delivered FPS.

## Validation
`node tests/roulette-hd60-v234.mjs` checks the host sender bitrate/cap, CPU feedback hysteresis, worker-rate propagation and adaptive JPEG dimensions while retaining old WebRTC/relay protocol contracts. Shared machine CI also runs the existing physics, bet, settlement and reconnection regressions. Windows server/host must be updated to load the new video source; Pages update alone only refreshes the viewer.
