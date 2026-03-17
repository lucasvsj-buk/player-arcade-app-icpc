// The $100 Tech Queue - Budget Snake Arcade Game
// Collect tech deals, stay under $100!

var ARCADE_CONTROLS = {
  'P1U': ['w', 'ArrowUp'], 'P1D': ['s', 'ArrowDown'],
  'P1L': ['a', 'ArrowLeft'], 'P1R': ['d', 'ArrowRight'],
  'P1A': ['u', ' '], 'P1B': ['i', 'Shift'],
  'START1': ['1', 'Enter'], 'START2': ['2']
};
var KEYBOARD_TO_ARCADE = {};
for (var code in ARCADE_CONTROLS) {
  ARCADE_CONTROLS[code].forEach(function (k) { KEYBOARD_TO_ARCADE[k] = code; });
}

var GS = 32, COLS = 25, ROWS = 18;
var VALUES = [1, 2, 5, 10, 20];
var COLORS = {};
COLORS[1] = 0xBDFF00; COLORS[2] = 0x99DD00;
COLORS[5] = 0xFFAA00; COLORS[10] = 0xFF5533; COLORS[20] = 0xFF0055;
var COLOR_STR = {};
COLOR_STR[1] = '#BDFF00'; COLOR_STR[2] = '#99DD00';
COLOR_STR[5] = '#FFAA00'; COLOR_STR[10] = '#FF5533'; COLOR_STR[20] = '#FF0055';

var scene, gfx, scanGfx, keys = {};
var state = 'menu';
var snake, dir, nextDir, moveTimer, moveDelay;
var items, budget, collected, timeAlive, startTime;
var highScore = 0;

var particles = [];
var heartbeatTimer = 0;
var audioCtx = null;
var lastCollectTime = 0;
var MAX_ITEMS = 10;

// Leaderboard
var leaderboard = [];
var nameChars = [0, 0, 0]; // indices into ALPHA
var namePos = 0;
var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

var musicInterval = null;
var musicStep = 0;
var menuMusicInterval = null;
var menuMusicStep = 0;
var menuMusicPlaying = false;
var goMusicInterval = null;
var goMusicStep = 0;
var goMusicPlaying = false;
var rocks = [];
var lastRockTime = 0;
var rockSpawnInterval = 15000; // 15 seconds
var rockGraceTime = 20000;    // first rock at 20 seconds
var firstRockSpawned = false;
var deathTimer = 0;
var deathFlash = 0;


// Text object pools
var textPool = [];

try {
  highScore = parseFloat(localStorage.getItem('tq_hs')) || 0;
  var lbData = localStorage.getItem('tq_lb');
  if (lbData) leaderboard = JSON.parse(lbData);
} catch (e) { }

var FONT = '"Consolas", "SF Mono", "Fira Mono", "Lucida Console", monospace';

function makeText(x, y, str, size, color, origin) {
  var t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: size + 'px',
    color: color || '#ffffff',
    fontStyle: 'bold'
  });
  if (origin !== undefined) t.setOrigin(origin);
  else t.setOrigin(0.5, 0);
  t.setDepth(500);
  textPool.push(t);
  return t;
}

function clearTexts() {
  for (var i = 0; i < textPool.length; i++) {
    textPool[i].destroy();
  }
  textPool = [];
  // Destroy pooled item labels
  if (items) {
    for (var j = 0; j < items.length; j++) {
      if (items[j].label) { items[j].label.destroy(); items[j].label = null; }
    }
  }
}

var config = {
  type: Phaser.AUTO,
  width: 800, height: 600,
  backgroundColor: '#0A0B10',
  scene: { create: create, update: update }
};
var game = new Phaser.Game(config);

function create() {
  scene = this;
  gfx = this.add.graphics();
  scanGfx = this.add.graphics();
  drawScanlines();
  this.input.keyboard.on('keydown', function (e) {
    var k = KEYBOARD_TO_ARCADE[e.key] || e.key;
    keys[k] = true;
    if (state === 'menu') {
      if (k === 'P1A') startGame();
    } else if (state === 'gameover') {
      if (k === 'P1A') { state = 'nameentry'; nameChars = [0, 0, 0]; namePos = 0; }
    } else if (state === 'nameentry') {
      if (k === 'P1U') { nameChars[namePos] = (nameChars[namePos] + 1) % 26; clearTexts(); playTone(600, 0.04, 0.06, 'square'); }
      if (k === 'P1D') { nameChars[namePos] = (nameChars[namePos] + 25) % 26; clearTexts(); playTone(500, 0.04, 0.06, 'square'); }
      if (k === 'P1A') {
        playTone(800, 0.06, 0.1, 'sine');
        namePos++;
        if (namePos >= 3) {
          var name = ALPHA[nameChars[0]] + ALPHA[nameChars[1]] + ALPHA[nameChars[2]];
          var sc = calcScore();
          leaderboard.push({ name: name, score: sc });
          leaderboard.sort(function (a, b) { return b.score - a.score; });
          if (leaderboard.length > 5) leaderboard = leaderboard.slice(0, 5);
          try { localStorage.setItem('tq_lb', JSON.stringify(leaderboard)); } catch (e) { }
          state = 'menu';
        }
        clearTexts();
      }
    }
    if (state === 'playing') {
      if (k === 'P1U' && dir !== 'down') nextDir = 'up';
      if (k === 'P1D' && dir !== 'up') nextDir = 'down';
      if (k === 'P1L' && dir !== 'right') nextDir = 'left';
      if (k === 'P1R' && dir !== 'left') nextDir = 'right';
    }
  });
  this.input.keyboard.on('keyup', function (e) {
    var k = KEYBOARD_TO_ARCADE[e.key] || e.key;
    keys[k] = false;
  });

  // GX-006: Touch/swipe support
  var touchStartX = 0, touchStartY = 0;
  this.input.on('pointerdown', function (p) {
    touchStartX = p.x; touchStartY = p.y;
  });
  this.input.on('pointerup', function (p) {
    if (state !== 'playing') return;
    var dx = p.x - touchStartX, dy = p.y - touchStartY;
    var minSwipe = 20;
    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir !== 'left') nextDir = 'right';
      else if (dx < 0 && dir !== 'right') nextDir = 'left';
    } else {
      if (dy > 0 && dir !== 'up') nextDir = 'down';
      else if (dy < 0 && dir !== 'down') nextDir = 'up';
    }
  });
}

