from pathlib import Path
def req(s,a,b,label):
    if a not in s: raise SystemExit("missing "+label)
    return s.replace(a,b,1)
def patch_all(paths,repls):
    for path in paths:
        p=Path(path); s=p.read_text()
        for a,b,label in repls: s=req(s,a,b,label+" @ "+path)
        p.write_text(s)

engine_paths=['assets/six-candy-rounds-engine.js','assets/six-candy.js','index.html']
old_themes="""const SIX_CLEAR_BONUS=[0,20,40,100,300,1000,3000,5000,10000];
const SIX_ROUND_THEMES=[
 {id:'cool-1',label:'Round 1',colors:['lime','green','aqua','navy'],tier:1},
 {id:'cool-2',label:'Round 2',colors:['lime','green','aqua','navy'],tier:2},
 {id:'cool-3',label:'Round 3',colors:['lime','green','aqua','navy'],tier:3},
 {id:'citrus-4',label:'Round 4',colors:['orange','yellow','lime','green'],tier:4},
 {id:'citrus-5',label:'Round 5',colors:['orange','yellow','lime','green'],tier:5},
 {id:'hot-6',label:'Round 6',colors:['violet','red','orange','yellow'],tier:6},
 {id:'hot-7',label:'Round 7',colors:['violet','red','orange','yellow'],tier:7},
 {id:'royal-8',label:'Round 8',colors:['gold','silver','diamond'],tier:8}
];"""
new_themes="""const SIX_CLEAR_BONUS=[0,20,40,100,300,1000];
const SIX_ROUND_THEMES=[
 {id:'cool-1',label:'Round 1',colors:['lime','green','aqua','navy'],tier:1},
 {id:'fresh-2',label:'Round 2',colors:['yellow','lime','green','aqua'],tier:2},
 {id:'citrus-3',label:'Round 3',colors:['orange','yellow','lime','green'],tier:3},
 {id:'hot-4',label:'Round 4',colors:['red','orange','yellow','lime'],tier:4},
 {id:'hot-5',label:'Round 5',colors:['violet','red','orange','yellow'],tier:5}
];
const SIX_CHANCE_THEME={id:'chance-3',label:'CHANCE',colors:['gold','silver','diamond'],tier:8};
const SIX_CHANCE_RATE=.12;"""
repls=[
(old_themes,new_themes,'five round themes'),
("function sixRoundTheme(round){return SIX_ROUND_THEMES[Math.max(0,Math.min(SIX_ROUND_THEMES.length-1,round-1))];}","function sixRoundTheme(round){return SIX_ROUND_THEMES[Math.max(0,Math.min(4,round-1))];}\nfunction sixPickChanceRound(random){return random()<SIX_CHANCE_RATE?2+Math.floor(random()*4):null;}",'chance helper'),
("function sixRoundClearBonus(round){return SIX_CLEAR_BONUS[Math.max(0,Math.min(8,round))]||0;}","function sixRoundClearBonus(round){return SIX_CLEAR_BONUS[Math.max(0,Math.min(5,round))]||0;}",'round bonus clamp'),
("this.kind='candy';this.gameName='シックスキャンディ';this.drawMode='single';this.reachMode='single';this.rows=SIX_ROWS;","this.kind='candy';this.gameName='シックスキャンディ';this.drawMode='grouped';this.reachMode='single';this.rows=SIX_ROWS;",'grouped mode'),
("this.roundIndex=1;this.roundsCleared=0;this.sixColorCount=4;this.boardGeneration=0;this.roundTheme=sixRoundTheme(1).id;this.clearBonusHundredths=0;this.clearedRounds=new Set();this.maxRounds=8;","this.roundIndex=1;this.roundsCleared=0;this.sixColorCount=4;this.boardGeneration=0;this.roundTheme=sixRoundTheme(1).id;this.clearBonusHundredths=0;this.clearedRounds=new Set();this.maxRounds=5;this.chanceRound=sixPickChanceRound(this.random);", 'max rounds and chance'),
("colorsForRound(n){return sixRoundColorCount(n);}","colorsForRound(n){return this.chanceRound===n?3:sixRoundColorCount(n);}",'chance color count'),
("const theme=sixRoundTheme(this.roundIndex),holes=sixPickGapTemplate(this.random,this.roundIndex);this.sixColorCount=theme.colors.length;this.roundTheme=theme.id;this.currentHoles=holes;","const theme=this.chanceRound===this.roundIndex?SIX_CHANCE_THEME:sixRoundTheme(this.roundIndex),holes=sixPickGapTemplate(this.random,this.roundIndex);this.sixColorCount=theme.colors.length;this.roundTheme=theme.id;this.currentHoles=holes;",'chance board'),
("if(this.currentClearBonus){this.emit('pyramidRoundBonus',{roundIndex:this.roundIndex,gain:this.currentClearBonus,nextRound:this.transitionPending?this.roundIndex+1:null});if(!await this.wait(1100*this.speed,token))return;}","if(this.currentClearBonus){this.emit('pyramidRoundBonus',{roundIndex:this.roundIndex,gain:this.currentClearBonus,nextRound:this.transitionPending?this.roundIndex+1:null});if(!await this.wait(420*this.speed,token))return;}",'fast clear bonus'),
("if(!await this.wait((plan.chain||plan.advance?MINI_RESULT_MS:150)*this.speed,token))return;","if(!await this.wait((plan.advance?260:plan.chain?MINI_RESULT_MS:150)*this.speed,token))return;",'fast breakthrough'),
("const outgoing=sixClone(this.pyramid),nextRound=this.roundIndex+1,sweepMs=(motionReduced?140:760)*this.speed;","const outgoing=sixClone(this.pyramid),nextRound=this.roundIndex+1,sweepMs=(motionReduced?100:430)*this.speed;",'fast sweep'),
("this.roundIndex++;this.newBoard();const refillMs=(motionReduced?140:480+(this.rows-1)*96)*this.speed;","this.roundIndex++;this.newBoard();const refillMs=(motionReduced?100:360+(this.rows-1)*60)*this.speed;",'fast refill')
]
patch_all(engine_paths,repls)

