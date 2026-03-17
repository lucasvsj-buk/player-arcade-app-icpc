// ICPC Competition Simulation
// Move: WASD / Joystick | Action: U key / ACTION button

const ARCADE_CONTROLS = {
  'P1U': ['w'], 'P1D': ['s'], 'P1L': ['a'], 'P1R': ['d'],
  'P2U': ['ArrowUp'], 'P2D': ['ArrowDown'],
  'P1A': ['u', 'z'], 'P1B': ['i', 'Escape'],
  'P2A': ['r'],
  'START1': ['1', 'Enter'], 'START2': ['2']
};
const KB = {};
for (const [c, ks] of Object.entries(ARCADE_CONTROLS)) ks.forEach(k => KB[k] = c);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 400,
  height: 300,
  zoom: 2,
  antialias: true,
  roundPixels: true,
  backgroundColor: '#0a0a1a',
  scene: { create, update }
});

// Background music — BeepBox song (150 BPM, 8 beats/bar, 4 ticks/beat, 4-bar loop = 12.8s)
// Melody: [startSec, ...Hz]  note dur = 0.17s
const SNOTES = [
  [0.0,220],[0.4,220],[0.6,220,261.63],
  [1.6,220],[2.0,220],[2.2,220,261.63],
  [6.4,220],[6.8,220],[7.0,220,261.63],
  [8.0,220],[8.4,220],[8.6,220,261.63],
  [10.2,440,880],[10.4,784,392],
  [11.8,659.25,329.63],[12.0,392,784],[12.2,880,440],
];
// Drums: [startSec, type]  0=kick, 1=snare, 2=hihat
const SDRUMS = [
  [0.0,2],[0.4,1],[0.8,2],[0.8,0],[1.6,2],[1.6,0],[2.4,2],[2.4,0],
  [3.2,2],[3.6,1],[4.0,2],[4.0,0],[4.8,2],[5.0,1],[5.4,0],[5.6,2],[5.6,0],
  [6.4,2],[6.8,1],[7.2,2],[7.2,0],[8.0,2],[8.0,0],[8.8,2],[8.8,0],
  [9.6,2],[10.0,1],[10.4,2],[10.4,0],[11.2,2],[11.4,1],[11.8,0],[12.0,2],[12.0,0],
];
const LOOP_DUR = 12.8;
let bgMusicActive = false, bgLoopTimer = null, bgComp = null, bgCompConn = false;

// Menu / selection music — A minor pentatonic, 120 BPM, 8-bar loop
const MNOTES = [
  [0.0,220],[0.5,329.63],[1.0,261.63],[1.5,329.63],
  [2.0,392],[2.5,329.63],[3.0,293.66],[3.5,261.63],
  [4.0,220],[4.5,261.63],[5.0,329.63],[5.5,392],
  [6.0,440],[6.5,392],[7.0,329.63],[7.5,220],
];
const MDRUMS = [
  [0.0,0],[1.0,2],[2.0,0],[3.0,2],
  [4.0,0],[5.0,2],[6.0,0],[7.0,2],
];
const MLOOP_DUR = 8.0;
let menuMusicActive = false, menuLoopTimer = null, menuComp = null, menuCompConn = false;

function getBgDst(ctx) {
  if (!bgComp) {
    bgComp = ctx.createDynamicsCompressor();
    bgComp.threshold.value = -18;
    bgComp.knee.value = 6;
    bgComp.ratio.value = 8;
    bgComp.attack.value = 0.003;
    bgComp.release.value = 0.1;
  }
  if (!bgCompConn) { bgComp.connect(ctx.destination); bgCompConn = true; }
  return bgComp;
}

function getMenuDst(ctx) {
  if (!menuComp) {
    menuComp = ctx.createDynamicsCompressor();
    menuComp.threshold.value = -18;
    menuComp.knee.value = 6;
    menuComp.ratio.value = 8;
    menuComp.attack.value = 0.003;
    menuComp.release.value = 0.1;
  }
  if (!menuCompConn) { menuComp.connect(ctx.destination); menuCompConn = true; }
  return menuComp;
}

function scheduleMelody(t0) {
  if (!bgMusicActive) return;
  const ctx = sc.sound.context;
  const dst = getBgDst(ctx);
  const ND = 0.17;
  for (const [ts, ...freqs] of SNOTES) {
    const t = t0 + ts;
    for (const f of freqs) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(dst);
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.03, t);
      g.gain.setValueAtTime(0.03, t + ND * 0.75);
      g.gain.linearRampToValueAtTime(0, t + ND);
      o.start(t); o.stop(t + ND);
    }
  }
  for (const [ts, type] of SDRUMS) {
    const t = t0 + ts;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(dst);
    if (type === 2) {
      o.type = 'square'; o.frequency.value = 8000;
      g.gain.setValueAtTime(0.025, t);
      g.gain.linearRampToValueAtTime(0, t + 0.04);
      o.start(t); o.stop(t + 0.04);
    } else if (type === 1) {
      o.type = 'sawtooth'; o.frequency.value = 300;
      g.gain.setValueAtTime(0.05, t);
      g.gain.linearRampToValueAtTime(0, t + 0.1);
      o.start(t); o.stop(t + 0.1);
    } else {
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.12, t);
      g.gain.linearRampToValueAtTime(0, t + 0.2);
      o.start(t); o.stop(t + 0.2);
    }
  }
  bgLoopTimer = setTimeout(() => scheduleMelody(t0 + LOOP_DUR), (LOOP_DUR - 0.5) * 1000);
}
function startBgMusic() {
  if (bgMusicActive) return;
  try {
    const ctx = sc.sound.context;
    const go = () => { if (bgMusicActive) return; bgMusicActive = true; scheduleMelody(ctx.currentTime + 0.05); };
    if (ctx.state === 'running') go(); else ctx.resume().then(go);
  } catch(e) {}
}
function stopBgMusic() {
  bgMusicActive = false;
  clearTimeout(bgLoopTimer);
  if (bgComp && bgCompConn) { bgComp.disconnect(); bgCompConn = false; }
}

function scheduleMenuMelody(t0) {
  if (!menuMusicActive) return;
  const ctx = sc.sound.context;
  const dst = getMenuDst(ctx);
  const ND = 0.38;
  for (const [ts, f] of MNOTES) {
    const t = t0 + ts;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(dst);
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.05, t);
    g.gain.setValueAtTime(0.05, t + ND * 0.7);
    g.gain.linearRampToValueAtTime(0, t + ND);
    o.start(t); o.stop(t + ND);
  }
  for (const [ts, type] of MDRUMS) {
    const t = t0 + ts;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(dst);
    if (type === 2) {
      o.type = 'square'; o.frequency.value = 5000;
      g.gain.setValueAtTime(0.012, t);
      g.gain.linearRampToValueAtTime(0, t + 0.06);
      o.start(t); o.stop(t + 0.06);
    } else {
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      g.gain.setValueAtTime(0.07, t);
      g.gain.linearRampToValueAtTime(0, t + 0.2);
      o.start(t); o.stop(t + 0.2);
    }
  }
  menuLoopTimer = setTimeout(() => scheduleMenuMelody(t0 + MLOOP_DUR), (MLOOP_DUR - 0.5) * 1000);
}
function startMenuMusic() {
  if (menuMusicActive) return;
  try {
    const ctx = sc.sound.context;
    const go = () => { if (menuMusicActive) return; menuMusicActive = true; scheduleMenuMelody(ctx.currentTime + 0.05); };
    if (ctx.state === 'running') go(); else ctx.resume().then(go);
  } catch(e) {}
}
function stopMenuMusic() {
  menuMusicActive = false;
  clearTimeout(menuLoopTimer);
  if (menuComp && menuCompConn) { menuComp.disconnect(); menuCompConn = false; }
}

const PROBLEMS = 6;
const BOTHER_DUR = 23400;
const BOTHER_CD  = 3500;
const BOTHER_R   = 44;
const WORK_R     = 36;
const PLAYER_SPD = 1 / 28000;
const BOOST_AMOUNT = 0.2;

const CONE_HALF = 0.27; // vision cone half-angle (radians)
// Guards: position, cone radius (just past prize), base angle toward prize, swing amp & period
const GD = [
  { x: 200, y: 36,  r: 104, ba: Math.PI / 2,          amp: 0.55, per: 4200 },  // top
  { x: 384, y: 230, r: 160, ba: Math.atan2(-75, -184), amp: 0.45, per: 5500 },  // right (lower)
  { x: 200, y: 285, r: 116, ba: -Math.PI / 2,          amp: 0.5,  per: 6200 },  // bottom
  { x: 16,  y: 80,  r: 160, ba: Math.atan2(75, 184),   amp: 0.20, per: 3800 },  // left (higher)
];

const TP = [
  { x: 80,  y: 235 },
  { x: 80,  y: 65  },
  { x: 320, y: 65  },
  { x: 320, y: 235 }
];
const TC = [0x00ff88, 0xff3355, 0x4499ff, 0xffcc00];
const TN = ['YOU', 'RED', 'BLU', 'YEL'];
const TEAMS_LIST = [
  "Naim continua dentro de nós",
  "Los Tralalelitos FLAMENGOOO",
  "Helicóptero",
  "ooga booga",
  "8e6d0497880e3db3b3b093f517c13f9f",
  "Igloo Zone",
  "Corman",
  "sin globito no hay fiesta",
  "Here's my #: 998244353",
  "hmmmmmmmmm?",
  "Red-Black Tree",
  "É só fazer",
  "NaN (Need a Name)",
  "apes together strong",
  "UH Pop",
  "é sempre o XOR",
  "SaleEnOdeUno",
  "Sindicato de Taxistas Calakmul",
  "Esse ai resolve com ccw",
  "Champán en lata",
  "La CASneta",
  "las4s e pelados",
  "MEMoir del pudu",
  "UNTreeCiclo",
  "para la pda elegimos nombre",
  "Wasos del valle",
  "Meu nome é shadow...",
  "No name yet",
  "Los Catastróficos",
  ":)",
  "Que bendición",
  "PULSE DEMON",
  "grafo de botas",
  "ORT 1 Dividimos no Conquistamos",
  "LA SECTA",
  "Find(Nim Mo);",
  "Testigos de Germán",
  "3x + 1",
  "WolfByte",
  "ACxioma",
  "FrostByte",
  "Synnapsis",
  "BananaScript",
  "Lugia Brasileiro"
];

