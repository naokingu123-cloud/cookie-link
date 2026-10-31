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
   'const COOKIE_ALL_CLEAR_HUNDREDTHS=300; const COOKIE_CLEAR_BONUSES=[300,1000,5000,20000,50000]; const cookieClearBonus=n=>COOKIE_CLEAR_BONUSES[Math.max(0,Math.min(4,n-1))]; const cookieClearTotal=n=>{let sum=0;for(let i=1;i<=n;i++)sum+=cookieClearBonus(i);return sum;};',
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
 // The bundled Three.js is intentionally tree-shaken and has CanvasTexture,
 // but no TextureLoader. Decode the artwork in an ordinary browser Image first.
 const pastryCanvas=document.createElement('canvas');pastryCanvas.width=1024;pastryCanvas.height=1024;
 const pastryContext=pastryCanvas.getContext('2d');
 const pastryTexture=new THREE.CanvasTexture(pastryCanvas);
 pastryTexture.colorSpace=THREE.SRGBColorSpace;pastryTexture.magFilter=THREE.LinearFilter;
 pastryTexture.minFilter=THREE.LinearFilter;
 const pastryImage=new Image();
 pastryImage.onload=()=>{if(!pastryContext)return;pastryContext.drawImage(pastryImage,0,0,1024,1024);pastryTexture.needsUpdate=true;};
 pastryImage.onerror=()=>console.warn('Candy platter illustration could not be loaded');
 pastryImage.src='assets/cookie-platter-sweets.svg';
 plateMat.map=pastryTexture;plateMat.needsUpdate=true;`,
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
  once("const SIX_COLOR_SPREAD=.30;\nconst SIX_SUGAR_ROUND_CHOICES=[2,3,3,3,4];\nconst SIX_START_GAP_TEMPLATES=[\n [[0,2],[0,4],[2,1],[2,5],[6,1],[6,5]],\n [[4,1],[4,5],[2,3],[7,1],[7,6]],\n [[4,1],[4,5],[2,3],[7,1],[7,6],[0,3]],\n [[4,2],[4,4],[7,1],[7,6]],\n [[4,2],[4,4],[7,1],[7,6],[8,2],[8,4]],\n [[0,1],[0,5],[5,1],[5,6],[7,1],[7,6]]\n];","const SIX_COLOR_SPREAD=.30;\nconst SIX_SUGAR_ROUND_CHOICES=[2,3,3,3,4];\n// Denser symmetrical holes, verified to be stable under sixDrop and\n// clear of all 25 fixed numbered positions.\nconst SIX_START_GAP_TEMPLATES=[\n [[0,2],[0,4],[2,1],[2,5],[6,1],[6,5],[8,2],[8,4],[9,1],[9,6],[0,1],[0,5]],\n [[4,1],[4,5],[2,3],[7,1],[7,6],[9,1],[9,6],[0,1],[0,5],[2,1],[2,5],[0,2],[0,4]],\n [[4,1],[4,5],[2,3],[7,1],[7,6],[0,3],[0,1],[0,5],[2,1],[2,5],[9,2],[9,5]],\n [[4,2],[4,4],[7,1],[7,6],[2,1],[2,5],[9,2],[9,5],[0,2],[0,4],[6,2],[6,4]],\n [[4,2],[4,4],[7,1],[7,6],[8,2],[8,4],[0,2],[0,4],[1,1],[1,6],[3,1],[3,6]],\n [[0,1],[0,5],[5,1],[5,6],[7,1],[7,6],[0,2],[0,4],[4,2],[4,4],[3,1],[3,6]]\n];","stable symmetric initial gaps");
  once("function sixMakeBoard(rows,colorCount,random,firstId=0,{holes=[]}={}){","// Preserve more left/right symmetric holes after each ordinary top-up.\n// Only remove NEW candies in mirrored pairs; never touch existing tiles.\n// A candidate pair is accepted only when gravity still has zero moves.\nconst sixRefillBoardBase=sixRefillBoard;\nsixRefillBoard=function(input,colorCount,random,firstId,drawn=new Set()){\n const result=sixRefillBoardBase(input,colorCount,random,firstId,drawn);\n const grid=result.grid,byCell=new Map(result.added.map(a=>[sixKey(a.r,a.c),a]));\n const pairs=[];\n for(let r=0;r<grid.length;r++){\n  const width=grid[r].length;\n  for(let c=0;c<Math.ceil(width/2);c++){\n   const mirror=width-1-c,left=byCell.get(sixKey(r,c)),right=byCell.get(sixKey(r,mirror));\n   if(left&&right)pairs.push(c===mirror?[left]:[left,right]);\n  }\n }\n sixShuffle(pairs,random);\n const limit=Math.min(8,Math.max(1,Math.floor(result.added.length*.45)));\n let removed=0;\n for(const pair of pairs){\n  if(removed+pair.length>limit)continue;\n  const saved=pair.map(p=>grid[p.r][p.c]);\n  for(const p of pair)grid[p.r][p.c]=null;\n  let stable=false;\n  try{stable=sixDrop(sixClone(grid)).moves.length===0&&sixResolve(grid).cells.length===0;}catch(e){stable=false;}\n  if(stable)removed+=pair.length;\n  else pair.forEach((p,i)=>{grid[p.r][p.c]=saved[i];});\n }\n if(removed)result.added=result.added.filter(a=>grid[a.r][a.c]?.id===a.tile.id);\n return result;\n};\nfunction sixMakeBoard(rows,colorCount,random,firstId=0,{holes=[]}={}){","stable symmetric gaps after top-up");
  once("  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));this.fill(true);if(keepHammers)this.grantHammers(0);this.prepareHammerPreview();this.emit('ready');","  // Keep any promised basket hammer across a reset/new game unless debug reset clears it.\n  const carriedForecast=keepHammers&&Array.isArray(this.hammerForecast)?this.hammerForecast.slice(0,SIZE):null;\n  this.hammerForecast=carriedForecast||Array(SIZE).fill(false);\n  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));this.fill(true);if(keepHammers)this.grantHammers(0);this.prepareHammerPreview();this.prepareHammerForecast();this.emit('ready');","carry promises into the next game and prepare stage 1-3");
  once(" prepareHammerPreview(){"," // Forecast once before each draw group: 1-3, 4-5, 6, 7, 8.\n // One persistent promise per column; already queued promises never reroll.\n prepareHammerForecast(){\n  if(!Array.isArray(this.hammerForecast))this.hammerForecast=Array(SIZE).fill(false);\n  const chance=debugEconomyInterpolate([[50,.006],[70,.015],[90,.035],[110,.065],[130,.11],[150,.16]]);\n  for(let c=0;c<SIZE;c++){\n   if(this.hammerForecast[c]||this.board.some(row=>row[c]?.special))continue;\n   if(this.random()<chance)this.hammerForecast[c]=true;\n  }\n }\n prepareHammerPreview(){","RTP-dependent pre-draw hammer forecast");
  once("  this.refillAdjusted=colorFreshCells(this.board,freshCells,this.colorCount,this.random);","  this.refillAdjusted=colorFreshCells(this.board,freshCells,this.colorCount,this.random);\n  // Place PREVIOUSLY forecast hammers in this group's refill, never roll here.\n  // If there is exactly one opening, it is selected with certainty.\n  this.hammerForecastPlaced=[];\n  if(!initial&&Array.isArray(this.hammerForecast)){\n   for(let c=0;c<SIZE;c++){\n    if(!this.hammerForecast[c]||this.board.some(row=>row[c]?.special))continue;\n    const cells=freshCells.filter(([r,column])=>column===c);\n    if(!cells.length)continue; // Carry the basket promise forward.\n    const [r]=cells[Math.floor(this.random()*cells.length)],tile=this.board[r][c];\n    tile.special=true;tile.number=null;\n    this.hammerForecast[c]=false;this.hammerForecastPlaced.push([r,c]);\n   }\n  }","place promised hammer in 1 of the actual newly filled cells");
  once("    this.processed+=numbers.length;this.emit('settled',{...batch,number,ball,depth,batchMaxLink,batchAllClears:this.allClears-beforeClears});","    this.processed+=numbers.length;\n    // A new forecast is visible on the settled board before the NEXT draw group.\n    // No new forecast is rolled after ball 8; carry any unused forecast to reset.\n    if(this.processed<8)this.prepareHammerForecast();\n    this.emit('settled',{...batch,number,ball,depth,batchMaxLink,batchAllClears:this.allClears-beforeClears,hammerForecast:[...this.hammerForecast]});","show new promises after each draw group settles");
  once("function stopPour(s){","function syncBasketHammerForecast(s,e){\n if(!Array.isArray(s?.baskets))return;\n for(let c=0;c<s.baskets.length;c++){\n  const basket=s.baskets[c],wanted=!!e.hammerForecast?.[c];\n  let mark=basket.querySelector('.cookie-hammer-forecast');\n  if(wanted&&!mark){\n   mark=document.createElement('span');\n   mark.className='cookie-hammer-forecast';\n   mark.textContent='🔨';\n   mark.setAttribute('role','img');mark.setAttribute('aria-label','次の補充で空きが出ればハンマーが落下');\n   basket.append(mark);\n  }else if(!wanted&&mark)mark.remove();\n }\n}\nfunction stopPour(s){","show stable hammer preview inside basket");
  once(" const s=slots[i];s.engine=e;\n if(e.kind==='choco'){chocoEvent(s,ev,e,a);return;}\n if(e.kind==='candy'){carnivalEvent(s,ev,e,a);return;}"," const s=slots[i];s.engine=e;\n if(e.kind==='choco'){chocoEvent(s,ev,e,a);return;}\n if(e.kind==='candy'){carnivalEvent(s,ev,e,a);return;}\n // Draw-pending, ready, refill and settled stages all preserve accurate forecasts.\n syncBasketHammerForecast(s,e);","refresh basket preview on every cookie event");
  once("if(drawing&&!paused&&now-paintStamp<1000/30){wake();return;}paintStamp=now;","if(drawing&&!paused&&now-paintStamp<1000/60-.5){wake();return;}paintStamp=now;","60fps roulette frame cap");
  console.info('[cookie-upgrade] patches:',history.join(', '));
  return source;
 }
 window.CookieUpgradePatch={patch,history};
})();