art_paths=['assets/six-candy-art.js','assets/six-candy.js','index.html']
art_repls=[
("function sixArtCandySprite(color,round=1,sugar=false){\n const theme=sixRoundTheme(round),name=theme.colors[color%theme.colors.length],style=SIX_PNG_STYLES[name],key='roundPNG/'+round+'/'+name;","function sixArtCandySprite(color,round=1,sugar=false,chance=false){\n const theme=chance?SIX_CHANCE_THEME:sixRoundTheme(round),name=theme.colors[color%theme.colors.length],style=SIX_PNG_STYLES[name],key='roundPNG/'+round+'/'+name+'/'+(chance?'chance':'base');",'chance art'),
("if(round===8){const g=x.createLinearGradient(22,22,106,108);","if(chance){const g=x.createLinearGradient(22,22,106,108);",'chance sparkle')
]
patch_all(art_paths,art_repls)

ui_paths=['assets/six-candy-rounds-ui.js','assets/six-candy.js','index.html']
ui_repls=[
("let sixCandyAudioLast={break:-100,fall:-100};","let sixCandyAudioLast={break:-100,fall:-100,role:-100};",'role audio state'),
("const names=kind==='fall'?['six-marble-0','six-marble-1','six-marble-2']:['six-hard-candy'];","const names=kind==='fall'?['six-marble-0','six-marble-1','six-marble-2']:kind==='role'?['six-role-chime']:['six-hard-candy'];",'role audio name'),
("if(kind==='fall'){const f=[1250,940,1510][j];d[i]=Math.min(1,t/.0015)*(Math.exp(-t*110)*high*.21+Math.sin(2*Math.PI*f*t)*Math.exp(-t*75)*.35+Math.sin(2*Math.PI*f*2.73*t)*Math.exp(-t*120)*.13);}\n   else{const burst=[0,.014,.033].reduce((v,b)=>v+(t>=b?Math.exp(-(t-b)*110):0),0);d[i]=Math.min(1,t/.001)*(high*burst*.19+(Math.sin(2*Math.PI*2340*t)+Math.sin(2*Math.PI*3710*t))*.10*Math.exp(-t*24));}","if(kind==='fall'){const f=[1250,940,1510][j];d[i]=Math.min(1,t/.0015)*(Math.exp(-t*110)*high*.21+Math.sin(2*Math.PI*f*t)*Math.exp(-t*75)*.35+Math.sin(2*Math.PI*f*2.73*t)*Math.exp(-t*120)*.13);}\n   else if(kind==='role'){const notes=[1318.5,1661.2,2093],f=notes[Math.min(2,Math.floor(t/.055))];d[i]=(Math.sin(2*Math.PI*f*t)*.28+Math.sin(2*Math.PI*f*2*t)*.08)*Math.exp(-t*7.5);}\n   else{const burst=[0,.014,.033].reduce((v,b)=>v+(t>=b?Math.exp(-(t-b)*110):0),0);d[i]=Math.min(1,t/.001)*(high*burst*.19+(Math.sin(2*Math.PI*2340*t)+Math.sin(2*Math.PI*3710*t))*.10*Math.exp(-t*24));}",'role PCM'),
("if(ev.phase==='pyramidShape'&&s.i===active)sound('magic',{volume:.6});","if(ev.phase==='pyramidShape'&&s.i===active){sixCandyAudio('role');sound('magic',{volume:.24});}",'role event sound'),
("const remain=e.processed+(ev.numbers?.length||0)<8,advance=e.roundIndex<8&&remain;","const remain=e.processed+(ev.numbers?.length||0)<8,advance=e.roundIndex<5&&remain;",'max round ui'),
("(advance?'NEXT ROUND '+(e.roundIndex+1)+' 進出':e.roundIndex===8?'ALL ROUNDS CLEAR':'ROUND CLEAR')","(advance?'NEXT ROUND '+(e.roundIndex+1)+' 進出':e.roundIndex===5?'ALL ROUNDS CLEAR':'ROUND CLEAR')",'round clear wording'),
("x.drawImage(sixArtCandySprite(t.color,ready?1:e.roundIndex,!!t.sugar),-candyR,-candyR,candyR*2,candyR*2);","x.drawImage(sixArtCandySprite(t.color,ready?1:e.roundIndex,!!t.sugar,e.chanceRound===e.roundIndex),-candyR,-candyR,candyR*2,candyR*2);",'chance candy draw'),
("if(e.roundIndex===8&&!motionReduced&&!transition){","if(e.chanceRound===e.roundIndex&&!motionReduced&&!transition){",'chance sparkle ui'),
("valid=r>=1&&r<=8;","valid=r>=1&&r<=5;",'round card range'),
("el.querySelector('em').textContent=valid?num(medalWin(bet,sixRoundClearBonus(r)))+' WIN':'';","el.querySelector('em').textContent=valid?(e.chanceRound===r&&r===e.roundIndex+1?'CHANCE! 3色':num(medalWin(bet,sixRoundClearBonus(r)))+' WIN'):'';",'chance preview'),
("<rect class=\"perimeter-rail\" x=\"4\" y=\"4\" width=\"92\" height=\"92\" rx=\"11\" pathLength=\"100\"/><rect class=\"perimeter-trail\" x=\"4\" y=\"4\" width=\"92\" height=\"92\" rx=\"11\" pathLength=\"100\"/><rect class=\"perimeter-core\" x=\"4\" y=\"4\" width=\"92\" height=\"92\" rx=\"11\" pathLength=\"100\"/>","<circle class=\"perimeter-rail\" cx=\"50\" cy=\"50\" r=\"44\" pathLength=\"100\"/><circle class=\"perimeter-trail\" cx=\"50\" cy=\"50\" r=\"44\" pathLength=\"100\"/><circle class=\"perimeter-core\" cx=\"50\" cy=\"50\" r=\"44\" pathLength=\"100\"/>",'circular allclear reach')
]
patch_all(ui_paths,ui_repls)

