// --- ARCADE MACHINE BINDINGS ---
const ARCADE_CONTROLS = {
    'P1U': ['w'], 'P1D': ['s'], 'P1L': ['a'], 'P1R': ['d'],
    'P2U': ['ArrowUp'], 'P2D': ['ArrowDown'], 'P2L': ['ArrowLeft'], 'P2R': ['ArrowRight'],
    'P1A': ['u', 'Space'], 'P1B': ['i'], // P1 Shoot & Ultimate
    'P2A': ['r', 'Enter'], 'P2B': ['t'], // P2 Shoot & Ultimate
    'START1': ['u', 'Space', 'Enter']    // Menu Navigation
};

// --- GLOBAL SETTINGS & STORAGE ---
const SETS = {
    diffNames: ['EASY', 'NORMAL', 'HARD', 'EXTREME'],
    diffMults: [0.8, 1.0, 1.3, 1.6], 
    spdMults: [0.8, 1.0, 1.2, 1.5],  
    scoreMults: [0.5, 1.0, 1.5, 3.0], 
    dIdx: 1, 
    cNames: ['GREEN', 'CYAN', 'MAGENTA', 'YELLOW', 'ORANGE', 'WHITE', 'RED'],
    cValues: [0x00ff00, 0x00ffff, 0xff00ff, 0xffff00, 0xff6600, 0xffffff, 0xff0000],
    p1C: 0, p2C: 1,
    sNames: ['CIRCLE', 'SQUARE', 'TRIANGLE', 'SOUL'], 
    sDesc: ['[BALANCED: NORMAL STATS]', '[TANK: SLOW BUT TOUGH]', '[ASSASSIN: FAST & DEADLY]', '[GLASS: TINY HITBOX, LOW HP]'],
    p1S: 0, p2S: 0,
    mNames: ['CYBER-ARP', 'DARK-BASS', 'NEON-DRIVE', 'MEGALO', 'BITE OF 87', 'OMORI DUET', 'DOOM E1M1', 'OFF'], 
    mIdx: 0,
    tNames: ['DARK', 'LIGHT', 'SYNTH', 'DETERMINATION'], 
    tIdx: 0
};

const THEMES = [
    { bg: '#020205', grid: 0x00ff00, gridAlpha: 0.05, txt: '#ffffff', title: '#00ff00', mSel: '#ffffff', mUnsel: '#555555' },
    { bg: '#e0e0e0', grid: 0x888888, gridAlpha: 0.2, txt: '#111111', title: '#00aa00', mSel: '#000000', mUnsel: '#888888' },
    { bg: '#1a0b2e', grid: 0xff00ff, gridAlpha: 0.15, txt: '#00ffff', title: '#ffff00', mSel: '#00ffff', mUnsel: '#880088' },
    { bg: '#000000', grid: 0xffffff, gridAlpha: 0.15, txt: '#ffffff', title: '#ffffff', mSel: '#ffff00', mUnsel: '#555555' } 
];

const Storage = {
    get: () => JSON.parse(localStorage.getItem('ks_scores_v5') || '{"A":[{"n":"END","s":5000}],"S":[{"n":"PUL","s":300}],"D":[]}'),
    save: (n, s, mode) => {
        let sc = Storage.get(); 
        if(!sc[mode]) sc[mode] = []; 
        sc[mode].push({n: n, s: s}); 
        sc[mode].sort((a,b) => b.s - a.s);
        sc[mode] = sc[mode].slice(0, 8); 
        localStorage.setItem('ks_scores_v5', JSON.stringify(sc));
    }
};

