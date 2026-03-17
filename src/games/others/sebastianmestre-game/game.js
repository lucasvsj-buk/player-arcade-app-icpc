// Nim Masters - A strategic stone-taking game
// Controls: A/D pile, W/S amount, U confirm (P1) | Arrows pile, Arrows amt, R confirm (P2)

const ARCADE_CONTROLS = {
  'P1U': ['w'], 'P1D': ['s'], 'P1L': ['a'], 'P1R': ['d'],
  'P2U': ['ArrowUp'], 'P2D': ['ArrowDown'], 'P2L': ['ArrowLeft'], 'P2R': ['ArrowRight'],
  'P1A': ['u'], 'P2A': ['r'],
  'START1': ['1', 'Enter'], 'START2': ['2']
};

const KEYBOARD_TO_ARCADE = {};
for (const [code, ks] of Object.entries(ARCADE_CONTROLS)) {
  ks.forEach(k => KEYBOARD_TO_ARCADE[k] = code);
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#08080f',
  scene: { create, update }
};

const game = new Phaser.Game(config);

// Menu flow state
let state = 'title'; // title → size → opp → tc → playing → gameover
let boardSize = 1;   // 0=small, 1=medium, 2=large
let oppType = 2;     // 0=player, 1=easy, 2=normal, 3=hard
let tcType = 1;      // 0=classic, 1=blitz, 2=bullet

// Derived game settings (set in startGame)
let mode = 1;        // 1=1P vs CPU, 2=2P
let diff = 1;        // 0=easy, 1=normal, 2=hard

const TC_BASE = [300000, 60000, 15000]; // tcType 0-2
const TC_INC  = [5000, 2000, 1000];

let gfx, sc;
let held = {};

// Nim game state
let piles = [];
let turn = 0;
let sel = 0;
let amt = 1;
let winner = -1;
let reason = '';

// CPU
let cpuWait = 0;
let cpuMove = null;

// Animation
let busy = false;
let busyT = 0;
let sparks = [];

// Clocks (P1 always has one when tcType>0; P2 only in 2P mode)
let clocks = [0, 0];
let clockOn = false;

let pulse = 0;

// ─── LIFECYCLE ───────────────────────────────────────────────────────────────

function create() {
  sc = this;
  gfx = this.add.graphics();
  this.input.keyboard.on('keydown', e => {
    const k = KEYBOARD_TO_ARCADE[e.key] || e.key;
    if (!held[k]) onKey(k);
    held[k] = true;
  });
  this.input.keyboard.on('keyup', e => {
    held[KEYBOARD_TO_ARCADE[e.key] || e.key] = false;
  });
}

function onKey(k) {
  const up   = k === 'P1U' || k === 'P2U';
  const dn   = k === 'P1D' || k === 'P2D';
  const ok   = k === 'START1' || k === 'P1A';
  const back = k === 'START2' || k === 'P2A';

  if (state === 'title') {
    state = 'size'; beep(500, 0.08); return;
  }
  if (state === 'size') {
    if (up) { boardSize = Math.max(0, boardSize - 1); beep(480, 0.05); }
    if (dn) { boardSize = Math.min(2, boardSize + 1); beep(480, 0.05); }
    if (ok) { state = 'opp'; beep(640, 0.08); }
    if (back) { state = 'title'; beep(300, 0.05); }
  } else if (state === 'opp') {
    if (up) { oppType = Math.max(0, oppType - 1); beep(480, 0.05); }
    if (dn) { oppType = Math.min(3, oppType + 1); beep(480, 0.05); }
    if (ok) { state = 'tc'; beep(640, 0.08); }
    if (back) { state = 'size'; beep(300, 0.05); }
  } else if (state === 'tc') {
    if (up) { tcType = Math.max(0, tcType - 1); beep(480, 0.05); }
    if (dn) { tcType = Math.min(2, tcType + 1); beep(480, 0.05); }
    if (ok) startGame();
    if (back) { state = 'opp'; beep(300, 0.05); }
  } else if (state === 'playing' && !busy && !cpuWait) {
    const mine = turn === 0 || mode === 2;
    if (!mine) return;
    const p1 = turn === 0;
    if (k === (p1 ? 'P1L' : 'P2L')) { moveSel(-1); beep(400, 0.04); }
    else if (k === (p1 ? 'P1R' : 'P2R')) { moveSel(1); beep(400, 0.04); }
    else if (k === (p1 ? 'P1U' : 'P2U')) { adjAmt(1); beep(500, 0.04); }
    else if (k === (p1 ? 'P1D' : 'P2D')) { adjAmt(-1); beep(500, 0.04); }
    else if (k === (p1 ? 'P1A' : 'P2A') || k === 'START1') confirm();
  } else if (state === 'gameover') {
    if (ok) { state = 'title'; }
  }
}

