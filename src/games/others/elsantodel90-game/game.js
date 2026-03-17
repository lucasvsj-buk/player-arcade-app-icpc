// Fast paced 1v1 strategic combat
// Strategically decide whether to use your shots to create new edges and score points (action button 1 while moving)
// or else turn an edge white which does not score and further will reduce score of future turns, but
// shields the component from total destruction when an odd cycle forms (action button 2)


function randint(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ARCADE_CONTROLS = {
  'P1U': ['w'], 'P1D': ['s'],
  'P1L': ['a'], 'P1R': ['d'],
  'P2U': ['ArrowUp'], 'P2D': ['ArrowDown'],
  'P2L': ['ArrowLeft'], 'P2R': ['ArrowRight'],
  'P1A': ['u'], 'P2A': ['r'],
  'P1B': ['i'], 'P2B': ['t'],
  'START1': ['1', 'Enter'], 'START2': ['2']
};

const KEYBOARD_TO_ARCADE = {};
for (const [code, keys] of Object.entries(ARCADE_CONTROLS)) {
  keys.forEach(k => KEYBOARD_TO_ARCADE[k] = code);
}

let WIDTH = 800;
let HEIGHT = 600;
let CIRCLE_RADIUS = 15

let STEP = 15; // Deterministic (potentially) game logic, regardless of delta
			   // This decouples game logic from frame rate
			   // Useful when graphics are the main framerate limiter instead of logic
			   // In my past game-making experience for simple-logic games, it was indeed the case
    

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#808080',
  scene: { create, update }
};

const game = new Phaser.Game(config);

let PS = 3; // Player Speed
let SS = 7; // Shot Speed

// Game state
let state = 'menu'; // menu, playing, gameover
let players = 2;
let gfx;
let score1 = 0, score2 = 0;
let keys = {};
let acumtime = 0;
let itercount = 0;
let beatInterval, scene;
let particles = [];
let penta = false;
let croma = false;
let TIME_UNTIL_GAME_ENDS = Math.floor(150*1000/STEP); // IN STEPS!!!!
let TIE_BREAKER_TIME = Math.floor(30*1000/STEP); // IN STEPS!!!!
let TIME_UNTIL_RESET_CONTROL = Math.floor(6*1000/STEP); // IN STEPS!!!!
let timeUntilResetControl = TIME_UNTIL_RESET_CONTROL; 
let timeUntilGameEnds = TIME_UNTIL_GAME_ENDS; 

let shot = [null, null];
let shotavail = [true, true];
let controlledVertex = [];
let vertices = [];
let edges = [];
let baseColor = 0;
let chromaticCircle = [];
for (var i=0;i<=0xff;i++) {
	chromaticCircle.push(0xff-i*0x01+i*0x100);
}
for (var i=1;i<=0xff;i++) {
	chromaticCircle.push(0xff00-i*0x0100+i*0x10000);
}
for (var i=1;i<=0xfe;i++) {
	chromaticCircle.push(0xff0000-i*0x010000+i*0x1);
}


function addScore(player, value) {
	if (player == 1)
		score1 += value;
	else
		score2 += value;
	if (score1 > score2) {
		penta = false;
		croma = false;
	}
	else if (score1 < score2)
	{
		penta = true;
		croma = false;
	}
	else
	{
		penta = false;
		croma = true;
	}
}


// LEGACY DEL TEMPLATE
let winScore = 5;
let p1, p2, ball;
// Paddle & ball settings
const PW = 12, PH = 80;
const BR = 8, BS = 3;

function create() {
  scene = this;
  gfx = this.add.graphics();
  resetGame();
  
  this.input.keyboard.on('keydown', e => {
    const k = KEYBOARD_TO_ARCADE[e.key] || e.key;
    keys[k] = true;
    
    if (state === 'menu' && k == 'START1')
    {
		startGame();
	}
	
    if (state === 'gameover' && k == 'START1')
    {
		state='menu';
		stopBeat();
	}
    
   // if (k === 'P1L' || k === 'P2L') {penta = false; croma = false;}
   // if (k === 'P1R' || k === 'P2R') {penta = true; croma = false;}
   // if (k === 'P1D' || k === 'P2D') {croma = true;}

   // 
   // if (state === 'menu') {
   //   if (k === 'P1U' || k === 'P2U') { players = 1; }
   //   if (k === 'P1D' || k === 'P2D') { players = 2; }
   //   if (k === 'START1' || k === 'P1A') { startGame(); }
   // } else if (state === 'gameover') {
   //   if (k === 'START1' || k === 'P1A') { state = 'menu'; resetGame(); }
   // }
  });
  
  this.input.keyboard.on('keyup', e => {
    const k = KEYBOARD_TO_ARCADE[e.key] || e.key;
    keys[k] = false;
  });
}