# Make role payout windows horizontal and compact, preserving candy size.
css='assets/six-candy-rounds.css'; c=Path(css).read_text()
addon="""
.six-role-window{overflow:hidden!important}.six-role-reel{display:flex!important;gap:4px;transition:transform .32s ease!important}.six-role-row{flex:0 0 58px!important;height:56px!important;border-radius:10px!important}.six-role[data-role="triangle"]{border:2px solid #e7a855!important;box-shadow:0 0 12px #ffd78988,inset 0 0 0 1px #fff7cf!important}.six-role[data-role="hexagon"]{border:2px solid #b884ef!important;box-shadow:0 0 14px #d8b6ff99,inset 0 0 0 1px #fff2ff!important}.six-reach-cell{border-radius:50%}.six-reach-cell .allclear-reach-aura,.six-reach-cell .allclear-reach-perimeter{border-radius:50%!important}.six-round-card[data-chance="1"]{background:linear-gradient(135deg,#fff2a2,#e7edff,#fff)!important;box-shadow:0 0 16px #fff2a5,inset 0 0 0 2px #fff!important}
"""
if addon.strip() not in c: c+='\n'+addon
Path(css).write_text(c)
p=Path('index.html'); s=p.read_text(); s=s.replace('</style>',addon+'\n</style>',1); p.write_text(s)