// ─── GAME SETUP ──────────────────────────────────────────────────────────────

function startGame() {
  mode = oppType === 0 ? 2 : 1;
  diff = Math.max(0, oppType - 1); // 0=easy,1=normal,2=hard

  const cfg = [[3, 1, 5], [4, 2, 7], [5, 3, 9]][boardSize];
  piles = Array.from({ length: cfg[0] }, () =>
    cfg[1] + Math.floor(Math.random() * (cfg[2] - cfg[1] + 1))
  );

  turn = 0; sel = 0; amt = 1;
  winner = -1; reason = 'normal';
  cpuWait = 0; cpuMove = null;
  busy = false; sparks = []; pulse = 0;

  clocks = [TC_BASE[tcType], TC_BASE[tcType]];
  clockOn = true;

  state = 'playing';
  beep(300, 0.1);
}

function moveSel(d) {
  for (let i = 1; i <= piles.length; i++) {
    const j = ((sel + d * i) % piles.length + piles.length) % piles.length;
    if (piles[j] > 0) { sel = j; amt = Math.min(amt, piles[sel]); return; }
  }
}

function adjAmt(d) { amt = Math.max(1, Math.min(piles[sel], amt + d)); }

function confirm() {
  if (!piles[sel] || amt < 1) return;
  execMove(sel, amt);
}

function execMove(pi, a) {
  busy = true; busyT = 0;
  const px = pileX(pi);
  const midIdx = piles[pi] - 1 - (a - 1) / 2;
  const py = stoneY(midIdx);
  const col = turn === 0 ? 0x00ff88 : 0xff4488;
  piles[pi] -= a;
  spawnSparks(px, py, col, Math.min(a * 6, 40));
  playTake(a);
}

function spawnSparks(px, py, col, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 5;
    sparks.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.5,
      life: 22 + Math.random() * 18, maxLife: 40, color: col, r: 2 + Math.random() * 3 });
  }
}

function afterMove() {
  // Increment for human player who just moved
  if (clockOn && (mode === 2 || turn === 0)) {
    clocks[turn] += TC_INC[tcType];
  }
  const total = piles.reduce((s, p) => s + p, 0);
  if (total === 0) {
    winner = turn; reason = 'normal';
    state = 'gameover'; clockOn = false; playWin(); return;
  }
  turn = 1 - turn;
  sel = piles.findIndex(p => p > 0);
  if (sel < 0) sel = 0;
  amt = 1;
  if (mode === 1 && turn === 1) {
    cpuWait = 65;
    cpuMove = calcCpuMove();
  }
}

// ─── CPU AI ──────────────────────────────────────────────────────────────────

function calcCpuMove() {
  if (diff === 2) return optimalMove();
  return mcMove(diff === 0 ? 8 : 60);
}

function optimalMove() {
  const xr = piles.reduce((x, p) => x ^ p, 0);
  if (xr !== 0) {
    for (let i = 0; i < piles.length; i++) {
      const t = piles[i] ^ xr;
      if (t < piles[i]) return { p: i, a: piles[i] - t };
    }
  }
  for (let i = 0; i < piles.length; i++) if (piles[i] > 0) return { p: i, a: 1 };
}

