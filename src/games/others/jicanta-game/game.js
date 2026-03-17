const ARCADE_CONTROLS={P1A:[' ','u','ArrowUp','w'],P1L:['ArrowLeft','a'],P1R:['ArrowRight','d'],START1:['1','Enter']};
const KEYBOARD_TO_ARCADE={};
for(const [code,arr] of Object.entries(ARCADE_CONTROLS))for(const k of arr)KEYBOARD_TO_ARCADE[k]=code;

const W=800,H=600;
const CENTER={x:400,y:300};
const HUB_POS={P1:{x:330,y:300},P2:{x:470,y:300}};
const LANE_IDS=['A','B','C','D'];
const ROUTE_DECISION_MS=2000;
const LOSS_LIMIT=1;
const MAX_ACTIVE_TRAINS=4;
const INTRO_MS=5200;
const BRIEFING_MIN_MS=2600;
const NAME_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ .';

const FONT_UI='"Courier New",monospace';
const FONT_NUM='"Courier New",monospace';
const C_BG0=0x0a1224,C_BG1=0x0f1c33,C_PANEL=0x111c31,C_PANEL_BORDER=0x3b5b8d;
const HUB_THEME={P1:{label:'LEFT',accent:0xffc27a},P2:{label:'RIGHT',accent:0x8fd4ff}};

const LANE_META={
 A:{color:0xE6A221,station:{x:250,y:150}},
 B:{color:0x4CB5FF,station:{x:550,y:150}},
 C:{color:0x2FC88A,station:{x:550,y:450}},
 D:{color:0xD78DE3,station:{x:250,y:450}}
};
const LANE_CTRL_1P={
 A:[{x:400,y:300},{x:350,y:300},{x:300,y:250},{x:250,y:150}],
 B:[{x:400,y:300},{x:450,y:300},{x:500,y:250},{x:550,y:150}],
 C:[{x:400,y:300},{x:450,y:300},{x:500,y:350},{x:550,y:450}],
 D:[{x:400,y:300},{x:350,y:300},{x:300,y:350},{x:250,y:450}]
};
const LANE_CTRL_2P={
 P1:{
  A:[{x:330,y:300},{x:300,y:300},{x:280,y:250},{x:250,y:150}],
  B:[{x:330,y:300},{x:372,y:300},{x:430,y:252},{x:550,y:150}],
  C:[{x:330,y:300},{x:372,y:300},{x:430,y:348},{x:550,y:450}],
  D:[{x:330,y:300},{x:300,y:300},{x:280,y:350},{x:250,y:450}]
 },
 P2:{
  A:[{x:470,y:300},{x:428,y:300},{x:370,y:252},{x:250,y:150}],
  B:[{x:470,y:300},{x:500,y:300},{x:520,y:250},{x:550,y:150}],
  C:[{x:470,y:300},{x:500,y:300},{x:520,y:350},{x:550,y:450}],
  D:[{x:470,y:300},{x:428,y:300},{x:370,y:348},{x:250,y:450}]
 }
};

const SCORE_KEY='duck_dispatch_scores_v1';

const config={type:Phaser.AUTO,width:W,height:H,pixelArt:true,antialias:false,backgroundColor:'#0a1224',scene:{create,update}};
new Phaser.Game(config);

let scene,g,state='menu';
let lanes={},routeDefs=[],routeById={},labels=[],labelCount=0;
let ducks=[],trains=[],parked={},popups=[];
let laneStepByHub={P1:0,P2:0},lanePulse=0,spawnHubStep=0;
let score=0,best=0,delivered=0,leftCount=0,wrongCount=0,failCount=0;
let combo=0;
let runMs=0,tNow=0,nextDuck=0,nextTrain=0,duckId=0,trainId=0;
let topScores=[],hud={},deco={stars:[]};
let musicTick=0,musicBeat=0,audioOn=false;
let introMusicTick=0,introBeat=0,introAudioOn=false;
let nameEntry=null;
let introStart=0;
let briefingStart=0;
let overRank=-1;
let gameMode='1p';

function create(){
 scene=this;
 g=scene.add.graphics();
 scene.cameras.main.setRoundPixels(true);
 setupRoutes();
 for(let i=0;i<80;i++)deco.stars.push({x:(Math.random()*W)|0,y:(Math.random()*H)|0,p:Math.random()*6.28,s:0.5+Math.random()*1.8});
 topScores=loadScores();
 best=topScores[0]?topScores[0].score:0;

 hud.title=scene.add.text(W/2,62,'DUCK EXPRESS',{fontFamily:FONT_UI,fontSize:40,color:'#f2f7ff'}).setOrigin(.5).setStroke('#071224',8);
 hud.tip=scene.add.text(W/2,106,'SPACE switch lane   ESC pause',{fontFamily:FONT_NUM,fontSize:15,color:'#9ad1ff'}).setOrigin(.5);
 hud.start=scene.add.text(W/2,530,'PRESS SPACE TO START',{fontFamily:FONT_UI,fontSize:24,color:'#ffffff'}).setOrigin(.5).setStroke('#0b1629',6);
 hud.score=scene.add.text(W/2,14,'',{fontFamily:FONT_NUM,fontSize:30,color:'#f6fcff'}).setOrigin(.5,0).setDepth(4).setStroke('#0a1324',8);
 hud.status=scene.add.text(22,39,'',{fontFamily:FONT_NUM,fontSize:16,color:'#dbeaff'}).setDepth(4).setVisible(false);
 hud.info=scene.add.text(22,557,'',{fontFamily:FONT_NUM,fontSize:15,color:'#b8d9ff'}).setDepth(4);
 hud.board=scene.add.text(W/2,422,'',{fontFamily:FONT_NUM,fontSize:20,color:'#dceeff',align:'center'}).setOrigin(.5,0).setDepth(6);
 hud.center=scene.add.text(W/2,286,'',{fontFamily:FONT_UI,fontSize:30,color:'#ffffff'}).setOrigin(.5).setAlpha(0).setStroke('#09101f',7).setDepth(6);
 hud.pause=scene.add.text(W/2,H/2,'PAUSED',{fontFamily:FONT_UI,fontSize:58,color:'#ffffff'}).setOrigin(.5).setVisible(false).setStroke('#09101f',10).setDepth(6);

 scene.input.keyboard.on('keydown',e=>onDown(KEYBOARD_TO_ARCADE[e.key]||e.key));
 hud.board.setText(scoreBoardText()).setVisible(true);
 resetRun();
 startIntro();
}

function onDown(k){
 if(state==='intro'){
  if(k==='P1A'){gameMode='1p';setupRoutes();startBriefing();return;}
  if(k==='START1'){gameMode='2p';setupRoutes();startBriefing();return;}
  return;
 }
 if(state==='menu'){
  if(k==='P1A'||k==='START1'){startBriefing();return;}
  return;
 }
 if(state==='brief'){
  if(k==='START1'||k==='P1A'){
   if((scene.time.now||0)-briefingStart>=BRIEFING_MIN_MS){
    startRun();
   }else{
    sfx(320,0.04,'square',0.025);
   }
  }
  return;
 }
 if(state==='name'){
  if(k==='P1A'||k==='P1R'){
   rotateInitial(1);
   sfx(780,0.03,'square',0.035);
   return;
  }
  if(k==='P1L'){
   rotateInitial(-1);
   sfx(650,0.03,'square',0.035);
   return;
  }
  if(k==='START1'){
   confirmInitial();
   return;
  }
  if(k==='Escape'){
   submitInitials();
   return;
  }
 }
 if(k==='Escape'){
  if(state==='play'){state='pause';stopMusic();hud.pause.setVisible(true);flash('PAUSE');return;}
  if(state==='pause'){state='play';startMusic();hud.pause.setVisible(false);flash('RESUME');return;}
 }
 if(state==='over'&&(k==='START1'||k==='P1A')){startRun();return;}
 if(state!=='play')return;
 if(k==='P1A'){
  laneStepByHub.P1++;
  lanePulse=1;
  sfx(720,0.03,'square',0.04);
  flash(gameMode==='2p'?'P1 '+activeLaneForHub('P1'):activeLaneForHub('P1'));
  return;
 }
 if(gameMode==='2p'&&k==='START1'){
  laneStepByHub.P2++;
  lanePulse=1;
  sfx(770,0.03,'square',0.04);
  flash('P2 '+activeLaneForHub('P2'));
 }
}

