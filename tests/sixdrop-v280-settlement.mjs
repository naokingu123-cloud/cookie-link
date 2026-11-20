// Run the actual shared preload/HTTP and Download ledger contracts with the
// new rounded native payout, including cancellation and cold-server resume.
process.env.SIXDROP_SETTLEMENT_REVISION='280';
await import('./sixdrop-v278-settlement.mjs');