function mcMove(traces) {
  const moves = [];
  for (let p = 0; p < piles.length; p++)
    for (let a = 1; a <= piles[p]; a++) moves.push({ p, a });
  let best = moves[0], bestScore = -1;
  for (const mv of moves) {
    const tmp = piles.map((v, i) => i === mv.p ? v - mv.a : v);
    if (tmp.every(v => v === 0)) return mv;
    let wins = 0;
    for (let i = 0; i < traces; i++) if (simRandom([...tmp], false)) wins++;
    if (wins > bestScore) { bestScore = wins; best = mv; }
  }
  return best;
}

function simRandom(sim, myTurn) {
  let mine = myTurn;
  while (true) {
    let total = 0; for (const v of sim) total += v;
    if (total === 0) return !mine;
    const ne = []; for (let i = 0; i < sim.length; i++) if (sim[i] > 0) ne.push(i);
    const pi = ne[Math.floor(Math.random() * ne.length)];
    sim[pi] -= 1 + Math.floor(Math.random() * sim[pi]);
    mine = !mine;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function pileX(i) {
  const n = piles.length;
  const sp = n <= 3 ? 155 : n === 4 ? 130 : 110;
  return 400 - (n - 1) * sp / 2 + i * sp;
}

function stoneY(j) { return 478 - j * 38 - 19; }

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const sec = s % 60;
  return Math.floor(s / 60) + ':' + (sec < 10 ? '0' : '') + sec;
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────

function update(time, delta) {
  pulse = (pulse + 0.08) % (Math.PI * 2);
  gfx.clear();
  if      (state === 'title')  drawTitle();
  else if (state === 'size')   drawPickerScreen('BOARD SIZE', sizeItems(), boardSize, null);
  else if (state === 'opp')    drawPickerScreen('OPPONENT',   oppItems(),  oppType,   oppCtx());
  else if (state === 'tc')     drawPickerScreen('TIME CTRL',  tcItems(),   tcType,    tcCtx());
  else if (state === 'playing'){ tick(delta); drawGame(); }
  else if (state === 'gameover') drawOver();
}

function sizeItems() {
  return [
    ['SMALL',  '3 PILES  1 TO 5 STONES', 0x44ff88],
    ['MEDIUM', '4 PILES  2 TO 7 STONES', 0x44aaff],
    ['LARGE',  '5 PILES  3 TO 9 STONES', 0xaa44ff],
  ];
}

function oppItems() {
  return [
    ['PLAYER', '2P LOCAL GAME',   0xff4488],
    ['EASY',   '8 MC TRACES',     0xffee00],
    ['NORMAL', '60 MC TRACES',    0xff8800],
    ['HARD',   'XOR OPTIMAL',     0xff3300],
  ];
}

function tcItems() {
  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      if (seconds > 0) {
        return `${minutes} MIN ${seconds} SEC`;
      } else {
        return `${minutes} MIN`;
      }
    } else {
      return `${seconds} SEC`;
    }
  }
  function timeControlLabel(idx) {
    const base = TC_BASE[idx];
    const inc = TC_INC[idx];
    return `${formatTime(base)} + ${formatTime(inc)} INC`;
  }
  return [
    ['CLASSIC', timeControlLabel(0), 0xffcc00],
    ['BLITZ',   timeControlLabel(1), 0xff6600],
    ['BULLET',  timeControlLabel(2), 0xff2200],
  ];
}

function oppCtx() { return ['SMALL BOARD', 'MEDIUM BOARD', 'LARGE BOARD'][boardSize]; }

