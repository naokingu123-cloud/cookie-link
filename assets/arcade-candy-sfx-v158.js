/* v277 compatibility bridge. All effects share the host's gesture-unlocked,
 * muted/paused, bounded SFX context; this file creates no second audio graph. */
(()=>{
'use strict';
window.SweetsEventSound=Object.freeze({
 version:'v277',
 play:(name,options)=>window.SweetsAudioV277?.play(name,options)??false,
 unlock:event=>window.SweetsAudioV277?.unlock(event)??false
});
})();