function resetRun(){
 ducks=[];trains=[];popups=[];
 parked={};
 score=0;delivered=0;leftCount=0;wrongCount=0;failCount=0;
 combo=0;
 laneStepByHub={P1:0,P2:0};
 lanePulse=0;
 spawnHubStep=0;
 runMs=0;
 nextDuck=0;nextTrain=430;
 duckId=0;trainId=0;
 nameEntry=null;
 overRank=-1;
}

function startIntro(){
 state='intro';
 introStart=scene.time.now||0;
 stopMusic();
 startIntroMusic();
 hud.pause.setVisible(false);
 hud.title.setVisible(false);
 hud.tip.setVisible(false);
 hud.start.setVisible(false);
 hud.board.setVisible(false);
 scene.tweens.killTweensOf(hud.center);
 hud.center.setAlpha(0);
}

function finishIntro(){
 if(state!=='intro')return;
 stopIntroMusic();
 state='menu';
 hud.pause.setVisible(false);
 hud.title.setVisible(true).setText('DUCK EXPRESS');
 hud.tip.setVisible(true).setText('READY');
 hud.start.setVisible(true).setText('PRESS SPACE TO PLAY');
 hud.board.setVisible(true).setText(scoreBoardText());
}

function startRun(){
 state='play';
 setupRoutes();
 resetRun();
 stopIntroMusic();
 startMusic();
 sfx(420,0.06,'square',0.06);
 hud.pause.setVisible(false);
 hud.title.setVisible(false);
 hud.tip.setVisible(false);
 hud.start.setVisible(false);
 hud.board.setVisible(false);
 hud.center.setAlpha(0);
}

function startBriefing(){
 state='brief';
 briefingStart=scene.time.now||0;
 stopIntroMusic();
 hud.pause.setVisible(false);
 hud.title.setVisible(false);
 hud.tip.setVisible(false);
 hud.start.setVisible(false);
 hud.board.setVisible(false);
 scene.tweens.killTweensOf(hud.center);
 hud.center.setAlpha(0);
}

function endRun(){
 if(state==='over'||state==='name')return;
 stopMusic();
 sfx(120,0.16,'sawtooth',0.07);
 if(shouldAskName(score)){
  state='name';
  nameEntry={chars:['A','A','A'],idx:0};
  hud.pause.setVisible(false);
  hud.title.setVisible(false);
  hud.tip.setVisible(false);
  hud.start.setVisible(false);
  hud.board.setVisible(false);
  scene.tweens.killTweensOf(hud.center);
  hud.center.setAlpha(0);
  return;
 }
 state='over';
 overRank=recordScore(score,'CPU');
 hud.pause.setVisible(false);
 hud.title.setVisible(false);
 hud.tip.setVisible(false);
 hud.start.setVisible(false);
 hud.board.setVisible(false);
}

function update(time,dt){
 tNow=time;
 if(state==='play')tickGame(dt);
 lanePulse=Math.max(0,lanePulse-dt*0.0035);

 g.clear();
 beginLabels();
 if(state==='intro'){
  drawBackground();
  drawIntro(time);
  drawFrame();
  endLabels();
  drawHUD();
  return;
 }
 if(state==='brief'){
  drawBackground();
  drawBriefing(time);
  drawFrame();
  endLabels();
  drawHUD();
  return;
 }
 if(state==='over'){
  drawBackground();
  drawGameOver(time);
  drawFrame();
  endLabels();
  drawHUD();
  return;
 }
 if(state==='name'){
  drawBackground();
  drawLanes();
  drawStations();
  drawNameEntry();
  drawFrame();
  endLabels();
  drawHUD();
  return;
 }
 drawBackground();
 drawLanes();
 drawStations();
 if(gameMode==='2p')drawTwoPlayerGuides();
 drawParkedTrains();
 drawMovingTrains();
 if(state==='menu')drawMenu(time);
 if(state==='pause')drawPause();
 if(state==='name')drawNameEntry();
 drawFrame();
 endLabels();
 drawHUD();
}

function tickGame(dt){
 runMs+=dt;
 if(tNow>=nextDuck)spawnDuck();
 if(tNow>=nextTrain)spawnTrain();

 for(let i=ducks.length-1;i>=0;i--){
  const d=ducks[i];
  d.p-=dt;
  if(d.p<=0){
   ducks.splice(i,1);
   leftCount++;
   failCount++;
   combo=0;
   score=Math.max(0,score-8);
   scene.cameras.main.shake(80,0.002);
   sfx(160,0.14,'sawtooth',0.07);
   addPopup(126,474,'-8',0xff9d9d);
   endRun();
   return;
  }
 }

 const spdMul=speedMul();
 const waitingByHub={P1:[],P2:[]};
 for(const tr of trains){
  if(!tr.locked)waitingByHub[tr.hub].push(tr);
 }
 const slotById={};
 for(const hub of activeHubs()){
  const arr=waitingByHub[hub].sort((a,b)=>a.lock-b.lock);
  for(let i=0;i<arr.length;i++)slotById[arr[i].id]=i;
 }
 for(let i=trains.length-1;i>=0;i--){
  const tr=trains[i];
  if(!tr.locked){
   const arr=waitingByHub[tr.hub];
   const idx=slotById[tr.id]||0;
   const shift=idx-(arr.length-1)*0.5;
   const pos=hubPos(tr.hub);
   tr.lock-=dt;
   tr.lane=activeLaneForHub(tr.hub);
   tr.route=routeId(tr.hub,tr.lane);
   tr.x=pos.x+shift*46;
   tr.y=pos.y+20+Math.abs(shift)*3;
   tr.bob+=dt*0.007;
   if(tr.lock<=0)tr.locked=true;
   continue;
  }
  tr.t+=tr.speed*dt*spdMul;
  const p=sampleLane(lanes[tr.route],tr.t);
  tr.x=p.x;
  tr.y=p.y;
  tr.bob+=dt*0.007;
  if(tr.t>=1){arrive(tr);trains.splice(i,1);}
 }

 for(let i=popups.length-1;i>=0;i--){
  const p=popups[i];
  p.y-=dt*0.03;
  p.a-=dt*0.0018;
  if(p.a<=0)popups.splice(i,1);
 }

 if(failCount>=LOSS_LIMIT)endRun();
}

function speedMul(){
 return 1+Math.min(2.8,runMs/45000);
}