function tcCtx() {
  const sz = ['SMALL', 'MEDIUM', 'LARGE'][boardSize];
  const op = ['VS PLAYER', 'VS EASY CPU', 'VS NORMAL CPU', 'VS HARD CPU'][oppType];
  return sz + '  ' + op + (oppType > 0 ? '  P1 CLOCK ONLY' : '');
}

function tick(delta) {
  if (busy) {
    if (++busyT > 26) { busy = false; afterMove(); }
  }
  if (cpuWait > 0 && !busy) {
    if (--cpuWait === 0 && cpuMove) {
      sel = cpuMove.p; amt = cpuMove.a;
      execMove(cpuMove.p, cpuMove.a);
      cpuMove = null;
    }
  }
  // Tick active human player's clock only
  if (clockOn && !busy) {
    if (mode === 2 || turn === 0) {
      clocks[turn] -= delta;
      if (clocks[turn] <= 0) {
        clocks[turn] = 0;
        winner = mode === 2 ? 1 - turn : 1;
        reason = 'timeout';
        state = 'gameover'; clockOn = false; playWin();
      }
    }
  }
  sparks = sparks.filter(s => {
    s.x += s.vx; s.y += s.vy; s.vy += 0.28;
    return --s.life > 0;
  });
}

// ─── DRAWING ─────────────────────────────────────────────────────────────────

function drawBg() {
  gfx.fillStyle(0x0d0d20);
  gfx.fillRect(0, 0, 800, 600);
  gfx.lineStyle(1, 0x161630);
  for (let x = 0; x <= 800; x += 40) { gfx.beginPath(); gfx.moveTo(x,0); gfx.lineTo(x,600); gfx.strokePath(); }
  for (let y = 0; y <= 600; y += 40) { gfx.beginPath(); gfx.moveTo(0,y); gfx.lineTo(800,y); gfx.strokePath(); }
}

function drawDecoPile(x, baseY, n, col) {
  for (let j = 0; j < n; j++) { gfx.fillStyle(col); gfx.fillCircle(x, baseY - j * 28, 13); }
}

function drawTitle() {
  drawBg();
  drawDecoPile(110, 520, 3, 0x1a3050); drawDecoPile(160, 520, 5, 0x152a44);
  drawDecoPile(640, 520, 4, 0x1a3050); drawDecoPile(690, 520, 2, 0x152a44); drawDecoPile(735, 520, 6, 0x101e30);

  const ty = 115 + Math.sin(pulse) * 4;
  gfx.fillStyle(0xffcc00);
  drawTxt(gfx, 'NIM MASTERS', 400, ty, 5);

  gfx.fillStyle(0x6688aa);
  drawTxt(gfx, 'A GAME OF STRATEGY', 400, 215, 2);

  gfx.fillStyle(0x1a2a3a);
  gfx.fillRoundedRect(130, 278, 540, 86, 8);
  gfx.fillStyle(0x4a6a7a);
  drawTxt(gfx, 'TAKE STONES FROM ONE PILE PER TURN', 400, 292, 1);
  drawTxt(gfx, 'THE LAST TO TAKE WINS', 400, 316, 1);
  drawTxt(gfx, 'NO STONES ON YOUR TURN  YOU LOSE', 400, 340, 1);

  const blink = Math.sin(pulse * 2.5) > 0;
  gfx.fillStyle(blink ? 0xffff00 : 0x555522);
  drawTxt(gfx, 'PRESS ANY KEY', 400, 448, 3);
}