const AudioEngine = {
    ctx: null,
    init: function() { 
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        if(this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone: function(freq, type, vol, dur) {
        if (!freq || !this.ctx || this.ctx.state === 'suspended' || SETS.mIdx === 7) return;
        let o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq;
        o.connect(g); g.connect(this.ctx.destination);
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        o.start(); o.stop(this.ctx.currentTime + dur);
    },
    sfx: function(id) {
        if(!this.ctx || this.ctx.state === 'suspended') return;
        if(id === 'shoot') this.playTone(400, 'square', 0.05, 0.1);
        if(id === 'hit') this.playTone(150, 'sawtooth', 0.1, 0.1);
        if(id === 'xp') this.playTone(800, 'sine', 0.05, 0.05);
        if(id === 'lvl') { this.playTone(300, 'square', 0.1, 0.4); setTimeout(()=>this.playTone(600, 'square', 0.1, 0.3), 100); }
        if(id === 'heal') { this.playTone(500, 'sine', 0.1, 0.2); setTimeout(()=>this.playTone(700, 'sine', 0.1, 0.4), 150); }
        if(id === 'shield') this.playTone(300, 'sine', 0.1, 0.5);
        if(id === 'warn') this.playTone(900, 'square', 0.08, 0.1);
        if(id === 'boom') this.playTone(100, 'sawtooth', 0.2, 0.6);
        if(id === 'boss') { this.playTone(200, 'sawtooth', 0.2, 1.0); setTimeout(()=>this.playTone(150, 'sawtooth', 0.2, 1.5), 300); }
        if(id === 'enemy_shoot') this.playTone(600, 'sawtooth', 0.05, 0.1);
        if(id === 'demon') { this.playTone(80, 'sawtooth', 0.3, 2.0); setTimeout(()=>this.playTone(100, 'sawtooth', 0.3, 2.0), 500); }
    }
};

const config = {
    type: Phaser.AUTO, width: 800, height: 600,
    backgroundColor: '#020205', pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [
        class BootScene extends Phaser.Scene {
            constructor() { super('Boot'); }
            preload() {
                const g = this.add.graphics();
                // Player Shapes
                g.lineStyle(2, 0xffffff); g.fillStyle(0xcccccc); g.fillCircle(12, 12, 10); g.strokeCircle(12, 12, 10); g.generateTexture('p_circle', 24, 24); g.clear();
                g.lineStyle(2, 0xffffff); g.fillStyle(0xcccccc); g.fillRect(2, 2, 20, 20); g.strokeRect(2, 2, 20, 20); g.generateTexture('p_square', 24, 24); g.clear();
                g.lineStyle(2, 0xffffff); g.fillStyle(0xcccccc); g.beginPath(); g.moveTo(12, 2); g.lineTo(22, 22); g.lineTo(2, 22); g.closePath(); g.fillPath(); g.strokePath(); g.generateTexture('p_triangle', 24, 24); g.clear();
                g.fillStyle(0xffffff); g.fillCircle(7, 7, 7); g.fillCircle(17, 7, 7); g.beginPath(); g.moveTo(0,7); g.lineTo(24,7); g.lineTo(12,24); g.closePath(); g.fillPath(); g.generateTexture('p_soul', 24, 24); g.clear(); 
                
                // Enemies
                g.fillStyle(0xff0033); g.beginPath(); g.moveTo(10, 0); g.lineTo(0, 20); g.lineTo(20, 20); g.closePath(); g.fillPath(); g.generateTexture('bug', 20, 20); g.clear();
                g.fillStyle(0xaa00ff); g.fillRect(0,0, 24, 24); g.lineStyle(2,0xffffff); g.strokeRect(0,0,24,24); g.generateTexture('leak', 24, 24); g.clear();
                g.fillStyle(0xff8800); g.beginPath(); g.moveTo(12, 0); g.lineTo(24, 12); g.lineTo(12, 24); g.lineTo(0, 12); g.closePath(); g.fillPath(); g.generateTexture('trojan', 24, 24); g.clear();
                g.fillStyle(0xffff00); g.fillCircle(12, 12, 12); g.generateTexture('kamikaze', 24, 24); g.clear(); 
                
                // BOSSES
                g.fillStyle(0xffd700); g.beginPath(); g.moveTo(30, 0); g.lineTo(60, 30); g.lineTo(30, 60); g.lineTo(0, 30); g.closePath(); g.fillPath(); g.lineStyle(3, 0xffffff); g.strokePath(); g.generateTexture('boss_mandirigma', 60, 60); g.clear();
                g.fillStyle(0x555555); g.fillRect(0,0, 50, 50); g.lineStyle(4, 0xff0000); g.strokeRect(0,0,50,50); g.generateTexture('boss_ghost', 50, 50); g.clear();
                g.fillStyle(0x00ffff); g.beginPath(); g.moveTo(30,0); g.lineTo(60,20); g.lineTo(45,60); g.lineTo(15,60); g.lineTo(0,20); g.closePath(); g.fillPath(); g.lineStyle(3, 0xffffff); g.strokePath(); g.generateTexture('boss_architect', 60, 60); g.clear();
                
                // PULSE DEMON BOSS
                g.fillStyle(0xff0000); g.beginPath(); g.moveTo(40,0); g.lineTo(80,40); g.lineTo(40,80); g.lineTo(0,40); g.closePath(); g.fillPath(); g.lineStyle(4, 0xffffff); g.strokePath(); g.generateTexture('boss_demon', 80, 80); g.clear();

                // Projectiles & Items
                g.fillStyle(0xffd700); g.fillCircle(6,6,6); g.generateTexture('boss_bullet', 12, 12); g.clear();
                g.fillStyle(0x00ffff); g.beginPath(); g.moveTo(6,0); g.lineTo(12,12); g.lineTo(0,12); g.closePath(); g.fillPath(); g.generateTexture('boss_rocket', 12, 12); g.clear();
                g.fillStyle(0xffff00); g.fillCircle(6, 6, 6); g.generateTexture('xp', 12, 12); g.clear(); 
                g.fillStyle(0xff00b3); g.fillCircle(6, 6, 6); g.fillCircle(14, 6, 6); g.beginPath(); g.moveTo(0,6); g.lineTo(20,6); g.lineTo(10,20); g.closePath(); g.fillPath(); g.generateTexture('heart', 20, 20); g.clear();
                g.fillStyle(0x00ff00); g.fillRect(0,0, 20, 20); g.fillStyle(0xffffff); g.fillRect(8,2,4,16); g.fillRect(2,8,16,4); g.generateTexture('medkit', 20, 20); g.clear();
                
                // Flags
                g.fillStyle(0x002D62); g.fillRect(0,0, 40,25); g.fillStyle(0xCE1126); g.fillRect(50,0, 40,25);
                g.fillStyle(0xCE1126); g.fillRect(0,35, 40,25); g.fillStyle(0x002D62); g.fillRect(50,35, 40,25);
                g.fillStyle(0xffffff); g.fillRect(40,0, 10,60); g.fillRect(0,25, 90,10);
                g.fillStyle(0xd4af37); g.fillRect(42,27, 6,6); g.generateTexture('dr_flag', 90, 60); g.clear();
                
                // CHILE Flag
                g.fillStyle(0xffffff); g.fillRect(0,0, 90, 30); g.fillStyle(0xDA291C); g.fillRect(0,30, 90, 30);
                g.fillStyle(0x0033A0); g.fillRect(0,0, 30, 30); 
                g.fillStyle(0xffffff); g.beginPath(); g.moveTo(15, 5); g.lineTo(18, 12); g.lineTo(25, 12); g.lineTo(20, 17); g.lineTo(22, 24); g.lineTo(15, 20); g.lineTo(8, 24); g.lineTo(10, 17); g.lineTo(5, 12); g.lineTo(12, 12); g.closePath(); g.fillPath(); g.generateTexture('chile_flag', 90, 60); g.clear();
                
                g.fillStyle(0x888888); g.fillRect(0,0, 4, 4); g.generateTexture('particle', 4, 4); g.clear();
                g.fillStyle(0xffffff); g.fillCircle(4,4,4); g.generateTexture('missile_base', 8, 8); g.clear();
                
                g.fillStyle(0x00ffff, 0.4); g.fillCircle(12,12,10); g.lineStyle(3, 0xffffff); g.strokeCircle(12,12,10); g.generateTexture('shield_orb_base', 24, 24); g.clear();
                g.lineStyle(4, 0xffffff, 0.5); g.fillStyle(0xffffff, 0.2); g.fillCircle(40,40,36); g.strokeCircle(40,40,36); g.generateTexture('energy_shield_base', 80, 80); 
                g.destroy();
            }
            create() { 
                this.add.text(400, 300, 'PRESS ACTION 1 TO INITIALIZE', { fontFamily: 'Courier', fontSize: '24px', color: '#00ff00' }).setOrigin(0.5);
                
                // Setup key listener using ARCADE_CONTROLS mapping
                let startKeys = ARCADE_CONTROLS.START1.join(',');
                this.input.keyboard.once('keydown', (event) => { 
                    if(ARCADE_CONTROLS.START1.includes(event.key) || ARCADE_CONTROLS.START1.includes(event.code)) {
                        AudioEngine.init(); this.scene.start('Menu'); 
                    } else {
                        // Fallback in case they press anything else
                        AudioEngine.init(); this.scene.start('Menu'); 
                    }
                });
            }
        },

        class MenuScene extends Phaser.Scene {
            constructor() { super('Menu'); }
            create() {
                let thm = THEMES[SETS.tIdx];
                this.cameras.main.setBackgroundColor(thm.bg);
                this.grid = this.add.tileSprite(400, 300, 800, 600, 'particle').setTint(thm.grid).setAlpha(thm.gridAlpha);
                
                this.title = this.add.text(400, 80, 'KERNEL SURVIVOR', { fontFamily: 'Courier', fontSize: '64px', color: thm.title, fontStyle: 'bold' }).setOrigin(0.5);
                
                this.state = 'MAIN'; 
                this.mOpts = ['SINGLE THREAD (1P)', 'MULTITHREADING (2P)', 'SETTINGS', 'LEADERBOARD', 'HOW TO PLAY', 'CREDITS'];
                this.sOpts = ['DIFFICULTY', 'THEME', 'P1 COLOR', 'P1 SHAPE', 'P2 COLOR', 'P2 SHAPE', 'MUSIC', 'BACK'];
                this.modeOpts = ['ARCADE (LEVELS & BOSSES)', 'SURVIVAL (ENDLESS HOSTILES)', 'PULSE DEMON (BOSS RUSH)', 'BACK'];
                
                this.menuTexts = [];
                for(let i=0; i<8; i++) { this.menuTexts.push(this.add.text(400, 170 + (i * 45), '', { fontFamily: 'Courier', fontSize: '24px', color: thm.mUnsel }).setOrigin(0.5)); }
                this.cursor = this.add.text(200, 250, '>', { fontFamily: 'Courier', fontSize: '24px', color: thm.mSel }).setOrigin(0.5);
                this.descText = this.add.text(400, 550, '', { fontFamily: 'Courier', fontSize: '18px', color: '#888888', fontStyle: 'italic' }).setOrigin(0.5);
                
                // Maps inputs to standard keys
                this.keys = this.input.keyboard.addKeys('W,S,UP,DOWN,A,D,LEFT,RIGHT,U,SPACE,ENTER');
                this.idx = 0;
                this.selectedPlayers = 1;
                
                this.infoContainer = this.add.container(400, 300).setVisible(false).setDepth(10);
                this.infoBg = this.add.rectangle(0, 0, 700, 500, 0x000000, 0.95).setStrokeStyle(4, thm.grid);
                this.infoText = this.add.text(0, -30, '', { fontFamily: 'Courier', fontSize: '20px', color: '#fff', align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5);
                this.infoFlag = this.add.image(0, 150, 'dr_flag').setVisible(false);
                this.infoContainer.add([this.infoBg, this.infoText, this.infoFlag]);
                this.inInfo = false;

                this.kCode = []; this.kTarget = ['UP', 'DOWN', 'RIGHT', 'LEFT', 'RIGHT'];

                if(this.musicTimer) this.musicTimer.remove();
                this.beat = 0;
                this.musicTimer = this.time.addEvent({ delay: 150, callback: this.playBeat, callbackScope: this, loop: true });
                this.renderMenu();

                if(this.attractTimer) this.attractTimer.remove();
                this.attractTimer = this.time.delayedCall(20000, () => {
                    this.musicTimer.remove();
                    this.scene.start('Play', { p: 1, attract: true, mode: 'ARCADE' });
                });
            }

            playBeat() {
                if(SETS.mIdx === 7) return;
                let t1 = [220, 329.63, 440, 554.37, 659.25, 554.37, 440, 329.63];
                let t2 = [146.83, 0, 146.83, 164.81, 130.81, 0, 130.81, 110];
                let t3 = [110, 220, 110, 329.63, 110, 440, 110, 220]; 
                let t4 = [293.66, 293.66, 587.33, 0, 440, 0, 415.30, 0, 392.00, 0, 349.23, 0, 293.66, 349.23, 392.00, 0, 261.63, 261.63, 587.33, 0, 440, 0, 415.30, 0, 392.00, 0, 349.23, 0, 293.66, 349.23, 392.00, 0];
                let t5 = [349.23, 0, 293.66, 0, 349.23, 293.66, 261.63, 0, 261.63, 0, 220.00, 0, 261.63, 220.00, 196.00, 0, 196.00, 0, 261.63, 0, 349.23, 0, 440.00, 0, 392.00, 0, 349.23, 0, 329.63, 0, 293.66, 0];
                let t6 = [329.63, 0, 0, 392.00, 0, 0, 440.00, 0, 0, 523.25, 0, 0, 493.88, 0, 0, 392.00, 0, 0, 329.63, 0, 0, 261.63, 0, 0, 293.66, 0, 0, 349.23, 0, 0, 329.63, 0, 0, 261.63, 0, 0];
                let t7 = [82.41, 82.41, 164.81, 82.41, 82.41, 146.83, 82.41, 82.41, 130.81, 82.41, 82.41, 123.47, 82.41, 82.41, 116.54, 0];
                let tracks = [t1, t2, t3, t4, t5, t6, t7];
                
                if(SETS.mIdx === 3 || SETS.mIdx === 6) this.musicTimer.delay = 110; 
                else if(SETS.mIdx === 4 || SETS.mIdx === 5) this.musicTimer.delay = 220; 
                else this.musicTimer.delay = 150; 
                
                let wForm = (SETS.mIdx === 6) ? 'square' : 'sawtooth';
                AudioEngine.playTone(tracks[SETS.mIdx][this.beat % tracks[SETS.mIdx].length], wForm, 0.04, 0.1);
                this.beat++;
            }

            applyTheme() {
                let thm = THEMES[SETS.tIdx];
                this.cameras.main.setBackgroundColor(thm.bg);
                this.grid.setTint(thm.grid); this.grid.setAlpha(thm.gridAlpha);
                this.title.setColor(thm.title); this.infoBg.setStrokeStyle(4, thm.grid);
            }

            renderMenu() {
                let thm = THEMES[SETS.tIdx];
                this.cursor.setColor(thm.mSel);
                this.descText.setText(''); 
                
                let opts = this.state === 'MAIN' ? this.mOpts : (this.state === 'MODE' ? this.modeOpts : this.sOpts);
                
                this.menuTexts.forEach((t, i) => {
                    if(i >= opts.length) { t.setVisible(false); return; }
                    t.setVisible(true);
                    let txt = opts[i];
                    if(this.state === 'SETTINGS') {
                        if(i===0) txt += `: < ${SETS.diffNames[SETS.dIdx]} >`;
                        if(i===1) txt += `: < ${SETS.tNames[SETS.tIdx]} >`;
                        if(i===2) txt += `: < ${SETS.cNames[SETS.p1C]} >`;
                        if(i===3) { txt += `: < ${SETS.sNames[SETS.p1S]} >`; if(this.idx===3) this.descText.setText(SETS.sDesc[SETS.p1S]); }
                        if(i===4) txt += `: < ${SETS.cNames[SETS.p2C]} >`;
                        if(i===5) { txt += `: < ${SETS.sNames[SETS.p2S]} >`; if(this.idx===5) this.descText.setText(SETS.sDesc[SETS.p2S]); }
                        if(i===6) txt += `: < ${SETS.mNames[SETS.mIdx]} >`;
                    }
                    if(this.state === 'MODE' && i===2) txt = `[ ${txt} ]`; // Highlight Demon mode
                    t.setText(txt);
                    t.setColor(i === this.idx ? thm.mSel : thm.mUnsel);
                    
                    if(this.state === 'MODE' && i===2) t.setColor(i === this.idx ? '#ff0000' : '#880000'); // Red for Demon Mode

                    if(i === this.idx) {
                        t.setFontStyle('bold');
                        if(this.state === 'SETTINGS' && i===2) t.setColor('#'+SETS.cValues[SETS.p1C].toString(16).padStart(6,'0'));
                        if(this.state === 'SETTINGS' && i===4) t.setColor('#'+SETS.cValues[SETS.p2C].toString(16).padStart(6,'0'));
                    } else t.setFontStyle('normal');
                });
                this.cursor.y = 170 + (this.idx * 45);
                this.cursor.x = this.menuTexts[this.idx].x - this.menuTexts[this.idx].width/2 - 30;
            }

            checkKonami(key) {
                this.kCode.push(key);
                if(this.kCode.length > 5) this.kCode.shift();
                if(this.kCode.join(',') === this.kTarget.join(',')) {
                    this.showInfo("GRACIAS CHILE\n\nPor recibir a la ICPC Latam 2026 y a\ntodos los programadores de la region.\n\n¡Un saludo desde Republica Dominicana!\n- Equipo PULSE DEMON", 'chile_flag');
                    this.kCode = [];
                }
            }

            update() {
                if(this.inInfo) {
                    if(Phaser.Input.Keyboard.JustDown(this.keys.U) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
                        this.inInfo = false; this.infoContainer.setVisible(false); this.infoFlag.setVisible(false);
                        this.attractTimer.reset({delay: 20000, callback:()=>{this.musicTimer.remove(); this.scene.start('Play', {p:1, attract:true, mode:'ARCADE'});}});
                    } return;
                }

                let up = Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.UP);
                let down = Phaser.Input.Keyboard.JustDown(this.keys.S) || Phaser.Input.Keyboard.JustDown(this.keys.DOWN);
                let left = Phaser.Input.Keyboard.JustDown(this.keys.A) || Phaser.Input.Keyboard.JustDown(this.keys.LEFT);
                let right = Phaser.Input.Keyboard.JustDown(this.keys.D) || Phaser.Input.Keyboard.JustDown(this.keys.RIGHT);
                let action = Phaser.Input.Keyboard.JustDown(this.keys.U) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER);

                if(up || down || left || right || action) {
                    this.attractTimer.reset({delay: 20000, callback:()=>{this.musicTimer.remove(); this.scene.start('Play', {p:1, attract:true, mode:'ARCADE'});}});
                }

                if(up) this.checkKonami('UP');
                if(down) this.checkKonami('DOWN');
                if(left) this.checkKonami('LEFT');
                if(right) this.checkKonami('RIGHT');

                let maxIdx = (this.state === 'MAIN' ? this.mOpts.length : (this.state === 'MODE' ? this.modeOpts.length : this.sOpts.length)) - 1;

                if (up) { this.idx = (this.idx - 1 + maxIdx + 1) % (maxIdx + 1); AudioEngine.playTone(600, 'square', 0.05, 0.05); this.renderMenu(); }
                if (down) { this.idx = (this.idx + 1) % (maxIdx + 1); AudioEngine.playTone(600, 'square', 0.05, 0.05); this.renderMenu(); }

                if (this.state === 'SETTINGS') {
                    if (this.idx === 0 && (left || right)) { SETS.dIdx = (SETS.dIdx + (left?-1:1) + 4) % 4; this.renderMenu(); }
                    if (this.idx === 1 && (left || right)) { SETS.tIdx = (SETS.tIdx + (left?-1:1) + 4) % 4; this.applyTheme(); this.renderMenu(); } 
                    if (this.idx === 2 && (left || right)) { SETS.p1C = (SETS.p1C + (left?-1:1) + 7) % 7; this.renderMenu(); }
                    if (this.idx === 3 && (left || right)) { SETS.p1S = (SETS.p1S + (left?-1:1) + 4) % 4; this.renderMenu(); }
                    if (this.idx === 4 && (left || right)) { SETS.p2C = (SETS.p2C + (left?-1:1) + 7) % 7; this.renderMenu(); }
                    if (this.idx === 5 && (left || right)) { SETS.p2S = (SETS.p2S + (left?-1:1) + 4) % 4; this.renderMenu(); }
                    if (this.idx === 6 && (left || right)) { SETS.mIdx = (SETS.mIdx + (left?-1:1) + 8) % 8; this.renderMenu(); }
                    if (action && this.idx === 7) { this.state = 'MAIN'; this.idx = 2; this.renderMenu(); AudioEngine.playTone(400, 'square', 0.05, 0.1); }
                } else if (this.state === 'MODE') {
                    if(action) {
                        AudioEngine.playTone(800, 'square', 0.05, 0.1);
                        if(this.idx === 0) { this.musicTimer.remove(); this.scene.start('Play', { p: this.selectedPlayers, mode: 'ARCADE' }); }
                        if(this.idx === 1) { this.musicTimer.remove(); this.scene.start('Play', { p: this.selectedPlayers, mode: 'SURVIVAL' }); }
                        if(this.idx === 2) { this.musicTimer.remove(); this.scene.start('Play', { p: this.selectedPlayers, mode: 'DEMON' }); }
                        if(this.idx === 3) { this.state = 'MAIN'; this.idx = this.selectedPlayers - 1; this.renderMenu(); }
                    }
                } else if (action) {
                    AudioEngine.playTone(800, 'square', 0.05, 0.1);
                    if (this.idx === 0) { this.selectedPlayers = 1; this.state = 'MODE'; this.idx = 0; this.renderMenu(); }
                    if (this.idx === 1) { this.selectedPlayers = 2; this.state = 'MODE'; this.idx = 0; this.renderMenu(); }
                    if (this.idx === 2) { this.state = 'SETTINGS'; this.idx = 0; this.renderMenu(); }
                    if (this.idx === 3) { this.musicTimer.remove(); this.scene.start('Leaderboard'); }
                    if (this.idx === 4) this.showInfo("HOW TO PLAY\n\n- Move JOYSTICK to aim & avoid bugs.\n- Auto-attacks fire periodically.\n- Manual fire (ACTION 1) homes if close.\n- Collect Yellow Bits to Upgrade.\n- Full Energy? Use Ultimate (ACTION 2).\n\nDON'T CAMP! Standing still triggers Nukes.");
                    if (this.idx === 5) this.showInfo("CREDITS\n\nDeveloper: Andrew Batista Garcia\n(aka: ender)\n\nTeam: PULSE DEMON\nEvent: ICPC Latam 2026\n\nMade in DR", 'dr_flag');
                }
            }
            showInfo(text, flag = null) { 
                this.infoText.setText(text); this.infoContainer.setVisible(true); this.inInfo = true; 
                if(flag) { this.infoFlag.setTexture(flag); this.infoFlag.setVisible(true); } else this.infoFlag.setVisible(false);
            }
        },

        class PlayScene extends Phaser.Scene {
            constructor() { super('Play'); }
            init(data) { 
                this.numP = data.p || 1; 
                this.isAttract = data.attract || false; 
                this.mode = data.mode || 'ARCADE'; // ARCADE, SURVIVAL, DEMON
            }
            
            create() {
                this.thm = THEMES[SETS.tIdx];
                this.cameras.main.setBackgroundColor(this.thm.bg);
                this.grid = this.add.tileSprite(400, 300, 800, 600, 'particle').setTint(this.thm.grid).setAlpha(this.thm.gridAlpha);
                
                this.xp = 0; this.xpNeeded = 30; 
                this.level = 1; 
                this.score = 0;
                this.gameOver = false; this.timeElapsed = 0; 
                this.boss = null; this.lastBossLevel = 0;
                this.demonPhase2 = false;

                this.comboMult = 1.0; this.comboHits = 0; this.comboTimer = 0;

                this.multH = this.numP === 2 ? 1.5 : 1.0; 
                this.multS = this.numP === 2 ? 0.6 : 1.0; 
                this.spawnRate = (1200 / SETS.diffMults[SETS.dIdx]) * this.multS;
                if(this.mode === 'SURVIVAL') this.spawnRate = 300 * this.multS; 
                if(this.mode === 'DEMON') this.spawnRate = 999999; // NO NORMAL ENEMIES IN DEMON MODE

                this.enemies = this.physics.add.group();
                this.xps = this.physics.add.group();
                this.hearts = this.physics.add.group();
                this.medkits = this.physics.add.group();
                this.players = this.physics.add.group();
                this.pulses = this.physics.add.group();
                this.missiles = this.physics.add.group();
                this.bossBullets = this.physics.add.group(); 

                this.keys = this.input.keyboard.addKeys({
                    p1Up: 'W', p1Down: 'S', p1Left: 'A', p1Right: 'D', p1A1: 'U', p1A2: 'I', p1A1Alt: 'SPACE',
                    p2Up: 'UP', p2Down: 'DOWN', p2Left: 'LEFT', p2Right: 'RIGHT', p2A1: 'R', p2A2: 'T', p2A1Alt: 'ENTER'
                });

                this.p1 = this.createPlayer(this.numP === 1 ? 400 : 350, 300, 1, SETS.cValues[SETS.p1C], SETS.sNames[SETS.p1S]);
                if (this.numP === 2) this.p2 = this.createPlayer(450, 300, 2, SETS.cValues[SETS.p2C], SETS.sNames[SETS.p2S]);

                this.xpBarBg = this.add.rectangle(400, 10, 780, 14, 0x333333).setDepth(100);
                this.xpBar = this.add.rectangle(20, 10, 0, 14, 0xffff00).setOrigin(0, 0.5).setDepth(101);
                
                let modeText = this.mode === 'SURVIVAL' ? 'SURVIVAL TIME: 0s' : (this.mode === 'DEMON' ? 'BOSS RUSH' : 'LVL: 1');
                this.levelText = this.add.text(20, 25, modeText, { fontFamily: 'Courier', fontSize: '18px', color: this.thm.txt }).setDepth(100);
                
                let sText = this.mode === 'SURVIVAL' ? 'KILLS: 0' : (this.mode === 'DEMON' ? 'TIME: 0s' : 'SCORE: 0');
                this.scoreText = this.add.text(780, 25, sText, { fontFamily: 'Courier', fontSize: '18px', color: this.thm.txt }).setOrigin(1, 0).setDepth(100);
                
                this.comboText = this.add.text(780, 45, 'COMBO x1.0', { fontFamily: 'Courier', fontSize: '20px', color: '#ffaa00', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(100);
                if(this.mode === 'DEMON') this.comboText.setVisible(false);

                this.reviveText = this.add.text(400, 50, '', { fontFamily: 'Courier', fontSize: '18px', color: '#ff00b3' }).setOrigin(0.5).setDepth(100);
                this.bossWarning = this.add.text(400, 80, '', { fontFamily: 'Courier', fontSize: '24px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(100);
                
                if(this.isAttract) {
                    this.add.text(400, 150, 'DEMO MODE - PRESS ANY BUTTON', { fontFamily: 'Courier', fontSize: '32px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(200);
                    this.p1.wpnType = 'rapid'; this.p1.manualMaxCD = 250;
                }

                this.bossHpText = this.add.text(0, 0, '', { fontFamily: 'Courier', fontSize: '16px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false).setDepth(150);

                this.trails = this.add.graphics().setDepth(-1);
                this.explodeEmitter = this.add.particles(0, 0, 'particle', { speed: {min:50, max:200}, lifespan: 400, scale: {start:1, end:0}, emitting: false, quantity: 8 });

                this.players.getChildren().forEach(p => {
                    p.body.collideWorldBounds = true;
                    p.body.onWorldBounds = true;
                    p.body.setBounce(0.2); 
                    
                    if(this.mode === 'DEMON') {
                        // Max out player for Demon mode
                        p.pulseRadius = 120; p.pulseCD = 800; p.pulseDmg = 30;
                        p.wpnType = 'rapid'; p.manualMaxCD = 150; p.manualDmg = 25;
                        p.ultType = 'bomb'; p.hasShield = true;
                        for(let i=0; i<4; i++) {
                            let s = this.physics.add.image(p.x, p.y, 'shield_orb_base').setTint(p.color);
                            s.body.setCircle(12); s.dmg = 20; this.pulses.add(s); p.shields.push(s);
                            s.offsetAngle = (Math.PI * 2 / 4) * i;
                        }
                    }
                });

                this.physics.add.overlap(this.pulses, this.enemies, this.damageEnemy, null, this);
                this.physics.add.overlap(this.missiles, this.enemies, this.damageEnemy, null, this);
                this.physics.add.overlap(this.players, this.enemies, this.hitPlayer, null, this);
                this.physics.add.overlap(this.players, this.bossBullets, this.hitPlayer, null, this);
                this.physics.add.overlap(this.players, this.xps, this.collectXp, null, this);
                this.physics.add.overlap(this.players, this.hearts, this.collectHeart, null, this);
                this.physics.add.overlap(this.players, this.medkits, this.collectMedkit, null, this);

                this.spawnTimer = this.time.addEvent({ delay: 1000, callback: this.spawnEnemy, callbackScope: this, loop: true });
                this.medTimer = this.time.addEvent({ delay: this.numP === 2 ? 12000 : 20000, callback: this.spawnMedkit, callbackScope: this, loop: true });
                
                if(this.musicTimer) this.musicTimer.remove();
                this.beat = 0;
                
                if(this.mode === 'SURVIVAL' && !this.isAttract) SETS.mIdx = 6; 
                if(this.mode === 'DEMON') SETS.mIdx = 3; // Megalovania
                
                this.musicTimer = this.time.addEvent({ delay: 150, callback: this.playBeat, callbackScope: this, loop: true });

                if(this.mode === 'DEMON') {
                    this.time.delayedCall(2000, () => this.spawnBoss(3)); // Spawns PULSE DEMON
                }
            }

            playBeat() {
                if(SETS.mIdx === 7 || this.gameOver || this.isAttract) return;
                let t1 = [220, 329.63, 440, 554.37, 659.25, 554.37, 440, 329.63];
                let t2 = [146.83, 0, 146.83, 164.81, 130.81, 0, 130.81, 110];
                let t3 = [110, 220, 110, 329.63, 110, 440, 110, 220]; 
                let t4 = [293.66, 293.66, 587.33, 0, 440, 0, 415.30, 0, 392.00, 0, 349.23, 0, 293.66, 349.23, 392.00, 0];
                let t5 = [349.23, 0, 293.66, 0, 349.23, 293.66, 261.63, 0, 261.63, 0, 220.00, 0, 261.63, 220.00, 196.00, 0];
                let t6 = [329.63, 0, 0, 392.00, 0, 0, 440.00, 0, 0, 523.25, 0, 0, 493.88, 0, 0, 392.00, 0, 0];
                let t7 = [82.41, 82.41, 164.81, 82.41, 82.41, 146.83, 82.41, 82.41, 130.81, 82.41, 82.41, 123.47, 82.41, 82.41, 116.54, 0];
                let tracks = [t1, t2, t3, t4, t5, t6, t7];
                
                if (SETS.mIdx === 3 || SETS.mIdx === 6) this.musicTimer.delay = this.bossActive ? (this.demonPhase2 ? 70 : 90) : 110;
                else if (SETS.mIdx === 4 || SETS.mIdx === 5) this.musicTimer.delay = this.bossActive ? 180 : 220;
                else this.musicTimer.delay = this.bossActive ? 100 : 150;
                
                let wForm = (SETS.mIdx === 6) ? 'square' : 'sawtooth';
                AudioEngine.playTone(tracks[SETS.mIdx][this.beat % tracks[SETS.mIdx].length], wForm, 0.04, 0.1);
                this.beat++;
            }

            createPlayer(x, y, id, color, shape) {
                let tex = 'p_circle'; let hpMult = 1.0; let spdMult = 1.0; let dmgMult = 1.0;
                if(shape === 'SQUARE') { tex = 'p_square'; hpMult = 1.5; spdMult = 0.8; } 
                if(shape === 'TRIANGLE') { tex = 'p_triangle'; hpMult = 0.7; spdMult = 1.4; dmgMult = 1.2; } 
                if(shape === 'SOUL') { tex = 'p_soul'; hpMult = 0.5; spdMult = 1.1; } 

                let p = this.players.create(x, y, tex);
                p.setTint(color); p.color = color;
                p.pid = id; p.isDead = false; p.collectedHearts = 0;
                p.setMaxVelocity(200 * spdMult);
                p.setDrag(1500); 
                
                p.body.setCircle(shape === 'SOUL' ? 5 : 10); 
                if(shape === 'SOUL') p.body.setOffset(7, 7);

                p.hp = 100 * hpMult; p.maxHp = 100 * hpMult;
                
                p.pulseTimer = 0; p.pulseCD = 2500; p.pulseRadius = 50; p.pulseDmg = 5 * dmgMult;
                p.wpnType = 'default'; p.manualCD = 0; p.manualMaxCD = 600; p.manualDmg = 15 * dmgMult;
                p.ultType = 'shield'; p.energy = 0; p.maxEnergy = 100; p.invulnTimer = 0;
                
                p.hasShield = false; p.shields = []; p.shieldAngle = 0;
                p.bigShield = this.physics.add.image(0, 0, 'energy_shield_base').setVisible(false).setTint(color);
                p.bigShield.body.setCircle(36, 4, 4); this.pulses.add(p.bigShield);
                
                p.idleTime = 0; 
                p.hpBar = this.add.graphics(); p.energyBar = this.add.graphics();
                return p;
            }

            spawnFloatText(x, y, txt, color) {
                let t = this.add.text(x, y, txt, { fontFamily: 'Courier', fontSize: '20px', color: color, fontStyle: 'bold' }).setOrigin(0.5);
                this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1000, onComplete: ()=>t.destroy() });
            }

            update(time, delta) {
                if(this.isAttract && Object.values(this.keys).some(k => k && k.isDown)) {
                    this.musicTimer.remove(); this.scene.start('Menu'); return;
                }

                if (this.gameOver) return;
                this.timeElapsed += delta;

                if(this.mode === 'SURVIVAL' || this.mode === 'DEMON') {
                    this.levelText.setText((this.mode==='DEMON'?'TIME: ':'SURVIVAL TIME: ') + Math.floor(this.timeElapsed/1000) + 's');
                }

                if(this.comboTimer > 0) {
                    this.comboTimer -= delta;
                    if(this.comboTimer <= 0) { this.comboHits = 0; this.comboMult = 1.0; this.comboText.setText('COMBO x1.0').setColor('#555555'); }
                }

                let activeCount = (this.p1&&!this.p1.isDead?1:0) + (this.p2&&!this.p2.isDead?1:0);
                let curMultS = (this.numP === 2 && activeCount === 2) ? 0.6 : (this.numP === 2 ? 0.85 : 1.0);
                let curSpawnRate = Math.max(150, ((1200 - (this.level * 30)) / SETS.diffMults[SETS.dIdx]) * curMultS);
                if(this.mode !== 'DEMON') this.spawnTimer.delay = this.boss ? curSpawnRate * 3 : curSpawnRate;

                // XP Magnetism
                this.players.getChildren().forEach(p => {
                    if(p.isDead) return;
                    this.xps.getChildren().forEach(xp => {
                        if(Phaser.Math.Distance.Between(p.x, p.y, xp.x, xp.y) < 50) {
                            this.physics.moveToObject(xp, p, 200);
                        }
                    });
                    this.medkits.getChildren().forEach(mk => {
                        if(Phaser.Math.Distance.Between(p.x, p.y, mk.x, mk.y) < 50) {
                            this.physics.moveToObject(mk, p, 200);
                        }
                    });
                });

                this.trails.clear();
                this.missiles.getChildren().forEach(m => {
                    if(!m.active) return;
                    if(!m.trail) m.trail = [];
                    m.trail.push({x: m.x, y: m.y});
                    if(m.trail.length > 5) m.trail.shift();
                    this.trails.lineStyle(2, m.tintTopLeft, 0.5);
                    this.trails.beginPath();
                    m.trail.forEach((pt, i) => { if(i===0) this.trails.moveTo(pt.x, pt.y); else this.trails.lineTo(pt.x, pt.y); });
                    this.trails.strokePath();
                });

                if(this.boss && this.boss.active) {
                    this.bossHpText.setVisible(true).setPosition(this.boss.x, this.boss.y - 45).setText('HP:' + Math.floor(this.boss.hp));
                    this.boss.atkTimer -= delta;
                    
                    if(this.boss.x < 30) this.boss.setVelocityX(Math.abs(this.boss.body.velocity.x));
                    if(this.boss.x > 770) this.boss.setVelocityX(-Math.abs(this.boss.body.velocity.x));
                    if(this.boss.y < 30) this.boss.setVelocityY(Math.abs(this.boss.body.velocity.y));
                    if(this.boss.y > 570) this.boss.setVelocityY(-Math.abs(this.boss.body.velocity.y));

                    let target = this.getClosest(this.boss.x, this.boss.y, this.players);

                    if(this.boss.texture.key === 'boss_mandirigma') {
                        if(target) {
                            this.physics.moveToObject(this.boss, target, this.boss.speed);
                            this.boss.rotation = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, target.x, target.y) + Math.PI/2;
                            
                            if(this.boss.atkTimer <= 0) {
                                this.boss.atkTimer = 1500;
                                AudioEngine.sfx('enemy_shoot');
                                let b = this.bossBullets.create(this.boss.x, this.boss.y, 'boss_bullet');
                                b.dmg = 15; 
                                this.physics.moveToObject(b, target, 450);
                                this.time.delayedCall(3000, () => { if(b.active) b.destroy(); });
                            }
                        }
                    } else if(this.boss.texture.key === 'boss_ghost') {
                        if(this.boss.atkTimer <= 0) {
                            this.boss.atkTimer = 3000;
                            AudioEngine.sfx('warn');
                            let pulse = this.physics.add.existing(this.add.zone(this.boss.x, this.boss.y, 200, 200));
                            pulse.body.setCircle(100); pulse.dmg = 30; 
                            this.bossBullets.add(pulse);
                            let c = this.add.graphics(); c.lineStyle(4, 0xff0000, 0.8); c.strokeCircle(this.boss.x, this.boss.y, 100);
                            this.tweens.add({ targets: c, alpha: 0, scale: 1.2, duration: 400, onComplete: () => { c.destroy(); pulse.destroy(); }});
                            
                            for(let i=0; i<3; i++) {
                                let bug = this.enemies.create(this.boss.x, this.boss.y, 'bug');
                                bug.hp = 15 * SETS.diffMults[SETS.dIdx]; 
                                bug.speed = 90 * SETS.spdMults[SETS.dIdx]; 
                                bug.iFrames = 0; bug.body.setCircle(10);
                                bug.setVelocity((Math.random()-0.5)*400, (Math.random()-0.5)*400); 
                            }
                        }
                    } else if(this.boss.texture.key === 'boss_architect') {
                        if(this.boss.atkTimer <= 0) {
                            this.boss.atkTimer = 2200; 
                            if(target) {
                                AudioEngine.sfx('enemy_shoot');
                                let b = this.bossBullets.create(this.boss.x, this.boss.y, 'boss_rocket');
                                b.dmg = 20; 
                                let angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, target.x, target.y);
                                b.rotation = angle; this.physics.velocityFromRotation(angle, 200, b.body.velocity); 
                                this.boss.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100)); 
                                this.time.delayedCall(3000, () => { if(b.active) b.destroy(); });
                            }
                        }
                    } else if(this.boss.texture.key === 'boss_demon') {
                        // PHASE 2 CHECK
                        if(this.boss.hp < (this.boss.maxHp / 2) && !this.demonPhase2) {
                            this.demonPhase2 = true;
                            AudioEngine.sfx('demon');
                            this.cameras.main.flash(1000, 255, 0, 0);
                            this.cameras.main.setBackgroundColor('#330000');
                            this.grid.setTint(0xff0000);
                            this.boss.speed *= 1.5;
                        }

                        if(target) {
                            this.physics.moveToObject(this.boss, target, this.boss.speed);
                            this.boss.rotation += 0.05;

                            if(this.boss.atkTimer <= 0) {
                                this.boss.atkTimer = this.demonPhase2 ? 1000 : 1800; // Faster in phase 2
                                
                                // Attack 1: Rocket
                                AudioEngine.sfx('enemy_shoot');
                                let b = this.bossBullets.create(this.boss.x, this.boss.y, 'boss_rocket');
                                b.setTint(0xff0000); b.dmg = 30; 
                                let angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, target.x, target.y);
                                b.rotation = angle; this.physics.velocityFromRotation(angle, this.demonPhase2?300:200, b.body.velocity); 
                                this.time.delayedCall(3000, () => { if(b.active) b.destroy(); });

                                // Attack 2: Pulse
                                let pulse = this.physics.add.existing(this.add.zone(this.boss.x, this.boss.y, 200, 200));
                                pulse.body.setCircle(100); pulse.dmg = 20; 
                                this.bossBullets.add(pulse);
                                let c = this.add.graphics(); c.lineStyle(4, 0xff0000, 0.8); c.strokeCircle(this.boss.x, this.boss.y, 100);
                                this.tweens.add({ targets: c, alpha: 0, scale: 1.5, duration: 400, onComplete: () => { c.destroy(); pulse.destroy(); }});
                                
                                // Attack 3: Minions (Only in Phase 2)
                                if(this.demonPhase2 && Math.random() > 0.5) {
                                    let bug = this.enemies.create(this.boss.x, this.boss.y, 'kamikaze');
                                    bug.hp = 10; bug.speed = 180; bug.iFrames = 0; bug.body.setCircle(10);
                                    bug.setVelocity((Math.random()-0.5)*400, (Math.random()-0.5)*400); 
                                }
                            }
                        }
                    }
                }

                this.bossBullets.getChildren().forEach(b => {
                    if(b.active && b.texture && b.texture.key === 'boss_rocket') {
                        let target = this.getClosest(b.x, b.y, this.players);
                        if(target) {
                            let tAngle = Phaser.Math.Angle.Between(b.x, b.y, target.x, target.y);
                            b.rotation = Phaser.Math.Angle.RotateTo(b.rotation, tAngle, this.demonPhase2 ? 0.08 : 0.03); 
                            this.physics.velocityFromRotation(b.rotation, this.demonPhase2 ? 300 : 200, b.body.velocity);
                        }
                    }
                });

                this.enemies.getChildren().forEach(e => { 
                    if(e.iFrames > 0) e.iFrames -= delta; 
                    
                    if(e.texture.key === 'leak') {
                        let target = this.getClosest(e.x, e.y, this.players);
                        if(target) {
                            let leadX = target.x + (target.body.velocity.x * 0.5);
                            let leadY = target.y + (target.body.velocity.y * 0.5);
                            this.physics.moveTo(e, leadX, leadY, e.speed);
                            e.rotation = Phaser.Math.Angle.Between(e.x, e.y, leadX, leadY) + Math.PI/2;
                        }
                    }

                    if(e.texture.key === 'kamikaze') {
                        let target = this.getClosest(e.x, e.y, this.players);
                        if(target && Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y) < 100 && !e.primed) {
                            e.primed = true; e.setVelocity(0,0);
                            this.tweens.add({ targets: e, alpha: 0, yoyo: true, repeat: 3, duration: 250, onComplete: () => {
                                if(!e.active) return;
                                AudioEngine.sfx('boom');
                                let pulse = this.physics.add.existing(this.add.zone(e.x, e.y, 160, 160));
                                pulse.body.setCircle(80); pulse.dmg = 40; pulse.isEnemyPulse = true;
                                this.bossBullets.add(pulse);
                                let c = this.add.graphics(); c.lineStyle(4, 0xffff00, 0.8); c.strokeCircle(e.x, e.y, 80);
                                this.tweens.add({ targets: c, alpha: 0, scale: 1.2, duration: 300, onComplete: () => { c.destroy(); pulse.destroy(); }});
                                e.destroy();
                            }});
                        }
                    }
                });

                this.missiles.getChildren().forEach(m => {
                    if(!m.active) return;
                    let target = this.getClosest(m.x, m.y, this.enemies);
                    let detRange = m.wpnType === 'sniper' ? 300 : 200;
                    if(target && Phaser.Math.Distance.Between(m.x, m.y, target.x, target.y) < detRange) {
                        let tAngle = Phaser.Math.Angle.Between(m.x, m.y, target.x, target.y);
                        m.rotation = Phaser.Math.Angle.RotateTo(m.rotation, tAngle, 0.15); 
                    }
                    this.physics.velocityFromRotation(m.rotation, m.speed || 450, m.body.velocity);
                });

                this.players.getChildren().forEach(p => {
                    if (p.isDead) return;
                    
                    let vx = 0, vy = 0;
                    let up = false, down = false, left = false, right = false, a1 = false, a2 = false;

                    // Support multiple keys mapped in ARCADE_CONTROLS
                    if(p.pid === 1) {
                        ARCADE_CONTROLS.P1U.forEach(k => { if(this.input.keyboard.addKey(k).isDown) up = true; });
                        ARCADE_CONTROLS.P1D.forEach(k => { if(this.input.keyboard.addKey(k).isDown) down = true; });
                        ARCADE_CONTROLS.P1L.forEach(k => { if(this.input.keyboard.addKey(k).isDown) left = true; });
                        ARCADE_CONTROLS.P1R.forEach(k => { if(this.input.keyboard.addKey(k).isDown) right = true; });
                        ARCADE_CONTROLS.P1A.forEach(k => { if(this.input.keyboard.addKey(k).isDown) a1 = true; });
                        ARCADE_CONTROLS.P1B.forEach(k => { if(this.input.keyboard.addKey(k).isDown) a2 = true; });
                    } else {
                        ARCADE_CONTROLS.P2U.forEach(k => { if(this.input.keyboard.addKey(k).isDown) up = true; });
                        ARCADE_CONTROLS.P2D.forEach(k => { if(this.input.keyboard.addKey(k).isDown) down = true; });
                        ARCADE_CONTROLS.P2L.forEach(k => { if(this.input.keyboard.addKey(k).isDown) left = true; });
                        ARCADE_CONTROLS.P2R.forEach(k => { if(this.input.keyboard.addKey(k).isDown) right = true; });
                        ARCADE_CONTROLS.P2A.forEach(k => { if(this.input.keyboard.addKey(k).isDown) a1 = true; });
                        ARCADE_CONTROLS.P2B.forEach(k => { if(this.input.keyboard.addKey(k).isDown) a2 = true; });
                    }

                    if(this.isAttract) {
                        let target = this.getClosest(p.x, p.y, this.enemies);
                        if(target) {
                            let a = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
                            if(Phaser.Math.Distance.Between(p.x,p.y,target.x,target.y) > 150) { vx = Math.cos(a); vy = Math.sin(a); } 
                            else { vx = -Math.cos(a); vy = -Math.sin(a); } 
                            a1 = Math.random() > 0.95; 
                            if(p.energy >= p.maxEnergy) a2 = true;
                        }
                    } else {
                        if (left) vx -= 1; if (right) vx += 1;
                        if (up) vy -= 1; if (down) vy += 1;
                    }

                    if (vx || vy) {
                        let len = Math.sqrt(vx*vx + vy*vy);
                        p.setAcceleration((vx/len)*1500, (vy/len)*1500);
                        p.lastDir = {x: vx/len, y: vy/len}; 
                        this.grid.tilePositionX += vx * 2; this.grid.tilePositionY += vy * 2;
                        p.idleTime = 0;
                        if(p.texture.key === 'p_triangle') p.rotation = Phaser.Math.Angle.Between(0,0,vx,vy) + Math.PI/2;
                    } else {
                        p.setAcceleration(0, 0);
                        p.idleTime += delta;
                    }

                    if (p.idleTime > 4000) { p.idleTime = 0; this.spawnOrbitalStrike(p.x, p.y); }

                    p.hpBar.clear(); p.hpBar.fillStyle(0xff0000); p.hpBar.fillRect(p.x - 15, p.y + 15, 30, 4);
                    p.hpBar.fillStyle(0x00ff00); p.hpBar.fillRect(p.x - 15, p.y + 15, 30 * (p.hp/p.maxHp), 4);
                    
                    p.energyBar.clear(); p.energyBar.fillStyle(0x000055); p.energyBar.fillRect(p.x - 15, p.y + 20, 30, 3);
                    let eColor = p.energy >= p.maxEnergy ? (Math.floor(time/100)%2===0?0xffffff:p.color) : p.color;
                    p.energyBar.fillStyle(eColor); p.energyBar.fillRect(p.x - 15, p.y + 20, 30 * (p.energy/p.maxEnergy), 3);

                    p.pulseTimer -= delta;
                    if (p.pulseTimer <= 0) { this.firePulse(p); p.pulseTimer = p.pulseCD; }
                    
                    p.manualCD -= delta;
                    if (a1 && p.manualCD <= 0) { this.fireMissile(p); p.manualCD = p.manualMaxCD; }

                    p.invulnTimer -= delta;
                    if (p.invulnTimer > 0 && p.ultType === 'shield') { p.bigShield.setPosition(p.x, p.y).setVisible(true); p.bigShield.dmg = 50; } 
                    else { p.bigShield.setVisible(false).setPosition(-100, -100); }

                    if (a2 && p.energy >= p.maxEnergy && p.invulnTimer <= 0) {
                        p.energy = 0; 
                        if(p.ultType === 'bomb') {
                            AudioEngine.sfx('boom');
                            this.cameras.main.flash(500, 255, 255, 255);
                            let currentEnemies = [...this.enemies.getChildren()];
                            currentEnemies.forEach(e => { 
                                if(!e.isBoss) { 
                                    this.explodeEmitter.emitParticleAt(e.x, e.y); 
                                    e.destroy(); 
                                    this.score += 100*SETS.scoreMults[SETS.dIdx]; 
                                } else { 
                                    e.hp -= 300; 
                                    this.spawnFloatText(e.x, e.y - 20, "-300", "#ff0000");
                                }
                            });
                        } else {
                            p.invulnTimer = 5000; AudioEngine.sfx('shield');
                            this.cameras.main.flash(200, 0, 255, 255);
                        }
                    }
                    
                    if (p.hasShield) {
                        p.shieldAngle += 0.05;
                        p.shields.forEach((s, i) => {
                            let angle = p.shieldAngle + s.offsetAngle; 
                            s.body.setCircle(12); 
                            s.setPosition(p.x + Math.cos(angle) * 55, p.y + Math.sin(angle) * 55); 
                        });
                    }
                });

                if (this.numP === 2 && activeCount === 1) {
                    let alive = this.p1.isDead ? this.p2 : this.p1;
                    this.reviveText.setText(`REVIVE: ${alive.collectedHearts}/3 HEARTS`);
                } else this.reviveText.setText('');

                this.enemies.getChildren().forEach(e => {
                    if (!e.active || e.isBoss || e.primed || e.texture.key === 'leak') return;
                    let target = this.getClosest(e.x, e.y, this.players);
                    if (target) {
                        this.physics.moveToObject(e, target, e.speed);
                        e.rotation = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y) + Math.PI/2;
                    }
                });
            }

            getClosest(x, y, group) {
                let closest = null, minDist = Infinity;
                group.getChildren().forEach(g => {
                    if (!g.active || g.isDead) return;
                    let dist = Phaser.Math.Distance.Between(x, y, g.x, g.y);
                    if (dist < minDist) { minDist = dist; closest = g; }
                });
                return closest;
            }

            spawnOrbitalStrike(x, y) {
                AudioEngine.sfx('warn');
                let warn = this.add.graphics();
                let r = { val: 0 };
                this.tweens.add({
                    targets: r, val: 90, duration: 1500,
                    onUpdate: () => { warn.clear(); warn.lineStyle(2, 0xff0000); warn.strokeCircle(x, y, r.val); },
                    onComplete: () => {
                        warn.destroy(); AudioEngine.sfx('boom'); this.cameras.main.shake(300, 0.03);
                        let blast = this.add.graphics(); blast.fillStyle(0xff0000, 0.8); blast.fillCircle(x, y, 90);
                        this.players.getChildren().forEach(p => { if (!p.isDead && Phaser.Math.Distance.Between(x, y, p.x, p.y) < 90) { p.hp -= 40; this.checkPlayerDeath(p); } });
                        this.enemies.getChildren().forEach(e => { if (e.active && Phaser.Math.Distance.Between(x, y, e.x, e.y) < 90) { this.explodeEmitter.emitParticleAt(e.x, e.y); e.destroy(); } });
                        this.tweens.add({ targets: blast, alpha: 0, duration: 300, onComplete: ()=>blast.destroy() });
                    }
                });
            }

            firePulse(p) {
                AudioEngine.sfx('shoot');
                let zone = this.physics.add.existing(this.add.zone(p.x, p.y, p.pulseRadius*2, p.pulseRadius*2));
                zone.body.setCircle(p.pulseRadius); zone.dmg = p.pulseDmg; zone.isPulse = true;
                this.pulses.add(zone);
                let c = this.add.graphics(); c.lineStyle(3, p.color, 0.8); c.strokeCircle(p.x, p.y, p.pulseRadius);
                this.tweens.add({ targets: c, alpha: 0, scale: 1.1, duration: 250, onComplete: () => { c.destroy(); zone.destroy(); }});
            }

            fireMissile(p) {
                AudioEngine.sfx('shoot');
                let m = this.missiles.create(p.x, p.y, 'missile_base').setTint(p.color);
                
                m.dmg = p.manualDmg; m.speed = 450; m.wpnType = p.wpnType;
                if(p.wpnType === 'rapid') { m.dmg = p.manualDmg * 0.4; m.speed = 600; m.setScale(0.8); }
                if(p.wpnType === 'sniper') { m.dmg = p.manualDmg * 2.5; m.speed = 800; m.setScale(1.5); }

                let dir = p.lastDir || {x: 1, y: 0};
                m.rotation = Phaser.Math.Angle.Between(0, 0, dir.x, dir.y);
                this.time.delayedCall(p.wpnType === 'sniper'? 2000 : 1000, () => { if(m.active) m.destroy(); });
            }

            spawnMedkit() {
                if(this.medkits.countActive() >= 3) return; 
                let x = Phaser.Math.Between(50, 750), y = Phaser.Math.Between(50, 550);
                this.medkits.create(x, y, 'medkit');
            }

            spawnBoss(cycle) {
                this.bossActive = true;
                AudioEngine.sfx('boss');
                this.cameras.main.flash(500, 255, 0, 0);
                
                let bType = cycle % 3; 
                let tex = 'boss_mandirigma'; let bName = 'MANDIRIGMA';
                
                if(this.mode === 'DEMON') {
                    tex = 'boss_demon'; bName = 'PULSE DEMON';
                } else {
                    if(bType === 1) { tex = 'boss_ghost'; bName = 'GHOST IN THE MACHINE'; }
                    if(bType === 2) { tex = 'boss_architect'; bName = 'THE ARCHITECT'; } 
                }
                
                this.bossWarning.setText('WARNING: ' + bName + ' APPROACHING!');
                this.time.delayedCall(3000, () => this.bossWarning.setText(''));

                let b = this.enemies.create(400, 100, tex);
                
                if(this.mode === 'DEMON') {
                    b.maxHp = 10000;
                    b.hp = 10000;
                    b.speed = 100;
                    b.atkTimer = 1500;
                } else {
                    b.hp = (300 + (this.level * 50)) * SETS.diffMults[SETS.dIdx] * (this.numP === 2 ? 1.5 : 1.0); 
                    b.speed = 60 + (this.level * 1.5) * SETS.spdMults[SETS.dIdx]; 
                    b.atkTimer = 2000;
                }
                
                b.iFrames = 0; b.isBoss = true; 
                b.setCollideWorldBounds(true);
                b.body.setCircle(this.mode==='DEMON'? 40 : 25);
                
                if(bType === 1 && this.mode !== 'DEMON') b.setVelocity(100, 100); 
                
                this.boss = b;
            }

            spawnEnemy() {
                if(this.mode === 'DEMON') return; // NO NORMAL ENEMIES
                
                let expectedBossLevel = Math.floor(this.level / 5) * 5;
                if(this.mode === 'ARCADE' && expectedBossLevel >= 5 && this.lastBossLevel < expectedBossLevel && !this.boss && this.enemies.countActive() < 10) {
                    this.lastBossLevel = expectedBossLevel;
                    this.spawnBoss((expectedBossLevel / 5) - 1);
                    return;
                }

                let x = Phaser.Math.Between(0, 800), y = Phaser.Math.Between(0, 600);
                if (Math.random() > 0.5) x = Math.random() > 0.5 ? -30 : 830; else y = Math.random() > 0.5 ? -30 : 630;
                
                let rand = Math.random();
                let type = 'bug', hp = 15, speed = 80 + (this.level * 1.5);
                if (rand > 0.8 && this.level > 2) { type = 'leak'; hp = 40; speed = 40; } 
                else if (rand > 0.6 && this.level > 4) { type = 'trojan'; hp = 20; speed = 130; } 
                else if (rand > 0.9 && this.level > 6) { type = 'kamikaze'; hp = 10; speed = 160; } 

                let e = this.enemies.create(x, y, type);
                e.hp = (hp + (this.level * 2)) * SETS.diffMults[SETS.dIdx] * (this.numP === 2 ? 1.5 : 1.0); 
                e.speed = speed * SETS.spdMults[SETS.dIdx]; 
                e.iFrames = 0; e.body.setCircle(10);
            }

            addCombo() {
                this.comboHits++;
                this.comboTimer = 3000; 
                if(this.comboHits > 5) this.comboMult = 1.5;
                if(this.comboHits > 15) this.comboMult = 2.0;
                if(this.comboHits > 30) this.comboMult = 3.0;
                
                this.comboText.setText('COMBO x' + this.comboMult.toFixed(1));
                if(this.comboMult >= 3) this.comboText.setColor('#ff0000');
                else if(this.comboMult >= 2) this.comboText.setColor('#ffff00');
                else this.comboText.setColor('#ffaa00');
            }

            damageEnemy(weapon, enemy) {
                if (!enemy.active || enemy.iFrames > 0 || enemy.primed) return; 
                
                enemy.hp -= weapon.dmg;
                enemy.iFrames = 150; 
                
                if (weapon.texture && weapon.texture.key === 'missile_base') weapon.destroy();

                if (enemy.hp <= 0) {
                    AudioEngine.sfx(enemy.isBoss ? 'boom' : 'hit');
                    this.explodeEmitter.emitParticleAt(enemy.x, enemy.y);
                    
                    if (enemy.isBoss) {
                        this.boss = null;
                        this.bossHpText.setVisible(false);
                        this.score += 5000 * SETS.scoreMults[SETS.dIdx];
                        this.cameras.main.shake(500, 0.05);
                        for(let i=0; i<10; i++) this.xps.create(enemy.x + Phaser.Math.Between(-30,30), enemy.y + Phaser.Math.Between(-30,30), 'xp');
                        if(this.numP === 2) for(let i=0; i<3; i++) this.hearts.create(enemy.x + Phaser.Math.Between(-40,40), enemy.y + Phaser.Math.Between(-40,40), 'heart');
                        
                        if(this.mode === 'DEMON') {
                            this.gameOver = true;
                            this.physics.pause();
                            this.musicTimer.remove();
                            this.time.delayedCall(2000, () => {
                                this.scene.start('NameInput', { score: Math.floor(this.timeElapsed/1000), mode: 'D' });
                            });
                            return;
                        }

                        this.level++; this.xp = 0; this.levelText.setText('LVL: ' + this.level);
                    } else {
                        if(enemy.texture.key === 'trojan') {
                            for(let i=0; i<3; i++) {
                                let b = this.enemies.create(enemy.x + Phaser.Math.Between(-10,10), enemy.y + Phaser.Math.Between(-10,10), 'bug');
                                b.hp = 10; b.speed = 120; b.iFrames = 200; b.body.setCircle(10);
                            }
                        }
                        
                        let deadCount = (this.p1 && this.p1.isDead ? 1 : 0) + (this.p2 && this.p2.isDead ? 1 : 0);
                        if (this.numP === 2 && deadCount === 1 && Math.random() < 0.15) this.hearts.create(enemy.x, enemy.y, 'heart');
                        else this.xps.create(enemy.x, enemy.y, 'xp');
                        
                        this.addCombo();
                        this.score += (100 * SETS.scoreMults[SETS.dIdx]) * this.comboMult; 
                    }
                    if(this.mode === 'ARCADE') this.scoreText.setText('SCORE: ' + Math.floor(this.score));
                    else if(this.mode === 'SURVIVAL') this.scoreText.setText('KILLS: ' + Math.floor(this.score / 100)); 
                    enemy.destroy();
                }
            }

            collectXp(player, xp) {
                if(this.isAttract || this.mode === 'DEMON') { xp.destroy(); return; } 
                
                xp.destroy(); AudioEngine.sfx('xp');
                this.xp += 10;
                player.energy = Math.min(player.maxEnergy, player.energy + 5);
                
                this.tweens.add({ targets: this.xpBar, width: (this.xp / this.xpNeeded) * 780, duration: 100 });
                
                if (this.xp >= this.xpNeeded) {
                    this.xp = 0; 
                    this.xpNeeded = Math.floor(this.xpNeeded * 1.3) + 10; 
                    this.level++;
                    this.levelText.setText('LVL: ' + this.level); this.xpBar.width = 0;
                    this.spawnFloatText(player.x, player.y - 20, "LEVEL UP!", "#ffff00");
                    AudioEngine.sfx('lvl');
                    
                    this.pendingUpgrades = [];
                    if(this.p1 && !this.p1.isDead) this.pendingUpgrades.push(1);
                    if(this.p2 && !this.p2.isDead) this.pendingUpgrades.push(2);
                    
                    this.processNextUpgrade();
                }
            }

            collectHeart(player, heart) {
                heart.destroy(); AudioEngine.sfx('xp');
                player.collectedHearts++;
                if (player.collectedHearts >= 3) {
                    player.collectedHearts = 0;
                    let deadP = this.p1.isDead ? this.p1 : this.p2;
                    deadP.isDead = false; deadP.hp = deadP.maxHp / 2;
                    deadP.setPosition(player.x, player.y).setVisible(true);
                    deadP.hpBar.setVisible(true); deadP.energyBar.setVisible(true);
                    this.spawnFloatText(deadP.x, deadP.y - 20, "REVIVED!", "#ff00b3");
                    this.cameras.main.flash(300, 255, 0, 150);
                }
            }

            collectMedkit(player, medkit) {
                medkit.destroy();
                AudioEngine.sfx('heal');
                player.hp = Math.min(player.maxHp, player.hp + 25);
                this.spawnFloatText(player.x, player.y - 20, "+25 HP", "#00ff00");
                this.cameras.main.flash(200, 0, 255, 0);
            }

            processNextUpgrade() {
                if (this.pendingUpgrades.length === 0) {
                    return; 
                }
                let pid = this.pendingUpgrades.shift();
                
                let p = pid === 1 ? this.p1 : this.p2;
                let pool = [];
                if (p.pulseRadius < 120) pool.push({ type: 'radius', text: 'Expand Regex (Area)' });
                if (p.pulseCD > 800) pool.push({ type: 'speed', text: 'Overclock (Auto Spd)' });
                if (p.pulseDmg < 30) pool.push({ type: 'dmg', text: 'Root Access (Auto Dmg)' });
                if (p.shields.length < 4) pool.push({ type: 'shield', text: 'Firewall (Add 1 Orb)' }); 
                
                if (p.wpnType === 'default') {
                    pool.push({ type: 'wpn_rapid', text: 'SMG Mod (Fast Manual)' });
                    pool.push({ type: 'wpn_sniper', text: 'Railgun Mod (Heavy Manual)' });
                } else if (p.manualMaxCD > 150) pool.push({ type: 'manual', text: 'Turbo Mod (Weapon Spd)' });

                if (p.ultType === 'shield') pool.push({ type: 'ult_bomb', text: 'Nuke Ultimate (Screen Wipe)' });
                
                if (pool.length === 0) pool.push({ type: 'score', text: 'Bitcoin Mining (+2000 Pts)' });

                this.scene.pause();
                this.scene.launch('LevelUp', { pid: pid, color: p.color, pool: pool, thm: this.thm });
            }

            applyUpgrade(pid, type) {
                let p = pid === 1 ? this.p1 : this.p2;
                if(type === 'radius') p.pulseRadius = Math.min(120, p.pulseRadius + 10); 
                if(type === 'speed') p.pulseCD = Math.max(800, p.pulseCD - 150); 
                if(type === 'dmg') p.pulseDmg += 5;
                if(type === 'manual') p.manualMaxCD = Math.max(150, p.manualMaxCD - 100);
                if(type === 'wpn_rapid') { p.wpnType = 'rapid'; p.manualMaxCD = 250; }
                if(type === 'wpn_sniper') { p.wpnType = 'sniper'; p.manualMaxCD = 1000; }
                if(type === 'ult_bomb') p.ultType = 'bomb';
                if(type === 'shield') { 
                    p.hasShield = true; 
                    let s = this.physics.add.image(p.x, p.y, 'shield_orb_base').setTint(p.color);
                    s.body.setCircle(12); s.dmg = 10; this.pulses.add(s); p.shields.push(s);
                    p.shields.forEach((sh, idx) => { sh.offsetAngle = (Math.PI * 2 / p.shields.length) * idx; });
                }
                if(type === 'score') { this.score += 2000 * SETS.scoreMults[SETS.dIdx]; this.scoreText.setText('SCORE: ' + Math.floor(this.score)); }
                
                this.time.delayedCall(50, () => { this.processNextUpgrade(); });
            }

            hitPlayer(player, enemy) {
                if (player.invulnTimer > 0) return;
                
                player.hp -= enemy.dmg || 20; 
                this.comboHits = 0; this.comboMult = 1.0; this.comboText.setText('COMBO x1.0').setColor('#555555');
                
                this.cameras.main.shake(150, 0.01);
                this.explodeEmitter.emitParticleAt(player.x, player.y);
                if (enemy && !enemy.isBoss && !enemy.isEnemyPulse) enemy.destroy();
                this.checkPlayerDeath(player);
            }

            checkPlayerDeath(player) {
                if (player.hp <= 0 && !player.isDead) {
                    player.isDead = true; 
                    player.hpBar.setVisible(false); 
                    player.energyBar.setVisible(false);
                    
                    AudioEngine.sfx('boom');
                    let pBlast = this.add.graphics();
                    pBlast.fillStyle(player.color, 0.8);
                    pBlast.fillCircle(player.x, player.y, 40);
                    this.tweens.add({ targets: pBlast, alpha: 0, scale: 3, duration: 800, onComplete: () => pBlast.destroy() });
                    for(let i=0; i<20; i++) this.explodeEmitter.emitParticleAt(player.x + Phaser.Math.Between(-20,20), player.y + Phaser.Math.Between(-20,20));

                    player.setPosition(-200, -200).setVisible(false); 
                    
                    let activeCount = (this.p1&&!this.p1.isDead?1:0) + (this.p2&&!this.p2.isDead?1:0);
                    if (activeCount === 0) {
                        this.gameOver = true; 
                        this.physics.pause(); 
                        this.musicTimer.remove(); 
                        this.medTimer.remove();
                        
                        this.time.delayedCall(1000, () => {
                            if(this.isAttract) this.scene.start('Menu');
                            else {
                                let finalScore = (this.mode === 'SURVIVAL' || this.mode === 'DEMON') ? Math.floor(this.timeElapsed/1000) : Math.floor(this.score);
                                let modeFlag = this.mode === 'SURVIVAL' ? 'S' : (this.mode === 'DEMON' ? 'D' : 'A');
                                this.scene.start('NameInput', { score: finalScore, mode: modeFlag });
                            }
                        });
                    }
                }
            }
        },

        class LevelUpScene extends Phaser.Scene {
            constructor() { super('LevelUp'); }
            init(data) { this.pid = data.pid; this.pColor = data.color; this.pool = data.pool; this.thm = data.thm; }
            create() {
                this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85);
                this.add.text(400, 100, `PLAYER ${this.pid} UPGRADE`, { fontFamily: 'Courier', fontSize: '40px', color: '#'+this.pColor.toString(16).padStart(6,'0'), fontStyle: 'bold' }).setOrigin(0.5);
                
                Phaser.Utils.Array.Shuffle(this.pool);
                this.options = this.pool.slice(0, 3);
                this.uiBoxes = [];
                this.selectedIndex = 0;

                for(let i=0; i<this.options.length; i++) {
                    let box = this.add.rectangle(400, 220 + (i*100), 550, 70, 0x222222).setStrokeStyle(4, 0x555555);
                    this.add.text(400, 220 + (i*100), this.options[i].text, { fontFamily: 'Courier', fontSize: '22px', color: '#fff' }).setOrigin(0.5);
                    this.uiBoxes.push(box);
                }

                this.updateSelection();
            }

            updateSelection() {
                this.uiBoxes.forEach((b, i) => {
                    b.setStrokeStyle(4, i === this.selectedIndex ? this.pColor : 0x555555);
                    b.setFillStyle(i === this.selectedIndex ? 0x444444 : 0x222222);
                });
            }

            update() {
                let up = false, down = false, action = false;

                if(this.pid === 1) {
                    ARCADE_CONTROLS.P1U.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) up = true; });
                    ARCADE_CONTROLS.P1D.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) down = true; });
                    ARCADE_CONTROLS.P1A.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) action = true; });
                } else {
                    ARCADE_CONTROLS.P2U.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) up = true; });
                    ARCADE_CONTROLS.P2D.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) down = true; });
                    ARCADE_CONTROLS.P2A.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) action = true; });
                }

                if (up && !this.upPressed) { this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length; this.updateSelection(); AudioEngine.sfx('shoot'); this.upPressed = true; }
                else if(!up) this.upPressed = false;
                
                if (down && !this.downPressed) { this.selectedIndex = (this.selectedIndex + 1) % this.options.length; this.updateSelection(); AudioEngine.sfx('shoot'); this.downPressed = true; }
                else if(!down) this.downPressed = false;

                if (action && !this.actionPressed) {
                    this.actionPressed = true;
                    AudioEngine.sfx('xp');
                    this.scene.stop();
                    this.scene.get('Play').applyUpgrade(this.pid, this.options[this.selectedIndex].type);
                    this.scene.resume('Play');
                } else if(!action) this.actionPressed = false;
            }
        },

        class NameInputScene extends Phaser.Scene {
            constructor() { super('NameInput'); }
            init(data) { this.score = data.score; this.mode = data.mode; }
            create() {
                this.add.rectangle(400, 300, 800, 600, 0x000000);
                this.add.text(400, 150, 'GAME OVER', { fontFamily: 'Courier', fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
                
                let sTxt = (this.mode === 'S' || this.mode === 'D') ? `TIME: ${this.score}s` : `FINAL SCORE: ${this.score}`;
                this.add.text(400, 230, sTxt, { fontFamily: 'Courier', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
                this.add.text(400, 300, 'ENTER INITIALS', { fontFamily: 'Courier', fontSize: '24px', color: '#00ff00' }).setOrigin(0.5);

                this.chars = [65, 65, 65]; 
                this.charIdx = 0;
                
                this.charTexts = [];
                for(let i=0; i<3; i++) {
                    this.charTexts.push(this.add.text(350 + (i*50), 380, 'A', { fontFamily: 'Courier', fontSize: '48px', color: '#fff' }).setOrigin(0.5));
                }
                this.cursor = this.add.text(350, 420, '^', { fontFamily: 'Courier', fontSize: '32px', color: '#00ffff' }).setOrigin(0.5);
            }
            
            update() {
                let up = false, down = false, left = false, right = false, action = false;

                ARCADE_CONTROLS.P1U.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) up = true; });
                ARCADE_CONTROLS.P1D.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) down = true; });
                ARCADE_CONTROLS.P1L.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) left = true; });
                ARCADE_CONTROLS.P1R.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) right = true; });
                ARCADE_CONTROLS.P1A.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) action = true; });
                ARCADE_CONTROLS.START1.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) action = true; });

                if (left && !this.lP) { this.charIdx = Math.max(0, this.charIdx - 1); AudioEngine.sfx('shoot'); this.lP = true;} else if(!left) this.lP = false;
                if (right && !this.rP) { this.charIdx = Math.min(2, this.charIdx + 1); AudioEngine.sfx('shoot'); this.rP = true;} else if(!right) this.rP = false;
                if (up && !this.uP) { this.chars[this.charIdx] = this.chars[this.charIdx] === 90 ? 65 : this.chars[this.charIdx] + 1; AudioEngine.sfx('hit'); this.uP = true;} else if(!up) this.uP = false;
                if (down && !this.dP) { this.chars[this.charIdx] = this.chars[this.charIdx] === 65 ? 90 : this.chars[this.charIdx] - 1; AudioEngine.sfx('hit'); this.dP = true;} else if(!down) this.dP = false;

                this.cursor.x = 350 + (this.charIdx * 50);
                for(let i=0; i<3; i++) { this.charTexts[i].setText(String.fromCharCode(this.chars[i])); }

                if (action && !this.aP) {
                    this.aP = true;
                    AudioEngine.sfx('lvl');
                    let name = String.fromCharCode(this.chars[0]) + String.fromCharCode(this.chars[1]) + String.fromCharCode(this.chars[2]);
                    Storage.save(name, this.score, this.mode);
                    this.scene.start('Leaderboard');
                } else if(!action) this.aP = false;
            }
        },

        class LeaderboardScene extends Phaser.Scene {
            constructor() { super('Leaderboard'); }
            create() {
                this.add.rectangle(400, 300, 800, 600, 0x000000);
                this.add.text(400, 50, 'HALL OF FAME', { fontFamily: 'Courier', fontSize: '48px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);
                
                this.add.text(200, 110, '- ARCADE -', { fontFamily: 'Courier', fontSize: '28px', color: '#00ff00' }).setOrigin(0.5);
                this.add.text(600, 110, '- SURVIVAL -', { fontFamily: 'Courier', fontSize: '28px', color: '#ffaa00' }).setOrigin(0.5);

                let scores = Storage.get();
                scores.A.forEach((s, i) => {
                    this.add.text(50, 160 + (i*35), `${(i+1)}. ${s.n}`, { fontFamily: 'Courier', fontSize: '24px', color: '#fff' });
                    this.add.text(350, 160 + (i*35), s.s.toString(), { fontFamily: 'Courier', fontSize: '24px', color: '#00ff00' }).setOrigin(1, 0);
                });
                scores.S.forEach((s, i) => {
                    this.add.text(450, 160 + (i*35), `${(i+1)}. ${s.n}`, { fontFamily: 'Courier', fontSize: '24px', color: '#fff' });
                    this.add.text(750, 160 + (i*35), `${s.s}s`, { fontFamily: 'Courier', fontSize: '24px', color: '#ffaa00' }).setOrigin(1, 0);
                });
                
                // Show Demon Conquerors at the bottom
                if(scores.D && scores.D.length > 0) {
                    this.add.text(400, 480, `PULSE DEMON CONQUERED BY: ${scores.D[0].n} (${scores.D[0].s}s)`, { fontFamily: 'Courier', fontSize: '20px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
                }

                this.add.text(400, 560, 'PRESS ACTION TO CONTINUE', { fontFamily: 'Courier', fontSize: '24px', color: '#555555' }).setOrigin(0.5);
            }
            update() {
                let action = false;
                ARCADE_CONTROLS.START1.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) action = true; });
                ARCADE_CONTROLS.P1A.forEach(k => { if(this.input.keyboard.checkDown(this.input.keyboard.addKey(k))) action = true; });

                if (action) {
                    AudioEngine.sfx('shoot');
                    this.scene.start('Menu');
                }
            }
        }
    ]
};

const game = new Phaser.Game(config);