function spawnDuck(){
 const t=LANE_IDS[(Math.random()*4)|0];
 const patience=Math.max(1100,3900-runMs*0.03);
 ducks.push({id:++duckId,t,p:patience,m:patience});
 quackSfx();
 const interval=Math.max(230,1280-runMs*0.028)+Math.random()*240;
 nextDuck=tNow+interval;
}

function activeLaneForHub(hub){return LANE_IDS[laneStepByHub[hub]&3];}

function pendingDecisionTrain(hub){
 let best=null;
 for(const tr of trains){
  if(tr.locked)continue;
  if(hub&&tr.hub!==hub)continue;
  if(!best||tr.lock<best.lock)best=tr;
 }
 return best;
}

function spawnTrain(){
 if(!ducks.length){
  nextTrain=tNow+180;
  return;
 }
 if(trains.length>=MAX_ACTIVE_TRAINS){
  nextTrain=tNow+240;
  return;
 }
 const d=ducks.length?ducks.shift():null;
 const hub=pickSpawnHub();
 const lane=activeLaneForHub(hub);
 const pos=hubPos(hub);
 const base=0.00024+Math.min(0.0003,runMs*0.00000001);
 trains.push({
  id:++trainId,
  hub,
  lane,
  route:routeId(hub,lane),
  lock:ROUTE_DECISION_MS,
  locked:false,
  duck:d,
  t:0,
  speed:base*(0.94+Math.random()*0.14),
  x:pos.x,
  y:pos.y,
  bob:Math.random()*6
 });
 const interval=Math.max(260,1440-runMs*0.032)+Math.random()*280;
 nextTrain=tNow+interval;
}

function arrive(tr){
 parkTrain(tr);
 if(!tr.duck)return;
 if(tr.duck.t===tr.lane){
  const perfect=tr.duck.p/tr.duck.m>.55;
  combo++;
  delivered++;
  const mult=1+Math.min(2.4,(combo-1)*0.14);
  const add=Math.round((perfect?30:12)*mult);
  score+=add;
  if(perfect)scene.cameras.main.shake(40,0.001);
  sfx(perfect?930:740,perfect?0.05:0.04,'square',0.05);
  addPopup(tr.x,tr.y-20,'+'+add,perfect?0xc8f8ff:0xffffff);
 }else{
  wrongCount++;
  failCount++;
  combo=0;
  score=Math.max(0,score-10);
  scene.cameras.main.shake(110,0.003);
  sfx(110,0.17,'sawtooth',0.08);
  addPopup(tr.x,tr.y-20,'-10',0xff9d9d);
  endRun();
 }
}

function parkTrain(tr){
 const pos=parkSlot(tr.lane,tr.hub);
 parked[tr.route]={x:pos.x,y:pos.y,duck:tr.duck,hub:tr.hub,lane:tr.lane};
}

function parkSlot(lane,hub){
 const st=LANE_META[lane].station;
 if(gameMode==='2p'){
  const xOff=hub==='P1'?-58:8;
  const yOff=(lane==='A'||lane==='B')?54:-54;
  return {x:st.x+xOff,y:st.y+yOff};
 }
 if(lane==='A'||lane==='B')return{x:st.x-44,y:st.y+52};
 return{x:st.x-44,y:st.y-52};
}

function drawBackground(){
 g.fillStyle(C_BG0,1);
 g.fillRect(0,0,W,H);

 for(const s of deco.stars){
  const tw=0.3+0.7*(0.5+0.5*Math.sin(tNow*0.0018*s.s+s.p));
  g.fillStyle(0xd8ecff,tw);
  g.fillRect((s.x)|0,(s.y)|0,2,2);
 }

 g.fillStyle(C_BG1,1);
 g.fillRect(0,330,W,H-330);
 g.lineStyle(1,0x26415f,0.45);
 for(let y=330;y<=H;y+=22){g.beginPath();g.moveTo(90,y);g.lineTo(710,y);g.strokePath();}
 for(let x=110;x<=690;x+=38){g.beginPath();g.moveTo(x,330);g.lineTo(CENTER.x+(x-CENTER.x)*1.45,H);g.strokePath();}
}

function drawLanes(){
 for(const def of routeDefs){
  const active=def.lane===activeLaneForHub(def.hub);
  drawLane(def,active);
 }
 if(gameMode==='2p')drawIntersectionPulse();
}

function drawLane(def,active){
 const {ctrl,color,id}=def;
 const inactiveAlpha=gameMode==='2p'?0.42:1;
 const baseAlpha=active?1:inactiveAlpha;
 g.lineStyle(16,0x10192b,1);
 strokePath(ctrl);
 g.lineStyle(active?8:5,active?0xffffff:color,baseAlpha);
 strokePath(ctrl);
 drawSleepers(lanes[id],active);
 const d=lanes[id],trailShift=(tNow*0.00055)%0.24;
 for(let t=trailShift;t<=1;t+=0.24){
  const p=sampleLane(d,t);
  g.fillStyle(active?0xffffff:color,active?0.95:(gameMode==='2p'?0.28:0.45));
  g.fillRect((p.x-2)|0,(p.y-2)|0,4,4);
 }
 if(active){
  g.lineStyle(2,gameMode==='2p'?HUB_THEME[def.hub].accent:color,0.9);
  strokePath(ctrl);
 }
}

function drawStations(){
 drawHubs();
 for(const id of LANE_IDS){
  const m=LANE_META[id];
  drawStation(m.station.x,m.station.y,m.color,id);
 }
}

function drawHubs(){
 const hubs=activeHubs();
 for(const hub of hubs){
  const theme=HUB_THEME[hub]||{label:'CENTER',accent:0x8fc8ff};
  const pos=hubPos(hub);
  const curr=activeLaneForHub(hub);
  const pend=pendingDecisionTrain(hub);
  const nextLane=pend?(pend.duck?pend.duck.t:'-'):'-';
  const title=gameMode==='2p'?(hub+' '+theme.label):'HUB';
  g.fillStyle(0x0f223d,1);g.fillRect(pos.x-56,pos.y-30,112,60);
  g.lineStyle(3,gameMode==='2p'?theme.accent:0x8fc8ff,1);g.strokeRect(pos.x-56,pos.y-30,112,60);
  g.fillStyle(gameMode==='2p'?theme.accent:0x79c6ff,1);g.fillRect(pos.x-56,pos.y-30,112,12);
  label(pos.x,pos.y+2,title,13,'#e9f5ff',.5,.5,FONT_UI);
  if(gameMode==='2p'){
   label(pos.x,pos.y-12,hub==='P1'?'SPACE':'ENTER',10,'#102039',.5,.5,FONT_NUM);
   drawSignalTower(pos.x+(hub==='P1'?-74:74),pos.y+4,theme.accent);
  }
  panel(pos.x-84,pos.y+38,168,26,0x102038,0x4e73aa,1,0);
  label(pos.x-76,pos.y+51,'NOW',10,'#9dc8ff',0,.5,FONT_NUM);
  label(pos.x-28,pos.y+51,curr,16,toHex(LANE_META[curr].color),.5,.5,FONT_UI);
  label(pos.x+6,pos.y+51,'NEXT',10,'#9dc8ff',0,.5,FONT_NUM);
  label(pos.x+56,pos.y+51,nextLane,16,nextLane==='-'?'#9db0cb':toHex(LANE_META[nextLane].color),.5,.5,FONT_UI);
 }
}