function randSpeed() { return 1 / (7500 + Math.random() * 7500); }

// Option positions: [UP, LEFT, RIGHT, DOWN]
const OPT_POS = [
  { x: 200, y: 129 },
  { x: 144, y: 154 },
  { x: 256, y: 154 },
  { x: 200, y: 179 }
];

let gst = 'menu';
let teams, plr, keys, gfx, sc;
let actionDown, winTeam, botherCooldown, catchCooldown, botherPopupTimer;
let problemActive, problemA, problemB, problemAnswer;
let problemOptions, problemSelectedIdx, problemResult, problemResultTimer;
let problemType = 'add', probGraphNodes, probGraphEdges;
let probNimPiles, probPalinStr, probColoring;
let txTitle, txSub, txI1, txI2, txI3, txStart;
let txNames, txHint, txBotherPopup;
let txWin, txWinSub, txWinBtn;
let txProbTitle, txProbQ, txProbFeedback, txProbHint, txProbOpts;
let txNimCounts;
let selCursor = 0, selScroll = 0, selPicked = [];
let txSelTitle, txSelRows, txSelSlots, txSelCount, txSelFoot;
let txMenuHint, txInstTitle, txInstContent;
let txHowdy;
let howdyTimer = 0;
const HOWDY_DUR = 2800;