let BLACK=0
let WHITE=3
let nextId=0

function getNode(id) {
	let ret = {x:0, y:0, id:-1};
	vertices.forEach(function(v) { if (v.id == id) ret = v; });
	return ret;
}

let TARGET_NODE_COUNT = 20;

function spawnNodes() {
	while (vertices.length <= TARGET_NODE_COUNT - 4) {
		for (var player = 1; player <= 2; player++) {
			let v1 = {x:randint(0,WIDTH-1), y:randint(0,HEIGHT-1),colorIndex:0,id:nextId};
			nextId++;
			let v2 = {x:v1.x + randint(40,80), y:v1.y + randint(-30,30),colorIndex:1,id:nextId};
			nextId++;
			vertices.push(v1);
			vertices.push(v2);
			edges.push({nodes:[v1.id,v2.id], color:player});
		}
	}
}

function resetControlledVertex() {
	for (var player=1;player<=2;player++) {
		pnodes = []
		edges.forEach(function(e) {
			if (e.color==player)
			for (var index=0;index<2;index++) 
			if (e.nodes[index] != controlledVertex[player-1] && pnodes.indexOf(e.nodes[index]) < 0) 
				pnodes.push(e.nodes[index]);
			});
		if (pnodes.length >= 1) {
			controlledVertex[player-1] = pnodes[randint(0, pnodes.length-1)];
			for (var i=-1;i<=1;i+=2)
			for (var j=-1;j<=1;j+=2)
				createParticles(getNode(controlledVertex[player-1]).x + i*17, getNode(controlledVertex[player-1]).y+ j*17, playerColor(player));
		}
		else
			controlledVertex[player-1] = -1
	}
	timeUntilResetControl = TIME_UNTIL_RESET_CONTROL;
	shot = [null, null]
	shotavail = [true, true]
}

function resetGame() {
  vertices = []
  edges = []
  nextId=0;
  spawnNodes();
  timeUntilGameEnds=TIME_UNTIL_GAME_ENDS;
  resetControlledVertex();
  acumtime = 0;
  itercount = 0;
  score1 = 0; score2 = 0;
  addScore(1,0); // To update stuff depending on scores
}

function resetBall(dir) {
  ball = { 
    x: 400, y: 300, 
    vx: BS * dir, 
    vy: (Math.random() - 0.5) * BS * 1.5 
  };
}

function startGame() {
  state = 'playing';
  resetGame();
  startBeat();
}

function stopBeat() {
  if (beatInterval) {
    clearInterval(beatInterval);
    beatInterval = null;
  }
}

function startBeat() {
  stopBeat();
  let beat = 0;
  // penta = false;
  beatInterval = setInterval(() => {
    // if (state !== 'playing') { stopBeat(); return; }
    // if (beat % 64 == 0) penta = !penta; 
    // Kick on 0, 4, 8, 12
    // if (b % 4 === 0) playTone(scene, 150, 0.08);
    // Hi-hat on offbeats
    // if (b % 2 === 1) playTone(scene, 1200, 0.02);
    // Snare on 4, 12
    // if (b === 4 || b === 12) playTone(scene, 250, 0.06);
    // Bass line melody
    let note = function(i) {return 440 * Math.pow(2.0, i / 12.0);}
	let bass = [0,0,null,null,1,2,3,0,0,0,null,null,4,5,6,8,8,null,7,null, null, 10,8,5,4,3,2,1,0,1,5,6,8,9];
	const b = beat % bass.length;
	let convert = function (scale, i) {
		let L = scale.length; 
		ret = 0; 
		while (i >= scale.length)
		{
			ret += 12;
			i -= scale.length;
		}
		while (i < 0)
		{
			ret -= 12;
			i += scale.length;
		}
		return ret + scale[i];
	}
	for (var i = 0; i < bass.length; i++) {
		if (!(bass[i] === null)) {
			if (croma)
				bass[i] = convert([0,1,2,3,4,5,6,7,8,9,10,11], bass[i]+6);
			else if (!penta)
				bass[i] = convert([0,2,4,5,7,9,11], bass[i]);
			else	
				bass[i] = -6+convert([0,2,4,7,9], bass[i]+3);
			
		}
	}
    if (!(bass[b] === null)) playTone(scene, note(bass[b]), 0.150);
    beat++;
  }, 150);
}