# Final compact role sliding and chance card marker injected after existing v5 carnivalHud.
for path in ['assets/six-candy-rounds-ui.js','assets/six-candy.js','index.html']:
    p=Path(path); s=p.read_text()
    s=s.replace("col.querySelector('.six-role-reel').style.transform='translateY('+(-Math.max(0,count-2)*32)+'px)';","col.querySelector('.six-role-reel').style.transform='translateX('+(-Math.max(0,count-1)*62)+'px)';")
    s=s.replace("el.dataset.tone=valid?sixThemeTone(r):'';","el.dataset.tone=valid?sixThemeTone(r):'';el.dataset.chance=valid&&e.chanceRound===r?'1':'0';")
    p.write_text(s)

# Update tests to five-round/chance expectations while keeping old physics checks.
p=Path('.github/tests/six_rounds_v4.cjs'); s=p.read_text()
s=s.replace("const expected=[['lime','green','aqua','navy'],['lime','green','aqua','navy'],['lime','green','aqua','navy'],['orange','yellow','lime','green'],['orange','yellow','lime','green'],['violet','red','orange','yellow'],['violet','red','orange','yellow'],['gold','silver','diamond']];","const expected=[['lime','green','aqua','navy'],['yellow','lime','green','aqua'],['orange','yellow','lime','green'],['red','orange','yellow','lime'],['violet','red','orange','yellow']];")
s=s.replace("assert.equal([1,2,3].reduce((s,r)=>s+q.sixRoundClearBonus(r),0),160);","assert.equal([1,2,3].reduce((s,r)=>s+q.sixRoundClearBonus(r),0),160);")
s=s.replace("templates:6,initialFalls:0,firstThreeBonus:1.6,allClear:100","templates:6,initialFalls:0,firstThreeBonus:1.6,allClear:100,maxRounds:5")
p.write_text(s)

Path('docs/SIX_CANDY_V6_20261026.md').write_text('''# Six Candy v6\n- Five draw batches: 3 / 2 / 1 / 1 / 1 via grouped engine mode.\n- Maximum Round 5.\n- Round palettes: R1 lime/green/aqua/blue, R2 yellow/lime/green/aqua, R3 orange/yellow/lime/green, R4 red/orange/yellow/lime, R5 violet/red/orange/yellow.\n- 12% chance of one Round 2-5 becoming a three-color gold/silver/diamond CHANCE board. It is disclosed in the NEXT card one round before.\n- First shape in a Round confirms progression; post-confirmation presentation is accelerated.\n- New role chime, cookie-style high/super/all-clear reach treatment adapted to circular candies.\n''')
print('SIX_V6_PATCHED')