function create() {
  sc = this;
  gfx = sc.add.graphics();
  keys = {};

  const S = (o) => Object.assign({ fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 }, o);
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');

  // Menu
  txTitle = sc.add.text(200, 93,  'ICPC SIMULATOR',  S({ fontSize: '20px', color: '#00ff88', strokeThickness: 3 })).setOrigin(0.5).setDepth(5);
  txSub   = sc.add.text(200, 123, 'Competition Edition', S({ fontSize: '11px', color: '#44aaff' })).setOrigin(0.5).setDepth(5);
  txI1    = sc.add.text(200, 163, 'Solve 6 problems before rival teams!', S({ fontSize: '8px', color: '#ffffff' })).setOrigin(0.5).setDepth(5);
  txI2    = sc.add.text(200, 180, '[ ACTION ] at your desk  ->  math problem', S({ fontSize: '8px', color: '#00ff88' })).setOrigin(0.5).setDepth(5);
  txI3    = sc.add.text(200, 198, '[ ACTION ] near rivals  ->  "Don Gaaato!"', S({ fontSize: '8px', color: '#ffcc00' })).setOrigin(0.5).setDepth(5);
  txStart = sc.add.text(200, 240, '[ PRESS START ]', S({ fontSize: '13px', color: '#ffffff', strokeThickness: 2 })).setOrigin(0.5).setDepth(5);

  // Game
  txNames = TP.map((p, i) =>
    sc.add.text(p.x, p.y - 35, TN[i], S({ fontSize: '9px', color: hex(TC[i]), strokeThickness: 2 }))
      .setOrigin(0.5).setDepth(3).setVisible(false)
  );
  txHint = sc.add.text(200, 295, '', S({ fontSize: '9px', color: '#ffff66', strokeThickness: 2 }))
    .setOrigin(0.5, 1).setDepth(5).setVisible(false);
  txBotherPopup = sc.add.text(0, 0, 'Don Gaaaato!', S({ fontSize: '9px', color: '#ffee44', strokeThickness: 2 }))
    .setOrigin(0.5, 0.5).setDepth(8).setVisible(false);

  // Problem overlay (depth 12+)
  txProbTitle    = sc.add.text(200, 87,  'SOLVE IT!', S({ fontSize: '11px', color: '#00ff88', strokeThickness: 2 })).setOrigin(0.5).setDepth(12).setVisible(false);
  txProbQ        = sc.add.text(200, 108, '', S({ fontSize: '14px', color: '#ffffff', strokeThickness: 2 })).setOrigin(0.5).setDepth(12).setVisible(false);
  txProbFeedback = sc.add.text(200, 200, '', S({ fontSize: '8px',  color: '#ffffff', strokeThickness: 2 })).setOrigin(0.5).setDepth(12).setVisible(false);
  txProbHint     = sc.add.text(200, 214, '[B] exit', S({ fontSize: '9px', color: '#666666', strokeThickness: 1 })).setOrigin(0.5).setDepth(12).setVisible(false);
  txProbOpts = OPT_POS.map(p =>
    sc.add.text(p.x, p.y, '', S({ fontSize: '11px', color: '#ffffff', strokeThickness: 2 }))
      .setOrigin(0.5).setDepth(13).setVisible(false)
  );

  txNimCounts = [153, 200, 248].map(x =>
    sc.add.text(x, 168, '0', { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(13).setVisible(false)
  );

  // Gameover
  txWin    = sc.add.text(200, 133, '', S({ fontSize: '19px', color: '#ffffff', strokeThickness: 3 })).setOrigin(0.5).setDepth(10).setVisible(false);
  txWinSub = sc.add.text(200, 165, '', S({ fontSize: '9px',  color: '#cccccc', strokeThickness: 2 })).setOrigin(0.5).setDepth(10).setVisible(false);
  txWinBtn = sc.add.text(200, 198, '[ PRESS START TO PLAY AGAIN ]', S({ fontSize: '8px', color: '#888888', strokeThickness: 1 })).setOrigin(0.5).setDepth(10).setVisible(false);

  // Selection screen
  txSelTitle = sc.add.text(200, 8, 'SELECT 3 RIVALS — ICPC 2026', S({ fontSize: '9px', color: '#44aaff', strokeThickness: 2 })).setOrigin(0.5).setDepth(5);
  txSelRows = Array.from({ length: 8 }, (_, i) =>
    sc.add.text(14, 22 + i * 26, '', { fontFamily: 'monospace', fontSize: '9px', color: '#cccccc', stroke: '#000', strokeThickness: 1 }).setDepth(5)
  );
  txSelSlots = sc.add.text(200, 233, '', { fontFamily: 'monospace', fontSize: '9px', color: '#aaffaa', stroke: '#000', strokeThickness: 1 }).setOrigin(0.5).setDepth(5);
  txSelCount = sc.add.text(200, 249, '', { fontFamily: 'monospace', fontSize: '9px', color: '#ffcc44', stroke: '#000', strokeThickness: 1 }).setOrigin(0.5).setDepth(5);
  txSelFoot  = sc.add.text(200, 273, 'Joystick: move  Btn A: pick  START: begin  Btn B: back', S({ fontSize: '9px', color: '#555566', strokeThickness: 1 })).setOrigin(0.5).setDepth(5);

  // Instructions screen
  txInstTitle = sc.add.text(200, 14, 'HOW TO PLAY', S({ fontSize: '12px', color: '#00ff88', strokeThickness: 2 })).setOrigin(0.5).setDepth(5);
  txInstContent = sc.add.text(18, 33,
    'MOVE:   Joystick\n' +
    'ACTION: Button A   (interact)\n' +
    'BACK:   Button B   (exit menus)\n' +
    '\n' +
    'At YOUR DESK -> solve a math problem\n' +
    '  Correct: +20% progress\n' +
    '  Wrong: progress resets to 0\n' +
    '  Solve 6 problems to WIN!\n' +
    '\n' +
    'Near a RIVAL -> "Don Gaaato!" (3.5s CD)\n' +
    '  Freezes rival team for ~23 seconds\n' +
    '\n' +
    'AVOID GUARD CONES!\n' +
    '  Caught = lose a solved problem\n' +
    '\n' +
    'Problems scale with progress:\n' +
    '  Easy:    addition\n' +
    '  Medium:  factors, GCD, palindromes\n' +
    '  Hard:    graphs, NIM, coloring, LIS\n' +
    '\n' +
    '[ PRESS ANY BUTTON TO PLAY ]',
    S({ fontSize: '9px', color: '#cccccc', strokeThickness: 1 })
  ).setDepth(5);

  // Menu secondary hint
  txMenuHint = sc.add.text(200, 262, '[ Btn B ] HOW TO PLAY', S({ fontSize: '9px', color: '#555577', strokeThickness: 1 })).setOrigin(0.5).setDepth(5);

  // Howdy intro
  txHowdy = sc.add.text(210, 142, 'HOWDY\nPARTNER!', S({ fontSize: '11px', color: '#ff4400', strokeThickness: 3, align: 'center' }))
    .setOrigin(0.5, 0.5).setDepth(20).setVisible(false);

  sc.input.keyboard.on('keydown', e => {
    const k = KB[e.key] || e.key;
    if (keys[k]) return;
    keys[k] = true;
    if (problemActive) handleProblemInput(k);
    else onKey(k);
  });
  sc.input.keyboard.on('keyup', e => {
    const k = KB[e.key] || e.key;
    keys[k] = false;
    if (k === 'P1A') actionDown = false;
  });

  initGame();
  setView('instructions');
}

function updateSelScroll() {
  if (selCursor < selScroll) selScroll = selCursor;
  else if (selCursor >= selScroll + 8) selScroll = selCursor - 7;
}

function updateSelRows() {
  for (let i = 0; i < 8; i++) {
    const idx = selScroll + i;
    if (idx >= TEAMS_LIST.length) { txSelRows[i].setText(''); continue; }
    const pi = selPicked.indexOf(idx);
    const mark = pi >= 0 ? '[' + (pi + 1) + '] ' : '    ';
    txSelRows[i].setText(mark + TEAMS_LIST[idx])
      .setColor(idx === selCursor ? '#ffff44' : (pi >= 0 ? '#88ff88' : '#cccccc'));
  }
  const slots = [0, 1, 2].map(i =>
    selPicked[i] !== undefined ? TEAMS_LIST[selPicked[i]].substring(0, 14) : '???'
  );
  txSelSlots.setText('RIVALS: ' + slots.join(' | '));
  const n = selPicked.length;
  txSelCount.setText(n === 3 ? 'READY!  Press START to begin!' : (3 - n) + ' more to pick...')
    .setColor(n === 3 ? '#00ff88' : '#ffcc44');
}

function startWithSelection() {
  for (let i = 0; i < 3; i++) {
    const nm = TEAMS_LIST[selPicked[i]];
    TN[i + 1] = nm.length > 12 ? nm.substring(0, 11) + '.' : nm;
    txNames[i + 1].setText(TN[i + 1]);
  }
  initGame();
  howdyTimer = HOWDY_DUR;
  setView('howdy');
  playHowdySound();
}

function initGame() {
  teams = TP.map((pos, i) => ({
    id: i, pos,
    solved: 0, progress: 0,
    speed: i === 0 ? PLAYER_SPD : randSpeed(),
    bothered: 0, done: false
  }));
  plr = { x: TP[0].x + 29, y: TP[0].y + 4 };
  actionDown = false;
  winTeam = -1;
  botherCooldown = 0;
  catchCooldown = 0;
  botherPopupTimer = 0;
  problemActive = false;
  problemResult = null;
  problemResultTimer = 0;
  problemSelectedIdx = -1;
}

function setView(v) {
  gst = v;
  const isMenu = v === 'menu', isPlay = v === 'playing', isOver = v === 'gameover';
  const isSel = v === 'select', isInst = v === 'instructions', isHowdy = v === 'howdy';
  [txTitle, txSub, txI1, txI2, txI3, txStart, txMenuHint].forEach(t => t.setVisible(isMenu));
  txNames.forEach(t => t.setVisible(isPlay || isOver || isHowdy));
  txHint.setVisible(false);
  [txProbTitle, txProbQ, txProbFeedback, txProbHint].forEach(t => t.setVisible(false));
  txProbOpts.forEach(t => t.setVisible(false));
  txNimCounts.forEach(t => t.setVisible(false));
  txWin.setVisible(isOver);
  txWinSub.setVisible(isOver);
  txWinBtn.setVisible(isOver);
  txSelTitle.setVisible(isSel);
  txSelRows.forEach(t => t.setVisible(isSel));
  txSelSlots.setVisible(isSel);
  txSelCount.setVisible(isSel);
  txSelFoot.setVisible(isSel);
  txInstTitle.setVisible(isInst);
  txInstContent.setVisible(isInst);
  txHowdy.setVisible(isHowdy);
  if (isSel) updateSelRows();
  if (isPlay) { stopMenuMusic(); startBgMusic(); }
  else if (isMenu || isSel || isInst) { stopBgMusic(); startMenuMusic(); }
  else { stopBgMusic(); stopMenuMusic(); }
  if (!isPlay && !isHowdy) { problemActive = false; botherPopupTimer = 0; txBotherPopup.setVisible(false); }
}

function onKey(k) {
  if (gst === 'menu') {
    if (k === 'START1' || k === 'P1A') {
      selPicked = []; selCursor = 0; selScroll = 0;
      setView('select');
    } else if (k === 'P1B') {
      setView('instructions');
    }
  } else if (gst === 'instructions') {
    setView('menu');
  } else if (gst === 'select') {
    if (k === 'P1U' || k === 'P2U') {
      selCursor = (selCursor - 1 + TEAMS_LIST.length) % TEAMS_LIST.length;
      updateSelScroll(); updateSelRows();
    } else if (k === 'P1D' || k === 'P2D') {
      selCursor = (selCursor + 1) % TEAMS_LIST.length;
      updateSelScroll(); updateSelRows();
    } else if (k === 'P1A') {
      const pi = selPicked.indexOf(selCursor);
      if (pi >= 0) selPicked.splice(pi, 1);
      else if (selPicked.length < 3) selPicked.push(selCursor);
      updateSelRows();
    } else if (k === 'P1B') {
      setView('menu');
    } else if (k === 'START1' && selPicked.length === 3) {
      startWithSelection();
    }
  } else if (gst === 'howdy') {
    howdyTimer = 0; // any key skips
  } else if (gst === 'gameover' && (k === 'START1' || k === 'P1A')) {
    setView('menu');
  } else if (gst === 'playing' && k === 'P1A' && !actionDown) {
    actionDown = true;
    const atWork = Math.hypot(plr.x - TP[0].x, plr.y - TP[0].y) < WORK_R;
    if (atWork) openProblem();
    else tryBother();
  }
}

// ── Problem mini-game ──────────────────────────────────────────────────────────

function genOptions(correct) {
  const used = new Set([correct]);
  const opts = [correct];
  while (opts.length < 4) {
    const off = 2 + (Math.random() * 13 | 0);
    const w = correct + (Math.random() < 0.5 ? off : -off);
    if (w > 0 && !used.has(w)) { used.add(w); opts.push(w); }
  }
  for (let i = 3; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function openProblem() {
  problemSelectedIdx = -1;
  problemResult = null;
  problemResultTimer = 0;
  problemActive = true;
  [txProbTitle, txProbQ, txProbFeedback, txProbHint].forEach(t => t.setVisible(true));
  genProblem();
}

function genProblem() {
  txNimCounts.forEach(t => t.setVisible(false));
  const d = teams[0].solved;
  if (d < 1) makeAddProb();
  else if (d < 3) {
    const r = Math.random();
    if (r < 0.33) makeFactorProb();
    else if (r < 0.66) makePalindromeProb();
    else makeGCDProb();
  } else {
    const r = Math.random();
    if (r < 0.25) makeGraphProb();
    else if (r < 0.50) makeNimProb();
    else if (r < 0.75) makeColoringProb();
    else makeLISProb();
  }
}

function makeAddProb() {
  problemType = 'add';
  const a = 8 + (Math.random() * 50 | 0);
  const b = 8 + (Math.random() * 50 | 0);
  problemAnswer = a + b;
  problemOptions = genOptions(problemAnswer);
  txProbTitle.setText('SOLVE IT!').setPosition(200, 87);
  txProbQ.setText(a + ' + ' + b + ' = ?').setPosition(200, 108);
  txProbFeedback.setText('').setPosition(200, 200);
  txProbHint.setPosition(200, 214);
  OPT_POS.forEach((p, i) => txProbOpts[i].setPosition(p.x, p.y).setText(String(problemOptions[i])).setStyle({ color: '#ffffff' }).setVisible(true));
}

const PRIMES = [2, 3, 5, 7, 11, 13];

function makeFactorProb() {
  problemType = 'factor';
  const pick = () => PRIMES[Math.random() * 4 | 0];
  const nf = 2 + (Math.random() * 2 | 0);
  const factors = Array.from({ length: nf }, pick);
  const N = factors.reduce((a, b) => a * b, 1);
  const ri = Math.random() * nf | 0;
  problemAnswer = factors[ri];
  const parts = factors.map((f, i) => i === ri ? '?' : String(f));
  const wrongs = PRIMES.filter(p => p !== problemAnswer);
  for (let i = wrongs.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0; [wrongs[i], wrongs[j]] = [wrongs[j], wrongs[i]];
  }
  const opts = [problemAnswer, wrongs[0], wrongs[1], wrongs[2]];
  for (let i = 3; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0; [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  problemOptions = opts;
  txProbTitle.setText('PRIME FACTOR').setPosition(200, 87);
  txProbQ.setText(N + ' = ' + parts.join(' x ')).setPosition(200, 108);
  txProbFeedback.setText('').setPosition(200, 200);
  txProbHint.setPosition(200, 214);
  OPT_POS.forEach((p, i) => txProbOpts[i].setPosition(p.x, p.y).setText(String(opts[i])).setStyle({ color: '#ffffff' }).setVisible(true));
}

function makeGraphProb() {
  problemType = 'graph';
  const n = 4 + (Math.random() * 2 | 0);
  const R = 26, cx = 200, cy = 130;
  probGraphNodes = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: (cx + Math.cos(a) * R) | 0, y: (cy + Math.sin(a) * R) | 0 };
  });
  probGraphEdges = [];
  const ord = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0; [ord[i], ord[j]] = [ord[j], ord[i]];
  }
  for (let i = 1; i < n; i++) probGraphEdges.push([ord[i - 1], ord[i]]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (Math.random() < 0.35 && !probGraphEdges.some(([a, b]) => (a === i && b === j) || (a === j && b === i)))
        probGraphEdges.push([i, j]);
  const deg = new Array(n).fill(0);
  for (const [a, b] of probGraphEdges) { deg[a]++; deg[b]++; }
  problemAnswer = deg.every(d => d % 2 === 0) ? 'YES' : 'NO';
  problemOptions = [null, 'YES', 'NO', null];
  txProbTitle.setText('GRAPH THEORY').setPosition(200, 76);
  txProbQ.setText('Eulerian circuit?').setPosition(200, 87);
  txProbFeedback.setText('').setPosition(200, 196);
  txProbHint.setPosition(200, 208);
  txProbOpts[0].setVisible(false); txProbOpts[3].setVisible(false);
  txProbOpts[1].setPosition(158, 179).setText('YES').setStyle({ color: '#ffffff' }).setVisible(true);
  txProbOpts[2].setPosition(243, 179).setText('NO').setStyle({ color: '#ffffff' }).setVisible(true);
}

function makeNimProb() {
  problemType = 'nim';
  probNimPiles = [1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0)];
  problemAnswer = (probNimPiles[0] ^ probNimPiles[1] ^ probNimPiles[2]) !== 0 ? 'YES' : 'NO';
  problemOptions = [null, 'YES', 'NO', null];
  txProbTitle.setText('NIM GAME').setPosition(200, 76);
  txProbQ.setText('First player wins?').setPosition(200, 87);
  txProbFeedback.setText('').setPosition(200, 196);
  txProbHint.setPosition(200, 208);
  txProbOpts[0].setVisible(false); txProbOpts[3].setVisible(false);
  txProbOpts[1].setPosition(158, 179).setText('YES').setStyle({ color: '#ffffff' }).setVisible(true);
  txProbOpts[2].setPosition(243, 179).setText('NO').setStyle({ color: '#ffffff' }).setVisible(true);
  const nimPxs = [153, 200, 248];
  for (let p = 0; p < 3; p++) txNimCounts[p].setPosition(nimPxs[p], 151).setText(String(probNimPiles[p])).setVisible(true);
}

function makePalindromeProb() {
  problemType = 'palindrome';
  const len = 6 + (Math.random() * 2 | 0);
  const pool = 'ABCDEFG';
  const half = Math.ceil(len / 2);
  const h = Array.from({ length: half }, () => pool[Math.random() * pool.length | 0]);
  const arr = [...h, ...h.slice(0, half - (len % 2)).reverse()];
  if (Math.random() < 0.5) {
    const flips = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let f = 0; f < flips; f++) {
      const pos = Math.random() * len | 0;
      let nc; do { nc = pool[Math.random() * pool.length | 0]; } while (nc === arr[pos]);
      arr[pos] = nc;
    }
  }
  probPalinStr = arr.join('');
  problemAnswer = probPalinStr === probPalinStr.split('').reverse().join('') ? 'YES' : 'NO';
  problemOptions = [null, 'YES', 'NO', null];
  txProbTitle.setText('PALINDROME?').setPosition(200, 78);
  txProbQ.setText(probPalinStr).setPosition(200, 133);
  txProbFeedback.setText('').setPosition(200, 196);
  txProbHint.setPosition(200, 208);
  txProbOpts[0].setVisible(false); txProbOpts[3].setVisible(false);
  txProbOpts[1].setPosition(158, 179).setText('YES').setStyle({ color: '#ffffff' }).setVisible(true);
  txProbOpts[2].setPosition(243, 179).setText('NO').setStyle({ color: '#ffffff' }).setVisible(true);
}

function makeColoringProb() {
  problemType = 'coloring';
  const n = 4 + (Math.random() * 2 | 0);
  const R = 26, cx = 200, cy = 130;
  probGraphNodes = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: (cx + Math.cos(a) * R) | 0, y: (cy + Math.sin(a) * R) | 0 };
  });
  probGraphEdges = [];
  const ord = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0; [ord[i], ord[j]] = [ord[j], ord[i]];
  }
  for (let i = 1; i < n; i++) probGraphEdges.push([ord[i - 1], ord[i]]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (Math.random() < 0.35 && !probGraphEdges.some(([a, b]) => (a === i && b === j) || (a === j && b === i)))
        probGraphEdges.push([i, j]);
  probColoring = Array.from({ length: n }, () => Math.random() * 3 | 0);
  if (Math.random() < 0.5 && probGraphEdges.length > 0) {
    const [ea, eb] = probGraphEdges[Math.random() * probGraphEdges.length | 0];
    probColoring[eb] = probColoring[ea];
  }
  problemAnswer = probGraphEdges.every(([a, b]) => probColoring[a] !== probColoring[b]) ? 'YES' : 'NO';
  problemOptions = [null, 'YES', 'NO', null];
  txProbTitle.setText('GRAPH COLORING').setPosition(200, 76);
  txProbQ.setText('Valid 3-coloring?').setPosition(200, 87);
  txProbFeedback.setText('').setPosition(200, 196);
  txProbHint.setPosition(200, 208);
  txProbOpts[0].setVisible(false); txProbOpts[3].setVisible(false);
  txProbOpts[1].setPosition(158, 179).setText('YES').setStyle({ color: '#ffffff' }).setVisible(true);
  txProbOpts[2].setPosition(243, 179).setText('NO').setStyle({ color: '#ffffff' }).setVisible(true);
}