function update(time, delta) {
  gfx.clear();
  
  if (state === 'menu') {
    drawMenu();
  } else if (state === 'playing') {
    acumtime += delta;
    while (acumtime >= STEP) {
		updateGame();
		acumtime -= STEP;
	}
    drawGame();
  } else if (state === 'gameover') {
    drawGameOver();
  }
}

function drawMenu() {
  // Title with glow effect
  gfx.fillStyle(0);
  gfx.fillRect(0,0,WIDTH,HEIGHT);
  gfx.fillStyle(0xffffff);
  drawText(gfx, 'BIPARTILANDIA', 400, 60, 7);
  
  // Subtitle
  gfx.fillStyle(0x00ffff);
  drawText(gfx, 'A TIMED FAST-PACED 1 VS 1 STRATEGIC GAME', 400, 160, 2.5);
  drawText(gfx, '100 PERCENT HUMAN-CODED IN GEANY. NO AI USED', 400, 190, 2.5);
  drawText(gfx, 'BY AGUSTIN SANTIAGO GUTIERREZ', 400, 240, 3);
  drawText(gfx, 'AGUSTIN.ELSANTODEL90 AT YOUTUBE', 400, 290, 3.5);
  
  // gfx.fillStyle(0xff00ff);
  // drawText(gfx, 'LEFT.RIGHT.DOWN TO CHANGE', 400, 300, 3.2);
  // 
  gfx.fillStyle(0xffff00);
  drawText(gfx, 'MOVE PLUS ACTION1 = SHOT EDGE', 400, 360, 3.2);
  drawText(gfx, 'ACTION2 = TURN EDGE INTO SHIELD', 400, 390, 3.2);
  drawText(gfx, 'NEW EDGE SCORES NUMBER OF', 400, 450, 2.7);
  drawText(gfx, 'PLAYER-COLOR EDGES IN COMPONENT', 400, 475, 2.7);
  drawText(gfx, 'AN ODD CYCLE DESTROYS THE COMPONENT', 400, 498, 2.7);
  drawText(gfx, 'OR DEFUSES A SHIELD', 400, 520, 2.7);
  gfx.fillStyle(0xff30ff);
  drawText(gfx, 'PRESS START TO PLAY', 400, 550, 3.2);
  // gfx.fillStyle(0xffff00);
  // drawText(gfx, 'TERMINARE EL JUEGO ACASO...', 400, 410, 3.2);
  // drawText(gfx, 'POCO PROBABLE.', 400, 440, 3.2);
  // drawText(gfx, 'MIENTRAS TANTO. BIPARTILANDIA', 400, 470, 3.2);
  // drawText(gfx, 'VIVE EN LA MENTE.', 400, 500, 3.2);
  
  
//  arrowY = 300
//  arrowX = 370
//  gfx.fillStyle(0xffffff);
//  if (croma)
//	gfx.fillTriangle(arrowY + 45, arrowX, arrowY + 105, arrowX, arrowY + 75, arrowX + 60);
//  else if (penta)
//	gfx.fillTriangle(arrowX, arrowY + 45, arrowX, arrowY + 105, arrowX + 60, arrowY + 75);
//  else
//    gfx.fillTriangle(arrowX, arrowY + 45, arrowX, arrowY + 105, arrowX - 60, arrowY + 75);
  // Mode selection with better spacing
  // const c1 = players === 1 ? 0x00ff00 : 0x555555;
  // const c2 = players === 2 ? 0x00ff00 : 0x555555;
  
  // gfx.fillStyle(c1);
  // drawText(gfx, '1 PLAYER', 400, 300, 2.5);
  // gfx.fillStyle(c2);
  // drawText(gfx, '2 PLAYERS', 400, 370, 2.5);
  
  // Arrow indicator
  // const arrowY = players === 1 ? 300 : 370;
  // gfx.fillStyle(0x00ff00);
  // gfx.fillTriangle(150, arrowY + 15, 150, arrowY + 35, 170, arrowY + 25);
  // gfx.fillTriangle(650, arrowY + 15, 650, arrowY + 35, 630, arrowY + 25);
  //
  // // Instructions with better spacing
  // gfx.fillStyle(0x999999);
  // drawText(gfx, 'USE UP DOWN TO SELECT', 400, 480, 1.2);
  // gfx.fillStyle(0xffff00);
  // drawText(gfx, 'PRESS START', 400, 530, 1.5);
}

