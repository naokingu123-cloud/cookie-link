/* The v268 workflow follows the current presentation, with all v268 payout assertions preserved in the v269 harness. Saved v266 UI has its own pinned fixture. */
process.env.DANGO_VIEW_QA_OUTPUT ||= 'qa-dango-v268-view';
await import('./dango-v269-view.mjs');