function makeGCDProb() {
  problemType = 'gcd';
  function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }
  let a, b, g;
  do {
    a = 6 + (Math.random() * 42 | 0);
    b = 6 + (Math.random() * 42 | 0);
    g = gcd(a, b);
  } while (g <= 1 || g === a || g === b);
  problemAnswer = g;
  problemOptions = genOptions(g);
  txProbTitle.setText('GCD').setPosition(200, 87);
  txProbQ.setText('GCD(' + a + ', ' + b + ') = ?').setPosition(200, 108);
  txProbFeedback.setText('').setPosition(200, 200);
  txProbHint.setPosition(200, 214);
  OPT_POS.forEach((p, i) => txProbOpts[i].setPosition(p.x, p.y).setText(String(problemOptions[i])).setStyle({ color: '#ffffff' }).setVisible(true));
}

function computeLIS(arr) {
  const dp = arr.map(() => 1);
  for (let i = 1; i < arr.length; i++)
    for (let j = 0; j < i; j++)
      if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
  return Math.max(...dp);
}

function makeLISProb() {
  problemType = 'lis';
  const n = 6 + (Math.random() < 0.5 ? 0 : 1);
  const arr = Array.from({ length: n }, () => 1 + (Math.random() * 14 | 0));
  const ans = computeLIS(arr);
  // Build option pool: all valid LIS lengths except the answer
  const pool = [];
  for (let v = 1; v <= n; v++) if (v !== ans) pool.push(v);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0; [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  problemAnswer = ans;
  problemOptions = [ans, pool[0], pool[1], pool[2]];
  for (let i = 3; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0; [problemOptions[i], problemOptions[j]] = [problemOptions[j], problemOptions[i]];
  }
  txProbTitle.setText('LIS LENGTH').setPosition(200, 87);
  txProbQ.setText('[' + arr.join(',') + ']').setPosition(200, 108);
  txProbFeedback.setText('').setPosition(200, 200);
  txProbHint.setPosition(200, 214);
  OPT_POS.forEach((p, i) => txProbOpts[i].setPosition(p.x, p.y).setText(String(problemOptions[i])).setStyle({ color: '#ffffff' }).setVisible(true));
}

function closeProblem() {
  problemActive = false;
  [txProbTitle, txProbQ, txProbFeedback, txProbHint].forEach(t => t.setVisible(false));
  txProbOpts.forEach(t => t.setVisible(false));
  txNimCounts.forEach(t => t.setVisible(false));
}

function handleProblemInput(k) {
  if (k === 'P1B') { closeProblem(); return; }
  if (problemResultTimer > 0) return;
  const dirMap = { 'P1U': 0, 'P1L': 1, 'P1R': 2, 'P1D': 3 };
  if (dirMap[k] !== undefined) selectOption(dirMap[k]);
}

function selectOption(idx) {
  if (problemOptions[idx] === null) return;
  problemSelectedIdx = idx;
  if (problemOptions[idx] === problemAnswer) {
    teams[0].progress += BOOST_AMOUNT;
    problemResult = 'correct';
    txProbFeedback.setText('CORRECT!  +' + (BOOST_AMOUNT * 100 | 0) + '%').setStyle({ color: '#00ff88' });
    txProbOpts[idx].setStyle({ color: '#00ff88' });
    problemResultTimer = 650;
    if (teams[0].progress >= 1) {
      teams[0].progress -= 1;
      teams[0].solved++;
      playSolve(true);
      if (teams[0].solved >= PROBLEMS) {
        teams[0].done = true; winTeam = 0;
        closeProblem();
        txWin.setText('YOU WIN!').setStyle({ color: '#' + TC[0].toString(16).padStart(6, '0') });
        txWinSub.setText('Your team solved all 6 problems first!');
        setView('gameover');
      }
    }
  } else {
    teams[0].progress = 0;
    problemResult = 'wrong';
    txProbFeedback.setText('WRONG!  Progress reset!').setStyle({ color: '#ff4455' });
    txProbOpts[idx].setStyle({ color: '#ff4455' });
    problemResultTimer = 650;
  }
}

// ── Bother ────────────────────────────────────────────────────────────────────

function tryBother() {
  if (botherCooldown > 0) return;
  for (let i = 1; i < 4; i++) {
    if (teams[i].done) continue;
    if (Math.hypot(plr.x - TP[i].x, plr.y - TP[i].y) < BOTHER_R) {
      teams[i].bothered = BOTHER_DUR;
      botherCooldown = BOTHER_CD;
      botherPopupTimer = 1800;
      txBotherPopup.setVisible(true);
      playCatMeow();
      break;
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────

function update(t, dt) {
  gfx.clear();
  if (gst === 'menu') drawMenu(t);
  else if (gst === 'playing') { gameLoop(dt, t); drawGame(t); }
  else if (gst === 'gameover') { drawGame(t); drawOver(t); }
  else if (gst === 'select') drawSelect(t);
  else if (gst === 'instructions') drawInstructions(t);
  else if (gst === 'howdy') {
    drawGame(t);
    drawHowdyBubble(t, howdyTimer);
    howdyTimer -= dt;
    if (howdyTimer <= 0) setView('playing');
  }
}

function gameLoop(dt, time) {
  if (!problemActive) {
    const s = Math.min(dt, 20) * 0.078;
    if (keys['P1L']) plr.x = Math.max(22, plr.x - s);
    if (keys['P1R']) plr.x = Math.min(378, plr.x + s);
    if (keys['P1U']) plr.y = Math.max(41, plr.y - s);
    if (keys['P1D']) plr.y = Math.min(279, plr.y + s);
  }

  botherCooldown = Math.max(0, botherCooldown - dt);
  catchCooldown  = Math.max(0, catchCooldown  - dt);
  if (botherPopupTimer > 0) {
    botherPopupTimer = Math.max(0, botherPopupTimer - dt);
    if (botherPopupTimer <= 0) txBotherPopup.setVisible(false);
  }

  if (catchCooldown <= 0) {
    for (const g of GD) {
      const ga = g.ba + g.amp * Math.sin(time / g.per * Math.PI * 2);
      const dx = plr.x - g.x, dy = plr.y - g.y;
      if (Math.hypot(dx, dy) < g.r) {
        let diff = Math.atan2(dy, dx) - ga;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < CONE_HALF) {
          plr.x = TP[0].x + 20; plr.y = TP[0].y;
          if (teams[0].solved > 0) teams[0].solved--;
          teams[0].progress = 0;
          catchCooldown = 3000;
          if (problemActive) closeProblem();
          playCatch();
          break;
        }
      }
    }
  }

  if (problemActive && problemResultTimer > 0) {
    problemResultTimer -= dt;
    if (problemResultTimer <= 0) {
      problemResult = null;
      problemSelectedIdx = -1;
      genProblem();
    }
  }

  const atWork = Math.hypot(plr.x - TP[0].x, plr.y - TP[0].y) < WORK_R;
  let nearRival = -1;
  for (let i = 1; i < 4; i++) {
    if (!teams[i].done && Math.hypot(plr.x - TP[i].x, plr.y - TP[i].y) < BOTHER_R) { nearRival = i; break; }
  }

  if (!problemActive) {
    txHint.setVisible(nearRival >= 0 || atWork);
    if (nearRival >= 0) {
      txHint.setText(botherCooldown > 0
        ? 'Cooldown: ' + (botherCooldown / 1000).toFixed(1) + 's...'
        : '[ ACTION ] -> Don Gaaato!');
    } else if (atWork) {
      txHint.setText('[ ACTION ] -> solve a problem!');
    }
  } else {
    txHint.setVisible(false);
  }

  for (const t of teams) {
    if (t.done) continue;
    if (t.bothered > 0) { t.bothered = Math.max(0, t.bothered - dt); continue; }
    t.progress += t.speed * dt;
    if (t.progress >= 1) {
      t.progress -= 1;
      t.solved++;
      if (t.id > 0) t.speed = randSpeed();
      playSolve(t.id === 0);
      if (t.solved >= PROBLEMS) {
        t.done = true; winTeam = t.id;
        txWin.setText(t.id === 0 ? 'YOU WIN!' : TN[t.id] + ' WINS!').setStyle({ color: '#' + TC[t.id].toString(16).padStart(6, '0') });
        txWinSub.setText(t.id === 0 ? 'Your team solved all 6 problems first!' : 'Better luck next competition...');
        if (problemActive) closeProblem();
        setView('gameover');
        return;
      }
    }
  }

}

// ── Drawing ───────────────────────────────────────────────────────────────────

function drawMenu(t) {
  gfx.fillStyle(0x0a0a1a);
  gfx.fillRect(0, 0, 400, 300);
  gfx.lineStyle(1, 0x151530, 0.8);
  for (let x = 0; x < 400; x += 25) gfx.lineBetween(x, 0, x, 300);
  for (let y = 0; y < 300; y += 25) gfx.lineBetween(0, y, 400, y);
  for (let i = 0; i < 4; i++) {
    gfx.fillStyle(TC[i], 0.05 + Math.abs(Math.sin(t * 0.0008 + i * 1.5)) * 0.04);
    gfx.fillCircle(TP[i].x, TP[i].y, 45);
  }
  gfx.lineStyle(2, 0xffffff, 0.15 + Math.abs(Math.sin(t * 0.003)) * 0.15);
  gfx.strokeCircle(200, 240, 35 + Math.sin(t * 0.003) * 4);
}

function drawSelect(t) {
  gfx.fillStyle(0x060614);
  gfx.fillRect(0, 0, 400, 300);
  // List bounding box
  gfx.lineStyle(1, 0x2244aa, 0.6);
  gfx.strokeRect(8, 16, 384, 210);
  // Cursor row highlight
  const ci = selCursor - selScroll;
  if (ci >= 0 && ci < 8) {
    gfx.fillStyle(0x1a2a66, 0.75);
    gfx.fillRect(9, 17 + ci * 26, 382, 25);
  }
  // Scroll arrows
  if (selScroll > 0) {
    gfx.fillStyle(0x4466ee, 0.85);
    gfx.fillTriangle(200, 13, 195, 18, 205, 18);
  }
  if (selScroll + 8 < TEAMS_LIST.length) {
    gfx.fillStyle(0x4466ee, 0.85);
    gfx.fillTriangle(200, 230, 195, 225, 205, 225);
  }
  // Divider above info area
  gfx.lineStyle(1, 0x2244aa, 0.5);
  gfx.lineBetween(8, 228, 392, 228);
}

function drawInstructions(t) {
  gfx.fillStyle(0x060614);
  gfx.fillRect(0, 0, 400, 300);
  gfx.lineStyle(1, 0x151530, 0.8);
  for (let x = 0; x < 400; x += 25) gfx.lineBetween(x, 0, x, 300);
  for (let y = 0; y < 300; y += 25) gfx.lineBetween(0, y, 400, y);
  gfx.lineStyle(1, 0x00ff88, 0.25);
  gfx.strokeRect(12, 8, 376, 286);
}

function playHowdySound() {
  try {
    const ctx = sc.sound.context;
    const dst = ctx.destination;
    const t0 = ctx.currentTime + 0.05;
    // Western bugle fanfare: C5 E5 G5 C6
    [523, 659, 784, 1047].forEach((f, i) => {
      const t = t0 + i * 0.13;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(dst);
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.09, t);
      g.gain.setValueAtTime(0.09, t + 0.09);
      g.gain.linearRampToValueAtTime(0, t + 0.13);
      o.start(t); o.stop(t + 0.13);
    });
  } catch(e) {}
}

function drawHowdyBubble(t, timeLeft) {
  const elapsed = HOWDY_DUR - timeLeft;
  const sc_val = elapsed < 350 ? elapsed / 350 : 1 + Math.sin(t * 0.005) * 0.03;
  txHowdy.setScale(sc_val);

  // Speech bubble background (draw first so text appears on top)
  const bx = 210, by = 142, bw = 84, bh = 40;
  // Tail toward Bill's face (~263, 168)
  gfx.fillStyle(0xfffff0, 0.97);
  gfx.fillTriangle(bx + 28, by + bh / 2 + 2, bx + 40, by + bh / 2 + 2, bx + 50, by + bh / 2 + 14);
  // Bubble body
  gfx.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);
  // Border
  gfx.lineStyle(2, 0xff5500, 0.95);
  gfx.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);
  gfx.lineStyle(0, 0, 0);
}