function drawStation(x,y,c,t){
 g.fillStyle(0x0a1629,1);g.fillRect(x-56,y-36,112,72);
 g.fillStyle(0x132846,1);g.fillRect(x-50,y-30,100,60);
 g.lineStyle(3,c,1);g.strokeRect(x-56,y-36,112,72);
 g.fillStyle(c,1);g.fillRect(x-56,y-36,112,12);
 g.fillStyle(tint(c,1.16),1);g.fillRect(x-56,y-36,112,4);
 g.fillStyle(0x274c78,1);g.fillRect(x-34,y-12,20,14);g.fillRect(x-8,y-12,20,14);g.fillRect(x+18,y-12,20,14);
 g.fillStyle(0xd8ecff,0.85);g.fillRect(x-30,y-10,12,10);g.fillRect(x-4,y-10,12,10);g.fillRect(x+22,y-10,12,10);
 g.fillStyle(0x2d3c55,1);g.fillRect(x-62,y+36,124,8);
 g.fillStyle(0x90a9c9,1);g.fillRect(x-62,y+34,124,2);
 label(x,y+15,'STATION',9,'#8eb7e4',.5,.5,FONT_NUM);
 label(x,y-20,t,21,'#f0f8ff',.5,.5,FONT_UI);
}

function drawQueuePanel(){
 panel(16,326,206,124,0x102038,0x4e73aa,1,0);
 g.fillStyle(0x7aa8e2,0.3);g.fillRect(16,326,206,18);
 label(28,335,'QUEUE',12,'#deefff',0,.5,FONT_NUM);
 label(206,335,'x'+ducks.length,12,'#c8e4ff',1,.5,FONT_NUM);
 g.fillStyle(0x132a48,1);g.fillRect(26,352,186,88);
 g.lineStyle(2,0x4e73aa,0.95);g.strokeRect(26,352,186,88);
 const slots=[ducks[0],ducks[1],ducks[2],ducks[3]];
 for(let i=0;i<4;i++){
  const d=slots[i];
  const x=46+i*43;
  g.fillStyle(0x0f2038,1);g.fillRect(x-16,366,32,62);
  g.lineStyle(1,0x365a87,1);g.strokeRect(x-16,366,32,62);
  if(!d){
   label(x,399,'--',10,'#6f8fb6',.5,.5,FONT_NUM);
   continue;
  }
  label(x,377,d.t,16,toHex(LANE_META[d.t].color),.5,.5,FONT_UI);
  drawDuck(x,404,0.72);
 }
}

function drawTwoPlayerGuides(){
 const leftLane=activeLaneForHub('P1');
 const rightLane=activeLaneForHub('P2');
 const leftNext=pendingDecisionTrain('P1');
 const rightNext=pendingDecisionTrain('P2');
 const leftNeed=leftNext&&leftNext.duck?leftNext.duck.t:'-';
 const rightNeed=rightNext&&rightNext.duck?rightNext.duck.t:'-';

 panel(14,116,170,86,0x0f2038,HUB_THEME.P1.accent,0.95,0);
 label(24,131,'P1 LEFT HUB',11,'#ffd7ad',0,.5,FONT_NUM);
 label(24,153,'KEY',10,'#9db8d8',0,.5,FONT_NUM);
 label(64,153,'SPACE',13,'#ffffff',0,.5,FONT_UI);
 label(24,176,'NOW',10,'#9db8d8',0,.5,FONT_NUM);
 label(62,176,leftLane,16,toHex(LANE_META[leftLane].color),0,.5,FONT_UI);
 label(106,176,'NEXT',10,'#9db8d8',0,.5,FONT_NUM);
 label(154,176,leftNeed,16,leftNeed==='-'?'#9db0cb':toHex(LANE_META[leftNeed].color),.5,.5,FONT_UI);

 panel(W-184,116,170,86,0x0f2038,HUB_THEME.P2.accent,0.95,0);
 label(W-174,131,'P2 RIGHT HUB',11,'#bfe8ff',0,.5,FONT_NUM);
 label(W-174,153,'KEY',10,'#9db8d8',0,.5,FONT_NUM);
 label(W-134,153,'ENTER',13,'#ffffff',0,.5,FONT_UI);
 label(W-174,176,'NOW',10,'#9db8d8',0,.5,FONT_NUM);
 label(W-136,176,rightLane,16,toHex(LANE_META[rightLane].color),0,.5,FONT_UI);
 label(W-92,176,'NEXT',10,'#9db8d8',0,.5,FONT_NUM);
 label(W-30,176,rightNeed,16,rightNeed==='-'?'#9db0cb':toHex(LANE_META[rightNeed].color),.5,.5,FONT_UI);
}

function drawParkedTrains(){
 for(const p of Object.values(parked)){
  g.fillStyle(0x000000,0.24);g.fillEllipse(p.x,p.y+15,56,12);
  drawTrain(p.x,p.y,0xd7e6ff,0.92);
  if(p.duck)drawDuck(p.x-18,p.y-12,0.74);
  if(gameMode==='2p')label(p.x+26,p.y-18,p.hub,9,'#ffe8b0',.5,.5,FONT_NUM);
 }
}

function drawMovingTrains(){
 for(const tr of trains){
  const y=tr.y+Math.sin(tr.bob)*1.25;
  g.fillStyle(0xdce8ff,0.18);
  g.fillEllipse(tr.x-40,y-16+Math.sin(tr.bob*0.6)*2,10,6);
  g.fillEllipse(tr.x-47,y-20+Math.sin(tr.bob*0.5)*2,8,5);
  g.fillStyle(0x000000,0.25);g.fillRect(tr.x-30,tr.y+12,60,7);
  drawTrain(tr.x,y,0xf3f8ff,1.18);
  if(tr.duck){
   const need=tr.duck.t,meta=LANE_META[need],ok=need===tr.lane;
   g.fillStyle(meta.color,1);g.fillRect(tr.x+20,y-34,48,20);
   label(tr.x+44,y-24,need,13,'#091426',.5,.5,FONT_NUM);
   if(gameMode==='2p'){
    const ac=HUB_THEME[tr.hub].accent;
    g.fillStyle(ac,1);g.fillRect(tr.x-46,y-34,24,12);
    label(tr.x-34,y-28,tr.hub,9,'#102039',.5,.5,FONT_NUM);
   }
   if(!tr.locked){
    label(tr.x-34,y+24,Math.max(0,tr.lock/1000).toFixed(1)+'s',11,'#ffe3a0',0,.5,FONT_NUM);
   }else if(!ok){
    label(tr.x-12,y+24,'X',15,'#ffb4b4',0,.5,FONT_UI);
   }
   drawDuck(tr.x-24,y-13,1.02);
  }
 }
 for(const p of popups){
  const t=label(p.x,p.y,p.t,12,toHex(p.c),.5,.5,FONT_NUM);
  t.setStroke('#08111f',2);
  t.setAlpha(Math.max(0,p.a));
 }
}

function drawPause(){
 g.fillStyle(0x000000,0.52);g.fillRect(0,0,W,H);
 panel(W/2-170,H/2-56,340,112,0x0c1a30,0x355f8d,0.95,14);
 label(W/2,H/2+34,'ESC resume',15,'#b8d9fa',.5,.5,FONT_NUM);
}