function startGame() {
  stopMenuMusic();
  state = 'playing';
  snake = [{ x: 12, y: 9 }];
  dir = 'right'; nextDir = 'right';
  moveTimer = 0;
  moveDelay = 150;
  items = [];
  budget = 0;
  collected = [];
  timeAlive = 0;
  startTime = Date.now();

  particles = [];
  rocks = [];
  lastRockTime = 0;
  firstRockSpawned = false;
  deathTimer = 0;
  deathFlash = 0;
  lastCollectTime = Date.now();
  spawnItem();
  spawnItem();
  startMusic();
}

function spawnItem() {
  var tries = 0, x, y, ok;
  do {
    x = 1 + Math.floor(Math.random() * (COLS - 2));
    y = 1 + Math.floor(Math.random() * (ROWS - 2));
    ok = true;
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === x && snake[i].y === y) { ok = false; break; }
    }
    for (var j = 0; j < items.length; j++) {
      if (items[j].x === x && items[j].y === y) { ok = false; break; }
    }
    // Check against rocks (4x4 blocks)
    if (ok) {
      for (var ri = 0; ri < rocks.length; ri++) {
        var r = rocks[ri];
        if (x >= r.x && x < r.x + 4 && y >= r.y && y < r.y + 4) { ok = false; break; }
      }
    }
    tries++;
  } while (!ok && tries < 100);
  if (!ok) return; // no valid position found
  var v = VALUES[Math.floor(Math.random() * VALUES.length)];
  var label = scene.add.text(x * GS + GS / 2, y * GS + GS / 2, '$' + v, {
    fontFamily: FONT, fontSize: '13px', color: '#000000', fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(501);
  items.push({ x: x, y: y, val: v, pulse: 0, label: label });
}

function spawnRock() {
  var tries = 0, rx, ry, ok;
  do {
    rx = 1 + Math.floor(Math.random() * (COLS - 5));
    ry = 1 + Math.floor(Math.random() * (ROWS - 4));
    ok = true;
    // Check against entire snake body
    for (var si = 0; si < snake.length; si++) {
      var sx = snake[si].x, sy = snake[si].y;
      if (sx >= rx && sx < rx + 4 && sy >= ry && sy < ry + 4) { ok = false; break; }
    }
    // Check against existing rocks
    if (ok) {
      for (var ri = 0; ri < rocks.length; ri++) {
        var er = rocks[ri];
        if (rx < er.x + 4 && rx + 4 > er.x && ry < er.y + 4 && ry + 4 > er.y) { ok = false; break; }
      }
    }
    tries++;
  } while (!ok && tries < 200);
  // If no valid position found, skip this rock
  if (!ok) return;
  rocks.push({ x: rx, y: ry });
  // Remove items that overlap the new rock
  for (var i = items.length - 1; i >= 0; i--) {
    if (items[i].x >= rx && items[i].x < rx + 4 && items[i].y >= ry && items[i].y < ry + 4) {
      if (items[i].label) items[i].label.destroy();
      items.splice(i, 1);
      spawnItem(); // replace it elsewhere
    }
  }
  // Screen shake effect
  scene.cameras.main.shake(300, 0.012);
  playRockSFX();
}

function playRockSFX() {
  // Harsh descending noise burst — signals danger
  try {
    var ctx = getAudioCtx(); if (!ctx) return;
    // Low rumble
    playTone(80, 0.3, 0.15, 'sawtooth');
    // Descending screech
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(600, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.3);
    // High noise click
    setTimeout(function () { playTone(900, 0.05, 0.08, 'square'); }, 50);
    setTimeout(function () { playTone(200, 0.1, 0.1, 'square'); }, 100);
  } catch (e) { }
}

function calcScore() {
  var t = state === 'playing' ? (Date.now() - startTime) / 1000 : timeAlive;
  var multiplier = budget <= 100 ? (budget / 100) : Math.max(0, (200 - budget) / 100);
  return Math.floor(multiplier * t * 10) / 10;
}

var lastState = '';

function update(time, delta) {
  gfx.clear();

  // Clear texts when state changes
  if (state !== lastState) {
    clearTexts();
    if (state === 'menu' && !menuMusicPlaying) startMenuMusic();
    if (state === 'menu' || state === 'playing') stopGoMusic();
    lastState = state;
  }

  if (state === 'menu') drawMenu();
  else if (state === 'playing') { updatePlaying(delta); drawPlaying(time); }
  else if (state === 'dying') { updateDying(delta); drawPlaying(time); }
  else if (state === 'gameover') drawReceipt();
  else if (state === 'nameentry') drawNameEntry();
}

// --- DEATH ANIMATION ---
function updateDying(delta) {
  deathTimer -= delta;
  deathFlash *= 0.92;
  if (deathTimer <= 0) {
    state = 'gameover';
    var sc = calcScore();
    if (sc > highScore) {
      highScore = sc;
      try { localStorage.setItem('tq_hs', highScore.toString()); } catch (e) { }
    }
    startGoMusic();
  }
}

// --- MENU ---
function drawMenu() {
  drawGrid();
  gfx.fillStyle(0x00F0FF, 0.15);
  gfx.fillRect(0, 0, 800, 600);

  if (textPool.length === 0) {
    makeText(400, 55, 'COMPRA', 28, '#00F0FF');
    makeText(400, 90, 'CHAMPAGNE', 48, '#ffffff');
    makeText(400, 160, '$100', 30, '#BDFF00');
    makeText(400, 215, 'COLLECT DEALS', 14, '#BDFF00');
    makeText(400, 238, 'STAY UNDER $100', 22, '#FF3366');

    // Leaderboard
    if (leaderboard.length > 0) {
      makeText(400, 285, 'TOP SCORES', 16, '#00F0FF');
      for (var li = 0; li < leaderboard.length; li++) {
        var entry = leaderboard[li];
        var ly = 310 + li * 22;
        makeText(310, ly, (li + 1) + '.', 13, '#888888', 0);
        makeText(335, ly, entry.name, 13, '#FFFF00', 0);
        var scoreT = makeText(490, ly, entry.score.toFixed(1), 13, '#ffffff', 0);
        scoreT.setOrigin(1, 0);
      }
    }

    // Press start blink (always last in textPool)
    makeText(400, 530, 'PRESS BTN1', 24, '#FFFF00');
  }

  // Draw pixel art champagne bottle + $ sign (every frame since gfx clears)
  drawChampagneIcon(160, 75);
  drawChampagneIcon(600, 75);

  // Blink PRESS BTN1 (last item in pool)
  var blink = Math.sin(Date.now() * 0.005) > 0;
  textPool[textPool.length - 1].setVisible(blink);
}

function drawChampagneIcon(bx, by) {
  var P = 4; // pixel size

  // Bottle body — dark green
  gfx.fillStyle(0x1B5E20, 1);
  gfx.fillRect(bx + 2 * P, by + 6 * P, 6 * P, 14 * P);  // main body
  gfx.fillRect(bx + 3 * P, by + 4 * P, 4 * P, 2 * P);    // shoulder taper
  gfx.fillRect(bx + 4 * P, by + 2 * P, 2 * P, 2 * P);    // neck

  // Gold foil top
  gfx.fillStyle(0xFFD700, 1);
  gfx.fillRect(bx + 3 * P, by + 1 * P, 4 * P, 1 * P);    // foil wrap
  gfx.fillRect(bx + 4 * P, by + 0 * P, 2 * P, 1 * P);    // cork top

  // Label — white stripe
  gfx.fillStyle(0xFFFFFF, 0.7);
  gfx.fillRect(bx + 2 * P, by + 10 * P, 6 * P, 3 * P);

  // Label accent — gold
  gfx.fillStyle(0xFFD700, 0.5);
  gfx.fillRect(bx + 2 * P, by + 11 * P, 6 * P, 1 * P);

  // Bottle highlight — light green edge
  gfx.fillStyle(0x4CAF50, 0.4);
  gfx.fillRect(bx + 2 * P, by + 6 * P, 1 * P, 14 * P);

  // Bubbles — animated
  var t = Date.now() * 0.003;
  for (var bi = 0; bi < 3; bi++) {
    var bubY = by - 4 * P - ((t + bi * 2.5) % 6) * P;
    var bubX = bx + 4 * P + Math.sin(t + bi * 1.7) * 2 * P;
    gfx.fillStyle(0xFFFFFF, 0.3 + Math.sin(t + bi) * 0.1);
    gfx.fillCircle(bubX, bubY, P * 0.6);
  }

  // Dollar sign next to bottle
  gfx.fillStyle(0xBDFF00, 0.8);
  // S-shape of dollar sign using pixel blocks
  var dx = bx + 11 * P, dy = by + 6 * P;
  gfx.fillRect(dx + 1 * P, dy + 0 * P, 3 * P, 1 * P); // top bar
  gfx.fillRect(dx + 0 * P, dy + 1 * P, 2 * P, 1 * P); // left top
  gfx.fillRect(dx + 1 * P, dy + 2 * P, 2 * P, 1 * P); // middle
  gfx.fillRect(dx + 2 * P, dy + 3 * P, 2 * P, 1 * P); // right bottom
  gfx.fillRect(dx + 0 * P, dy + 4 * P, 3 * P, 1 * P); // bottom bar
  // vertical line through $
  gfx.fillRect(dx + 1.5 * P, dy - 0.5 * P, 1 * P, 6 * P);
}

// --- PLAYING ---
function updatePlaying(delta) {
  moveDelay = 150 - calcIntensity() * 50;
  moveTimer += delta;
  if (moveTimer < moveDelay) return;
  moveTimer = 0;

  dir = nextDir;
  var head = { x: snake[0].x, y: snake[0].y };
  if (dir === 'up') head.y--;
  if (dir === 'down') head.y++;
  if (dir === 'left') head.x--;
  if (dir === 'right') head.x++;

  // Wrap
  if (head.x < 0) head.x = COLS - 1;
  if (head.x >= COLS) head.x = 0;
  if (head.y < 1) head.y = ROWS - 1;
  if (head.y >= ROWS) head.y = 1;

  // Self collision
  for (var i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      gameOver(); return;
    }
  }

  // Rock collision — check if head overlaps any 4x4 rock
  for (var ri = 0; ri < rocks.length; ri++) {
    var r = rocks[ri];
    if (head.x >= r.x && head.x < r.x + 4 && head.y >= r.y && head.y < r.y + 4) {
      gameOver(); return;
    }
  }

  snake.unshift(head);

  // Check items
  var ate = false;
  for (var j = items.length - 1; j >= 0; j--) {
    if (items[j].x === head.x && items[j].y === head.y) {
      budget += items[j].val;
      collected.push({ val: items[j].val, color: COLORS[items[j].val] });
      playPickup();
      createParticles(head.x * GS + GS / 2, head.y * GS + GS / 2, COLORS[items[j].val], 12);
      if (items[j].label) items[j].label.destroy();
      items.splice(j, 1);
      ate = true;
      lastCollectTime = Date.now(); // reset item timer
      if (budget > 100) { gameOver(); return; }
      spawnItem();

      break;
    }
  }
  if (!ate) snake.pop();


  // Item scaling — if no items collected for 10s, add one more (capped)
  if (Date.now() - lastCollectTime >= 10000) {
    lastCollectTime = Date.now();
    if (items.length < MAX_ITEMS) {
      spawnItem();
      // GX-004: Idle-spawn visual/audio cue
      playTone(440, 0.08, 0.06, 'sine');
      setTimeout(function () { playTone(550, 0.06, 0.05, 'sine'); }, 60);
    }
  }

  // Rock spawning — first rock at 20s, interval shrinks as player survives
  var elapsed = Date.now() - startTime;
  var currentRockInterval = Math.max(5000, rockSpawnInterval - (elapsed / 1000) * 200);
  if (!firstRockSpawned && elapsed >= rockGraceTime) {
    firstRockSpawned = true;
    lastRockTime = Date.now();
    spawnRock();
  } else if (firstRockSpawned && Date.now() - lastRockTime >= currentRockInterval) {
    lastRockTime = Date.now();
    spawnRock();
  }

  // Heartbeat
  heartbeatTimer += delta;
  var hbInterval = 500 - (budget / 100) * 350;
  if (heartbeatTimer > hbInterval) {
    heartbeatTimer = 0;
    playHeartbeat();
  }
}