function drawFancyTable(tx, ty) {
  const tY = ty + 13; // = 168, trophy base level / table surface

  // Table legs (visible at sides beneath cloth)
  gfx.fillStyle(0x6b4f0a);
  gfx.fillRect(tx - 34, tY + 2, 5, 14);
  gfx.fillRect(tx + 29, tY + 2, 5, 14);
  // Leg feet
  gfx.fillRect(tx - 35, tY + 13, 7, 3);
  gfx.fillRect(tx + 28, tY + 13, 7, 3);
  // Stretcher crossbar
  gfx.fillStyle(0x7a5a14);
  gfx.fillRect(tx - 29, tY + 8, 58, 3);

  // Tablecloth (deep crimson)
  gfx.fillStyle(0xaa1133, 0.93);
  gfx.fillRect(tx - 38, tY + 2, 76, 12);
  // Cloth top edge highlight
  gfx.fillStyle(0xcc2244, 0.4);
  gfx.fillRect(tx - 38, tY + 3, 76, 2);

  // Decorative medal seals on cloth
  gfx.fillStyle(0xddaa22, 0.85);
  gfx.fillCircle(tx - 18, tY + 8, 4);
  gfx.fillCircle(tx + 18, tY + 8, 4);
  gfx.fillStyle(0xffdd55, 0.65);
  gfx.fillCircle(tx - 18, tY + 7, 2);
  gfx.fillCircle(tx + 18, tY + 7, 2);
  gfx.fillStyle(0xfffbee, 0.9);
  gfx.fillCircle(tx - 18, tY + 7, 1);
  gfx.fillCircle(tx + 18, tY + 7, 1);

  // Subtle gold band across cloth center
  gfx.fillStyle(0xffcc00, 0.18);
  gfx.fillRect(tx - 38, tY + 6, 76, 3);

  // Gold trim strip along cloth top
  gfx.fillStyle(0xddaa00, 0.75);
  gfx.fillRect(tx - 38, tY + 2, 76, 2);

  // Gold fringe
  gfx.fillStyle(0xddaa00, 0.9);
  for (let fx = tx - 37; fx <= tx + 35; fx += 4) {
    gfx.fillRect(fx, tY + 13, 2, 4);
    gfx.fillCircle(fx + 1, tY + 18, 1);
  }

  // Table top surface (polished wood)
  gfx.fillStyle(0x9a7220);
  gfx.fillRect(tx - 39, tY - 4, 78, 6);
  // Shine
  gfx.fillStyle(0xffee88, 0.22);
  gfx.fillRect(tx - 37, tY - 3, 74, 1);

  // Ornate top molding
  gfx.fillStyle(0xccaa44, 0.85);
  gfx.fillRect(tx - 41, tY - 5, 82, 2);
  gfx.fillStyle(0xffee77, 0.45);
  gfx.fillRect(tx - 41, tY - 5, 82, 1);
}