function drawNameEntry(){
 g.fillStyle(0x000000,0.76);g.fillRect(0,0,W,H);
 panel(W/2-250,176,500,248,0x0c1a30,0x5d88c2,0.98,0);
 g.fillStyle(0x78b5ff,0.25);g.fillRect(W/2-250,176,500,28);
 label(W/2,194,'NEW HIGH SCORE',16,'#d9edff',.5,.5,FONT_NUM);
 label(W/2,228,'ENTER YOUR INITIALS',24,'#eff7ff',.5,.5,FONT_UI);
 label(W/2,254,'A/D or SPACE to rotate letter',13,'#9dc8ff',.5,.5,FONT_NUM);
 panel(W/2-178,286,356,92,0x102038,0x6f90c2,1,0);
 for(let i=0;i<3;i++){
  const x=W/2-82+i*82;
  const active=i===nameEntry.idx;
  panel(x-30,306,60,54,active?0x1d3558:0x142947,active?0xbfe3ff:0x3f6fa7,1,0);
  label(x,333,nameEntry.chars[i],40,active?'#ffffff':'#d6e9ff',.5,.5,FONT_UI);
  if(active){
   label(x,299,'^',15,'#ffe39e',.5,.5,FONT_NUM);
   label(x,367,'v',15,'#ffe39e',.5,.5,FONT_NUM);
  }
 }
 label(W/2,392,'ENTER confirms letter   ESC submits now',13,'#c8dfff',.5,.5,FONT_NUM);
 label(W/2,410,'SCORE '+String(score).padStart(5,'0'),18,'#ffffff',.5,.5,FONT_NUM);
}

function drawIntro(time){
 const p=Math.max(0,Math.min(1,(time-introStart)/INTRO_MS));
 const enter=Math.max(0,Math.min(1,p/0.35));
 const trainY=352+Math.sin(time*0.01)*2;
 const trainX=W/2+Math.sin(time*0.003)*5;
 const titleAlpha=0.2+0.8*enter;
 const scale=1+0.06*enter;

 g.fillStyle(0x081326,0.9);g.fillRect(110,94,580,446);
 g.lineStyle(3,0x4e73aa,0.95);g.strokeRect(110,94,580,446);
 g.fillStyle(0x6aa6e6,0.1);g.fillEllipse(W/2,170,430,120);
 g.fillStyle(0xff9ec4,0.06);g.fillEllipse(W/2,520,460,100);

 for(let y=108;y<530;y+=4){
  g.fillStyle(0xffffff,0.03);
  g.fillRect(118,y,564,1);
 }

 g.lineStyle(5,0x2c435f,1);
 g.beginPath();g.moveTo(166,366);g.lineTo(634,366);g.strokePath();
 g.beginPath();g.moveTo(166,386);g.lineTo(634,386);g.strokePath();
 for(let x=176;x<634;x+=18){
  g.lineStyle(2,0x6b7f9a,0.7);
  g.beginPath();g.moveTo(x,361);g.lineTo(x,391);g.strokePath();
 }

 drawFlower(170+Math.sin(time*0.002)*2,398,1.2,0xff8ec3,0xffe17a,0x6cbf71);
 drawFlower(208+Math.sin(time*0.0024+1)*2,402,0.95,0x8fd3ff,0xfff2a6,0x69b96f);
 drawFlower(240+Math.sin(time*0.0022+2)*2,400,1.05,0xd6a0ff,0xfff2a6,0x6fbf74);
 drawFlower(560+Math.sin(time*0.0021+3)*2,398,1.15,0xff9fb8,0xffde72,0x69be73);
 drawFlower(594+Math.sin(time*0.0025+4)*2,402,0.98,0x9ae1ff,0xfff4a2,0x6bbf74);
 drawFlower(630+Math.sin(time*0.002+5)*2,400,1.08,0xc99cff,0xffe17a,0x69bc70);

 drawTrain(trainX,trainY-38,0x8bbdff,1.44*scale);
 drawDuck(trainX-34*scale,trainY-58*scale,1.2*scale);

 label(W/2,150,'DUCK EXPRESS',64,'#f2f8ff',.5,.5,FONT_UI).setAlpha(titleAlpha);
 label(W/2,196,'SELECT GAME MODE',18,'#9fd2ff',.5,.5,FONT_NUM);

 panel(W/2-248,430,232,86,0x102038,gameMode==='1p'?0xb8deff:0x4e73aa,1,0);
 label(W/2-132,454,'1 PLAYER',24,'#f0f7ff',.5,.5,FONT_UI);
 label(W/2-132,482,'SPACE',16,'#9dc8ff',.5,.5,FONT_NUM);
 label(W/2-132,500,'SOLO DISPATCH',11,'#b6d8ff',.5,.5,FONT_NUM);

 panel(W/2+16,430,232,86,0x102038,gameMode==='2p'?0xb8deff:0x4e73aa,1,0);
 label(W/2+132,454,'2 PLAYERS',24,'#f0f7ff',.5,.5,FONT_UI);
 label(W/2+132,482,'ENTER',16,'#9dc8ff',.5,.5,FONT_NUM);
 label(W/2+132,500,'P1 SPACE / P2 ENTER',11,'#b6d8ff',.5,.5,FONT_NUM);

 label(W/2,533,'SPACE = 1P   ENTER = 2P',15,'#d8ecff',.5,.5,FONT_NUM);
}

function drawMenu(time){
 const y=238+Math.sin(time*0.004)*7;
 drawDuck(332,y,1.56);
 drawTrain(452,y+25,0x73a5ff,1.2);
 panel(W/2-210,332,420,54,0x102038,0x4e73aa,1,0);
 label(W/2,350,'MODE '+(gameMode==='2p'?'2 PLAYER':'1 PLAYER')+' READY',16,'#f0f7ff',.5,.5,FONT_UI);
 label(W/2,371,'PRESS SPACE OR ENTER TO PLAY',12,'#9dc8ff',.5,.5,FONT_NUM);
 panel(W/2-120,390,240,24,0x102038,0x4e73aa,1,0);
 label(W/2,402,'TOP SCORES',13,'#bfe2ff',.5,.5,FONT_NUM);
 hud.board.setVisible(true).setText(scoreBoardText());
}

function drawBriefing(time){
 const elapsed=(scene.time.now||0)-briefingStart;
 const ready=elapsed>=BRIEFING_MIN_MS;
 g.fillStyle(0x000000,0.74);g.fillRect(0,0,W,H);
 panel(W/2-250,188,500,224,0x0d1c34,0x4e73aa,0.98,0);
 g.fillStyle(0x79c6ff,0.09);g.fillEllipse(W/2,216,300,74);
 label(W/2,200,(gameMode==='2p'?'2 PLAYER':'1 PLAYER')+' MODE LOCKED',14,'#cfe7ff',.5,.5,FONT_NUM);
 label(W/2,244,'HOW TO PLAY',30,'#eff7ff',.5,.5,FONT_UI);
 if(gameMode==='2p'){
  label(W/2,286,'1) MATCH DUCK LETTER TO STATION',14,'#cde5ff',.5,.5,FONT_NUM);
  label(W/2,314,'2) P1 SPACE = LEFT HUB',14,'#ffd6a2',.5,.5,FONT_NUM);
  label(W/2,338,'3) P2 ENTER = RIGHT HUB',14,'#bfe8ff',.5,.5,FONT_NUM);
 }else{
  label(W/2,296,'1) MATCH DUCK LETTER TO STATION',15,'#cde5ff',.5,.5,FONT_NUM);
  label(W/2,326,'2) SPACE CHANGES DIRECTION',15,'#9fd2ff',.5,.5,FONT_NUM);
 }
 label(W/2,360,'ONE MISTAKE ENDS THE RUN',14,'#ffd3d3',.5,.5,FONT_NUM);
 if(ready){
  label(W/2,382,gameMode==='2p'?'PRESS SPACE OR ENTER TO BEGIN':'PRESS SPACE TO BEGIN',18,'#ffffff',.5,.5,FONT_UI);
 }else{
  const left=Math.max(0,(BRIEFING_MIN_MS-elapsed)/1000);
  label(W/2,382,'GET READY '+left.toFixed(1),16,'#d4e8ff',.5,.5,FONT_NUM);
 }
}