function gameOver() {
  state = 'dying';
  stopMusic();
  timeAlive = (Date.now() - startTime) / 1000;
  deathTimer = 500; // 0.5s animation
  deathFlash = 1;
  // Explosion particles from snake head
  if (snake.length > 0) {
    var head = snake[0];
    createParticles(head.x * GS + GS / 2, head.y * GS + GS / 2, 0xFF0055, 24);
    createParticles(head.x * GS + GS / 2, head.y * GS + GS / 2, 0xFFFFFF, 12);
    // Scatter body segments as particles
    for (var si = 1; si < snake.length; si++) {
      createParticles(snake[si].x * GS + GS / 2, snake[si].y * GS + GS / 2, 0x00F0FF, 4);
    }
  }
  playGameOver();
}

function drawPlaying(time) {
  drawGrid();

  // Items with glow + pulse (labels pooled on items)
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    it.pulse = (it.pulse || 0) + 0.05;
    var px = it.x * GS, py = it.y * GS;
    var c = COLORS[it.val];
    // Glow
    gfx.fillStyle(c, 0.15);
    gfx.fillRoundedRect(px - 4, py - 4, GS + 8, GS + 8, 6);
    gfx.fillStyle(c, 0.8);
    gfx.fillRoundedRect(px + 2, py + 2, GS - 4, GS - 4, 4);
    // Recreate label if destroyed (e.g. by clearTexts on state transition)
    if (!it.label) {
      it.label = scene.add.text(px + GS / 2, py + GS / 2, '$' + it.val, {
        fontFamily: FONT, fontSize: '13px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(501);
    }
    it.label.setPosition(px + GS / 2, py + GS / 2);
  }

  // Snake body
  for (var j = snake.length - 1; j >= 0; j--) {
    var seg = snake[j];
    var sx = seg.x * GS, sy = seg.y * GS;
    if (j === 0) {
      gfx.fillStyle(0x00F0FF, 0.2);
      gfx.fillRoundedRect(sx - 3, sy - 3, GS + 6, GS + 6, 8);
      gfx.fillStyle(0x00F0FF);
      gfx.fillRoundedRect(sx + 1, sy + 1, GS - 2, GS - 2, 6);
      gfx.lineStyle(2, 0xFFFFFF, 0.7);
      gfx.strokeRoundedRect(sx + 1, sy + 1, GS - 2, GS - 2, 6);
      var ex = dir === 'left' ? -4 : dir === 'right' ? 4 : 0;
      var ey = dir === 'up' ? -4 : dir === 'down' ? 4 : 0;
      gfx.fillStyle(0x000000);
      gfx.fillCircle(sx + 11 + ex, sy + 12 + ey, 3);
      gfx.fillCircle(sx + 21 + ex, sy + 12 + ey, 3);
      gfx.fillStyle(0xFFFFFF);
      gfx.fillCircle(sx + 11 + ex, sy + 11 + ey, 1.5);
      gfx.fillCircle(sx + 21 + ex, sy + 11 + ey, 1.5);
    } else {
      var bColor = 0x00B8CC;
      if (j - 1 < collected.length) bColor = collected[j - 1].color;
      var alpha = 0.9 - (j / snake.length) * 0.3;
      gfx.fillStyle(bColor, alpha);
      gfx.fillRoundedRect(sx + 2, sy + 2, GS - 4, GS - 4, 4);
      gfx.lineStyle(1, 0xFFFFFF, 0.15);
      gfx.strokeRoundedRect(sx + 2, sy + 2, GS - 4, GS - 4, 4);
    }
  }

  // Draw rocks
  for (var rk = 0; rk < rocks.length; rk++) {
    var rock = rocks[rk];
    var rx = rock.x * GS, ry = rock.y * GS;
    var rw = 4 * GS, rh = 4 * GS;
    // Red danger glow
    gfx.fillStyle(0xFF0033, 0.12);
    gfx.fillRect(rx - 4, ry - 4, rw + 8, rh + 8);
    // Dark rock body
    gfx.fillStyle(0x1A0A0A, 0.95);
    gfx.fillRect(rx, ry, rw, rh);
    // Jagged internal lines for texture
    gfx.lineStyle(1, 0x330011, 0.6);
    for (var rl = 0; rl < 4; rl++) {
      gfx.moveTo(rx, ry + rl * GS); gfx.lineTo(rx + rw, ry + rl * GS);
      gfx.moveTo(rx + rl * GS, ry); gfx.lineTo(rx + rl * GS, ry + rh);
    }
    gfx.strokePath();
    // Danger border
    gfx.lineStyle(2, 0xFF0033, 0.5);
    gfx.strokeRect(rx, ry, rw, rh);
    // Skull/danger symbol — X marks
    gfx.lineStyle(2, 0xFF0033, 0.4);
    var cx = rx + rw / 2, cy = ry + rh / 2;
    gfx.moveTo(cx - 12, cy - 12); gfx.lineTo(cx + 12, cy + 12);
    gfx.moveTo(cx + 12, cy - 12); gfx.lineTo(cx - 12, cy + 12);
    gfx.strokePath();
  }

  updateParticles();

  // Red danger vignette when budget >= $90
  if (budget >= 90) {
    var danger = Math.min((budget - 90) / 10, 1); // 0 at $90 → 1 at $100
    var pulse = 0.5 + Math.sin(Date.now() * 0.008) * 0.5; // 0-1 pulsing
    var alpha = danger * 0.15 + danger * pulse * 0.1;
    // Vignette borders
    gfx.fillStyle(0xFF0020, alpha);
    gfx.fillRect(0, 0, 800, 8);           // top
    gfx.fillRect(0, 592, 800, 8);         // bottom
    gfx.fillRect(0, 0, 8, 600);           // left
    gfx.fillRect(792, 0, 8, 600);         // right
    // Corner glow
    gfx.fillStyle(0xFF0020, alpha * 0.6);
    gfx.fillRect(0, 0, 40, 40);
    gfx.fillRect(760, 0, 40, 40);
    gfx.fillRect(0, 560, 40, 40);
    gfx.fillRect(760, 560, 40, 40);
  }

  drawHUD();
}

function drawHUD() {
  // Top bar background
  gfx.fillStyle(0x000000, 0.7);
  gfx.fillRect(0, 0, 800, 30);
  gfx.lineStyle(1, 0x1A1C26);
  gfx.strokeRect(0, 0, 800, 30);

  // Budget bar
  var pct = Math.min(budget / 100, 1);
  var barW = 300;
  gfx.fillStyle(0x1A1C26);
  gfx.fillRect(20, 8, barW, 14);
  var barColor = pct < 0.5 ? 0xBDFF00 : pct < 0.8 ? 0xFFAA00 : 0xFF0055;
  gfx.fillStyle(barColor, 0.8);
  gfx.fillRect(20, 8, barW * pct, 14);
  gfx.lineStyle(1, 0x00F0FF, 0.4);
  gfx.strokeRect(20, 8, barW, 14);

  // HUD text objects: create once, update each frame
  // indices in textPool: 0=budget, 1=of100, 2=time, 3=count, 4=highscore
  if (textPool.length === 0) {
    makeText(340, 5, '$0', 16, '#ffffff', 0);
    makeText(395, 5, '/$100', 16, '#888888', 0);
    makeText(730, 5, '0.0s', 16, '#00F0FF', 0);
    makeText(600, 5, 'x0', 16, '#BDFF00', 0);
    makeText(780, 5, 'HI ' + highScore.toFixed(1), 10, '#FF0055', 1);
  }
  // Update values (guarded)
  if (textPool.length >= 5) {
    textPool[0].setText('$' + budget);
    var t = ((Date.now() - startTime) / 1000).toFixed(1);
    textPool[2].setText(t + 's');
    textPool[3].setText('x' + collected.length);
    textPool[4].setText('HI ' + highScore.toFixed(1));
  }

  // GX-002: Death flash overlay
  if (deathFlash > 0.01) {
    gfx.fillStyle(0xFFFFFF, deathFlash * 0.6);
    gfx.fillRect(0, 0, 800, 600);
  }

}

// --- RECEIPT (Game Over) ---
function drawReceipt() {
  gfx.fillStyle(0x000000, 0.85);
  gfx.fillRect(0, 0, 800, 600);

  gfx.fillStyle(0x0D0E14);
  gfx.fillRoundedRect(200, 30, 400, 540, 8);
  gfx.lineStyle(2, 0x00F0FF, 0.5);
  gfx.strokeRoundedRect(200, 30, 400, 540, 8);

  // Layout constants
  var ROW_H = 20;
  var maxShow = Math.min(collected.length, 8);
  var listTop = 95;

  if (textPool.length === 0) {
    makeText(400, 50, 'DIGITAL RECEIPT', 24, '#00F0FF');

    // Items list
    for (var i = 0; i < maxShow; i++) {
      var ci = collected[i];
      var ry = listTop + i * ROW_H;
      makeText(252, ry, 'ITEM ' + (i + 1), 13, '#CCCCCC', 0);
      var priceText = makeText(560, ry, '$' + ci.val, 13, COLOR_STR[ci.val] || '#ffffff', 0);
      priceText.setOrigin(1, 0); // right-align, top-anchor
    }
    var yy = listTop + maxShow * ROW_H;
    if (collected.length > maxShow) {
      makeText(400, yy, '+ ' + (collected.length - maxShow) + ' MORE', 12, '#888888');
      yy += ROW_H;
    }

    yy += 12;
    var overBudget = budget > 100;
    makeText(400, yy, 'TOTAL  $' + budget, 20, overBudget ? '#FF0055' : '#BDFF00');
    if (overBudget) {
      yy += 26;
      makeText(400, yy, 'OVER BUDGET!', 16, '#FF0055');
    }
    yy += 30;

    var sc = calcScore();
    var multiplier = budget <= 100 ? (budget / 100) : Math.max(0, (200 - budget) / 100);
    makeText(400, yy, 'TIME ' + timeAlive.toFixed(1) + 's', 13, '#ffffff'); yy += 22;
    makeText(400, yy, 'SCORE ' + sc.toFixed(1), 24, '#00F0FF'); yy += 30;

    // GX-001: Score formula breakdown
    makeText(400, yy, 'BUDGET EFF: ' + Math.round(multiplier * 100) + '%', 10, '#666666'); yy += 16;
    makeText(400, yy, Math.round(multiplier * 100) + '% x ' + timeAlive.toFixed(1) + 's x 10', 10, '#555555'); yy += 20;

    if (sc >= highScore && sc > 0) {
      makeText(400, yy, 'NEW HIGH SCORE!', 16, '#FFFF00'); yy += 22;
    }
    makeText(400, yy, 'HI ' + highScore.toFixed(1), 13, '#FF0055');

    // Blink text — always at fixed position
    makeText(400, 535, 'PRESS BTN1', 18, '#888888');
  }

  // Divider lines (drawn each frame since gfx clears)
  gfx.fillStyle(0x333333);
  gfx.fillRect(220, 88, 360, 1);
  var divY = listTop + maxShow * ROW_H + (collected.length > maxShow ? ROW_H : 0) + 6;
  gfx.fillRect(220, divY, 360, 1);

  // Colored boxes for receipt items (drawn each frame, aligned with text)
  for (var bi = 0; bi < maxShow; bi++) {
    gfx.fillStyle(collected[bi].color);
    gfx.fillRoundedRect(230, listTop + bi * ROW_H + 2, 14, 14, 2);
  }

  // Blink last text
  var blink = Math.sin(Date.now() * 0.004) > 0;
  textPool[textPool.length - 1].setVisible(blink);
}

// --- NAME ENTRY ---
function drawNameEntry() {
  gfx.fillStyle(0x000000, 0.9);
  gfx.fillRect(0, 0, 800, 600);

  gfx.fillStyle(0x0D0E14);
  gfx.fillRoundedRect(200, 100, 400, 400, 8);
  gfx.lineStyle(2, 0x00F0FF, 0.5);
  gfx.strokeRoundedRect(200, 100, 400, 400, 8);

  if (textPool.length === 0) {
    makeText(400, 130, 'ENTER YOUR NAME', 22, '#00F0FF');
    makeText(400, 175, 'SCORE: ' + calcScore().toFixed(1), 18, '#BDFF00');

    // 3 letter slots
    for (var ci = 0; ci < 3; ci++) {
      var cx = 320 + ci * 70;
      makeText(cx, 250, ALPHA[nameChars[ci]], 48, ci === namePos ? '#FFFF00' : '#ffffff');
      // Up arrow
      makeText(cx, 220, '^', 20, ci === namePos ? '#00F0FF' : '#444444');
      // Down arrow
      makeText(cx, 310, 'v', 20, ci === namePos ? '#00F0FF' : '#444444');
    }

    makeText(400, 380, 'UP/DOWN TO CHANGE', 12, '#888888');
    makeText(400, 400, 'BTN1 TO CONFIRM', 12, '#888888');
  }

  // Underline active slot
  var activeCx = 320 + namePos * 70;
  gfx.fillStyle(0xFFFF00, 0.8);
  gfx.fillRect(activeCx - 15, 300, 30, 3);
}

// --- GRID ---
function drawGrid() {
  gfx.lineStyle(1, 0x1A1C26, 0.5);
  for (var x = 0; x <= 800; x += GS) {
    gfx.moveTo(x, 0); gfx.lineTo(x, 600);
  }
  for (var y = 0; y <= 600; y += GS) {
    gfx.moveTo(0, y); gfx.lineTo(800, y);
  }
  gfx.strokePath();
}

// --- SCANLINES ---
function drawScanlines() {
  scanGfx.setDepth(1000);
  scanGfx.fillStyle(0x000000, 0.06);
  for (var y = 0; y < 600; y += 3) {
    scanGfx.fillRect(0, y, 800, 1);
  }
}

// --- PARTICLES ---
function createParticles(x, y, color, count) {
  for (var i = 0; i < count; i++) {
    var a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    var spd = 1.5 + Math.random() * 3;
    particles.push({
      x: x, y: y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      color: color, size: 1.5 + Math.random() * 2,
      life: 18 + Math.random() * 12
    });
  }
}

function updateParticles() {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.life--;
    if (p.life <= 0) { particles[i] = particles[particles.length - 1]; particles.pop(); continue; }
    var a = p.life / 30;
    gfx.fillStyle(p.color, a);
    gfx.fillCircle(p.x, p.y, p.size * (p.life / 30));
  }
}