function drawBillPoucher(bx, by, t) {
  // Bill Poucher — ICPC Executive Director, trademark white Stetson hat
  const bby = (by + Math.sin(t * 0.0013) * 1.5) | 0;

  // Shadow
  gfx.fillStyle(0x000000, 0.22);
  gfx.fillEllipse(bx + 1, bby + 13, 13, 4);

  // Boots (dark brown leather, pointed western toe)
  gfx.fillStyle(0x4a2008);
  gfx.fillRect(bx - 3, bby + 6, 4, 6);
  gfx.fillRect(bx + 1, bby + 6, 4, 6);
  gfx.fillStyle(0x2e1204);
  gfx.fillRect(bx - 5, bby + 10, 6, 3);
  gfx.fillRect(bx + 1, bby + 10, 6, 3);
  // Boot shine
  gfx.fillStyle(0x8a4010, 0.4);
  gfx.fillRect(bx - 2, bby + 7, 2, 2);
  gfx.fillRect(bx + 2, bby + 7, 2, 2);

  // Pants (dark jeans)
  gfx.fillStyle(0x1a2844);
  gfx.fillRect(bx - 3, bby + 1, 3, 5);
  gfx.fillRect(bx + 1, bby + 1, 3, 5);

  // Western shirt (tan/khaki)
  gfx.fillStyle(0xc8a060);
  gfx.fillRect(bx - 4, bby - 7, 9, 9);
  // Yoke V-detail
  gfx.fillStyle(0xa07840, 0.65);
  gfx.fillTriangle(bx - 4, bby - 7, bx + 5, bby - 7, bx, bby - 3);
  // Shirt pocket
  gfx.fillStyle(0xaa8848, 0.5);
  gfx.fillRect(bx - 3, bby - 6, 3, 2);

  // Big western belt buckle
  gfx.fillStyle(0xddaa00);
  gfx.fillRect(bx - 2, bby + 1, 5, 3);
  gfx.lineStyle(1, 0xffee44, 0.9);
  gfx.strokeRect(bx - 2, bby + 1, 5, 3);
  gfx.fillStyle(0xffffff, 0.4);
  gfx.fillRect(bx - 1, bby + 2, 1, 1);

  // Head
  gfx.fillStyle(0xf5c890);
  gfx.fillCircle(bx, bby - 11, 5);

  // White/silver hair (shows below hat brim)
  gfx.fillStyle(0xddddd0);
  gfx.fillRect(bx - 4, bby - 16, 8, 3);

  // Ears
  gfx.fillStyle(0xf5c890);
  gfx.fillCircle(bx - 5, bby - 11, 2);
  gfx.fillCircle(bx + 5, bby - 11, 2);

  // Glasses frames (a distinguished look)
  gfx.lineStyle(1, 0x888888, 0.9);
  gfx.strokeRect(bx - 3, bby - 14, 3, 3);
  gfx.strokeRect(bx + 1, bby - 14, 3, 3);
  gfx.lineBetween(bx - 3, bby - 12, bx - 6, bby - 12);
  gfx.lineBetween(bx + 4, bby - 12, bx + 7, bby - 12);

  // Eyes (behind glasses)
  gfx.fillStyle(0x224466);
  gfx.fillCircle(bx - 1, bby - 13, 1);
  gfx.fillCircle(bx + 2, bby - 13, 1);

  // Friendly smile
  gfx.lineStyle(1, 0x7a3a10, 0.9);
  gfx.lineBetween(bx - 2, bby - 9, bx, bby - 8);
  gfx.lineBetween(bx, bby - 8, bx + 2, bby - 9);

  // ====  WHITE STETSON COWBOY HAT  ====
  const hy = bby - 17; // brim base y

  // Brim underside shadow
  gfx.fillStyle(0xb0aa90, 0.75);
  gfx.fillRect(bx - 10, hy + 1, 21, 2);

  // BRIM — wide, cream-white
  gfx.fillStyle(0xeeeedd);
  gfx.fillRect(bx - 10, hy - 1, 21, 2);
  // Brim top highlight
  gfx.fillStyle(0xffffff, 0.5);
  gfx.fillRect(bx - 9, hy - 2, 19, 1);

  // CROWN — tall, classic Stetson silhouette
  gfx.fillStyle(0xe8e4cc);
  gfx.fillRect(bx - 6, hy - 10, 12, 10);

  // Crown center crease (the Stetson's signature dent)
  gfx.fillStyle(0xd0caa8, 0.85);
  gfx.fillRect(bx - 1, hy - 10, 2, 10);

  // Crown side shading
  gfx.fillStyle(0xc8bf98, 0.55);
  gfx.fillRect(bx + 4, hy - 10, 2, 10);
  gfx.fillRect(bx - 6, hy - 10, 2, 8);

  // Crown top (slightly pinched)
  gfx.fillStyle(0xe8e4cc);
  gfx.fillRect(bx - 4, hy - 11, 8, 2);

  // Hat band (dark brown)
  gfx.fillStyle(0x3a2008);
  gfx.fillRect(bx - 6, hy - 1, 12, 2);
  // Hat band buckle
  gfx.fillStyle(0xddaa00, 0.85);
  gfx.fillRect(bx - 1, hy - 1, 2, 2);

  // Crown highlight (light catches upper-left face)
  gfx.fillStyle(0xffffff, 0.25);
  gfx.fillRect(bx - 4, hy - 9, 3, 6);
}

function drawGame(t) {
  // Hall background
  gfx.fillStyle(0x14100a);
  gfx.fillRect(0, 0, 400, 300);
  // Wood floor planks
  const plankCols = [0x7a5230, 0x6b4827, 0x835a38, 0x704c2a];
  for (let py = 24; py < 300; py += 14) {
    gfx.fillStyle(plankCols[((py - 24) / 14 | 0) % plankCols.length]);
    gfx.fillRect(0, py, 400, 14);
    gfx.lineStyle(1, 0x3c2410, 0.75);
    gfx.lineBetween(0, py + 13, 400, py + 13);
  }
  // Subtle grain lines
  gfx.lineStyle(1, 0x4a2c12, 0.1);
  for (let gx = 35; gx < 400; gx += 52) gfx.lineBetween(gx, 24, gx, 300);
  // Side wall strips
  gfx.fillStyle(0x1e1535, 0.9);
  gfx.fillRect(0, 24, 8, 276);
  gfx.fillRect(392, 24, 8, 276);
  // Ceiling lights
  gfx.fillStyle(0xfffacc, 0.55);
  for (let lx = 50; lx <= 350; lx += 100) gfx.fillCircle(lx, 30, 2);
  // Center spotlight glow
  gfx.fillStyle(0xfff8d0, 0.07);
  gfx.fillCircle(200, 152, 65);
  gfx.fillStyle(0xfff8d0, 0.04);
  gfx.fillCircle(200, 152, 95);

  // Fancy trophy table + Bill Poucher character
  drawFancyTable(200, 155);

  // Central trophy + balloons
  const tx = 200, ty = 155;
  const bCols = [0xff4444, 0xff8800, 0xffee00, 0x44dd44, 0x4499ff, 0xdd44ff];
  for (let b = 0; b < PROBLEMS; b++) {
    const ang = -Math.PI * 0.8 + b * (Math.PI * 0.6 / (PROBLEMS - 1));
    const bx = (tx + Math.cos(ang) * 44) | 0;
    const by = (ty - 12 + Math.sin(ang) * 31 + Math.sin(t * 0.002 + b * 1.1) * 3) | 0;
    gfx.lineStyle(1, 0x888877, 0.45);
    gfx.lineBetween(tx, ty - 12, bx, by + 7);
    gfx.fillStyle(bCols[b], 0.9);
    gfx.fillEllipse(bx, by, 10, 13);
    gfx.fillStyle(0xffffff, 0.3);
    gfx.fillCircle(bx - 2, by - 3, 2);
    gfx.fillStyle(bCols[b], 0.8);
    gfx.fillCircle(bx, by + 7, 1);
  }
  // Trophy base
  gfx.fillStyle(0x886600);
  gfx.fillRect(tx - 9, ty + 9, 18, 4);
  gfx.fillStyle(0xaa8800);
  gfx.fillRect(tx - 6, ty + 7, 12, 3);
  // Stem
  gfx.fillStyle(0xddaa00);
  gfx.fillRect(tx - 2, ty - 4, 5, 12);
  // Cup
  gfx.fillStyle(0xffcc00);
  gfx.fillRect(tx - 9, ty - 16, 18, 13);
  // Handles
  gfx.fillStyle(0xddaa00);
  gfx.fillRect(tx - 13, ty - 14, 4, 7);
  gfx.fillRect(tx + 9, ty - 14, 4, 7);
  // Rim
  gfx.fillStyle(0xffee44);
  gfx.fillRect(tx - 10, ty - 17, 20, 3);
  // Shine
  gfx.fillStyle(0xffffff, 0.6);
  gfx.fillRect(tx - 5, ty - 13, 2, 5);

  drawBillPoucher(263, 180, t);
  for (let i = 0; i < 4; i++) drawStation(i, t);

  // Cat animation for first 3s of stun only
  for (let i = 1; i < 4; i++) {
    if (teams[i].bothered > BOTHER_DUR - 3000) {
      const p = TP[i];
      drawCat(p.x, p.y < 150 ? p.y + 47 : p.y - 47, t);
    }
  }

  const atWork = Math.hypot(plr.x - TP[0].x, plr.y - TP[0].y) < WORK_R;
  if (atWork && !problemActive) {
    gfx.lineStyle(2, TC[0], 0.35 + Math.abs(Math.sin(t * 0.005)) * 0.25);
    gfx.strokeCircle(TP[0].x, TP[0].y, WORK_R);
    gfx.fillStyle(TC[0], 0.06);
    gfx.fillCircle(TP[0].x, TP[0].y, WORK_R);
  }

  drawGuards(t);

  // "Don Gaaaato!" speech bubble
  if (botherPopupTimer > 0) {
    const prog = 1 - botherPopupTimer / 1800;
    const ba = botherPopupTimer < 540 ? botherPopupTimer / 540 : 1;
    const bx = plr.x, by = plr.y - 22 - prog * 10;
    gfx.fillStyle(0x111100, 0.88 * ba);
    gfx.fillRect(bx - 35, by - 8, 70, 14);
    gfx.lineStyle(1, 0xffee44, ba);
    gfx.strokeRect(bx - 35, by - 8, 70, 14);
    gfx.fillStyle(0x111100, 0.88 * ba);
    gfx.fillTriangle(bx - 3, by + 6, bx + 3, by + 6, bx, by + 11);
    txBotherPopup.setPosition(bx, by).setAlpha(ba);
  }

  // Player (blinks while invincible after catch)
  if (catchCooldown <= 0 || Math.floor(t / 120) % 2 === 0) {
    gfx.fillStyle(0x000000, 0.35);
    gfx.fillEllipse(plr.x, plr.y + 8, 11, 4);
    gfx.fillStyle(0xffd5a0);
    gfx.fillCircle(plr.x, plr.y - 5, 3);
    gfx.fillStyle(TC[0], 0.92);
    gfx.fillRect(plr.x - 2, plr.y - 2, 4, 5);
    gfx.fillStyle(0x334455);
    gfx.fillRect(plr.x - 2, plr.y + 3, 2, 3);
    gfx.fillRect(plr.x,     plr.y + 3, 2, 3);
  }
  // Cooldown bar always visible
  const cdPct = botherCooldown > 0 ? 1 - botherCooldown / BOTHER_CD : 1;
  gfx.fillStyle(0x111111, 0.8);
  gfx.fillRect(plr.x - 8, plr.y + 9, 16, 3);
  gfx.fillStyle(botherCooldown > 0 ? 0xff7700 : 0xffff00, 0.9);
  gfx.fillRect(plr.x - 8, plr.y + 9, 16 * cdPct, 3);

  // Red flash on catch
  if (catchCooldown > 2500) {
    gfx.fillStyle(0xff0000, (catchCooldown - 2500) / 500 * 0.45);
    gfx.fillRect(0, 0, 400, 300);
  }

  drawHUD(t);
  if (problemActive) drawProblem(t);
}