function drawGameOver(time){
 const bob=Math.sin(time*0.003);
 g.fillStyle(0x000000,0.72);g.fillRect(0,0,W,H);

 g.fillStyle(0x75b7ff,0.09);g.fillEllipse(W/2,118,380,120);
 g.fillStyle(0xff9ec4,0.08);g.fillEllipse(W/2,504,420,130);

 panel(86,84,628,432,0x0b162b,0x4e73aa,0.98,0);
 g.lineStyle(2,0x96c5ff,0.35);
 for(let y=94;y<504;y+=4){
  g.beginPath();g.moveTo(96,y);g.lineTo(704,y);g.strokePath();
 }

 label(W/2,130,'RUN OVER',56,'#eff7ff',.5,.5,FONT_UI);
 label(W/2,172,'ARCADE SCORE REPORT',14,'#a9d4ff',.5,.5,FONT_NUM);

 drawDuckSticker(132,128+bob*2,0.92,0xffd780);
 drawDuckSticker(668,128-bob*2,0.92,0x9fd7ff);
 drawDuckSticker(132,488-bob*2,0.98,0xffb3cb);
 drawDuckSticker(668,488+bob*2,0.98,0xbce6ff);
 drawDuckSticker(W/2-248,128,0.72,0xd2b5ff);
 drawDuckSticker(W/2+248,128,0.72,0xc4f1a7);

 panel(120,200,300,196,0x102038,0x4e73aa,1,0);
 label(270,224,'THIS RUN',14,'#cbe6ff',.5,.5,FONT_NUM);
 label(270,266,String(score).padStart(5,'0'),46,'#ffffff',.5,.5,FONT_UI);
 label(270,300,'DELIVERED '+delivered,15,'#bfe0ff',.5,.5,FONT_NUM);
 label(270,326,'BEST '+best,15,'#bfe0ff',.5,.5,FONT_NUM);
 if(overRank>-1){
  label(270,356,'NEW RANK #'+(overRank+1),17,'#ffde9b',.5,.5,FONT_UI);
 }else{
  label(270,356,'KEEP PUSHING',15,'#a6c7ea',.5,.5,FONT_NUM);
 }

 panel(448,200,236,256,0x102038,0x4e73aa,1,0);
 label(566,224,'TOP SCORES',14,'#cbe6ff',.5,.5,FONT_NUM);
 for(let i=0;i<5;i++){
  const e=topScores[i];
  const y=258+i*34;
  g.fillStyle(i===0?0x1a3556:0x162d4a,1);g.fillRect(462,y-14,208,26);
  label(476,y,(i+1)+'.',13,'#9fc4eb',0,.5,FONT_NUM);
  label(506,y,e?e.name:'---',15,'#f2f8ff',0,.5,FONT_UI);
  label(664,y,String(e?e.score:0),13,'#d6e9ff',1,.5,FONT_NUM);
 }

 label(W/2,486,'PRESS SPACE TO PLAY AGAIN',21,'#ffffff',.5,.5,FONT_UI);
 label(W/2,510,'ONE MORE RUN',13,'#c4dfff',.5,.5,FONT_NUM);
}

function drawFrame(){
 g.lineStyle(3,0x4e73aa,1);
 g.strokeRect(3,3,W-6,H-6);
 g.lineStyle(1,0x90b5ea,0.5);
 g.strokeRect(8,8,W-16,H-16);
 for(let i=0;i<H;i+=3){
  g.fillStyle(0x000000,0.05);
  g.fillRect(0,i,W,1);
 }
}

function drawHUD(){
 if(state==='name'||state==='intro'||state==='brief'||state==='over'){
  hud.info.setText('');
  hud.status.setText('');
  return;
 }
 panel(10,548,780,42,C_PANEL,C_PANEL_BORDER,0.95,10);
 const secs=Math.floor(runMs/1000),f=failCount/LOSS_LIMIT;
 hud.score.setText((gameMode==='2p'?'2P ':'1P ')+'SCORE '+String(score).padStart(5,'0')+'  HI '+String(best).padStart(5,'0')+'  T '+secs+'s');
 hud.status.setText('');
 hud.info.setText(state==='play'?(gameMode==='2p'?'LEFT HUB: SPACE   RIGHT HUB: ENTER   ESC pause':'SPACE switch lane   ESC pause'):state==='name'?'A/D rotate   ENTER confirm':'');
 hud.status.setColor(f>0?'#ffd4d4':'#e6f2ff');
 hud.info.setColor('#b8d9ff');
 g.fillStyle(0x1a3150,1);g.fillRect(640,557,136,12);
 g.fillStyle(f>0?0xff8a8a:0x6fc4ff,1);g.fillRect(640,557,136*f,12);
}

function drawFlower(x,y,s,petal,center,leaf){
 const u=Math.max(0.7,s);
 g.lineStyle(2,leaf,0.9);
 g.beginPath();g.moveTo(x,y+10*u);g.lineTo(x,y-8*u);g.strokePath();
 g.fillStyle(leaf,1);g.fillEllipse(x-5*u,y+2*u,7*u,4*u);g.fillEllipse(x+5*u,y-1*u,7*u,4*u);
 g.fillStyle(petal,1);
 g.fillEllipse(x,y-13*u,8*u,8*u);
 g.fillEllipse(x-6*u,y-8*u,8*u,8*u);
 g.fillEllipse(x+6*u,y-8*u,8*u,8*u);
 g.fillEllipse(x-4*u,y-16*u,8*u,8*u);
 g.fillEllipse(x+4*u,y-16*u,8*u,8*u);
 g.fillStyle(center,1);g.fillEllipse(x,y-12*u,6*u,6*u);
}

function drawDuckSticker(x,y,s,bg){
 const u=Math.max(0.7,s);
 g.fillStyle(bg,0.25);g.fillEllipse(x,y,54*u,54*u);
 g.lineStyle(2,tint(bg,1.08),0.9);g.strokeEllipse(x,y,54*u,54*u);
 drawDuck(x,y+4*u,1.05*u);
 g.fillStyle(0xffffff,0.65);g.fillEllipse(x-12*u,y-12*u,10*u,6*u);
}

function initAudio(){
 if(!scene.sound||!scene.sound.context)return null;
 return scene.sound.context;
}

function sfx(freq,dur,type='square',vol=0.05){
 const ctx=initAudio();
 if(!ctx)return;
 const t=ctx.currentTime;
 const o=ctx.createOscillator(),g2=ctx.createGain();
 o.type=type;
 o.frequency.setValueAtTime(freq,t);
 g2.gain.setValueAtTime(vol,t);
 g2.gain.exponentialRampToValueAtTime(0.001,t+dur);
 o.connect(g2);g2.connect(ctx.destination);
 o.start(t);o.stop(t+dur);
}

function quackSfx(){
 const ctx=initAudio();
 if(!ctx)return;
 const t=ctx.currentTime;
 quackBurst(ctx,t,800,530,0.028);
 quackBurst(ctx,t+0.05,740,500,0.024);
}