function drawPickerScreen(title, items, sel, ctx) {
  drawBg();
  gfx.fillStyle(0x2233aa);
  drawTxt(gfx, 'NIM MASTERS', 400, 15, 2);
  gfx.fillStyle(0xffcc00);
  drawTxt(gfx, title, 400, 58, 4);

  if (ctx) {
    gfx.fillStyle(0x445566);
    drawTxt(gfx, ctx, 400, 106, 2);
  }

  const n = items.length;
  const itemH = n <= 3 ? 78 : 64;
  const gap = 8;
  const totalH = n * itemH + (n - 1) * gap;
  const startY = (ctx ? 128 : 120) + Math.max(0, (300 - totalH) / 2);
  const p = Math.sin(pulse) * 0.15 + 0.85;

  for (let i = 0; i < n; i++) {
    const [label, desc, col] = items[i];
    const oy = startY + i * (itemH + gap);
    const isActive = i === sel;

    if (isActive) {
      gfx.fillStyle(col, 0.18 * p);
      gfx.fillRoundedRect(146, oy - 2, 508, itemH + 4, 10);
    }
    gfx.fillStyle(isActive ? col : 0x1a2a3a);
    gfx.fillRoundedRect(148, oy, 504, itemH, 8);

    gfx.fillStyle(isActive ? 0x000000 : col);
    drawTxt(gfx, label, 400, oy + (desc ? 11 : (itemH - 20) / 2), 3);

    if (desc) {
      gfx.fillStyle(isActive ? 0x112233 : 0x445566);
      drawTxt(gfx, desc, 400, oy + itemH - 21, 2);
    }
  }

  // Side arrows for selected item
  const [,, arrowCol] = items[sel];
  const ay = startY + sel * (itemH + gap) + itemH / 2 - 8;
  gfx.fillStyle(arrowCol);
  gfx.fillTriangle(126, ay, 126, ay + 16, 140, ay + 8);
  gfx.fillTriangle(674, ay, 674, ay + 16, 660, ay + 8);

  gfx.fillStyle(0x334455);
  drawTxt(gfx, 'UD SELECT   START OK   BACK P2', 400, 557, 2);
}