xxx=0;
yyy=0;

let FIREWORKS_DENSITY = 800;

function fireworks(x1,y1,x2,y2) {
	for (var i=0;i<((x2-x1)*(y2-y1))/FIREWORKS_DENSITY; i++) {
		x = randint(x1,x2);
		y = randint(y1,y2);
		createParticles(x,y,randint(0x000000, 0xffffff));
	}
}

function outOfRange(v) {
	return v.x < 0 || v.x >= WIDTH || v.y < 0 || v.y >= HEIGHT;
}

function shotNodeColision(s, v)
{
	return !(s === null) && (s.x-v.x)*(s.x-v.x) + (s.y-v.y)*(s.y-v.y) <= CIRCLE_RADIUS*CIRCLE_RADIUS;
}

function getComponent(vid)
{
	ret = [vid];
	let change = true;
	while (change) {
		change = false;
		edges.forEach(function(e) {
			for (var i=0;i<2;i++)
			if (ret.indexOf(e.nodes[i]) >= 0 && ret.indexOf(e.nodes[1-i]) < 0)
			{
				change = true;
				ret.push(e.nodes[1-i]);
			}
		});
	}
	return ret;
}

function updateGame() {

	timeUntilGameEnds--;
	if (timeUntilGameEnds <= 0)
	{
		if (score1 != score2)
		{
			state='gameover';
			return;
		}
		else
		{
			timeUntilGameEnds=TIE_BREAKER_TIME;
		}
	}

	itercount++;

	if (itercount % 2 == 0) {
		baseColor++;
		baseColor %= chromaticCircle.length;
	}
	
	spawnNodes();

	timeUntilResetControl--;
	if (timeUntilResetControl <= 0) {
		resetControlledVertex();
	}

	if (shotavail[0]) {
		dx1=0;
		dy1=0;
	}
	else if (!(shot[0] === null)) {
		shot[0].x += dx1;
		shot[0].y += dy1;
		if (outOfRange(shot[0])) shot[0] = null;
	}
	if (shotavail[1]) {
		dx2=0;
		dy2=0;
	}
	else if (!(shot[1] === null))
	{
		shot[1].x += dx2;
		shot[1].y += dy2;
		if (outOfRange(shot[1])) shot[1] = null;
	}
	//  // P1 movement
	if (keys['P1U'] || keys['P1UL'] || keys['P1UR'] || keys['P1LU'] || keys['P1RU']) {getNode(controlledVertex[0]).y -= PS; if (shotavail[0]) dy1=-SS;}
	if (keys['P1D'] || keys['P1DL'] || keys['P1DR'] || keys['P1LD'] || keys['P1RD']) {getNode(controlledVertex[0]).y += PS; if (shotavail[0]) dy1= SS;}
	if (keys['P1L'] || keys['P1LU'] || keys['P1LD'] || keys['P1UL'] || keys['P1DL']) {getNode(controlledVertex[0]).x -= PS; if (shotavail[0]) dx1=-SS;}
	if (keys['P1R'] || keys['P1RU'] || keys['P1RD'] || keys['P1UR'] || keys['P1DR']) {getNode(controlledVertex[0]).x += PS; if (shotavail[0]) dx1= SS;}
																														   
	if (keys['P2U'] || keys['P2UL'] || keys['P2UR'] || keys['P2LU'] || keys['P2RU']) {getNode(controlledVertex[1]).y -= PS; if (shotavail[1]) dy2=-SS}
	if (keys['P2D'] || keys['P2DL'] || keys['P2DR'] || keys['P2LD'] || keys['P2RD']) {getNode(controlledVertex[1]).y += PS; if (shotavail[1]) dy2= SS}
	if (keys['P2L'] || keys['P2LU'] || keys['P2LD'] || keys['P2UL'] || keys['P2DL']) {getNode(controlledVertex[1]).x -= PS; if (shotavail[1]) dx2=-SS}
	if (keys['P2R'] || keys['P2RU'] || keys['P2RD'] || keys['P2UR'] || keys['P2DR']) {getNode(controlledVertex[1]).x += PS; if (shotavail[1]) dx2= SS}
	
	vertices.forEach(function(v) {
			if (v.id != controlledVertex[0] && v.id != controlledVertex[1]) {
				v.x += randint(-2,1);
				v.y += randint(-2,1);
			}
			while (v.x < 0) v.x += WIDTH;
		    while (v.y < 0) v.y += HEIGHT;
		    v.x %= WIDTH;
		    v.y %= HEIGHT;
		    for (var player=1;player<=2;player++) {
				if (controlledVertex[player-1] != v.id && shotNodeColision(shot[player-1], v)) {
					shot[player-1] = null;
					var yata = false;
					edges.forEach(function(e) { if ((e.nodes[0] == v.id && e.nodes[1] == controlledVertex[player-1])
						                          ||(e.nodes[1] == v.id && e.nodes[0] == controlledVertex[player-1])) yata = true; });
					if (!yata) {
						var c1 = getComponent(v.id);
						var c2 = getComponent(controlledVertex[player-1]);
						edges.push({nodes:[v.id, controlledVertex[player-1]], color:player});
						var merged = getComponent(v.id);
						var scoreDelta = -1;
						edges.forEach(function(e) { if (e.color == player && merged.indexOf(e.nodes[0]) >= 0 && merged.indexOf(e.nodes[1]) >= 0) scoreDelta++; });
						var clash = getNode(v.id).colorIndex == getNode(controlledVertex[player-1]).colorIndex;
						var destruction = false;
						if (c2.indexOf(v.id) >= 0) // Misma componente!
						{
							if (clash)
							{
								var saved = false;
								for (var index=0;index<edges.length;index++) {
									var e = edges[index];
									if (e.color == WHITE && merged.indexOf(e.nodes[0]) >= 0 && merged.indexOf(e.nodes[1]) >= 0)
									{
										e.color = BLACK;
										saved=true;
										break;
									}
								}
								if (saved)
									edges.pop();
								else
								{
									minX=WIDTH;
									maxX=0;
									minY=HEIGHT;
									maxY=0;
									c1.forEach(function(vid) {
											var v = getNode(vid);
											if (v.x < minX) minX = v.x;
											if (v.y < minY) minY = v.y;
											if (v.x > maxX) maxX = v.x;
											if (v.y > maxY) maxY = v.y;
										});
									destruction = true;
									fireworks(minX,minY,maxX,maxY);
									for (var index=0;index<edges.length;index++) {
										if (merged.indexOf(edges[index].nodes[0]) >= 0 &&
											merged.indexOf(edges[index].nodes[1]) >= 0)
										{
											edges.splice(index,1);
											index--;
										}
									}
									for (var index=0;index<vertices.length;index++) {
										if (merged.indexOf(vertices[index].id) >= 0)
										{
											vertices.splice(index,1);
											index--;
										}
									}
									spawnNodes();
									resetControlledVertex();
								}
							}
						}
						else if (clash)
						{
							var smaller;
							if (c1.length < c2.length)
								smaller = c1;
							else
								smaller = c2;
							smaller.forEach(function(vid) { getNode(vid).colorIndex = 1 - getNode(vid).colorIndex; });
						}
						if (!destruction)
							addScore(player, scoreDelta);
					}
				}
			}
		});
	
	if (keys['P1B'] && shotavail[0]) {
		shotavail[0] = false;
		shot[0] = null;
		for(var index=0;index<edges.length;index++) {
			var e = edges[index];
			if (e.color == 1 && (e.nodes[0] == controlledVertex[0] || e.nodes[1] == controlledVertex[0])) {
				e.color = WHITE;
				break;
			}
		};
	}

	if (keys['P2B'] && shotavail[1]) {
		shotavail[1] = false;
		shot[1] = null;
		for(var index=0;index<edges.length;index++) {
			var e = edges[index];
			if (e.color == 2 && (e.nodes[0] == controlledVertex[1] || e.nodes[1] == controlledVertex[1])) {
				e.color = WHITE;
				break;
			}
		};
	}
	
	if (keys['P1A'] && shotavail[0] && (dx1 != 0 || dy1 != 0)) {
		shotavail[0] = false;
		if (controlledVertex[0] >= 0)
			shot[0] = {x:getNode(controlledVertex[0]).x + dx1,
					   y:getNode(controlledVertex[0]).y + dy1 };
	}
	
	if (keys['P2A'] && shotavail[1] && (dx2 != 0 || dy2 != 0)) {
		shotavail[1] = false;
		if (controlledVertex[1] >= 0)
			shot[1] = {x:getNode(controlledVertex[1]).x + dx2,
					   y:getNode(controlledVertex[1]).y + dy2 };
	}
	
	// Proof of concept fireworks test
	// if (xxx % 50 == 0)
	// 	fireworks(xxx-150, yyy-250, xxx+30, yyy+70); // createParticles(xxx, yyy, 0xFFFfff)
	// xxx++;
	// yyy+=2;
	// xxx %= WIDTH;
	// yyy %= HEIGHT;
	
	
	
	
//  // P1 movement
//  if (keys['P1U'] && p1.y > 0) p1.y -= PS;
//  if (keys['P1D'] && p1.y < 600 - PH) p1.y += PS;
//  
//  // P2 movement (AI or player)
//  if (players === 2) {
//    if (keys['P2U'] && p2.y > 0) p2.y -= PS;
//    if (keys['P2D'] && p2.y < 600 - PH) p2.y += PS;
//  } else {
//    // Simple AI: follow ball with some delay
//    const center = p2.y + PH/2;
//    const diff = ball.y - center;
//    if (Math.abs(diff) > 10) {
//      p2.y += Math.sign(diff) * (PS * 0.7);
//    }
//    p2.y = Math.max(0, Math.min(600 - PH, p2.y));
//  }
//  
//  // Ball movement
//  ball.x += ball.vx;
//  ball.y += ball.vy;
//  
//  // Top/bottom bounce
//  if (ball.y <= BR || ball.y >= 600 - BR) {
//    ball.vy *= -1;
//    ball.y = ball.y <= BR ? BR : 600 - BR;
//    playWallHit(this);
//    createParticles(ball.x, ball.y, 0x00ffff);
//  }
//  
//  // Paddle collision P1
//  if (ball.x - BR <= p1.x + PW && ball.x + BR >= p1.x &&
//      ball.y >= p1.y && ball.y <= p1.y + PH && ball.vx < 0) {
//    ball.vx *= -1.08;
//    ball.vy += ((ball.y - (p1.y + PH/2)) / PH) * 3;
//    ball.x = p1.x + PW + BR;
//    playPaddleHit(this);
//    createParticles(ball.x, ball.y, 0x00ff00);
//  }
//  
//  // Paddle collision P2
//  if (ball.x + BR >= p2.x && ball.x - BR <= p2.x + PW &&
//      ball.y >= p2.y && ball.y <= p2.y + PH && ball.vx > 0) {
//    ball.vx *= -1.08;
//    ball.vy += ((ball.y - (p2.y + PH/2)) / PH) * 3;
//    ball.x = p2.x - BR;
//    playPaddleHit(this);
//    createParticles(ball.x, ball.y, 0xff00ff);
//  }
//  
//  // Speed limit
//  ball.vx = Math.sign(ball.vx) * Math.min(Math.abs(ball.vx), 12);
//  ball.vy = Math.sign(ball.vy) * Math.min(Math.abs(ball.vy), 8);
//  
//  // Score
//  if (ball.x < 0) {
//    score2++;
//    playScoreSound(this);
//    if (score2 >= winScore) { state = 'gameover'; stopBeat(); }
//    else { resetBall(-1); }
//  }
//  if (ball.x > 800) {
//    score1++;
//    playScoreSound(this);
//    if (score1 >= winScore) { state = 'gameover'; stopBeat(); }
//    else { resetBall(1); }
//  }
}