function quackBurst(ctx,start,from,to,vol){
 const o=ctx.createOscillator(),g2=ctx.createGain();
 o.type='square';
 o.frequency.setValueAtTime(from,start);
 o.frequency.exponentialRampToValueAtTime(to,start+0.08);
 g2.gain.setValueAtTime(0.0001,start);
 g2.gain.exponentialRampToValueAtTime(vol,start+0.01);
 g2.gain.exponentialRampToValueAtTime(0.001,start+0.09);
 o.connect(g2);g2.connect(ctx.destination);
 o.start(start);o.stop(start+0.1);
}

function introMusicStep(){
 const arp=[659,784,988,1175,988,784,659,784];
 const pad=[220,247,262,247];
 const a=arp[introBeat&7],p=pad[(introBeat>>1)&3];
 sfx(a,0.14,'triangle',0.028);
 if((introBeat&1)===0)sfx(p,0.2,'square',0.016);
 if((introBeat&3)===0)sfx(110,0.06,'sine',0.012);
 introBeat++;
}

function startIntroMusic(){
 if(introAudioOn)return;
 const ctx=initAudio();
 if(!ctx)return;
 if(ctx.state==='suspended')ctx.resume();
 introAudioOn=true;
 introBeat=0;
 introMusicStep();
 introMusicTick=setInterval(introMusicStep,190);
}

function stopIntroMusic(){
 if(!introAudioOn)return;
 introAudioOn=false;
 if(introMusicTick){clearInterval(introMusicTick);introMusicTick=0;}
}

function musicStep(){
 const melody=[523,659,784,659,523,659,880,659,523,659,784,659,523,494,440,494];
 const bass=[131,0,131,0,147,0,165,0,131,0,131,0,110,0,98,0];
 const m=melody[musicBeat&15],b=bass[musicBeat&15];
 if(m)sfx(m,0.11,'square',0.022);
 if(b)sfx(b,0.15,'triangle',0.03);
 if((musicBeat&3)===0)sfx(82,0.04,'square',0.018);
 musicBeat++;
}

function startMusic(){
 if(audioOn)return;
 const ctx=initAudio();
 if(!ctx)return;
 if(ctx.state==='suspended')ctx.resume();
 audioOn=true;
 musicBeat=0;
 musicStep();
 musicTick=setInterval(musicStep,160);
}

function stopMusic(){
 if(!audioOn)return;
 audioOn=false;
 if(musicTick){clearInterval(musicTick);musicTick=0;}
}

function flash(msg){
 hud.center.setText(msg).setAlpha(1);
 scene.tweens.killTweensOf(hud.center);
 scene.tweens.add({targets:hud.center,alpha:0,duration:820,ease:'Quad.easeOut'});
}

function addPopup(x,y,t,c){popups.push({x,y,t,c,a:1});}

function drawDuck(x,y,s){
 const u=Math.max(1,s);
 g.fillStyle(0x000000,0.23);g.fillEllipse(x,y+11*u,24*u,6*u);
 g.fillStyle(0xfff0b3,1);g.fillEllipse(x-2*u,y+1*u,20*u,14*u);
 g.fillStyle(0xffde77,1);g.fillEllipse(x-6*u,y-1*u,14*u,11*u);
 g.fillStyle(0xffd056,1);g.fillEllipse(x+3*u,y-8*u,10*u,8*u);
 g.fillStyle(0xf2b053,1);g.fillRect(x+9*u,y-6*u,8*u,3*u);
 g.fillStyle(0xf8c469,1);g.fillRect(x-10*u,y+4*u,7*u,3*u);
 g.fillStyle(0xedd06a,1);g.fillEllipse(x-5*u,y+3*u,8*u,5*u);
 g.fillStyle(0xffffff,1);g.fillRect(x+2*u,y-9*u,3*u,3*u);
 g.fillStyle(0x101010,1);g.fillRect(x+3*u,y-8*u,2*u,2*u);
}

function drawTrain(x,y,c,s){
 const u=Math.max(1,s);
 g.fillStyle(0x000000,0.3);g.fillRect(x-44*u,y+16*u,88*u,5*u);
 g.fillStyle(0x33475f,1);g.fillRect(x-46*u,y+18*u,92*u,3*u);
 g.fillStyle(0x8aa0b8,1);g.fillRect(x-46*u,y+16*u,92*u,1*u);
 g.fillStyle(c,1);g.fillRect(x-40*u,y-10*u,56*u,20*u);
 g.fillStyle(tint(c,1.15),1);g.fillRect(x-40*u,y-10*u,56*u,5*u);
 g.fillStyle(tint(c,0.95),1);g.fillRect(x+16*u,y-12*u,22*u,22*u);
 g.fillStyle(tint(c,1.08),1);g.fillRect(x+16*u,y-16*u,14*u,5*u);
 g.fillStyle(0x27394f,1);g.fillRect(x+30*u,y-20*u,5*u,10*u);
 g.fillStyle(0x314f76,1);
 g.fillRect(x-30*u,y-5*u,11*u,7*u);
 g.fillRect(x-15*u,y-5*u,11*u,7*u);
 g.fillRect(x,y-5*u,11*u,7*u);
 g.fillRect(x+20*u,y-7*u,10*u,7*u);
 g.fillStyle(0xffef98,1);g.fillRect(x+38*u,y+1*u,5*u,4*u);
 g.fillStyle(0x172336,1);
 g.fillEllipse(x-30*u,y+13*u,11*u,11*u);
 g.fillEllipse(x-12*u,y+13*u,11*u,11*u);
 g.fillEllipse(x+6*u,y+13*u,11*u,11*u);
 g.fillEllipse(x+24*u,y+13*u,11*u,11*u);
 g.fillStyle(0x9fb3ce,1);
 g.fillEllipse(x-30*u,y+13*u,4*u,4*u);
 g.fillEllipse(x-12*u,y+13*u,4*u,4*u);
 g.fillEllipse(x+6*u,y+13*u,4*u,4*u);
 g.fillEllipse(x+24*u,y+13*u,4*u,4*u);
 g.fillStyle(0xd9e8ff,1);g.fillRect(x-33*u,y+8*u,10*u,2*u);g.fillRect(x+16*u,y+8*u,11*u,2*u);
}

function drawSleepers(data,active){
 const step=0.08;
 for(let t=0.04;t<0.98;t+=step){
  const p=sampleLane(data,t);
  const p0=sampleLane(data,Math.max(0,t-0.01));
  const p1=sampleLane(data,Math.min(1,t+0.01));
  const dx=p1.x-p0.x,dy=p1.y-p0.y;
  const len=Math.hypot(dx,dy)||1;
  const nx=-dy/len,ny=dx/len;
  const half=active?8:6;
  g.lineStyle(active?2:1,0x7d8fa7,active?0.55:0.35);
  g.beginPath();
  g.moveTo(p.x-nx*half,p.y-ny*half);
  g.lineTo(p.x+nx*half,p.y+ny*half);
  g.strokePath();
 }
}

function drawIntersectionPulse(){
 g.fillStyle(0xc6e4ff,0.05);g.fillEllipse(CENTER.x,CENTER.y,74,42);
 g.lineStyle(2,0x9fc9ff,0.2);
 g.beginPath();g.moveTo(CENTER.x-26,CENTER.y-16);g.lineTo(CENTER.x+26,CENTER.y+16);g.strokePath();
 g.beginPath();g.moveTo(CENTER.x-26,CENTER.y+16);g.lineTo(CENTER.x+26,CENTER.y-16);g.strokePath();
 g.fillStyle(0x0f2038,1);g.fillRect(CENTER.x-18,CENTER.y-6,36,12);
 label(CENTER.x,CENTER.y,'X',11,'#cfe8ff',.5,.5,FONT_NUM);
}

