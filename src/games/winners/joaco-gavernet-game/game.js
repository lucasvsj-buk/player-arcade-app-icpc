/*
Snake Duel: Crush Ring (1v1) - Buk Arcade Challenge ICPC
First to 3 rounds wins. Touch border/self/opponent body = lose. Ring shrinks over time.
*/

(function () {
  const GW = 800;
  const GH = 600;

  const CS = 16;
  const COLS = 40;
  const ROWS = 30;

  const TICK_MS = 110;
  const WIN_ROUNDS = 3;

  const SHRINK_EVERY = 10500;
  const WARN_MS = 3200;
  const MIN_INNER = 7;

  const DIR = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
  const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };

  const C = {
    bg0: 0x07070c,
    bg1: 0x0a0a16,
    grid: 0x1e1e2e,
    crush: 0x1a090f,
    wall0: 0xff2a6d,
    wall1: 0xff6b9b,
    p1: 0x00e5ff,
    p2: 0xff4dff,
    food: 0xfff45a,
    ui: 0xf2f2ff,
    dim: 0x9a9ab5
  };

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const RANKS = [
    { name: 'NEWBIE', hex: '#808080', body: 0x808080, head: 0x808080 },
    { name: 'PUPIL', hex: '#008000', body: 0x008000, head: 0x008000 },
    { name: 'SPECIALIST', hex: '#03A89E', body: 0x03A89e, head: 0x03A89e },
    { name: 'EXPERT', hex: '#0000FF', body: 0x0000ff, head: 0x0000ff },
    { name: 'CANDIDATE MASTER', hex: '#AA00AA', body: 0xaa00aa, head: 0xaa00aa },
    { name: 'MASTER', hex: '#FF8C00', body: 0xff8c00, head: 0xff8c00 },
    { name: 'GRANDMASTER', hex: '#FF0000', body: 0xff0000, head: 0xff0000 },
    { name: 'LGM', hex: '#FF0000', body: 0xff0000, head: 0x151515 }
  ];

  const selectedSkins = { p1: 2, p2: 6 };

  function maxInset() {
    const mx = Math.floor((COLS - MIN_INNER) / 2) - 1;
    const my = Math.floor((ROWS - MIN_INNER) / 2) - 1;
    return Math.max(0, Math.min(mx, my));
  }

  function createSnake(x, y, d, color, headColor, name) {
    return { body: [{ x, y }, { x: x - DIR[d].x, y: y - DIR[d].y }, { x: x - 2 * DIR[d].x, y: y - 2 * DIR[d].y }], dir: d, next: d, alive: true, color, headColor: headColor || color, name, grow: 0, boost: 0 };
  }

  function setDir(s, d) {
    if (!d || d === OPP[s.dir]) return;
    s.next = d;
  }

  function tickSnake(s) {
    if (!s.alive) return;
    s.dir = s.next;
    const d = DIR[s.dir];
    const h = s.body[0];
    s.body.unshift({ x: h.x + d.x, y: h.y + d.y });
    if (s.grow > 0) s.grow--;
    else s.body.pop();
  }

  function onWall(x, y, inset) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    return x <= inset || x >= (COLS - 1 - inset) || y <= inset || y >= (ROWS - 1 - inset);
  }

  function insideSafe(x, y, inset) {
    return x > inset && x < (COLS - 1 - inset) && y > inset && y < (ROWS - 1 - inset);
  }

  function hitsBody(head, body, startIdx) {
    for (let i = startIdx; i < body.length; i++) {
      const c = body[i];
      if (c.x === head.x && c.y === head.y) return true;
    }
    return false;
  }

  function freeCell(state, tries) {
    const used = new Set();
    state.s1.body.forEach(c => used.add(c.x + ',' + c.y));
    state.s2.body.forEach(c => used.add(c.x + ',' + c.y));
    const inset = state.inset;
    tries = tries || 120;
    for (let i = 0; i < tries; i++) {
      const x = (inset + 1) + ((Math.random() * (COLS - 2 * (inset + 1))) | 0);
      const y = (inset + 1) + ((Math.random() * (ROWS - 2 * (inset + 1))) | 0);
      if (!insideSafe(x, y, inset)) continue;
      const k = x + ',' + y;
      if (!used.has(k)) return { x, y };
    }
    for (let y = inset + 1; y < ROWS - inset - 1; y++) {
      for (let x = inset + 1; x < COLS - inset - 1; x++) {
        if (!insideSafe(x, y, inset)) continue;
        const k = x + ',' + y;
        if (!used.has(k)) return { x, y };
      }
    }
    return null;
  }

  function spawnFood(state, letterIndex) {
    const c = freeCell(state);
    state.food = c ? { x: c.x, y: c.y, ch: LETTERS[letterIndex % LETTERS.length] } : null;
  }

  function tstyle(size, color, weight) {
    return {
      fontFamily: 'Courier New, Consolas, monospace',
      fontSize: size + 'px',
      fontStyle: (weight === '600' || weight === 600) ? 'bold' : (weight ? ('' + weight) : 'bold'),
      color: color || '#f2f2ff'
    };
  }

  const Boot = {
    key: 'Boot',
    create: function () {
      this.scene.start('Menu');
    }
  };

  const Menu = {
    key: 'Menu',
    create: function () {
      try {
        this.input.keyboard.addCapture([
          Phaser.Input.Keyboard.KeyCodes.UP,
          Phaser.Input.Keyboard.KeyCodes.DOWN,
          Phaser.Input.Keyboard.KeyCodes.LEFT,
          Phaser.Input.Keyboard.KeyCodes.RIGHT,
          Phaser.Input.Keyboard.KeyCodes.SPACE,
          Phaser.Input.Keyboard.KeyCodes.ENTER,
          Phaser.Input.Keyboard.KeyCodes.W,
          Phaser.Input.Keyboard.KeyCodes.A,
          Phaser.Input.Keyboard.KeyCodes.S,
          Phaser.Input.Keyboard.KeyCodes.D
        ]);
      } catch (e) { }

      const g = this.add.graphics();
      g.fillStyle(C.bg0);
      g.fillRect(0, 0, GW, GH);
      g.fillStyle(C.bg1, 0.9);
      g.fillRect(0, 0, GW, GH);

      const logoY = 92;
      const tSnake = this.add.text(0, logoY, 'SNAKE', tstyle(70, '#5E6674', 'bold')).setOrigin(0, 0.5);
      const tForces = this.add.text(0, logoY, 'FORCES', tstyle(70, '#2F79C3', 'bold')).setOrigin(0, 0.5);
      const totalLogoW = tSnake.width + tForces.width - 2;
      const logoX = (GW - totalLogoW) / 2;
      tSnake.setX(logoX);
      tForces.setX(logoX + tSnake.width - 2);

      const ulY = logoY + 46;
      const ulGap = 6;
      const ulW = (totalLogoW - ulGap * 2) / 3;
      g.fillStyle(0xf2cf55, 0.95);
      g.fillRect(logoX, ulY, ulW, 4);
      g.fillStyle(0x2f79c3, 0.95);
      g.fillRect(logoX + ulW + ulGap, ulY, ulW, 4);
      g.fillStyle(0xd94343, 0.95);
      g.fillRect(logoX + ulW * 2 + ulGap * 2, ulY, ulW, 4);
      this.add.text(GW / 2, 228, 'PICK RANK SKINS', tstyle(22, '#fff45a', 'bold')).setOrigin(0.5);
      const p1Skin = this.add.text(GW / 2, 276, '', tstyle(26, '#03A89E', 'bold')).setOrigin(0.5);
      const p2Skin = this.add.text(GW / 2, 318, '', tstyle(26, '#ff0000', 'bold')).setOrigin(0.5);

      this.add.text(GW / 2, 390, 'HIT BORDER / YOUR BODY / ENEMY BODY = LOSE', tstyle(18, '#f2f2ff', '600')).setOrigin(0.5);
      this.add.text(GW / 2, 420, 'HEAD-ON: LONGER SNAKE WINS', tstyle(18, '#9a9ab5', '600')).setOrigin(0.5);
      this.add.text(GW / 2, 450, 'SHORTER SNAKE GETS A SMALL SPEED BOOST', tstyle(18, '#9a9ab5', '600')).setOrigin(0.5);
      this.add.text(GW / 2, 480, 'THE RING SHRINKS. SURVIVE THE CRUSH.', tstyle(18, '#f2f2ff', '600')).setOrigin(0.5);

      const t = this.add.text(GW / 2, 540, 'PRESS START', tstyle(28, '#00e5ff', 'bold')).setOrigin(0.5);
      this.tweens.add({ targets: t, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });

      let s1 = selectedSkins.p1;
      let s2 = selectedSkins.p2;

      const renderSkins = () => {
        const r1 = RANKS[s1];
        const r2 = RANKS[s2];
        p1Skin.setText('P1: ' + r1.name);
        p1Skin.setColor(r1.hex);
        p2Skin.setText('P2: ' + r2.name);
        p2Skin.setColor(r2.hex);
      };

      const cycle = (v, d) => {
        const n = RANKS.length;
        return (v + d + n) % n;
      };

      const start = () => {
        selectedSkins.p1 = s1;
        selectedSkins.p2 = s2;
        this.scene.start('Game', { r1: s1, r2: s2 });
      };

      renderSkins();
      this.input.once('pointerdown', start);

      const h = e => {
        const k = (e && e.key) ? ('' + e.key).toUpperCase() : '';
        let changed = false;
        if (k === 'P1L' || k === 'A') { s1 = cycle(s1, -1); changed = true; }
        else if (k === 'P1R' || k === 'D') { s1 = cycle(s1, 1); changed = true; }
        else if (k === 'P2L' || k === 'ARROWLEFT') { s2 = cycle(s2, -1); changed = true; }
        else if (k === 'P2R' || k === 'ARROWRIGHT') { s2 = cycle(s2, 1); changed = true; }

        if (changed) {
          renderSkins();
          return;
        }

        if (k === 'ENTER' || k === ' ' || k === 'START1' || k === 'START2' || k === '1' || k === '2') {
          this.input.keyboard.off('keydown', h);
          start();
        }
      };
      this.input.keyboard.on('keydown', h);
    }
  };

  class Game extends Phaser.Scene {
    constructor() {
      super({ key: 'Game' });
    }
    init(data) {
      this.score1 = 0;
      this.score2 = 0;
      this.rank1 = data && data.r1 != null ? data.r1 : selectedSkins.p1;
      this.rank2 = data && data.r2 != null ? data.r2 : selectedSkins.p2;
      selectedSkins.p1 = this.rank1;
      selectedSkins.p2 = this.rank2;
      this.letterIndex = 0;
    }
    create() {
      try {
        this.input.keyboard.addCapture([
          Phaser.Input.Keyboard.KeyCodes.UP,
          Phaser.Input.Keyboard.KeyCodes.DOWN,
          Phaser.Input.Keyboard.KeyCodes.LEFT,
          Phaser.Input.Keyboard.KeyCodes.RIGHT,
          Phaser.Input.Keyboard.KeyCodes.SPACE,
          Phaser.Input.Keyboard.KeyCodes.ENTER,
          Phaser.Input.Keyboard.KeyCodes.W,
          Phaser.Input.Keyboard.KeyCodes.A,
          Phaser.Input.Keyboard.KeyCodes.S,
          Phaser.Input.Keyboard.KeyCodes.D
        ]);
      } catch (e) { }

      this.g = this.add.graphics();
      this.cam = this.cameras.main;
      this.sfx = makeSfx(this);

      this.uiScore = this.add.text(GW / 2, 18, '0 - 0', tstyle(28, '#f2f2ff', 'bold')).setOrigin(0.5, 0);
      this.uiHint = this.add.text(GW / 2, 52, 'FIRST TO ' + WIN_ROUNDS, tstyle(14, '#9a9ab5', '600')).setOrigin(0.5, 0);
      this.uiRing = this.add.text(GW / 2, 74, '', tstyle(16, '#ff2a6d', 'bold')).setOrigin(0.5, 0);
      this.big = this.add.text(GW / 2, GH / 2 - 40, '', tstyle(96, '#f2f2ff', 'bold')).setOrigin(0.5);
      this.sub = this.add.text(GW / 2, GH / 2 + 40, '', tstyle(24, '#fff45a', '600')).setOrigin(0.5);
      this.foodText = this.add.text(0, 0, 'A', tstyle(18, '#fff45a', 'bold')).setOrigin(0.5).setVisible(false);

      this.particles = [];

      this.input.keyboard.on('keydown', e => {
        const k = (e && e.key) ? ('' + e.key).toUpperCase() : '';
        if (this.phase !== 'play') return;
        if (k === 'W' || k === 'P1U') setDir(this.state.s1, 'U');
        else if (k === 'S' || k === 'P1D') setDir(this.state.s1, 'D');
        else if (k === 'A' || k === 'P1L') setDir(this.state.s1, 'L');
        else if (k === 'D' || k === 'P1R') setDir(this.state.s1, 'R');
        else if (e.key === 'ArrowUp' || k === 'P2U') setDir(this.state.s2, 'U');
        else if (e.key === 'ArrowDown' || k === 'P2D') setDir(this.state.s2, 'D');
        else if (e.key === 'ArrowLeft' || k === 'P2L') setDir(this.state.s2, 'L');
        else if (e.key === 'ArrowRight' || k === 'P2R') setDir(this.state.s2, 'R');
      });

      this.initRound();
    }
    initRound() {
      const mid = ROWS >> 1;
      this.letterIndex = 0;
      const rk1 = RANKS[this.rank1] || RANKS[0];
      const rk2 = RANKS[this.rank2] || RANKS[1];
      this.state = {
        inset: 0,
        s1: createSnake(6, mid, 'R', rk1.body, rk1.head, 'P1'),
        s2: createSnake(COLS - 7, mid, 'L', rk2.body, rk2.head, 'P2'),
        food: null
      };
      spawnFood(this.state, this.letterIndex);

      this.tickAcc = 0;
      this.phase = 'countdown';
      this.count = 3;
      this.countAt = this.time.now + 650;
      this.shrinkAt = 0;
      this.shrMax = maxInset();
      this.roundEndAt = 0;

      this._warnLast = 0;
      this.uiRing.setText('');

      this.big.setVisible(true);
      this.sub.setVisible(true);
      this.big.setFontSize(96);
      this.big.setText('3');
      this.sub.setText('GET READY');
    }
    update(time, delta) {
      const g = this.g;
      g.clear();
      const ox = (GW - COLS * CS) / 2;
      const oy = (GH - ROWS * CS) / 2;

      this.drawArena(g, ox, oy, time);
      this.drawFood(g, ox, oy, time);
      this.drawSnakes(g, ox, oy, time);
      this.drawParticles(g);

      this.uiScore.setText(this.score1 + '  -  ' + this.score2);
      this.uiHint.setText('FIRST TO ' + WIN_ROUNDS);

      if (this.phase === 'countdown') {
        if (time >= this.countAt) {
          this.count--;
          this.countAt = time + 650;
          if (this.count > 0) {
            this.big.setText('' + this.count);
            this.sfx.beep(520);
          } else {
            this.phase = 'play';
            this.shrinkAt = time + SHRINK_EVERY;
            this.big.setText('GO');
            this.sub.setText('');
            this.sfx.beep(820);
            this.time.delayedCall(350, () => { this.big.setText(''); this.big.setVisible(false); this.sub.setVisible(false); });
          }
        }
        return;
      }

      if (this.phase === 'play') {
        const tto = this.shrinkAt - time;
        if (this.state.inset < this.shrMax && tto > 0) {
          const n = Math.max(1, Math.ceil(tto / 1000));
          this.uiRing.setText('NEXT SHRINK: ' + n);
          if (tto <= WARN_MS) {
            if (!this._warnLast || this._warnLast !== n) {
              this._warnLast = n;
              this.sfx.warn(n);
            }
          } else {
            this._warnLast = 0;
          }
        } else {
          this.uiRing.setText(this.state.inset >= this.shrMax ? 'RING: FINAL SIZE' : 'NEXT SHRINK: 0');
          this._warnLast = 0;
        }

        if (this.state.inset < this.shrMax && time >= this.shrinkAt) {
          this.doShrink(time);
        }

        this.tickAcc += delta;
        while (this.tickAcc >= TICK_MS && this.phase === 'play') {
          this.tickAcc -= TICK_MS;
          this.step(time);
        }
        return;
      }

      if (this.phase === 'roundEnd') {
        if (time >= this.roundEndAt) {
          if (this.score1 >= WIN_ROUNDS || this.score2 >= WIN_ROUNDS) {
            this.scene.start('Results', { s1: this.score1, s2: this.score2 });
          } else {
            this.initRound();
          }
        }
      }
    }
    doShrink(time) {
      this.state.inset++;
      this.shrinkAt = time + SHRINK_EVERY;
      this.sfx.shrink();
      try { this.cam.shake(140, 0.012); } catch (e) {}

      if (this.state.food && !insideSafe(this.state.food.x, this.state.food.y, this.state.inset)) spawnFood(this.state, this.letterIndex);

      const s1 = this.state.s1;
      const s2 = this.state.s2;
      const k1 = crushed(s1.body, this.state.inset);
      const k2 = crushed(s2.body, this.state.inset);
      if (k1) s1.alive = false;
      if (k2) s2.alive = false;
      if (!s1.alive || !s2.alive) this.finishRound(time);

      function crushed(body, inset) {
        for (let i = 0; i < body.length; i++) {
          const c = body[i];
          if (onWall(c.x, c.y, inset)) return true;
        }
        return false;
      }
    }
    step(time) {
      const st = this.state;
      const s1 = st.s1;
      const s2 = st.s2;

      const eat = s => {
        if (!st.food || !s.alive) return;
        const h = s.body[0];
        if (h.x === st.food.x && h.y === st.food.y) {
          s.grow += 1;
          this.sfx.food();
          this.emit(this.cellToPx(h), C.food);
          this.letterIndex = (this.letterIndex + 1) % LETTERS.length;
          spawnFood(st, this.letterIndex);
        }
      };

      const collide = (checkSwap, h1o, h2o) => {
        const h1 = s1.body[0];
        const h2 = s2.body[0];
        let d1 = false;
        let d2 = false;
        let clash = 0;

        if (checkSwap) {
          if (h1.x === h2.x && h1.y === h2.y) {
            if (s1.body.length > s2.body.length) clash = 1;
            else if (s2.body.length > s1.body.length) clash = 2;
            else clash = 3;
          } else if (h1.x === h2o.x && h1.y === h2o.y && h2.x === h1o.x && h2.y === h1o.y) {
            if (s1.body.length > s2.body.length) clash = 1;
            else if (s2.body.length > s1.body.length) clash = 2;
            else clash = 3;
          }
        }

        if (clash === 1) d2 = true;
        else if (clash === 2) d1 = true;
        else if (clash === 3) { d1 = true; d2 = true; }

        if (!d1 && s1.alive) {
          if (onWall(h1.x, h1.y, st.inset)) d1 = true;
          else if (hitsBody(h1, s1.body, 1)) d1 = true;
          else if (!clash && hitsBody(h1, s2.body, 0)) d1 = true;
        }
        if (!d2 && s2.alive) {
          if (onWall(h2.x, h2.y, st.inset)) d2 = true;
          else if (hitsBody(h2, s2.body, 1)) d2 = true;
          else if (!clash && hitsBody(h2, s1.body, 0)) d2 = true;
        }

        if (d1) s1.alive = false;
        if (d2) s2.alive = false;
      };

      const h1o = { x: s1.body[0].x, y: s1.body[0].y };
      const h2o = { x: s2.body[0].x, y: s2.body[0].y };

      tickSnake(s1);
      tickSnake(s2);

      collide(true, h1o, h2o);
      eat(s1);
      eat(s2);

      if (s1.alive && s2.alive) {
        const d12 = s2.body.length - s1.body.length;
        const d21 = s1.body.length - s2.body.length;
        s1.boost = Math.max(0, s1.boost + (d12 >= 2 ? Math.min(0.28, d12 * 0.06) : -0.02));
        s2.boost = Math.max(0, s2.boost + (d21 >= 2 ? Math.min(0.28, d21 * 0.06) : -0.02));

        if (s1.boost >= 1) {
          s1.boost -= 1;
          tickSnake(s1);
          collide(false, h1o, h2o);
          eat(s1);
        }

        if (s1.alive && s2.alive && s2.boost >= 1) {
          s2.boost -= 1;
          tickSnake(s2);
          collide(false, h1o, h2o);
          eat(s2);
        }
      }

      if (!s1.alive || !s2.alive) this.finishRound(time);
    }
    finishRound(time) {
      const s1 = this.state.s1;
      const s2 = this.state.s2;
      this.phase = 'roundEnd';

      let msg = 'DRAW';
      if (s1.alive && !s2.alive) { this.score1++; msg = 'P1 WINS'; }
      else if (!s1.alive && s2.alive) { this.score2++; msg = 'P2 WINS'; }

      this.big.setVisible(true);
      this.sub.setVisible(true);
      this.big.setText(msg);
      this.big.setFontSize(72);
      this.sub.setText(msg === 'DRAW' ? 'NO POINTS' : 'ROUND');

      this.sfx.death();
      if (msg !== 'DRAW') this.sfx.win();
      try { this.cam.shake(160, 0.014); } catch (e) {}
      this.roundEndAt = time + 1600;
    }
    cellToPx(c) {
      const ox = (GW - COLS * CS) / 2;
      const oy = (GH - ROWS * CS) / 2;
      return { x: ox + (c.x + 0.5) * CS, y: oy + (c.y + 0.5) * CS };
    }
    emit(p, color) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 1.6 + Math.random() * 3.4;
        this.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 26, color, r: 2 + Math.random() * 2 });
      }
    }
    drawParticles(g) {
      if (!this.particles.length) return;
      const out = [];
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life--;
        if (p.life <= 0) continue;
        g.fillStyle(p.color, Math.min(1, p.life / 26));
        g.fillCircle(p.x, p.y, p.r);
        out.push(p);
      }
      this.particles = out;
    }
    drawArena(g, ox, oy, time) {
      g.fillStyle(C.bg0);
      g.fillRect(0, 0, GW, GH);
      g.fillStyle(C.bg1, 0.95);
      g.fillRect(0, 0, GW, GH);

      g.fillStyle(C.grid, 0.35);
      for (let y = 0; y <= ROWS; y++) g.fillRect(ox, oy + y * CS, COLS * CS, 1);
      for (let x = 0; x <= COLS; x++) g.fillRect(ox + x * CS, oy, 1, ROWS * CS);

      const inset = this.state.inset;
      const ix = ox + (inset + 1) * CS;
      const iy = oy + (inset + 1) * CS;
      const iw = (COLS - 2 * (inset + 1)) * CS;
      const ih = (ROWS - 2 * (inset + 1)) * CS;

      g.fillStyle(C.crush, 0.55);
      g.fillRect(ox, oy, COLS * CS, (iy - oy));
      g.fillRect(ox, iy + ih, COLS * CS, (oy + ROWS * CS) - (iy + ih));
      g.fillRect(ox, iy, (ix - ox), ih);
      g.fillRect(ix + iw, iy, (ox + COLS * CS) - (ix + iw), ih);

      const warn = (this.phase === 'play') && (this.state.inset < this.shrMax) && ((this.shrinkAt - time) > 0) && ((this.shrinkAt - time) <= WARN_MS);
      const a = warn ? (0.45 + 0.35 * Math.sin(time / 70)) : 0.65;
      const col = warn ? C.wall1 : C.wall0;
      g.fillStyle(col, a);
      drawBorder(g, ox, oy, inset);

      function drawBorder(g, ox, oy, inset) {
        const xl = inset;
        const xr = COLS - 1 - inset;
        const yt = inset;
        const yb = ROWS - 1 - inset;
        for (let x = xl; x <= xr; x++) {
          g.fillRect(ox + x * CS + 1, oy + yt * CS + 1, CS - 2, CS - 2);
          g.fillRect(ox + x * CS + 1, oy + yb * CS + 1, CS - 2, CS - 2);
        }
        for (let y = yt + 1; y < yb; y++) {
          g.fillRect(ox + xl * CS + 1, oy + y * CS + 1, CS - 2, CS - 2);
          g.fillRect(ox + xr * CS + 1, oy + y * CS + 1, CS - 2, CS - 2);
        }
      }
    }
    drawFood(g, ox, oy, time) {
      const f = this.state.food;
      if (!f) {
        this.foodText.setVisible(false);
        return;
      }
      const x = ox + f.x * CS + CS / 2;
      const y = oy + f.y * CS + CS / 2;
      const p = 0.55 + 0.25 * Math.sin(time / 90);
      g.fillStyle(C.food, 0.16 + 0.18 * p);
      g.fillRect(x - CS / 2 + 1, y - CS / 2 + 1, CS - 2, CS - 2);
      this.foodText.setVisible(true);
      this.foodText.setText(f.ch);
      this.foodText.setPosition(x, y - 1);
    }
    drawSnakes(g, ox, oy, time) {
      const s1 = this.state.s1;
      const s2 = this.state.s2;
      drawSnake(g, s1);
      drawSnake(g, s2);

      function drawSnake(g, s) {
        const blink = (!s.alive) ? (0.2 + 0.2 * Math.sin(time / 50)) : 1;
        for (let i = 0; i < s.body.length; i++) {
          const c = s.body[i];
          const x = ox + c.x * CS;
          const y = oy + c.y * CS;
          const head = i === 0;
          const base = head ? s.headColor : s.color;
          g.fillStyle(base, (head ? 0.35 : 0.18) * blink);
          g.fillRect(x - 1, y - 1, CS + 2, CS + 2);
          g.fillStyle(base, 1 * blink);
          g.fillRect(x + 1, y + 1, CS - 2, CS - 2);
          if (head) {
            g.fillStyle(C.ui, 0.95 * blink);
            g.fillRect(x + 4, y + 4, 3, 3);
            g.fillRect(x + CS - 7, y + 4, 3, 3);
          }
        }
      }
    }
  }

  const Results = {
    key: 'Results',
    init: function (d) {
      this.s1 = (d && d.s1) || 0;
      this.s2 = (d && d.s2) || 0;
    },
    create: function () {
      try {
        this.input.keyboard.addCapture([
          Phaser.Input.Keyboard.KeyCodes.SPACE,
          Phaser.Input.Keyboard.KeyCodes.ENTER
        ]);
      } catch (e) { }

      this.add.graphics().fillStyle(C.bg0).fillRect(0, 0, GW, GH);
      const w = this.s1 >= WIN_ROUNDS ? 'P1' : 'P2';
      const col = w === 'P1' ? RANKS[selectedSkins.p1].hex : RANKS[selectedSkins.p2].hex;
      this.add.text(GW / 2, 170, w + ' WINS', tstyle(84, col, 'bold')).setOrigin(0.5);
      this.add.text(GW / 2, 270, this.s1 + ' - ' + this.s2, tstyle(44, '#f2f2ff', 'bold')).setOrigin(0.5);
      this.add.text(GW / 2, 360, 'BACK TO SKIN SELECT', tstyle(26, '#fff45a', 'bold')).setOrigin(0.5);
      const t = this.add.text(GW / 2, 450, 'PRESS START', tstyle(28, '#9a9ab5', 'bold')).setOrigin(0.5);
      this.tweens.add({ targets: t, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });

      const go = () => this.scene.start('Menu');
      this.input.once('pointerdown', go);
      const h = e => {
        const k = (e && e.key) ? ('' + e.key).toUpperCase() : '';
        if (k === 'ENTER' || k === ' ' || k === 'START1' || k === 'START2' || k === '1' || k === '2') {
          this.input.keyboard.off('keydown', h);
          go();
        }
      };
      this.input.keyboard.on('keydown', h);
    }
  };

  function makeSfx(scene) {
    const ctx = scene.sound && scene.sound.context;
    if (!ctx) return { food: n, death: n, win: n, shrink: n, beep: n, warn: n };

    function tone(freq, dur, type, vol) {
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        const v = vol == null ? 0.08 : vol;
        g.gain.setValueAtTime(v, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + dur);
      } catch (e) { }
    }

    return {
      beep: function (f) { tone(f || 520, 0.06, 'sine', 0.06); },
      warn: function (n) {
        const f = n === 1 ? 860 : n === 2 ? 700 : 560;
        tone(f, 0.09, 'square', 0.09);
      },
      food: function () { tone(880, 0.07, 'square', 0.09); },
      shrink: function () {
        try {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(240, ctx.currentTime);
          o.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);
          g.gain.setValueAtTime(0.14, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
          o.start(ctx.currentTime);
          o.stop(ctx.currentTime + 0.18);
        } catch (e) { }
      },
      death: function () { tone(120, 0.18, 'sawtooth', 0.13); },
      win: function () {
        tone(520, 0.12, 'square', 0.09);
        try { scene.time.delayedCall(90, () => tone(680, 0.12, 'square', 0.08)); } catch (e) { }
      }
    };

    function n() { }
  }

  const cfg = {
    type: Phaser.AUTO,
    width: GW,
    height: GH,
    backgroundColor: '#07070c',
    scene: [Boot, Menu, Game, Results],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  };

  function startWhenReady() {
    if (!document.body) return setTimeout(startWhenReady, 0);
    cfg.parent = document.body;
    new Phaser.Game(cfg);
  }

  startWhenReady();
})();
