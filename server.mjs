process.env.SWEETS_BET_DURATION_MS??='3000';
process.env.SWEETS_AUTONOMOUS_ROUNDS??='1';

await import('./server-rtc-preload.mjs');
await import('./server-payout-preload-v3.mjs');
await import('./server-core.mjs');
await import('./server-autonomous-rounds-v213.mjs');