function drawGame() {
  gfx.fillStyle(0x08080f);
  gfx.fillRect(0, 0, 800, 600);
  gfx.fillStyle(0x0e0e22);
  gfx.fillRect(0, 0, 800, 62);

  const p1c = 0x00ff88;
  const p2c = mode === 1 ? 0xff8800 : 0xff4488;
  const glow = Math.sin(pulse) * 0.25 + 0.75;
  const showP1Clock = true;
  const showP2Clock = mode === 2;

  // P1 box
  if (turn === 0) { gfx.fillStyle(p1c, 0.15 * glow); gfx.fillRoundedRect(6, 4, 250, 54, 7); }
  gfx.fillStyle(turn === 0 ? p1c : 0x1e2e3e);
  gfx.fillRoundedRect(8, 6, 246, 50, 6);

  if (showP1Clock) {
    const low = clocks[0] < 10000;
    const flash = low && Math.sin(pulse * 5) > 0;
    gfx.fillStyle(turn === 0 ? 0x004422 : 0x7799aa);
    drawTxt(gfx, 'PLAYER 1', 96, 11, 2);
    gfx.fillStyle(flash ? 0xffff00 : (low ? 0xff5500 : (turn === 0 ? 0x003322 : p1c)));
    drawTxt(gfx, fmtTime(clocks[0]), 196, 22, 3);
  } else {
    gfx.fillStyle(turn === 0 ? 0x001100 : 0x667788);
    drawTxt(gfx, 'PLAYER 1', 131, 19, 2);
    if (turn === 0 && !busy && !cpuWait) { gfx.fillStyle(0x003300); drawTxt(gfx, 'YOUR TURN', 131, 40, 2); }
  }

  // Center VS + time ctrl name (always shown)
  const tcNames = ['CLASSIC', 'BLITZ', 'BULLET'];
  const tcColsArr = [0xffcc00, 0xff6600, 0xff2200];
  gfx.fillStyle(0x223344);
  drawTxt(gfx, 'VS', 400, 10, 1.8);
  gfx.fillStyle(tcColsArr[tcType]);
  drawTxt(gfx, tcNames[tcType], 400, 30, 1.5);

  // P2 / CPU box
  const diffCol   = [0xffee00, 0xff8800, 0xff3300][diff];
  const diffLabel = ['EASY', 'NORMAL', 'HARD'][diff];
  const p2name    = mode === 1 ? 'CPU' : 'PLAYER 2';
  if (turn === 1) { gfx.fillStyle(p2c, 0.15 * glow); gfx.fillRoundedRect(544, 4, 250, 54, 7); }
  gfx.fillStyle(turn === 1 ? p2c : 0x2e1e2e);
  gfx.fillRoundedRect(546, 6, 246, 50, 6);

  if (showP2Clock) {
    const low = clocks[1] < 10000;
    const flash = low && Math.sin(pulse * 5) > 0;
    gfx.fillStyle(turn === 1 ? 0x440022 : 0x7799aa);
    drawTxt(gfx, 'PLAYER 2', 704, 11, 1.5);
    gfx.fillStyle(flash ? 0xffff00 : (low ? 0xff5500 : (turn === 1 ? 0x330011 : p2c)));
    drawTxt(gfx, fmtTime(clocks[1]), 604, 22, 2.8);
  } else {
    gfx.fillStyle(turn === 1 ? 0x110000 : 0x887766);
    drawTxt(gfx, p2name, mode === 1 ? 630 : 669, 19, 2.2);
    if (mode === 1) {
      gfx.fillStyle(turn === 1 ? diffCol : 0x554433);
      drawTxt(gfx, diffLabel, 750, 19, 1.5);
    }
    if (turn === 1 && cpuWait > 0) { gfx.fillStyle(0x330000); drawTxt(gfx, 'MOVING', 669, 40, 2); }
    else if (turn === 1 && !busy && mode === 2) { gfx.fillStyle(0x334455); drawTxt(gfx, 'YOUR TURN', 669, 40, 2); }
  }

  // Ground line
  gfx.fillStyle(0x1a2a3a);
  gfx.fillRect(60, 488, 680, 3);

  for (let i = 0; i < piles.length; i++) drawPile(i);

  for (const s of sparks) {
    gfx.fillStyle(s.color, s.life / s.maxLife);
    gfx.fillCircle(s.x, s.y, s.r);
  }

  // Bottom bar
  const curCol = turn === 0 ? p1c : p2c;
  gfx.fillStyle(0x0e0e22);
  gfx.fillRect(0, 556, 800, 44);
  if (cpuWait > 0) { gfx.fillStyle(p2c); drawTxt(gfx, 'CPU IS MOVING', 400, 567, 2); }
  else if (!busy)  { gfx.fillStyle(curCol); drawTxt(gfx, 'LR PILE  WS AMT  PRESS ACT', 400, 567, 2); }
}

function drawPile(idx) {
  const x = pileX(idx);
  const sr = 17;
  const isSel = idx === sel && !busy && !cpuWait;
  const p1c = 0x00ff88;
  const p2c = mode === 1 ? 0xff8800 : 0xff4488;
  const curCol = turn === 0 ? p1c : p2c;

  if (isSel) {
    gfx.fillStyle(curCol, 0.06);
    gfx.fillRect(x - 30, 70, 60, 425);
    gfx.fillStyle(curCol, 0.9);
    gfx.fillRect(x - 30, 488, 60, 3);
  }

  for (let j = 0; j < piles[idx]; j++) {
    const sy = stoneY(j);
    const willTake = isSel && j >= piles[idx] - amt;
    const sc2 = willTake ? curCol : 0x2255aa;
    if (willTake) {
      const g = Math.sin(pulse * 2) * 0.2 + 0.4;
      gfx.fillStyle(sc2, g);
      gfx.fillCircle(x, sy, sr + 5);
    }
    gfx.fillStyle(sc2);
    gfx.fillCircle(x, sy, sr);
    gfx.fillStyle(0xffffff, willTake ? 0.45 : 0.18);
    gfx.fillCircle(x - 5, sy - 5, sr * 0.36);
    gfx.lineStyle(1, 0x000000, 0.3);
    gfx.strokeCircle(x, sy, sr);
  }

  gfx.fillStyle(0x334455);
  drawTxt(gfx, 'P' + (idx + 1), x, 500, 1.5);
  gfx.fillStyle(0x1a2a3a);
  gfx.fillCircle(x, 528, 16);
  gfx.fillStyle(piles[idx] === 0 ? 0x334455 : 0xaabbcc);
  drawTxt(gfx, piles[idx].toString(), x, 519, 2);

  if (isSel && piles[idx] > 0) {
    const topY = stoneY(piles[idx] - 1) - sr - 10;
    gfx.fillStyle(curCol);
    drawTxt(gfx, '-' + amt, x, topY - 22, 2.2);
    gfx.fillStyle(curCol, 0.8);
    gfx.fillTriangle(x - 8, topY - 4, x + 8, topY - 4, x, topY + 8);
  }

  if (piles[idx] === 0) { gfx.fillStyle(0x2a3a4a); gfx.fillRect(x - 22, 474, 44, 3); }
}