function drawStation(i, t) {
  const tm = teams[i];
  const p = TP[i];
  const c = TC[i];
  const iB = tm.bothered > 0;
  const W = 72, H = 59;

  gfx.fillStyle(c, iB ? 0.07 : 0.11);
  gfx.fillRect(p.x - W / 2, p.y - H / 2, W, H);
  gfx.lineStyle(iB ? 2 : 1, iB ? 0xff1111 : c, iB ? 0.9 : 0.55);
  gfx.strokeRect(p.x - W / 2, p.y - H / 2, W, H);

  gfx.fillStyle(0x3d2010);
  gfx.fillRect(p.x - 22, p.y - 2, 44, 13);
  gfx.fillStyle(0x5e3318);
  gfx.fillRect(p.x - 22, p.y - 3, 44, 3);

  gfx.fillStyle(0x222222);
  gfx.fillRect(p.x - 1, p.y - 9, 2, 7);
  gfx.fillStyle(0x111111);
  gfx.fillRect(p.x - 12, p.y - 20, 23, 15);
  gfx.fillStyle(iB ? 0x550000 : 0x001122);
  gfx.fillRect(p.x - 10, p.y - 19, 20, 12);

  if (!iB) {
    const flicker = 0.4 + Math.abs(Math.sin(t * 0.0025 + i * 0.7)) * 0.35;
    gfx.lineStyle(1, 0x00ccff, flicker);
    for (let l = 0; l < 4; l++) {
      const lw = 4 + (l * 4 + i * 3) % 12;
      gfx.lineBetween(p.x - 9, p.y - 17 + l * 3, p.x - 9 + lw, p.y - 17 + l * 3);
    }
  } else {
    gfx.lineStyle(2, 0xff3333, 0.9);
    gfx.lineBetween(p.x - 9, p.y - 18, p.x + 9, p.y - 7);
    gfx.lineBetween(p.x + 9, p.y - 18, p.x - 9, p.y - 7);
  }

  const npcPos = i === 0 ? [[-24, 8], [15, 8]] : [[-24, 8], [-5, 16], [15, 8]];
  for (const [ox, oy] of npcPos) {
    const w = iB ? 0 : Math.sin(t * 0.0014 + ox * 0.25 + i * 0.9) * 0.9;
    gfx.fillStyle(iB ? 0x2a1010 : c, 0.82);
    gfx.fillRect(p.x + ox - 3, p.y + oy - 4 + w, 6, 7);
    gfx.fillStyle(0xffbe96);
    gfx.fillCircle(p.x + ox, p.y + oy - 7 + w, 3);
    if (iB) {
      gfx.lineStyle(1, 0xff4444, 0.85);
      gfx.lineBetween(p.x + ox - 3, p.y + oy - 11, p.x + ox + 3, p.y + oy - 6);
      gfx.lineBetween(p.x + ox + 3, p.y + oy - 11, p.x + ox - 3, p.y + oy - 6);
    }
  }

  if (iB) {
    const pct = tm.bothered / BOTHER_DUR;
    gfx.fillStyle(0x1a0000);
    gfx.fillRect(p.x - W / 2, p.y + H / 2 - 3, W, 3);
    gfx.fillStyle(0xff2233, 0.65 + Math.abs(Math.sin(t * 0.009)) * 0.25);
    gfx.fillRect(p.x - W / 2, p.y + H / 2 - 3, W * pct, 3);
  }

  if (i > 0 && !iB && !tm.done) {
    const d = Math.hypot(plr.x - p.x, plr.y - p.y);
    if (d < BOTHER_R * 1.6) {
      const a = (1 - d / (BOTHER_R * 1.6)) * 0.45;
      gfx.lineStyle(2, botherCooldown <= 0 ? 0xffff00 : 0xff6600, a + Math.abs(Math.sin(t * 0.006)) * 0.1);
      gfx.strokeCircle(p.x, p.y, BOTHER_R * (0.92 + Math.sin(t * 0.003) * 0.04));
    }
  }

  for (let s = 0; s < tm.solved; s++) {
    gfx.fillStyle(c, 0.9);
    gfx.fillCircle(p.x - W / 2 + 5 + s * 6, p.y - H / 2 + 5, 2);
    gfx.lineStyle(1, 0xffffff, 0.2);
    gfx.strokeCircle(p.x - W / 2 + 5 + s * 6, p.y - H / 2 + 5, 2);
  }
}

function drawGuards(t) {
  for (const g of GD) {
    const ga = g.ba + g.amp * Math.sin(t / g.per * Math.PI * 2);
    const R = g.r;
    const x1 = (g.x + Math.cos(ga - CONE_HALF) * R) | 0;
    const y1 = (g.y + Math.sin(ga - CONE_HALF) * R) | 0;
    const x2 = (g.x + Math.cos(ga + CONE_HALF) * R) | 0;
    const y2 = (g.y + Math.sin(ga + CONE_HALF) * R) | 0;
    // Cone
    gfx.fillStyle(0xffee88, 0.09);
    gfx.fillTriangle(g.x, g.y, x1, y1, x2, y2);
    gfx.lineStyle(1, 0xffee88, 0.28);
    gfx.lineBetween(g.x, g.y, x1, y1);
    gfx.lineBetween(g.x, g.y, x2, y2);
    // Figure
    gfx.fillStyle(0x000000, 0.28);
    gfx.fillEllipse(g.x, g.y + 7, 10, 4);
    gfx.fillStyle(0x223355, 0.95);
    gfx.fillRect(g.x - 2, g.y - 2, 4, 5);
    gfx.fillStyle(0x112244);
    gfx.fillRect(g.x - 2, g.y + 3, 2, 3);
    gfx.fillRect(g.x,     g.y + 3, 2, 3);
    gfx.fillStyle(0xffd5a0);
    gfx.fillCircle(g.x, g.y - 5, 3);
    gfx.fillStyle(0x223355);
    gfx.fillRect(g.x - 3, g.y - 9, 6, 2);
  }
}

function drawHUD(t) {
  gfx.fillStyle(0x000000, 0.9);
  gfx.fillRect(0, 0, 400, 24);
  gfx.lineStyle(1, 0x222244);
  gfx.lineBetween(0, 24, 400, 24);

  for (let i = 0; i < 4; i++) {
    const tm = teams[i];
    const x = 10 + i * 97;
    const c = TC[i];
    const iB = tm.bothered > 0;

    gfx.fillStyle(c, 0.9);
    gfx.fillRect(x, 2, 4, 20);

    for (let s = 0; s < PROBLEMS; s++) {
      const filled = s < tm.solved;
      gfx.fillStyle(filled ? c : 0x1a1a2e);
      gfx.fillCircle(x + 10 + s * 6, 9, 3);
      if (filled) {
        gfx.lineStyle(1, 0xffffff, 0.22);
        gfx.strokeCircle(x + 10 + s * 6, 9, 3);
      }
    }

    gfx.fillStyle(0x0a0a18);
    gfx.fillRect(x + 6, 15, 41, 5);
    gfx.fillStyle(iB ? 0xff2233 : c, iB ? (0.22 + Math.abs(Math.sin(t * 0.008)) * 0.4) : 0.85);
    gfx.fillRect(x + 6, 15, 41 * tm.progress, 5);
    gfx.lineStyle(1, iB ? 0xff3344 : c, 0.4);
    gfx.strokeRect(x + 6, 15, 41, 5);

    if (i === 0) {
      const pct = botherCooldown > 0 ? 1 - botherCooldown / BOTHER_CD : 1;
      gfx.fillStyle(0x221100);
      gfx.fillRect(x + 6, 21, 41, 2);
      gfx.fillStyle(botherCooldown > 0 ? 0xff8800 : 0xffff00, 0.85);
      gfx.fillRect(x + 6, 21, 41 * pct, 2);
    }
  }
}

