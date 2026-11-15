process.env.SWEETS_BET_DURATION_MS??='10000';
process.env.SWEETS_AUTONOMOUS_ROUNDS='0';
process.env.SWEETS_PLAYER_STABLE_MS??='2800';
process.env.SWEETS_ROUND_START_DELAY_MS??='1100';
process.env.SWEETS_RESULT_GRACE_MS??='3200';
// A missing physical host must never be replaced by an unrequested random
// eight-ball draw. The round waits for the real host to reconnect instead.
process.env.SWEETS_HOST_FALLBACK_DELAY_MS??=String(24*60*60*1000);

await import('./server-startup-sanitize-v217.mjs');
await import('./server-rtc-preload.mjs');
await import('./server-payout-preload-v3.mjs');
await import('./server-core-loader-v217.mjs');