function drawOver() {
  gfx.fillStyle(0x08080f);
  gfx.fillRect(0, 0, 800, 600);
  gfx.fillStyle(0x000033, Math.sin(pulse * 0.5) * 0.04 + 0.08);
  gfx.fillRect(0, 0, 800, 600);
  gfx.lineStyle(1, 0x161630);
  for (let x = 0; x <= 800; x += 40) { gfx.beginPath(); gfx.moveTo(x,0); gfx.lineTo(x,600); gfx.strokePath(); }

  gfx.fillStyle(0xffcc00);
  drawTxt(gfx, 'GAME OVER', 400, 130, 5);

  const wName = winner === 0 ? 'PLAYER 1' : (mode === 1 ? 'CPU' : 'PLAYER 2');
  const wCol  = winner === 0 ? 0x00ff88 : (mode === 1 ? 0xff8800 : 0xff4488);
  gfx.fillStyle(wCol, 0.12 * (Math.sin(pulse) * 0.2 + 0.8));
  gfx.fillRoundedRect(150, 240, 500, 62, 12);
  gfx.fillStyle(wCol);
  drawTxt(gfx, wName + ' WINS', 400, 255, 4);

  // Context info
  if (reason === 'timeout') {
    gfx.fillStyle(0xff4400);
    drawTxt(gfx, 'OUT OF TIME', 400, 336, 3);
    if (mode === 2) {
      gfx.fillStyle(0x445566);
      drawTxt(gfx, 'P1 ' + fmtTime(clocks[0]), 270, 384, 2);
      drawTxt(gfx, 'P2 ' + fmtTime(clocks[1]), 530, 384, 2);
    }
  } else if (mode === 1) {
    const dc = [0xffee00, 0xff8800, 0xff3300][diff];
    gfx.fillStyle(0x334455);
    drawTxt(gfx, 'VS CPU  ' + ['EASY', 'NORMAL', 'HARD'][diff], 400, 345, 2);
  } else if (mode === 2) {
    gfx.fillStyle(tcCols(tcType));
    drawTxt(gfx, ['CLASSIC', 'BLITZ', 'BULLET'][tcType], 400, 345, 2);
    gfx.fillStyle(0x445566);
    drawTxt(gfx, 'P1 ' + fmtTime(clocks[0]), 270, 376, 2);
    drawTxt(gfx, 'P2 ' + fmtTime(clocks[1]), 530, 376, 2);
  }

  const sz = ['SMALL', 'MEDIUM', 'LARGE'][boardSize];
  gfx.fillStyle(0x334455);
  drawTxt(gfx, sz + ' BOARD', 400, 430, 2);
  gfx.fillStyle(0x556677);
  drawTxt(gfx, 'PRESS START', 400, 474, 2);
}

function tcCols(t) { return [0xffcc00, 0xff6600, 0xff2200][t]; }