function drawProblem(t) {
  const isYN = problemType !== 'add' && problemType !== 'factor' && problemType !== 'gcd' && problemType !== 'lis';
  const bx = 88, by = isYN ? 67 : 74, bw = 225, bh = isYN ? 160 : 150;
  gfx.fillStyle(0x000000, 0.92);
  gfx.fillRect(bx, by, bw, bh);
  gfx.lineStyle(2, TC[0], 0.85 + Math.abs(Math.sin(t * 0.005)) * 0.15);
  gfx.strokeRect(bx, by, bw, bh);
  gfx.lineStyle(1, TC[0], 0.2);
  gfx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

  if ((problemType === 'graph' || problemType === 'coloring') && probGraphNodes) {
    // Colorblind-safe: blue(circle) / orange(square) / yellow(diamond)
    const GCOLS = [0x0077cc, 0xff8800, 0xf0e040];
    gfx.lineStyle(1, 0x5577bb, 0.85);
    for (const [a, b] of probGraphEdges)
      gfx.lineBetween(probGraphNodes[a].x, probGraphNodes[a].y, probGraphNodes[b].x, probGraphNodes[b].y);
    for (let ni = 0; ni < probGraphNodes.length; ni++) {
      const nd = probGraphNodes[ni];
      const col = problemType === 'coloring' ? probColoring[ni] : -1;
      gfx.fillStyle(col >= 0 ? GCOLS[col] : 0x1a3366, 0.95);
      if (col === 1) {
        gfx.fillRect(nd.x - 5, nd.y - 5, 10, 10);
        gfx.lineStyle(1, 0x000000, 0.55);
        gfx.strokeRect(nd.x - 5, nd.y - 5, 10, 10);
      } else if (col === 2) {
        gfx.fillTriangle(nd.x, nd.y - 7, nd.x - 6, nd.y, nd.x + 6, nd.y);
        gfx.fillTriangle(nd.x - 6, nd.y, nd.x + 6, nd.y, nd.x, nd.y + 7);
        gfx.lineStyle(1, 0x000000, 0.55);
        gfx.lineBetween(nd.x, nd.y - 7, nd.x - 6, nd.y);
        gfx.lineBetween(nd.x - 6, nd.y, nd.x, nd.y + 7);
        gfx.lineBetween(nd.x, nd.y + 7, nd.x + 6, nd.y);
        gfx.lineBetween(nd.x + 6, nd.y, nd.x, nd.y - 7);
      } else {
        gfx.fillCircle(nd.x, nd.y, 6);
        gfx.lineStyle(1, col >= 0 ? 0x000000 : 0x88aaff, 0.55);
        gfx.strokeCircle(nd.x, nd.y, 6);
      }
    }
  }

  if (problemType === 'nim' && probNimPiles) {
    const baseY = 145, sw = 9, sh = 5, step = 6;
    const pxs = [153, 200, 248], pc = [0xff5566, 0x44aaff, 0xffcc22];
    for (let p = 0; p < 3; p++) {
      gfx.fillStyle(pc[p], 0.9);
      for (let s = 0; s < probNimPiles[p]; s++)
        gfx.fillRect(pxs[p] - sw / 2, baseY - s * step - sh, sw, sh);
    }
    gfx.lineStyle(1, 0x5566aa, 0.5);
    gfx.lineBetween(133, baseY, 268, baseY);
  }

  const optColors = [0x1a1a3a, 0x1a1a3a, 0x1a1a3a, 0x1a1a3a];
  if (problemSelectedIdx >= 0)
    optColors[problemSelectedIdx] = problemResult === 'correct' ? 0x003322 : 0x220011;
  const borderCols = [0x4455aa, 0x4455aa, 0x4455aa, 0x4455aa];
  if (problemSelectedIdx >= 0)
    borderCols[problemSelectedIdx] = problemResult === 'correct' ? 0x00ff88 : 0xff3355;
  for (let i = 0; i < 4; i++) {
    if (!txProbOpts[i].visible) continue;
    const ox = txProbOpts[i].x, oy = txProbOpts[i].y;
    gfx.fillStyle(optColors[i], 0.95);
    gfx.fillRect(ox - 23, oy - 10, 46, 19);
    gfx.lineStyle(1, borderCols[i], 0.9);
    gfx.strokeRect(ox - 23, oy - 10, 46, 19);
  }

  gfx.fillStyle(0x8888cc, 0.9);
  if (!isYN) {
    gfx.fillTriangle(200, 117, 196, 122, 204, 122);
    gfx.fillTriangle(200, 191, 196, 186, 204, 186);
    gfx.fillTriangle(119, 154, 124, 151, 124, 158);
    gfx.fillTriangle(281, 154, 276, 151, 276, 158);
  } else {
    gfx.fillTriangle(131, 179, 136, 176, 136, 183);
    gfx.fillTriangle(270, 179, 264, 176, 264, 183);
  }
}

function drawOver(t) {
  gfx.fillStyle(0x000000, 0.78);
  gfx.fillRect(0, 0, 400, 300);
  const c = winTeam >= 0 ? TC[winTeam] : 0xffffff;
  gfx.lineStyle(2, c, 0.45 + Math.abs(Math.sin(t * 0.003)) * 0.35);
  gfx.strokeRect(40, 105, 320, 110);
  gfx.fillStyle(0x000000, 0.7);
  gfx.fillRect(41, 106, 319, 109);
}

function drawCat(cx, cy, t) {
  const fr = Math.floor(t / 350) % 2;
  const c = 0xf5c078;
  // Outer ears drawn first — head will cover their bases
  gfx.fillStyle(c, 0.95);
  gfx.fillTriangle(cx - 5, cy - 6, cx - 2, cy - 6, cx - 4, cy - 12);
  gfx.fillTriangle(cx + 2, cy - 6, cx + 5, cy - 6, cx + 4, cy - 12);
  // Head covers ear bases
  gfx.fillCircle(cx, cy - 2, 6);
  // Body
  gfx.fillEllipse(cx, cy + 4, 12, 8);
  // Inner ears (pink, on top)
  gfx.fillStyle(0xff9999, 0.85);
  gfx.fillTriangle(cx - 4, cy - 7, cx - 2, cy - 7, cx - 3, cy - 11);
  gfx.fillTriangle(cx + 2, cy - 7, cx + 4, cy - 7, cx + 3, cy - 11);
  // Eyes
  gfx.fillStyle(0x113311, 0.95);
  if (fr === 0) {
    gfx.fillCircle(cx - 2, cy - 3, 1);
    gfx.fillCircle(cx + 2, cy - 3, 1);
  } else {
    gfx.lineStyle(1, 0x113311, 0.95);
    gfx.lineBetween(cx - 3, cy - 3, cx - 1, cy - 3);
    gfx.lineBetween(cx + 1, cy - 3, cx + 3, cy - 3);
  }
  // Nose
  gfx.fillStyle(0xff6699, 0.9);
  gfx.fillCircle(cx, cy - 1, 1);
  // Whiskers
  gfx.lineStyle(1, 0x887766, 0.5);
  gfx.lineBetween(cx - 6, cy - 1, cx - 2, cy);
  gfx.lineBetween(cx - 6, cy + 1, cx - 2, cy);
  gfx.lineBetween(cx + 2, cy, cx + 6, cy - 1);
  gfx.lineBetween(cx + 2, cy, cx + 6, cy + 1);
  // Tail (wags between frames)
  const tailY = fr === 0 ? cy + 1 : cy + 4;
  gfx.lineStyle(2, c, 0.9);
  gfx.lineBetween(cx + 5, cy + 7, cx + 11, tailY);
  gfx.lineBetween(cx + 11, tailY, cx + 10, tailY - 4);
}

// ── Audio ─────────────────────────────────────────────────────────────────────

function playCatch() {
  try {
    const ctx = sc.sound.context;
    [523, 392, 294, 196].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.value = f;
      const s = ctx.currentTime + i * 0.1;
      g.gain.setValueAtTime(0.14, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.18);
      o.start(s); o.stop(s + 0.18);
    });
  } catch (e) {}
}

function playCatMeow() {
  try {
    const ctx = sc.sound.context;
    const s = ctx.currentTime;
    // Main meow tone — rises then falls
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(450, s);
    o.frequency.linearRampToValueAtTime(820, s + 0.13);
    o.frequency.linearRampToValueAtTime(580, s + 0.32);
    o.frequency.exponentialRampToValueAtTime(280, s + 0.55);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.22, s + 0.06);
    g.gain.setValueAtTime(0.22, s + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.55);
    o.start(s); o.stop(s + 0.55);
    // Upper harmonic for cat-like timbre
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(900, s);
    o2.frequency.linearRampToValueAtTime(1640, s + 0.13);
    o2.frequency.linearRampToValueAtTime(1160, s + 0.32);
    o2.frequency.exponentialRampToValueAtTime(560, s + 0.55);
    g2.gain.setValueAtTime(0, s);
    g2.gain.linearRampToValueAtTime(0.07, s + 0.06);
    g2.gain.setValueAtTime(0.07, s + 0.3);
    g2.gain.exponentialRampToValueAtTime(0.001, s + 0.55);
    o2.start(s); o2.stop(s + 0.55);
  } catch (e) {}
}

function playSolve(isPlayer) {
  try {
    const ctx = sc.sound.context;
    const n = isPlayer ? [523, 659, 784, 1047, 1319] : [330, 392, 494];
    n.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = f;
      const s = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.13, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.2);
      o.start(s); o.stop(s + 0.2);
    });
  } catch (e) {}
}