// --- AUDIO (Web Audio API) ---
function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = scene.sound.context; } catch (e) { }
  }
  return audioCtx;
}

function playTone(freq, dur, vol, type) {
  try {
    var ctx = getAudioCtx(); if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type || 'square';
    gain.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) { }
}

function playHeartbeat() {
  var intensity = Math.min(budget / 100, 1);
  var vol1 = 0.06 + intensity * 0.08;
  var vol2 = 0.04 + intensity * 0.06;
  // Extra loud and deep past $90
  if (budget >= 90) {
    vol1 = 0.16 + intensity * 0.1;
    vol2 = 0.12 + intensity * 0.08;
  }
  playTone(40 + intensity * 30, 0.15, vol1, 'sine');
  setTimeout(function () {
    playTone(35 + intensity * 25, 0.1, vol2, 'sine');
  }, 120);
  // Third urgent beat past $90
  if (budget >= 90) {
    setTimeout(function () {
      playTone(50, 0.08, vol2 * 0.7, 'sine');
    }, 220);
  }
}

function playPickup() {
  playTone(880, 0.06, 0.12, 'square');
  setTimeout(function () { playTone(1100, 0.08, 0.1, 'square'); }, 50);
  setTimeout(function () { playTone(1320, 0.1, 0.08, 'sine'); }, 100);
}

