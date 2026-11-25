/* v301: fit plain payout faces to their logical, untransformed content bays.
 * Only invoked on value/layout changes. Never queries the whole DOM per frame. */
(()=>{
'use strict';
const measuring=document.createElement('canvas').getContext('2d');
const px=x=>parseFloat(x)||0;
function plain(value,container,suffix=null,options={}){
 if(!value||!container||!container.clientWidth||!measuring)return;
 value.style.removeProperty('font-size');
 const style=getComputedStyle(value),box=getComputedStyle(container);
 const side=px(box.paddingLeft)+px(box.paddingRight);
 const suffixStyle=suffix?getComputedStyle(suffix):null;
 const occupied=suffix?suffix.offsetWidth+px(suffixStyle.marginLeft)+px(suffixStyle.marginRight)+px(box.columnGap):0;
 const width=Math.max(1,container.clientWidth-side-occupied-(options.inset??4));
 const height=container.clientHeight;
 const base=px(style.fontSize)||12;
 const capped=height?Math.min(base,Math.max(1,(height-2)*(options.heightFraction??.86))):base;
 measuring.font=style.fontWeight+' '+capped+'px '+style.fontFamily;
 const str=value.textContent||'',spacing=px(style.letterSpacing);
 const metric=measuring.measureText(str),inkWidth=Math.max(metric.width,(metric.actualBoundingBoxLeft||0)+(metric.actualBoundingBoxRight||0));
 const natural=Math.max(1,inkWidth+Math.max(0,str.length-1)*spacing+1);
 const size=Math.max(.5,capped*Math.min(1,width/natural));
 value.style.setProperty('font-size',size.toFixed(2)+'px','important');
}
window.SweetsPayoutFitV301=Object.freeze({plain});
})();