function drawSignalTower(x,y,accent){
 g.fillStyle(0x203551,1);g.fillRect(x-4,y-18,8,26);
 g.fillStyle(0x2d486d,1);g.fillRect(x-8,y+8,16,4);
 g.fillStyle(accent,1);g.fillEllipse(x,y-16,8,8);
 g.fillStyle(0x6d7f96,1);g.fillEllipse(x,y-6,8,8);
}

function activeHubs(){return gameMode==='2p'?['P1','P2']:['P1'];}

function hubPos(hub){
 if(gameMode==='2p')return HUB_POS[hub];
 return CENTER;
}

function routeId(hub,lane){return hub+'_'+lane;}

function setupRoutes(){
 routeDefs=buildRouteDefs();
 routeById={};
 lanes={};
 for(const def of routeDefs){
  routeById[def.id]=def;
  lanes[def.id]=buildLaneData(def.ctrl);
 }
}

function buildRouteDefs(){
 const defs=[];
 if(gameMode==='2p'){
  for(const hub of ['P1','P2']){
   for(const lane of LANE_IDS){
    defs.push({id:routeId(hub,lane),hub,lane,color:LANE_META[lane].color,ctrl:LANE_CTRL_2P[hub][lane]});
   }
  }
  return defs;
 }
 for(const lane of LANE_IDS){
  defs.push({id:routeId('P1',lane),hub:'P1',lane,color:LANE_META[lane].color,ctrl:LANE_CTRL_1P[lane]});
 }
 return defs;
}

function pickSpawnHub(){
 if(gameMode!=='2p')return 'P1';
 const hubs=['P1','P2'];
 for(let k=0;k<2;k++){
  const hub=hubs[(spawnHubStep+k)&1];
  const pending=trains.filter(tr=>!tr.locked&&tr.hub===hub).length;
  if(pending<2){
   spawnHubStep=(spawnHubStep+k+1)&1;
   return hub;
  }
 }
 const hub=hubs[spawnHubStep&1];
 spawnHubStep=(spawnHubStep+1)&1;
 return hub;
}

function beginLabels(){labelCount=0;}
function endLabels(){for(let i=labelCount;i<labels.length;i++)labels[i].setVisible(false);}
function label(x,y,text,size,color,ox=.5,oy=.5,font=FONT_NUM){
 let t=labels[labelCount];
 if(!t){
  t=scene.add.text(0,0,'',{fontFamily:font,fontSize:size,color});
  t.setDepth(3);
  labels.push(t);
 }
 t.setVisible(true).setPosition(x,y).setText(text).setFontSize(size).setColor(color).setOrigin(ox,oy).setFontFamily(font).setAlpha(1);
 labelCount++;
 return t;
}

function panel(x,y,w,h,bg,border,alpha=1,r=10){
 g.fillStyle(bg,alpha);
 g.fillRect(x,y,w,h);
 g.lineStyle(2,border,0.95);
 g.strokeRect(x,y,w,h);
}

function strokePath(ctrl){
 g.beginPath();
 g.moveTo(ctrl[0].x,ctrl[0].y);
 for(let i=1;i<ctrl.length;i++)g.lineTo(ctrl[i].x,ctrl[i].y);
 g.strokePath();
}

function tint(v,f){
 const r=Math.max(0,Math.min(255,((v>>16)&255)*f|0));
 const g2=Math.max(0,Math.min(255,((v>>8)&255)*f|0));
 const b=Math.max(0,Math.min(255,(v&255)*f|0));
 return (r<<16)|(g2<<8)|b;
}

function loadScores(){
 try{
  const raw=localStorage.getItem(SCORE_KEY);
  if(!raw)return [];
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed))return [];
  return parsed.map(normalizeScoreEntry).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,5);
 }catch(e){
  return [];
 }
}

function saveScores(){
 try{localStorage.setItem(SCORE_KEY,JSON.stringify(topScores.slice(0,5)));}catch(e){}
}

function recordScore(v,name='AAA'){
 const n=Math.max(0,Math.floor(v));
 topScores.push({name:sanitizeInitials(name),score:n});
 topScores.sort((a,b)=>b.score-a.score);
 topScores=topScores.slice(0,5);
 best=topScores[0]?topScores[0].score:0;
 saveScores();
 for(let i=0;i<topScores.length;i++)if(topScores[i].score===n&&topScores[i].name===sanitizeInitials(name))return i;
 return -1;
}

function scoreBoardText(){
 let out='TOP 5';
 for(let i=0;i<5;i++){
  const e=topScores[i];
  out+='\n'+(i+1)+'. '+(e?e.name:'---')+'  '+(e?e.score:0);
 }
 return out;
}

function sanitizeInitials(name){
 const clean=String(name||'').toUpperCase().replace(/[^A-Z .]/g,'');
 return (clean+'AAA').slice(0,3);
}

function normalizeScoreEntry(v){
 if(Number.isFinite(v)&&v>=0)return {name:'AAA',score:Math.floor(v)};
 if(!v||typeof v!=='object'||!Number.isFinite(v.score)||v.score<0)return null;
 return {name:sanitizeInitials(v.name),score:Math.floor(v.score)};
}

function shouldAskName(v){
 if(!Number.isFinite(v)||v<0)return false;
 if(topScores.length<5)return true;
 return v>=topScores[topScores.length-1].score;
}

function rotateInitial(dir){
 if(!nameEntry)return;
 const i=nameEntry.idx;
 const cur=nameEntry.chars[i];
 let p=NAME_ALPHABET.indexOf(cur);
 if(p<0)p=0;
 p=(p+dir+NAME_ALPHABET.length)%NAME_ALPHABET.length;
 nameEntry.chars[i]=NAME_ALPHABET[p];
}

function confirmInitial(){
 if(!nameEntry)return;
 sfx(920,0.03,'square',0.04);
 if(nameEntry.idx<2){nameEntry.idx++;return;}
 submitInitials();
}

function submitInitials(){
 if(!nameEntry)return;
 const tag=nameEntry.chars.join('');
 overRank=recordScore(score,tag);
 nameEntry=null;
 state='over';
 hud.pause.setVisible(false);
 hud.title.setVisible(false);
 hud.tip.setVisible(false);
 hud.start.setVisible(false);
 hud.board.setVisible(false);
 sfx(520,0.07,'triangle',0.05);
}

function buildLaneData(ctrl){
 const seg=[],pts=ctrl;
 let total=0;
 for(let i=0;i<pts.length-1;i++){
  const a=pts[i],b=pts[i+1];
  const len=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);
  seg.push(len);
  total+=len;
 }
 return {pts,seg,total};
}

function sampleLane(data,t){
 if(t<=0)return data.pts[0];
 if(t>=1)return data.pts[data.pts.length-1];
 const d=t*data.total;
 let rem=d;
 for(let i=0;i<data.seg.length;i++){
  const len=data.seg[i];
  if(rem<=len){
   const a=data.pts[i],b=data.pts[i+1];
   const r=len===0?0:rem/len;
   return {x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r};
  }
  rem-=len;
 }
 return data.pts[data.pts.length-1];
}

function toHex(v){return '#'+v.toString(16).padStart(6,'0');}