// ─── AUDIO ───────────────────────────────────────────────────────────────────

function beep(freq, vol) {
  try {
    const ctx = sc.sound.context;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.07);
  } catch (e) {}
}

function playTake(a) {
  try {
    const ctx = sc.sound.context;
    [380, 300, 240, 200].slice(0, Math.min(a, 4)).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = 'triangle';
      const t = ctx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.start(t); o.stop(t + 0.14);
    });
  } catch (e) {}
}

function playWin() {
  try {
    const ctx = sc.sound.context;
    [300, 380, 480, 600, 760, 960].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = 'square';
      const t = ctx.currentTime + i * 0.1;
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t); o.stop(t + 0.18);
    });
  } catch (e) {}
}

// ─── PIXEL FONT ──────────────────────────────────────────────────────────────

function drawTxt(g, text, cx, y, sz) {
  const C = {
    'A': [0xFC,0x12,0x12,0xFC,0x00], 'B': [0xFE,0x92,0x92,0x6C,0x00],
    'C': [0x7C,0x82,0x82,0x44,0x00], 'D': [0xFE,0x82,0x82,0x7C,0x00],
    'E': [0xFE,0x92,0x92,0x82,0x00], 'F': [0xFE,0x12,0x12,0x02,0x00],
    'G': [0x7C,0x82,0x92,0x74,0x00], 'H': [0xFE,0x10,0x10,0xFE,0x00],
    'I': [0x00,0x82,0xFE,0x82,0x00], 'J': [0x40,0x80,0x80,0x7E,0x00],
    'K': [0xFE,0x10,0x28,0x44,0x00], 'L': [0xFE,0x80,0x80,0x80,0x00],
    'M': [0xFE,0x04,0x18,0x04,0xFE], 'N': [0xFE,0x08,0x10,0x20,0xFE],
    'O': [0x7C,0x82,0x82,0x7C,0x00], 'P': [0xFE,0x12,0x12,0x0C,0x00],
    'R': [0xFE,0x12,0x32,0xCC,0x00], 'S': [0x4C,0x92,0x92,0x64,0x00],
    'T': [0x02,0x02,0xFE,0x02,0x02], 'U': [0x7E,0x80,0x80,0x7E,0x00],
    'V': [0x3E,0x40,0x80,0x40,0x3E], 'W': [0x7E,0x80,0x70,0x80,0x7E],
    'X': [0xC6,0x28,0x10,0x28,0xC6], 'Y': [0x06,0x08,0xF0,0x08,0x06],
    'Z': [0xC2,0xA2,0x92,0x8E,0x00],
    '0': [0x7C,0xA2,0x92,0x8A,0x7C], '1': [0x00,0x84,0xFE,0x80,0x00],
    '2': [0xC4,0xA2,0x92,0x8C,0x00], '3': [0x44,0x92,0x92,0x6C,0x00],
    '4': [0x1E,0x10,0xFE,0x10,0x00], '5': [0x4E,0x8A,0x8A,0x72,0x00],
    '6': [0x7C,0x92,0x92,0x64,0x00], '7': [0x02,0xE2,0x12,0x0E,0x00],
    '8': [0x6C,0x92,0x92,0x6C,0x00], '9': [0x4C,0x92,0x92,0x7C,0x00],
    ':': [0x00,0x00,0x66,0x00,0x00],
    ' ': [0,0,0,0,0], '-': [0x10,0x10,0x10,0x10,0x00], '+': [0x10,0x10,0x7C,0x10,0x10]
  };
  const sp = 7 * sz;
  let x = cx - text.length * sp / 2;
  const ps = Math.max(1, sz - 1);
  for (const c of text) {
    const d = C[c];
    if (d) for (let col = 0; col < 5; col++) for (let row = 0; row < 8; row++)
      if (d[col] & (1 << row)) g.fillRect(x + col * sz, y + row * sz, ps, ps);
    x += sp;
  }
}