function playerColor(player) {
	return chromaticCircle[(baseColor + (chromaticCircle.length>>2) + (chromaticCircle.length>>1) * (player-1)) % chromaticCircle.length];
}

function drawGame() {
  // Update and draw particles
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life > 0) {
      const alpha = p.life / 20;
      gfx.fillStyle(p.color, alpha);
      gfx.fillCircle(p.x, p.y, p.size);
      return true;
    }
    return false;
  });
  
  edges.forEach(function(e) {
	 let color;
	 if (e.color == WHITE)
		color = 0xffffff;
	 else if (e.color == BLACK)
	    color = 0;
	 else
	    color = playerColor(e.color);
	 let v1 = getNode(e.nodes[0]);
	 let v2 = getNode(e.nodes[1]);
	 gfx.lineStyle(8, color, 1);
	 gfx.lineBetween(v1.x, v1.y,v2.x, v2.y);
  });
  for (var player=1;player<=2;player++) {
	  v = getNode(controlledVertex[player-1]);
	  if (v.id >= 0) {
		  gfx.fillStyle(playerColor(player));
		  gfx.fillCircle(v.x, v.y, CIRCLE_RADIUS+5);
	  }
	  if (!(shot[player-1] === null))
	  {
		  gfx.lineStyle(8, playerColor(player), 1);
		  gfx.lineBetween(shot[player-1].x, shot[player-1].y,v.x, v.y);
	  }
  }
  vertices.forEach(function(vertex) {
	 gfx.fillStyle(chromaticCircle[(baseColor + (chromaticCircle.length>>1) * vertex.colorIndex) % chromaticCircle.length]);
	 gfx.fillCircle(vertex.x, vertex.y, CIRCLE_RADIUS);
  });
  for (var player=1;player<=2;player++) {
	  v = getNode(controlledVertex[player-1]);
	  if (v.id >= 0) {
		  gfx.fillStyle(playerColor(player));
		  gfx.fillTriangle(v.x - 7, v.y+5, v.x + 7, v.y+5, v.x, v.y -10);
	  }
  }
  
  
  
