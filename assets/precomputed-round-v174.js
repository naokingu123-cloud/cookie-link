(()=>{
'use strict';

/*
 * SWEETS LINK v175 native-ball hotfix.
 *
 * v174 generated a separate eight-number plan, calculated every enabled game
 * before the physical draw, and then mapped roulette callbacks onto that plan.
 * That made the visible pocket disagree with the number used by the games and
 * blocked the start sequence while the shadow simulations completed.
 *
 * Keep this file path for compatibility with the existing loader, but do not
 * install any start wrapper, number adapter, shadow simulation, or replay.
 * The number reported by the physical roulette is the sole authoritative value.
 */
if(window.__sweetsNativeBallV175)return;
window.__sweetsNativeBallV175=true;

/* Prevent any duplicate/stale v174 installer from being applied afterward. */
window.__sweetsPrecomputedRoundV174=true;

try{
 localStorage.removeItem('sweets-link-precomputed-round-v174');
 localStorage.removeItem('sweets-link-precomputed-ledger-v174');
 localStorage.removeItem('sweets-link-pending-round-v1');
}catch(error){
 console.warn('[NativeBallV175] old round cache could not be cleared',error);
}

console.info('[NativeBallV175] native roulette result enabled; precompute/replay disabled');
})();
