process.env.SWEETS_BET_DURATION_MS??='3000';

await import('./server-rtc-preload.mjs');
await import('./server-payout-preload-v3.mjs');
await import('./server-core.mjs');