//  // Center line
//  gfx.fillStyle(0x333333);
//  for (let y = 0; y < 600; y += 30) {
//    gfx.fillRect(398, y, 4, 15);
//  }
  
//  // Paddles with glow
//  gfx.fillStyle(0x00ff00, 0.3);
//  gfx.fillRect(p1.x - 2, p1.y - 2, PW + 4, PH + 4);
//  gfx.fillStyle(0xff00ff, 0.3);
//  gfx.fillRect(p2.x - 2, p2.y - 2, PW + 4, PH + 4);
//  
//  gfx.fillStyle(0xffffff);
//  gfx.fillRect(p1.x, p1.y, PW, PH);
//  gfx.fillRect(p2.x, p2.y, PW, PH);
//  
//  // Ball with glow
//  gfx.fillStyle(0xffffff, 0.3);
//  gfx.fillCircle(ball.x, ball.y, BR + 3);
//  gfx.fillStyle(0xffffff);
//  gfx.fillCircle(ball.x, ball.y, BR);
//  
//  // Score with glow
//  gfx.fillStyle(0x00ff00);
//  drawText(gfx, score1.toString(), 300, 5, 4);
//  gfx.fillStyle(0xff00ff);
//  drawText(gfx, score2.toString(), 500, 5, 4);
  
  // Remaining times
  gfx.fillStyle(0xffffff);
  let GAP = 70;
  gfx.fillRect(WIDTH/2 -5 - GAP * (timeUntilResetControl / TIME_UNTIL_RESET_CONTROL), 1, 
               2*GAP * (timeUntilResetControl / TIME_UNTIL_RESET_CONTROL), 10);  
  var ww = WIDTH/2 *(1.0-timeUntilGameEnds/TIME_UNTIL_GAME_ENDS);
  gfx.fillRect(ww, HEIGHT-10, 
               WIDTH-2*ww, 10);  
  // Player labels
  gfx.fillStyle(playerColor(1));
  drawTextLeft(gfx, 'P1=' + score1.toString() + (shotavail[0] ? " SHOT" : ""), 5, 1, 5.2);
  gfx.fillStyle(playerColor(2));
  drawTextRight(gfx, (shotavail[1] ? "SHOT " : "") + (players === 1 ? 'AI=' : 'P2=') + score2.toString(),	 795, 1, 5.2);
}

