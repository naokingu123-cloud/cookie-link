/* Source-level upgrades are applied before the existing game IIFE executes.
   Keep this file small: the bundled game file stays unchanged. */
(function(){
 'use strict';
 const history=[];
 function patch(source){
  function once(oldText,newText,label){
   const n=source.split(oldText).length-1;
   if(n!==1){console.warn('[cookie-upgrade] skipped '+label+' (matches='+n+')');return;}
   source=source.replace(oldText,newText);history.push(label);
  }
  once(
   'const COOKIE_ALL_CLEAR_HUNDREDTHS=2000; // 20x; shared by settlement, previews and award labels.',
   'const COOKIE_ALL_CLEAR_HUNDREDTHS=1000; const COOKIE_CLEAR_BONUSES=[1000,5000,20000,50000,100000]; const cookieClearBonus=n=>COOKIE_CLEAR_BONUSES[Math.max(0,Math.min(4,n-1))]; const cookieClearTotal=n=>{let sum=0;for(let i=1;i<=n;i++)sum+=cookieClearBonus(i);return sum;};',
   'progressive all-clear prize constants'
  );
  once(
   'const payoutHundredths=(maxLink,maxChain,allClears=0)=>payoutTenths(maxLink)*10+COOKIE_ALL_CLEAR_HUNDREDTHS*allClears;',
   'const payoutHundredths=(maxLink,maxChain,allClears=0)=>payoutTenths(maxLink)*10+cookieClearTotal(allClears);',
   'progressive all-clear settlements'
  );
  once(
   'this.supplyWonder(fresh,initial);',
   `this.supplyWonder(fresh,initial);
   // A rare, unnumbered WILD cookie automatically counts as HIT on the next draw.
   // Only choose newly created blank cells, never replacing a numbered, hammer or sugar cell.
   const wildCandidates=fresh.filter(t=>t&&t.number==null&&!t.special&&!t.step&&!t.wild);
   const wildChance=debugEconomyInterpolate([[50,.0005],[70,.002],[90,.006],[110,.012],[130,.025],[150,.045]]);
   if(wildCandidates.length&&this.random()<wildChance){const w=wildCandidates[Math.floor(this.random()*wildCandidates.length)];w.wild=true;w.number=null;}
   `,
   'rare WILD placement'
  );
  once(
   'if(tile&&tile.number==null&&!tile.special&&!tile.step)pools[tile.color].push([r,c]);',
   'if(tile&&tile.number==null&&!tile.special&&!tile.step&&!tile.wild)pools[tile.color].push([r,c]);',
   'keep hammer placement off WILD tiles'
  );
  once(
   'if(numberSet.has(this.board[r][c]?.number))hit.push([r,c]);',
   'if(numberSet.has(this.board[r][c]?.number)||this.board[r][c]?.wild)hit.push([r,c]);',
   'WILD auto-hit on next draw'
  );
  once(
   "function syncTileDecor(el,t){\n const sweet=el.querySelector('.sweet');",
   `function syncTileDecor(el,t){
 const sweet=el.querySelector('.sweet');
 let wildLabel=el.querySelector('.cookie-wild-label');
 if(t.wild&&!wildLabel){wildLabel=document.createElement('span');wildLabel.className='cookie-wild-label';wildLabel.textContent='WILD';wildLabel.setAttribute('aria-label','次の抽選で必ずヒットするWILD');sweet.appendChild(wildLabel);}
 else if(!t.wild&&wildLabel)wildLabel.remove();
 el.classList.toggle('cookie-wild',!!t.wild);`,
   'WILD tile artwork'
  );
  once(
   'const win=medalWin(app?.bet(s.i)??e.roundBet,COOKIE_ALL_CLEAR_HUNDREDTHS),value=num(win);',
   'const win=medalWin(app?.bet(s.i)??e.roundBet,cookieClearBonus(Math.max(1,e.allClears))),value=num(win);',
   'all-clear result value'
  );
  once(
   "fitGoldenNumber($('bonus-value'),num(medalWin(bet,COOKIE_ALL_CLEAR_HUNDREDTHS)),19,180);",
   "fitGoldenNumber($('bonus-value'),num(medalWin(bet,cookieClearBonus(e.allClears+1))),19,180);",
   'upcoming clear prize display'
  );
  once(
   "num(medalWin(bet,COOKIE_ALL_CLEAR_HUNDREDTHS))+' WIN');",
   "num(medalWin(bet,cookieClearBonus(e.allClears+1)))+' WIN');",
   'upcoming clear accessibility label'
  );
  once(
   'updateWonderHud(a,s,e,bet);\n fitGoldenNumber',
   `updateWonderHud(a,s,e,bet);
 const nextClearLabel=document.getElementById('cookie-next-clear');
 if(nextClearLabel){nextClearLabel.hidden=active!==0;nextClearLabel.textContent='次の全消し：'+Math.min(5,e.allClears+1)+'回目 '+num(medalWin(bet,cookieClearBonus(e.allClears+1)))+'枚（'+(cookieClearBonus(e.allClears+1)/100)+'倍）';}
 fitGoldenNumber`,
   'next all-clear count above board'
  );
  once(
   "const plateMat=new THREE.MeshPhysicalMaterial({color:'#e9a83c',transparent:true,opacity:.87,metalness:.12,roughness:.28,clearcoat:.7,clearcoatRoughness:.15,side:THREE.DoubleSide});materials.push(plateMat);",
   `const plateMat=new THREE.MeshPhysicalMaterial({color:'#fff9e3',transparent:true,opacity:.94,metalness:.07,roughness:.34,clearcoat:.7,clearcoatRoughness:.15,side:THREE.DoubleSide});materials.push(plateMat);
 const pastryTexture=new THREE.TextureLoader().load('assets/cookie-platter-sweets.svg',()=>{plateMat.needsUpdate=true;});
 pastryTexture.colorSpace=THREE.SRGBColorSpace;pastryTexture.wrapS=THREE.RepeatWrapping;pastryTexture.magFilter=THREE.LinearFilter;plateMat.map=pastryTexture;plateMat.needsUpdate=true;`,
   'candy illustration on yellow roulette plate'
  );
  once(
   'cookieBias:debugEconomyInterpolate([[50,-1.8],[90,0],[110,.16],[130,.5],[150,1]]),',
   'cookieBias:debugEconomyInterpolate([[50,-2.1],[70,-.9],[90,-.22],[110,.25],[130,.75],[150,1.5]]),',
   'rebuild cookie bias for larger clear prizes'
  );
  once(
   'cookiePlacement:debugEconomyInterpolate([[50,-1],[90,0],[110,.16],[130,.5],[150,1]]),',
   'cookiePlacement:debugEconomyInterpolate([[50,-1.45],[70,-.6],[90,-.12],[110,.2],[130,.65],[150,1.3]]),',
   'rebuild cookie placement for larger clear prizes'
  );
  console.info('[cookie-upgrade] patches:',history.join(', '));
  return source;
 }
 window.CookieUpgradePatch={patch,history};
})();