function playGameOver() {
  var freqs = [600, 500, 400, 300, 200, 120];
  freqs.forEach(function (f, i) {
    setTimeout(function () { playTone(f, 0.25, 0.15, 'sawtooth'); }, i * 120);
  });
}



// --- MENU MUSIC ---
// Fast, driving arpeggiator to build urgency and attract players
var MENU_ARP = [220, 329, 440, 523, 659, 523, 440, 329]; // Am tense climb
var MENU_BASS2 = [55, 55, 58.3, 55, 73.4, 69.3, 55, 55]; // dissonant bass movement

function startMenuMusic() {
  stopMenuMusic();
  menuMusicStep = 0;
  menuMusicPlaying = true;
  scheduleMenuNote();
}

function stopMenuMusic() {
  if (menuMusicInterval) {
    clearTimeout(menuMusicInterval);
    menuMusicInterval = null;
  }
  menuMusicPlaying = false;
}

function scheduleMenuNote() {
  if (state !== 'menu') { menuMusicPlaying = false; return; }
  playMenuNote();
  menuMusicStep++;
  menuMusicInterval = setTimeout(scheduleMenuNote, 150);
}

function playMenuNote() {
  try {
    var ctx = getAudioCtx(); if (!ctx) return;
    var step8 = menuMusicStep % 8;
    var step16 = menuMusicStep % 16;

    // Aggressive pulsing bass — sawtooth
    if (menuMusicStep % 2 === 0) {
      var bOsc = ctx.createOscillator();
      var bGain = ctx.createGain();
      bOsc.connect(bGain); bGain.connect(ctx.destination);
      bOsc.frequency.value = MENU_BASS2[step8];
      bOsc.type = 'sawtooth';
      bGain.gain.setValueAtTime(0.06, ctx.currentTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      bOsc.start(ctx.currentTime);
      bOsc.stop(ctx.currentTime + 0.15);
    }

    // Fast square wave arpeggios — edgy and driving
    var aOsc = ctx.createOscillator();
    var aGain = ctx.createGain();
    aOsc.connect(aGain); aGain.connect(ctx.destination);
    aOsc.frequency.value = MENU_ARP[step8];
    aOsc.type = 'square';
    aGain.gain.setValueAtTime(0.035, ctx.currentTime);
    aGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    aOsc.start(ctx.currentTime);
    aOsc.stop(ctx.currentTime + 0.1);

    // Tension stab — sawtooth screech every 8 steps
    if (step16 === 0) {
      var sOsc = ctx.createOscillator();
      var sGain = ctx.createGain();
      sOsc.connect(sGain); sGain.connect(ctx.destination);
      sOsc.frequency.value = 880;
      sOsc.type = 'sawtooth';
      sGain.gain.setValueAtTime(0.04, ctx.currentTime);
      sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      sOsc.start(ctx.currentTime);
      sOsc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) { }
}

// --- GAME OVER MUSIC ---
// Slow, melancholic sine arpeggios — same Am key but relaxed
var GO_MELODY = [220, 261, 329, 392, 440, 392, 329, 261]; // Am ascending/descending
var GO_BASS = [55, 55, 65.4, 65.4, 73.4, 73.4, 55, 55];   // gentle bass movement

function startGoMusic() {
  stopGoMusic();
  goMusicStep = 0;
  goMusicPlaying = true;
  scheduleGoNote();
}

function stopGoMusic() {
  if (goMusicInterval) {
    clearTimeout(goMusicInterval);
    goMusicInterval = null;
  }
  goMusicPlaying = false;
}

function scheduleGoNote() {
  if (state !== 'gameover' && state !== 'nameentry') { goMusicPlaying = false; return; }
  playGoNote();
  goMusicStep++;
  goMusicInterval = setTimeout(scheduleGoNote, 350);
}

function playGoNote() {
  try {
    var ctx = getAudioCtx(); if (!ctx) return;
    var step8 = goMusicStep % 8;

    // Soft sine bass pad — every other step
    if (goMusicStep % 2 === 0) {
      var bOsc = ctx.createOscillator();
      var bGain = ctx.createGain();
      bOsc.connect(bGain); bGain.connect(ctx.destination);
      bOsc.frequency.value = GO_BASS[step8];
      bOsc.type = 'sine';
      bGain.gain.setValueAtTime(0.04, ctx.currentTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      bOsc.start(ctx.currentTime);
      bOsc.stop(ctx.currentTime + 0.6);
    }

    // Gentle triangle melody
    var mOsc = ctx.createOscillator();
    var mGain = ctx.createGain();
    mOsc.connect(mGain); mGain.connect(ctx.destination);
    mOsc.frequency.value = GO_MELODY[step8];
    mOsc.type = 'triangle';
    mGain.gain.setValueAtTime(0.03, ctx.currentTime);
    mGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    mOsc.start(ctx.currentTime);
    mOsc.stop(ctx.currentTime + 0.4);

    // High shimmer — every 4 steps
    if (goMusicStep % 4 === 0) {
      var sOsc = ctx.createOscillator();
      var sGain = ctx.createGain();
      sOsc.connect(sGain); sGain.connect(ctx.destination);
      sOsc.frequency.value = GO_MELODY[step8] * 2;
      sOsc.type = 'sine';
      sGain.gain.setValueAtTime(0.015, ctx.currentTime);
      sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      sOsc.start(ctx.currentTime);
      sOsc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) { }
}

// --- BACKGROUND MUSIC ENGINE ---
// Dark minor-key arpeggiator + bass that accelerates with budget
var BASS_NOTES = [55, 55, 65.4, 73.4, 55, 55, 82.4, 73.4]; // A1, A1, C2, D2...
var ARP_PATTERN = [
  [220, 261, 329], // Am chord tones
  [220, 329, 392],
  [261, 329, 440],
  [329, 392, 523],
  [261, 329, 440],
  [220, 329, 392],
  [220, 261, 329],
  [196, 261, 329]  // resolve down
];

function startMusic() {
  stopMusic();
  musicStep = 0;
  scheduleMusicStep();
}

function stopMusic() {
  if (musicInterval) {
    clearTimeout(musicInterval);
    musicInterval = null;
  }
}

function calcIntensity() {
  var totalCells = COLS * ROWS;
  var occupied = snake.length + rocks.length * 16 + items.length;
  var crowding = Math.min(occupied / totalCells, 1); // 0 = empty board, 1 = full
  var budgetRatio = Math.min(budget / 100, 1);
  // 70% crowding + 30% budget
  return Math.min(crowding * 0.7 + budgetRatio * 0.3, 1);
}

function scheduleMusicStep() {
  if (state !== 'playing') return;
  var intensity = calcIntensity();
  // Tempo: 200ms at start → 80ms when board is packed
  var tempo = 200 - intensity * 130;

  playMusicNote();
  musicStep++;

  musicInterval = setTimeout(scheduleMusicStep, tempo);
}

function playMusicNote() {
  try {
    var ctx = getAudioCtx(); if (!ctx) return;
    var intensity = calcIntensity();
    var step8 = musicStep % 8;
    var step3 = musicStep % 3;

    // Bass — low sub pulse on every other step
    if (musicStep % 2 === 0) {
      var bassFreq = BASS_NOTES[step8];
      // Detune slightly as intensity rises for unease
      bassFreq *= (1 + intensity * 0.02);
      var bOsc = ctx.createOscillator();
      var bGain = ctx.createGain();
      bOsc.connect(bGain); bGain.connect(ctx.destination);
      bOsc.frequency.value = bassFreq;
      bOsc.type = 'triangle';
      var bVol = 0.06 + intensity * 0.04;
      bGain.gain.setValueAtTime(bVol, ctx.currentTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      bOsc.start(ctx.currentTime);
      bOsc.stop(ctx.currentTime + 0.2);
    }

    // Arpeggiator — cycle through chord tones
    var arpChord = ARP_PATTERN[step8];
    var arpFreq = arpChord[step3];
    // Shift octave up as intensity grows
    if (intensity > 0.6) arpFreq *= 2;
    var aOsc = ctx.createOscillator();
    var aGain = ctx.createGain();
    aOsc.connect(aGain); aGain.connect(ctx.destination);
    aOsc.frequency.value = arpFreq;
    aOsc.type = 'square';
    var aVol = 0.03 + intensity * 0.02;
    aGain.gain.setValueAtTime(aVol, ctx.currentTime);
    aGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    aOsc.start(ctx.currentTime);
    aOsc.stop(ctx.currentTime + 0.12);

    // High tension stab every 8 steps at high intensity
    if (intensity > 0.5 && step8 === 0) {
      var sOsc = ctx.createOscillator();
      var sGain = ctx.createGain();
      sOsc.connect(sGain); sGain.connect(ctx.destination);
      sOsc.frequency.value = 660 + intensity * 200;
      sOsc.type = 'sawtooth';
      sGain.gain.setValueAtTime(0.04, ctx.currentTime);
      sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      sOsc.start(ctx.currentTime);
      sOsc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) { }
}