function drawGameOver() {
  const winner = score1 > score2 ? 'P1' : (players === 1 ? 'AI' : 'P2');
  
  gfx.fillStyle(0xff0000);
  drawText(gfx, 'GAME OVER', 400, 200, 4);
  
  gfx.fillStyle(0x00ff00);
  drawText(gfx, winner + ' WINS', 400, 300, 8);
  
  gfx.fillStyle(0xffffff);
  drawText(gfx, score1 + ' - ' + score2, 400, 380, 7);
  
  gfx.fillStyle(0xFFFFFF);
  drawText(gfx, 'PRESS START TO GO TO MENU', 400, 480, 3);
}

// Simple pixel text renderer
function drawTextBase(g, text, x, y, size, centering, right) {
  const chars = {
    'A': [0xFC,0x12,0x12,0xFC,0x00], 'B': [0xFE,0x92,0x92,0x6C,0x00],
    'C': [0x7C,0x82,0x82,0x44,0x00], 'D': [0xFE,0x82,0x82,0x7C,0x00],
    'E': [0xFE,0x92,0x92,0x82,0x00], 'G': [0x7C,0x82,0x92,0x74,0x00],
    'F': [0xFE,0x12,0x12,0x02,0x00], 'H': [0xFE,0x10,0x10,0xFE,0x00],
    'I': [0x00,0x82,0xFE,0x82,0x00], 'J': [0x60,0x80,0x80,0x7E,0x00], 
    'L': [0xFE,0x80,0x80,0x80,0x00],
    'M': [0xFE,0x04,0x18,0x04,0xFE], 'N': [0xFE,0x08,0x10,0x20,0xFE],
    'O': [0x7C,0x82,0x82,0x7C,0x00], 'P': [0xFE,0x12,0x12,0x0C,0x00],
    'R': [0xFE,0x12,0x32,0xCC,0x00], 'S': [0x4C,0x92,0x92,0x64,0x00],
    'T': [0x02,0x02,0xFE,0x02,0x02], 'U': [0x7E,0x80,0x80,0x7E,0x00],
    'V': [0x3E,0x40,0x80,0x40,0x3E], 'W': [0x7E,0x80,0x70,0x80,0x7E],
    'Y': [0x06,0x08,0xF0,0x08,0x06], 'Z': [0xC2,0xB2,0x9A,0x86,0x00],
    '0': [0x7C,0xA2,0x92,0x8A,0x7C], '1': [0x00,0x84,0xFE,0x80,0x00],
    '2': [0xC4,0xA2,0x92,0x8C,0x00], '3': [0x44,0x92,0x92,0x6C,0x00],
    '4': [0x1E,0x10,0xFE,0x10,0x00], '5': [0x4E,0x8A,0x8A,0x72,0x00],
    '6': [0x7C,0x92,0x92,0x64,0x00], '7': [0x02,0xE2,0x12,0x0E,0x00],
    '8': [0x6C,0x92,0x92,0x6C,0x00], '9': [0x4C,0x92,0x92,0x7C,0x00],
    ' ': [0x00,0x00,0x00,0x00,0x00], '-': [0x10,0x10,0x10,0x10,0x00],
    '.': [0x00,0xC0,0xC0,0x00,0x00], '=': [0x28,0x28,0x28,0x28,0x28]
  };
  
  const spacing = 7 * size;
  let startX = 0;
  if (right)
	startX = x - (text.length * spacing);
  else if (centering)
	startX = x - (text.length * spacing) / 2;
  else
	startX = x;
	
  for (let c of text) {
    const data = chars[c];
    if (data) {
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 8; row++) {
          if (data[col] & (1 << row)) {
            g.fillRect(startX + col * size, y + row * size, size - 1, size - 1);
          }
        }
      }
    }
    startX += spacing;
  }
}

function drawText(g, text, x, y, size) {
	return drawTextBase(g, text, x, y, size, true, false);
}

function drawTextLeft(g, text, x, y, size) {
	return drawTextBase(g, text, x, y, size, false, false);
}

function drawTextRight(g, text, x, y, size) {
	return drawTextBase(g, text, x, y, size, false, true);
}

function playTone(scene, freq, dur) {
  try {
    const ctx = scene.sound.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch(e) {}
}

function playPaddleHit(scene) {
  try {
    const ctx = scene.sound.context;
    // Main hit
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 800;
    osc1.type = 'square';
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);
    
    // Harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1200;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.1, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.08);
  } catch(e) {}
}

function playWallHit(scene) {
  try {
    const ctx = scene.sound.context;
    // Bounce sound
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 400;
    osc1.type = 'triangle';
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.07);
    
    // Lower thump
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 150;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.15, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.05);
  } catch(e) {}
}

function playScoreSound(scene) {
  try {
    const ctx = scene.sound.context;
    // Epic descending tone for score
    [600, 450, 300, 200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sawtooth';
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch(e) {}
}

function createParticles(x, y, color) {
  while (x < 0) x += WIDTH;
  while (y < 0) y += HEIGHT;
  x %= WIDTH;
  y %= HEIGHT;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * 3,
      vy: Math.sin(angle) * 3,
      color,
      size: 2 + Math.random() * 2,
      life: 15 + Math.random() * 10
    });
  }
}
