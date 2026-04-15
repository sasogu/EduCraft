const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const PERF = (() => {
    // Modo rendimiento:
    // - Override por URL: ?perf=low | ?perf=normal
    // - Persistencia: localStorage 'edu-mario-perf'
    const normalize = (raw) => {
        const value = String(raw || '').toLowerCase().trim();
        if (!value) {
            return '';
        }
        if (value === 'low' || value === 'lite') {
            return 'low';
        }
        if (value === 'normal' || value === 'default') {
            return 'normal';
        }
        return '';
    };

    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = normalize(params.get('perf'));
        if (fromUrl) {
            try {
                window.localStorage.setItem('edu-mario-perf', fromUrl);
            } catch {
                // ignore
            }
            return fromUrl;
        }

        const stored = normalize(window.localStorage.getItem('edu-mario-perf'));
        if (stored) {
            return stored;
        }
    } catch {
        // ignore
    }

    return 'normal';
})();

const IS_LOW_PERF = PERF === 'low';
const TARGET_FPS = IS_LOW_PERF ? 30 : 60;
const MAX_ENEMIES = IS_LOW_PERF ? 8 : 18;
const PARALLAX_EVERY_N_FRAMES = IS_LOW_PERF ? 3 : 1;
const ENEMY_FLIP_EVERY_N_FRAMES = IS_LOW_PERF ? 3 : 1;

const PLAYER_SPEED = 180;
const PLAYER_JUMP_VELOCITY = -780;
const ENEMY_STOMP_BOUNCE = -520;
const JUMP_CUT_MULTIPLIER = 0.35;
const ENEMY_STOMP_EPSILON = 16;
const ENEMY_STOMP_VY_THRESHOLD = -120;

// Combo / power-ups
const COMBO_START_AT_STREAK = 3; // a partir de 3 aciertos seguidos
const COMBO_STEP_EVERY = 2; // 3->x2, 5->x3, 7->x4...
const COMBO_MAX_MULTIPLIER = 4;
const POWERUP_SPAWN_EVERY_STREAK = 4; // cada 4 aciertos seguidos spawnea un power-up
const POWERUP_MAX_ACTIVE = 1;
const STAR_INVINCIBLE_MS = 5000;

// Dificultad adaptativa
const ADAPTIVE_WINDOW = 12; // nº de eventos recientes (acierto/fallo)
const HINTS_DISABLE_SCORE = 100; // a partir de aquí se ocultan ayudas visuales

const PIANO_KEY_SOUND_COOLDOWN_MS = 140;
// key05.ogg = Do grave. Mapeo diatónico (Do..Fa↑) sobre un piano cromático.
const PIANO_SAMPLE_NUMBERS_BY_NOTE_INDEX = [5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 22];

const SUPPORTED_LOCALES = ['es', 'ca', 'en'];

const SCORE_GAME_ID = 'edumario';

const NOTE_LABELS = {
    es: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do↑', 'Re↑', 'Mi↑', 'Fa↑'],
    ca: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do↑', 'Re↑', 'Mi↑', 'Fa↑'],
    en: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C↑', 'D↑', 'E↑', 'F↑']
};

const TRANSLATIONS = {
    es: {
        hud: {
            score: 'Puntos: {score}',
            attempts: 'Intentos: {attempts}',
            lives: 'Vidas: {lives}',
            combo: 'Racha: {streak}',
            mult: 'x{mult}',
            shield: 'Escudo: {charges}',
            target: 'Objetivo: {note}',
            perf: 'Rendimiento: {state}',
            perfOn: 'ON',
            perfOff: 'OFF'
        },
        help: {
            toggle: 'ⓘ',
            title: '¿Cómo se puntúa?',
            body: 'x1/x2/x3/x4: multiplica los puntos al acertar varias seguidas.\nIntentos: fallos al pulsar una nota incorrecta.\nVidas: golpes de enemigos.\nEscudo: bloquea un golpe.'
        },
        controls: {
            jump: 'Saltar'
        },
        feedback: {
            correct: '¡Correcto!',
            tryAgain: 'Intenta otra',
            enemyHit: 'Te ha tocado un enemigo',
            stomp: '¡Pisotón!',
            extraLife: '+1 vida',
            shieldOn: '¡Escudo!',
            starOn: '¡Invencible!',
            blocked: '¡Bloqueado!'
        },
        gameOver: {
            title: 'GAME OVER',
            score: 'Puntuación: {score}',
            prompt: 'Introduce 3 letras o números (A-Z, 0-9):',
            saveHint: 'ENTER para guardar',
            saveHintTouch: 'Toca para escribir',
            restartHint: 'Pulsa SPACE para reiniciar',
            restartHintTouch: 'Toca para reiniciar',
            emptyRanking: 'Ranking vacío'
        }
    },
    ca: {
        hud: {
            score: 'Punts: {score}',
            attempts: 'Intents: {attempts}',
            lives: 'Vides: {lives}',
            combo: 'Ratxa: {streak}',
            mult: 'x{mult}',
            shield: 'Escut: {charges}',
            target: 'Objectiu: {note}',
            perf: 'Rendiment: {state}',
            perfOn: 'ON',
            perfOff: 'OFF'
        },
        help: {
            toggle: 'ⓘ',
            title: 'Com es puntua?',
            body: 'x1/x2/x3/x4: multiplica els punts en encadenar encerts.\nIntents: fallades en tocar una nota incorrecta.\nVides: colps d\'enemics.\nEscut: bloqueja un colp.'
        },
        controls: {
            jump: 'Saltar'
        },
        feedback: {
            correct: 'Correcte!',
            tryAgain: 'Torna-ho a provar',
            enemyHit: 'Un enemic t\'ha tocat',
            stomp: 'Trepitjada!',
            extraLife: '+1 vida',
            shieldOn: 'Escut!',
            starOn: 'Invencible!',
            blocked: 'Bloquejat!'
        },
        gameOver: {
            title: 'GAME OVER',
            score: 'Puntuació: {score}',
            prompt: 'Introdueix 3 lletres o números (A-Z, 0-9):',
            saveHint: 'ENTER per desar',
            saveHintTouch: 'Toca per escriure',
            restartHint: 'Prem ESPAI per reiniciar',
            restartHintTouch: 'Toca per reiniciar',
            emptyRanking: 'Rànquing buit'
        }
    },
    en: {
        hud: {
            score: 'Points: {score}',
            attempts: 'Attempts: {attempts}',
            lives: 'Lives: {lives}',
            combo: 'Streak: {streak}',
            mult: 'x{mult}',
            shield: 'Shield: {charges}',
            target: 'Target: {note}',
            perf: 'Performance: {state}',
            perfOn: 'ON',
            perfOff: 'OFF'
        },
        help: {
            toggle: 'ⓘ',
            title: 'How scoring works',
            body: 'x1/x2/x3/x4: multiplies points for consecutive correct hits.\nAttempts: mistakes when pressing the wrong note.\nLives: enemy hits.\nShield: blocks one hit.'
        },
        controls: {
            jump: 'Jump'
        },
        feedback: {
            correct: 'Correct!',
            tryAgain: 'Try again',
            enemyHit: 'An enemy hit you',
            stomp: 'Stomp!',
            extraLife: '+1 life',
            shieldOn: 'Shield!',
            starOn: 'Invincible!',
            blocked: 'Blocked!'
        },
        gameOver: {
            title: 'GAME OVER',
            score: 'Score: {score}',
            prompt: 'Enter 3 letters or numbers (A-Z, 0-9):',
            saveHint: 'Press ENTER to save',
            saveHintTouch: 'Tap to enter',
            restartHint: 'Press SPACE to restart',
            restartHintTouch: 'Tap to restart',
            emptyRanking: 'No scores yet'
        }
    }
};

class EduMarioScene extends Phaser.Scene {
    constructor() {
        super('edu-mario');
        this.locale = 'es';
        this.t = (key, vars) => key;

        // Notas ordenadas de grave a agudo (las agudas se marcan con ↑ para distinguirlas en las teclas).
        // Los labels visibles dependen del idioma; internamente trabajamos por índice.
        this.notes = NOTE_LABELS.es;
        this.notePositions = [];
        this.targetIndex = 0;
        this.score = 0;
        this.attempts = 0;
        this.lives = 3;

        this.comboStreak = 0;
        this.comboMultiplier = 1;
        this.invincibleUntil = 0;
        this.invincibleTintActive = false;
        this.shieldCharges = 0;

        this.adaptiveEvents = [];
        this.adaptiveMode = 'normal'; // 'assist' | 'normal' | 'challenge'
        this.hintTween = null;
        this.nextEnemyMilestone = 20;
        this.nextLifeMilestone = 50;
        this.nextRandomEnemyAt = 0;
        this.keyResolveLockUntil = 0;
        this.hitLock = false;
        this.touchLeft = false;
        this.touchRight = false;
        this.touchJump = false;
        this.touchJumpWasDown = false;
        this.jumpCutApplied = false;
        this.audioArmed = false;

        this.isGameOver = false;
        this.enteringInitials = false;
        this.initials = '';
        this.submittedScore = false;
        this.highScores = [];
        this.gameOverKeyHandler = null;

        this.skyMode = 'normal';

        this.parallaxTick = 0;
    }

    preload() {
        this.load.atlas(
            'sunnyAtlas',
            'assets/games/edu-mario/sunny/atlas/atlas.png',
            'assets/games/edu-mario/sunny/atlas/atlas.json'
        );
        // Fondo más infantil / pixel-art (parallax cielo + montañas)
        this.load.image('bg-back', 'assets/skies/pixelsky.png');
        this.load.image('bg-mid', 'assets/skies/mountains-tile.png');
        this.load.image('bg-back-spooky', 'assets/skies/spookysky.jpg');
        this.load.spritesheet('tiles', 'assets/games/edu-mario/sunny/environment/tileset.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        // Piano cromático (archivos en assets/games/edu-mario/piano/keyXX.ogg)
        for (let i = 0; i < PIANO_SAMPLE_NUMBERS_BY_NOTE_INDEX.length; i += 1) {
            const num = PIANO_SAMPLE_NUMBERS_BY_NOTE_INDEX[i];
            const padded = String(num).padStart(2, '0');
            this.load.audio(`piano-key${padded}`, `assets/games/edu-mario/piano/key${padded}.ogg`);
        }
    }

    create() {
        this.resetRunState();

        this.setupI18n();
        this.setupResponsive();

        // Fondo con parallax (en low-perf reducimos capas).
        this.bgBack = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-back');

        if (!IS_LOW_PERF) {
            // Montañas solo abajo (una fila), ocupando todo el ancho.
            const midSource = this.textures.get('bg-mid')?.getSourceImage();
            const midHeight = midSource?.height || Math.floor(GAME_HEIGHT * 0.35);
            this.bgMid = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - midHeight / 2, GAME_WIDTH, midHeight, 'bg-mid');
        } else {
            this.bgMid = null;
        }

        this.createUi();
        this.createTextures();
        this.createPlatforms();
        this.createPlayer();
        this.createEnemies();
        this.createPowerUps();
        this.createControls();
        this.createColliders();
        this.setupAudio();
        this.loadHighScores();
        this.syncRemoteRankingsInBackground();
        this.createGameOverUi();
        this.pickNewTarget();
    }

    setupResponsive() {
        const scale = this.scale;
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;

        if (isTouch && scale && scale.fullscreen && scale.fullscreen.available) {
            this.input.once('pointerdown', () => {
                if (!scale.isFullscreen) {
                    scale.startFullscreen();
                }
            });
        }

        const refreshScale = () => {
            if (scale && typeof scale.refresh === 'function') {
                scale.refresh();
        
        this.helpToggle = this.add.text(GAME_WIDTH - 20, 64, this.t('help.toggle'), {
            fontSize: '18px',
            color: '#0f172a',
            backgroundColor: 'rgba(255,255,255,0.85)',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        this.helpToggle.setDepth(12).setScrollFactor(0);
        
        const helpWidth = 300;
        const helpHeight = 120;
        const helpX = GAME_WIDTH - helpWidth - 20;
        const helpY = 92;
        const helpBg = this.add.rectangle(helpX, helpY, helpWidth, helpHeight, 0xffffff, 0.95)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0x94a3b8, 0.9)
            .setScrollFactor(0);
        const helpText = `${this.t('help.title')}\n${this.t('help.body')}`;
        const helpLabel = this.add.text(helpX + 10, helpY + 8, helpText, {
            fontSize: '12px',
            color: '#0f172a',
            wordWrap: { width: helpWidth - 20 }
        }).setScrollFactor(0);
        this.helpPanel = this.add.container(0, 0, [helpBg, helpLabel]);
        this.helpPanel.setDepth(11).setScrollFactor(0);
        this.helpPanel.setVisible(false);
        
        this.helpToggle.on('pointerdown', () => {
            if (this.helpPanel) {
                this.helpPanel.setVisible(!this.helpPanel.visible);
            }
        });
            }
        };

        window.addEventListener('resize', refreshScale, { passive: true });
        window.addEventListener('orientationchange', () => {
            setTimeout(refreshScale, 250);
        }, { passive: true });
    }

    async syncRemoteRankingsInBackground() {
        const svc = window.ScoreService;
        if (!svc || typeof svc.getBoardsByGame !== 'function' || typeof svc.loadEntries !== 'function') {
            return;
        }

        try {
            // Asegura que los boards (incluso ocultos) estén montados.
            if (typeof svc.getBoardByGame === 'function' && !svc.getBoardByGame(SCORE_GAME_ID)
                && typeof svc.scanDom === 'function') {
                svc.scanDom();
            }
        } catch (_) {
            // ignore
        }

        let boards;
        try {
            boards = svc.getBoardsByGame(SCORE_GAME_ID) || [];
        } catch (_) {
            boards = [];
        }
        if (!boards.length) {
            return;
        }

        const allTimeBoard = boards.find((b) => (b?.options?.period || 'all-time') === 'all-time') || boards[0];
        const weeklyBoard = boards.find((b) => (b?.options?.period || 'all-time') === 'weekly') || null;

        try {
            await svc.loadEntries(allTimeBoard, 'all-time');
        } catch (_) {
            // ignore
        }
        if (weeklyBoard) {
            try {
                await svc.loadEntries(weeklyBoard, 'weekly');
            } catch (_) {
                // ignore
            }
        }

        // Recarga desde local (que ya puede incluir el remoto persistido).
        this.loadHighScores();
        if (this.isGameOver && this.submittedScore && this.gameOverUi?.ranking) {
            this.gameOverUi.ranking.setText(this.formatHighScores());
        }
    }

    resetRunState() {
        // IMPORTANTE: Scene.restart() no vuelve a llamar al constructor.
        // Por eso reseteamos aquí el estado de la partida.
        this.targetIndex = 0;
        this.score = 0;
        this.attempts = 0;
        this.lives = 3;

        this.comboStreak = 0;
        this.comboMultiplier = 1;
        this.invincibleUntil = 0;
        this.invincibleTintActive = false;
        this.shieldCharges = 0;

        this.adaptiveEvents = [];
        this.adaptiveMode = 'normal';
        this.hintTween = null;
        this.nextEnemyMilestone = 20;
        this.nextLifeMilestone = 50;
        this.nextRandomEnemyAt = 0;
        this.keyResolveLockUntil = 0;
        this.hitLock = false;
        this.touchLeft = false;
        this.touchRight = false;
        this.touchJump = false;
        this.touchJumpWasDown = false;
        this.jumpCutApplied = false;

        this.isGameOver = false;
        this.enteringInitials = false;
        this.initials = '';
        this.submittedScore = false;

        this.skyMode = 'normal';

        this.parallaxTick = 0;
    }

    maybeUpdateBackgroundByScore() {
        // 0-49: fondo normal, 50-79: spooky, 80+: vuelve al normal.
        const desiredMode = this.score >= 80 ? 'normal' : (this.score >= 50 ? 'spooky' : 'normal');
        if (desiredMode === this.skyMode) {
            return;
        }

        this.skyMode = desiredMode;
        if (!this.bgBack) {
            return;
        }

        if (desiredMode === 'spooky') {
            this.bgBack.setTexture('bg-back-spooky');
        } else {
            this.bgBack.setTexture('bg-back');
        }
    }

    setupI18n() {
        const locale = this.getInitialLocale();
        this.locale = locale;
        this.t = this.createTranslator(locale);
        this.notes = NOTE_LABELS[locale] || NOTE_LABELS.es;
        this.syncHelpOverlay();
    }

    syncHelpOverlay() {
        const toggle = document.getElementById('edumario-help-toggle');
        const panel = document.getElementById('edumario-help-panel');
        const title = document.getElementById('edumario-help-title');
        const body = document.getElementById('edumario-help-body');
        if (!toggle || !panel || !title || !body) return;

        toggle.textContent = this.t('help.toggle');
        title.textContent = this.t('help.title');
        body.textContent = this.t('help.body');

        if (!toggle.dataset.bound) {
            toggle.dataset.bound = 'true';
            toggle.addEventListener('click', () => {
                const isHidden = panel.hasAttribute('hidden');
                if (isHidden) {
                    panel.removeAttribute('hidden');
                    toggle.setAttribute('aria-expanded', 'true');
                } else {
                    panel.setAttribute('hidden', '');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    getInitialLocale() {
        try {
            const normalizeLocale = (raw) => {
                const value = String(raw || '').toLowerCase().trim();
                if (!value) {
                    return '';
                }
                // EduMúsic usa 'val' para valenciano. En EduMario usamos 'ca' (catalán).
                if (value === 'val') {
                    return 'ca';
                }
                // Acepta alias comunes por si vienen por URL.
                if (value === 'cat' || value === 'catalan' || value === 'català') {
                    return 'ca';
                }
                return value;
            };

            const params = new URLSearchParams(window.location.search);
            const fromUrl = normalizeLocale(params.get('lang'));
            if (SUPPORTED_LOCALES.includes(fromUrl)) {
                window.localStorage.setItem('edu-mario-lang', fromUrl);
                return fromUrl;
            }

            const stored = normalizeLocale(window.localStorage.getItem('edu-mario-lang'));
            if (SUPPORTED_LOCALES.includes(stored)) {
                return stored;
            }

            // Heredar idioma de EduMúsic si existe (es/val/en).
            const inherited = normalizeLocale(window.localStorage.getItem('lang'));
            if (SUPPORTED_LOCALES.includes(inherited)) {
                window.localStorage.setItem('edu-mario-lang', inherited);
                return inherited;
            }

            const nav = String(navigator.language || '').toLowerCase();
            if (nav.startsWith('ca')) {
                return 'ca';
            }
            if (nav.startsWith('en')) {
                return 'en';
            }
        } catch (error) {
            // ignore
        }

        return 'es';
    }

    createTranslator(locale) {
        const dict = TRANSLATIONS[locale] || TRANSLATIONS.es;
        const fallback = TRANSLATIONS.es;

        const getByPath = (obj, path) => {
            const parts = String(path).split('.');
            let cur = obj;
            for (const part of parts) {
                if (!cur || typeof cur !== 'object' || !(part in cur)) {
                    return undefined;
                }
                cur = cur[part];
            }
            return cur;
        };

        const format = (template, vars) => {
            if (!vars) {
                return template;
            }
            return template.replace(/\{(\w+)\}/g, (_, key) => {
                const val = vars[key];
                return val === undefined || val === null ? '' : String(val);
            });
        };

        return (key, vars) => {
            const raw = getByPath(dict, key) ?? getByPath(fallback, key) ?? key;
            return typeof raw === 'string' ? format(raw, vars) : String(raw);
        };
    }

    setupAudio() {
        // Desbloquea el contexto de audio tras la primera interacción del usuario.
        const arm = async () => {
            if (this.audioArmed) {
                return;
            }
            this.audioArmed = true;
            try {
                if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
                    await this.sound.context.resume();
                }
            } catch (error) {
                // Si el navegador bloquea el audio, simplemente seguimos sin sonido.
            }
        };

        this.input.once('pointerdown', arm);
        this.input.keyboard?.once('keydown', arm);
    }

    playTone(frequency, durationMs, type = 'sine', volume = 0.08) {
        const ctx = this.sound?.context;
        if (!ctx || typeof ctx.createOscillator !== 'function') {
            return;
        }

        try {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + durationMs / 1000);
        } catch (error) {
            // Silencioso si falla (por políticas del navegador / audio no disponible)
        }
    }

    playSuccessSound() {
        // Doble "ding" corto (agradable)
        this.playTone(880, 70, 'sine', 0.08);
        this.time.delayedCall(80, () => this.playTone(1175, 90, 'sine', 0.08));
    }

    playErrorSound() {
        // Bajada rápida tipo "buzzer"
        this.playTone(220, 120, 'square', 0.06);
        this.time.delayedCall(40, () => this.playTone(164, 140, 'square', 0.05));
    }

    playStompSound() {
        // "Pop" corto y grave, tipo pisotón
        this.playTone(180, 50, 'triangle', 0.09);
        this.time.delayedCall(35, () => this.playTone(120, 70, 'triangle', 0.07));
    }

    createUi() {
        const staffWidth = 560;
        const staffX = GAME_WIDTH / 2;
        const staffY = 70;
        const staffSpacing = 18;
        const staffBottom = staffY + staffSpacing * 4;
        const noteStep = staffSpacing / 2;

        const staff = this.add.graphics();
        staff.lineStyle(2, 0x1f2933, 0.9);
        for (let i = 0; i < 5; i += 1) {
            const y = staffY + i * staffSpacing;
            staff.lineBetween(staffX - staffWidth / 2, y, staffX + staffWidth / 2, y);
        }

        const staffBase = staffBottom + noteStep * 2;
        this.notePositions = this.notes.map((_, index) => staffBase - index * noteStep);
        this.noteDot = this.add.circle(staffX, staffBottom, 9, 0x111827);
        this.noteLedger = this.add.graphics();
        this.staffMetrics = { staffX, staffWidth, staffY, staffBottom, noteStep };

        this.feedbackText = this.add.text(staffX, staffY + staffSpacing * 6.2, '', {
            fontSize: '20px',
            color: '#0f172a'
        }).setOrigin(0.5, 0.5);

        this.targetHintText = this.add.text(staffX, staffY + staffSpacing * 5.4, '', {
            fontSize: '18px',
            color: '#0f172a'
        }).setOrigin(0.5, 0.5);

        this.scoreText = this.add.text(20, 16, this.t('hud.score', { score: this.score }), {
            fontSize: '18px',
            color: '#0f172a'
        });

        this.livesText = this.add.text(20, 40, this.t('hud.lives', { lives: this.lives }), {
            fontSize: '18px',
            color: '#0f172a'
        });

        this.comboText = this.add.text(20, 64, this.t('hud.combo', { streak: this.comboStreak }), {
            fontSize: '16px',
            color: '#0f172a'
        });

        this.multText = this.add.text(20, 84, this.t('hud.mult', { mult: this.comboMultiplier }), {
            fontSize: '16px',
            color: '#0f172a'
        });

        this.shieldText = this.add.text(20, 104, this.t('hud.shield', { charges: this.shieldCharges }), {
            fontSize: '16px',
            color: '#0f172a'
        });

        this.attemptsText = this.add.text(GAME_WIDTH - 20, 16, this.t('hud.attempts', { attempts: this.attempts }), {
            fontSize: '18px',
            color: '#0f172a'
        }).setOrigin(1, 0);

        const perfState = IS_LOW_PERF ? this.t('hud.perfOn') : this.t('hud.perfOff');
        this.perfText = this.add.text(GAME_WIDTH - 20, 40, this.t('hud.perf', { state: perfState }), {
            fontSize: '14px',
            color: '#0f172a'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.perfText.on('pointerdown', () => {
            const next = IS_LOW_PERF ? 'normal' : 'low';
            try {
                window.localStorage.setItem('edu-mario-perf', next);
            } catch {
                // ignore
            }

            // Recargamos para que FPS/resolution/render se apliquen desde config.
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('perf', next);
                window.location.href = url.toString();
            } catch {
                window.location.reload();
            }
        });

        this.updateHints();
    }

    updateComboUi() {
        if (this.comboText) {
            this.comboText.setText(this.t('hud.combo', { streak: this.comboStreak }));
        }
        if (this.multText) {
            this.multText.setText(this.t('hud.mult', { mult: this.comboMultiplier }));
        }
        if (this.shieldText) {
            this.shieldText.setText(this.t('hud.shield', { charges: this.shieldCharges }));
        }
    }

    recordAdaptiveEvent(isCorrect) {
        this.adaptiveEvents.push(!!isCorrect);
        if (this.adaptiveEvents.length > ADAPTIVE_WINDOW) {
            this.adaptiveEvents.splice(0, this.adaptiveEvents.length - ADAPTIVE_WINDOW);
        }
    }

    getAdaptiveStats() {
        const list = Array.isArray(this.adaptiveEvents) ? this.adaptiveEvents : [];
        const total = list.length;
        const correct = list.filter(Boolean).length;
        const accuracy = total ? (correct / total) : 1;

        let wrongStreak = 0;
        for (let i = list.length - 1; i >= 0; i -= 1) {
            if (list[i]) break;
            wrongStreak += 1;
        }

        return { total, correct, accuracy, wrongStreak };
    }

    updateAdaptiveDifficulty() {
        const { total, accuracy, wrongStreak } = this.getAdaptiveStats();
        if (total < 6) {
            // Al principio no tocamos demasiado.
            return;
        }

        // A partir de cierta puntuación, evitamos volver a mostrar ayudas.
        if ((this.score || 0) >= HINTS_DISABLE_SCORE) {
            const was = this.adaptiveMode;
            this.adaptiveMode = 'challenge';
            if (this.adaptiveMode !== was) {
                this.updateHints();
            }
            return;
        }

        const was = this.adaptiveMode;

        // Regla sencilla:
        // - Si se atasca: ayuda.
        // - Si va sobrado: reto.
        // - Si no: normal.
        if (wrongStreak >= 3 || accuracy <= 0.55 || this.lives <= 1) {
            this.adaptiveMode = 'assist';
        } else if (accuracy >= 0.85 && this.comboStreak >= 5 && this.lives >= 2) {
            this.adaptiveMode = 'challenge';
        } else {
            this.adaptiveMode = 'normal';
        }

        if (this.adaptiveMode !== was) {
            this.updateHints();
        }
    }

    updateHints() {
        // Pistas:
        // - assist: muestra texto objetivo + flecha a la tecla.
        // - normal: solo punto en pentagrama.
        // - challenge: igual que normal (sin ayudas extra).
        const show = (this.adaptiveMode === 'assist') && ((this.score || 0) < HINTS_DISABLE_SCORE);
        if (this.targetHintText) {
            if (show) {
                this.targetHintText.setText(this.t('hud.target', { note: this.notes?.[this.targetIndex] || '' }));
                this.targetHintText.setVisible(true);
            } else {
                this.targetHintText.setText('');
                this.targetHintText.setVisible(false);
            }
        }

        if (this.hintArrow) {
            this.hintArrow.setVisible(show);
        }

        if (this.hintTween) {
            this.hintTween.stop();
            this.hintTween = null;
        }
        if (show && this.hintArrow) {
            this.hintTween = this.tweens.add({
                targets: this.hintArrow,
                y: this.hintArrow.y - 6,
                duration: 520,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        this.positionHintArrow();
    }

    positionHintArrow() {
        if (!this.hintArrow || !this.keys) {
            return;
        }
        if (!this.hintArrow.visible) {
            return;
        }
        const children = this.keys.getChildren ? this.keys.getChildren() : [];
        const keySprite = children.find((k) => (k && k.getData && k.getData('noteIndex')) === this.targetIndex);
        if (!keySprite) {
            return;
        }
        const keyY = this.keyY ?? 310;
        this.hintArrow.setPosition(keySprite.x, keyY - 28);
    }

    getEnemySpawnTuning() {
        // Ajusta la presión según el modo.
        if (this.adaptiveMode === 'assist') {
            return {
                chanceMul: 0.6,
                minDelay: IS_LOW_PERF ? 2200 : 1500,
                maxDelay: IS_LOW_PERF ? 3600 : 2800,
                maxEnemies: Math.max(4, Math.floor(MAX_ENEMIES * 0.65)),
                speedMin: 55,
                speedMax: 75,
            };
        }
        if (this.adaptiveMode === 'challenge') {
            return {
                chanceMul: 1.25,
                minDelay: IS_LOW_PERF ? 1500 : 1000,
                maxDelay: IS_LOW_PERF ? 2700 : 2000,
                maxEnemies: Math.min(MAX_ENEMIES + 6, IS_LOW_PERF ? 12 : 26),
                speedMin: 85,
                speedMax: 110,
            };
        }
        return {
            chanceMul: 1,
            minDelay: IS_LOW_PERF ? 1800 : 1200,
            maxDelay: IS_LOW_PERF ? 3200 : 2400,
            maxEnemies: MAX_ENEMIES,
            speedMin: 70,
            speedMax: 90,
        };
    }

    resetCombo() {
        this.comboStreak = 0;
        this.comboMultiplier = 1;
        this.updateComboUi();
    }

    bumpComboOnCorrect() {
        this.comboStreak += 1;

        // Multiplicador discreto: 1x, 2x, 3x, 4x...
        if (this.comboStreak < COMBO_START_AT_STREAK) {
            this.comboMultiplier = 1;
        } else {
            const extra = 1 + Math.floor((this.comboStreak - COMBO_START_AT_STREAK) / COMBO_STEP_EVERY);
            this.comboMultiplier = Math.min(COMBO_MAX_MULTIPLIER, 1 + extra);
        }

        this.updateComboUi();
    }

    createPowerUps() {
        this.powerUps = this.physics.add.group();
    }

    spawnPowerUp(type, spawnNearX) {
        if (!this.powerUps) {
            return;
        }

        // Mantener pocos objetos activos.
        const activeCount = this.powerUps.countActive(true);
        if (activeCount >= POWERUP_MAX_ACTIVE) {
            for (const child of this.powerUps.getChildren()) {
                if (child?.active) {
                    child.destroy();
                }
            }
        }

        const x = Phaser.Math.Clamp(spawnNearX + Phaser.Math.Between(-180, 180), 60, GAME_WIDTH - 60);
        const y = 240;

        const texture = type === 'star' ? 'power-star' : 'power-shield';
        const pu = this.powerUps.create(x, y, texture);
        pu.setData('powerType', type);
        pu.setDepth(10);
        pu.setCollideWorldBounds(true);
        pu.setBounce(0.2, 0.2);
        pu.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-10, 10));

        // Despawn suave si nadie lo recoge.
        const bornAt = this.time?.now ?? Date.now();
        pu.setData('bornAt', bornAt);
        this.time.delayedCall(8000, () => {
            if (pu?.active) {
                pu.destroy();
            }
        });
    }

    maybeSpawnPowerUpOnStreak() {
        if (this.comboStreak <= 0) {
            return;
        }
        if ((this.comboStreak % POWERUP_SPAWN_EVERY_STREAK) !== 0) {
            return;
        }

        // Alterna: 4->escudo, 8->estrella, 12->escudo...
        const type = (this.comboStreak % (POWERUP_SPAWN_EVERY_STREAK * 2) === 0) ? 'star' : 'shield';
        this.spawnPowerUp(type, this.player?.x ?? (GAME_WIDTH / 2));
    }

    applyPowerUp(type) {
        const now = this.time?.now ?? Date.now();

        if (type === 'star') {
            this.invincibleUntil = Math.max(this.invincibleUntil || 0, now + STAR_INVINCIBLE_MS);
            this.feedbackText?.setText(this.t('feedback.starOn'));
            this.playSuccessSound();
            return;
        }

        if (type === 'shield') {
            this.shieldCharges = Math.min(1, (this.shieldCharges || 0) + 1);
            this.feedbackText?.setText(this.t('feedback.shieldOn'));
            this.playSuccessSound();
            this.updateComboUi();
        }
    }

    handlePowerUpOverlap(player, powerUp) {
        if (!powerUp?.active) {
            return;
        }
        const type = powerUp.getData('powerType');
        powerUp.destroy();
        this.applyPowerUp(type);
    }

    createGameOverUi() {
        const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
        overlay.setDepth(1000);

        const title = this.add.text(GAME_WIDTH / 2, 140, this.t('gameOver.title'), {
            fontSize: '44px',
            color: '#f8fafc'
        }).setOrigin(0.5).setDepth(1001);

        const scoreLine = this.add.text(GAME_WIDTH / 2, 200, '', {
            fontSize: '22px',
            color: '#f8fafc'
        }).setOrigin(0.5).setDepth(1001);

        const prompt = this.add.text(GAME_WIDTH / 2, 250, this.t('gameOver.prompt'), {
            fontSize: '18px',
            color: '#f8fafc'
        }).setOrigin(0.5).setDepth(1001);

        const initialsText = this.add.text(GAME_WIDTH / 2, 290, '___', {
            fontSize: '40px',
            color: '#f8fafc'
        }).setOrigin(0.5).setDepth(1001);

        const hint = this.add.text(GAME_WIDTH / 2, 340, this.t('gameOver.saveHint'), {
            fontSize: '16px',
            color: '#e2e8f0'
        }).setOrigin(0.5).setDepth(1001);

        const ranking = this.add.text(GAME_WIDTH / 2, 410, '', {
            fontSize: '16px',
            color: '#f8fafc',
            align: 'center'
        }).setOrigin(0.5).setDepth(1001);

        const restartHint = this.add.text(GAME_WIDTH / 2, 495, '', {
            fontSize: '16px',
            color: '#e2e8f0'
        }).setOrigin(0.5).setDepth(1001);

        this.gameOverUi = { overlay, title, scoreLine, prompt, initialsText, hint, ranking, restartHint };
        this.setGameOverUiVisible(false);

        this.events.once('shutdown', () => {
            if (this.gameOverKeyHandler && this.input?.keyboard) {
                this.input.keyboard.off('keydown', this.gameOverKeyHandler);
            }
        });
    }

    setGameOverUiVisible(visible) {
        if (!this.gameOverUi) {
            return;
        }
        Object.values(this.gameOverUi).forEach((obj) => obj.setVisible(visible));
    }

    isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
    }

    openInitialsPrompt() {
        if (this.submittedScore || !this.isGameOver) {
            return;
        }
        if (this.initialsPromptOpen) {
            return;
        }
        this.initialsPromptOpen = true;
        const current = this.initials || '';
        let value = '';
        try {
            value = window.prompt(this.t('gameOver.prompt'), current) || '';
        } catch {
            value = '';
        }
        this.initialsPromptOpen = false;
        const normalized = String(value || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 3);
        if (!normalized) {
            return;
        }
        this.initials = normalized;
        const display = (this.initials + '___').slice(0, 3);
        this.gameOverUi?.initialsText?.setText(display);
        if (this.initials.length === 3) {
            this.submittedScore = true;
            this.saveHighScore(this.initials, this.score);
            this.loadHighScores();
            this.gameOverUi?.ranking?.setText(this.formatHighScores());
            this.gameOverUi?.hint?.setText('');
            const restartKey = this.isTouchDevice() ? 'gameOver.restartHintTouch' : 'gameOver.restartHint';
            this.gameOverUi?.restartHint?.setText(this.t(restartKey));
        }
    }

    loadHighScores() {
        const legacyKey = 'edu-mario-highscores';

        const loadLegacy = () => {
            try {
                const raw = window.localStorage.getItem(legacyKey);
                const parsed = raw ? JSON.parse(raw) : [];
                return Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                return [];
            }
        };

        const loadFromScoreService = () => {
            const svc = window.ScoreService;
            if (!svc || typeof svc.scanDom !== 'function' || typeof svc.getBoardsByGame !== 'function') {
                return null;
            }
            try {
                // Asegura que los boards ocultos estén montados.
                if (typeof svc.getBoardByGame === 'function' && !svc.getBoardByGame(SCORE_GAME_ID)) {
                    svc.scanDom();
                }
                const boards = svc.getBoardsByGame(SCORE_GAME_ID) || [];
                const primary = boards[0];
                if (!primary || typeof svc.loadLocal !== 'function') {
                    return null;
                }

                // Migración: si existen scores antiguos y el ranking nuevo está vacío.
                const existing = svc.loadLocal(primary, 'all-time');
                const legacy = loadLegacy();
                if (Array.isArray(existing) && existing.length === 0 && legacy.length > 0
                    && typeof svc.saveLocalEntry === 'function') {
                    for (const entry of legacy) {
                        const nameRaw = entry && entry.name != null ? entry.name : '';
                        const scoreRaw = entry && entry.score != null ? entry.score : 0;
                        const name = (typeof svc.normalizeInitials === 'function')
                            ? svc.normalizeInitials(nameRaw)
                            : String(nameRaw || '---').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'A');
                        const score = Number(scoreRaw);
                        if (!Number.isFinite(score)) {
                            continue;
                        }
                        const migrated = { name, score, ts: new Date().toISOString() };
                        for (const b of boards) {
                            svc.saveLocalEntry(b, migrated);
                        }
                    }
                    try {
                        window.localStorage.removeItem(legacyKey);
                    } catch (_) {}
                }

                const list = svc.loadLocal(primary, 'all-time');
                return Array.isArray(list) ? list : [];
            } catch (_) {
                return null;
            }
        };

        const unified = loadFromScoreService();
        if (Array.isArray(unified)) {
            const normalized = unified
                .map((e) => ({
                    name: (e && e.name != null ? String(e.name) : '---').toUpperCase().slice(0, 3),
                    score: Number(e && e.score != null ? e.score : 0) || 0,
                    ts: e && e.ts ? e.ts : null,
                }))
                .filter((e) => e && typeof e.name === 'string' && Number.isFinite(e.score))
                .sort((a, b) => (b.score - a.score));
            this.highScores = normalized.slice(0, 10);
            return;
        }

        const legacy = loadLegacy();
        this.highScores = legacy
            .filter((e) => e && typeof e.name === 'string' && typeof e.score === 'number')
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }

    saveHighScore(name, score) {
        const svc = window.ScoreService;
        const safeScore = Number(score);
        if (!Number.isFinite(safeScore)) {
            return;
        }

        // Preferimos el formato del ScoreService (3 chars A-Z/0-9).
        const normalizedName = (svc && typeof svc.normalizeInitials === 'function')
            ? svc.normalizeInitials(name)
            : String(name || '---').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'A');

        if (svc && typeof svc.scanDom === 'function' && typeof svc.getBoardsByGame === 'function') {
            try {
                if (typeof svc.getBoardByGame === 'function' && !svc.getBoardByGame(SCORE_GAME_ID)) {
                    svc.scanDom();
                }
                const boards = svc.getBoardsByGame(SCORE_GAME_ID) || [];
                const primary = boards[0];
                if (primary && typeof svc.addEntry === 'function') {
                    // addEntry guarda en local para todos los boards y luego intenta remoto.
                    svc.addEntry(primary, normalizedName, safeScore).catch(() => {});
                    return;
                }
            } catch (_) {
                // fallback a legacy
            }
        }

        // Fallback legacy (si ScoreService no está cargado).
        const now = Date.now();
        const existing = (this.highScores || []).filter((e) => e && typeof e.name === 'string' && typeof e.score === 'number');
        const prev = existing.find((e) => String(e.name).toUpperCase().slice(0, 3) === normalizedName);

        if (prev && prev.score >= safeScore) {
            this.highScores = existing
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
        } else {
            const withoutName = existing.filter((e) => String(e.name).toUpperCase().slice(0, 3) !== normalizedName);
            const entry = { name: normalizedName, score: safeScore, at: now };
            this.highScores = [...withoutName, entry]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
        }

        try {
            window.localStorage.setItem('edu-mario-highscores', JSON.stringify(this.highScores));
        } catch (_) {}
    }

    formatHighScores() {
        const list = this.highScores || [];
        if (list.length === 0) {
            return this.t('gameOver.emptyRanking');
        }
        const lines = list.map((entry, index) => {
            const name = (entry.name || '---').padEnd(3, ' ');
            const score = String(entry.score).padStart(3, ' ');
            return `${index + 1}. ${name}  ${score}`;
        });
        return lines.join('\n');
    }

    triggerGameOver() {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;
        this.enteringInitials = true;
        this.initials = '';
        this.submittedScore = false;

        this.physics.pause();
        this.player.setVelocity(0, 0);
        this.player.anims?.stop();

        this.setGameOverUiVisible(true);
        this.gameOverUi.scoreLine.setText(this.t('gameOver.score', { score: this.score }));
        this.gameOverUi.initialsText.setText('___');
        const isTouch = this.isTouchDevice();
        const saveHintKey = isTouch ? 'gameOver.saveHintTouch' : 'gameOver.saveHint';
        this.gameOverUi.hint.setText(this.t(saveHintKey));
        this.gameOverUi.ranking.setText('');
        this.gameOverUi.restartHint.setText('');

        if (isTouch) {
            this.gameOverUi.initialsText.setInteractive({ useHandCursor: true });
            this.gameOverUi.prompt.setInteractive({ useHandCursor: true });
            this.gameOverUi.initialsText.on('pointerdown', () => this.openInitialsPrompt());
            this.gameOverUi.prompt.on('pointerdown', () => this.openInitialsPrompt());
            this.gameOverUi.overlay.setInteractive();
            this.gameOverUi.overlay.on('pointerdown', () => {
                if (this.submittedScore) {
                    this.scene.restart();
                }
            });
        }

        if (this.gameOverKeyHandler && this.input?.keyboard) {
            this.input.keyboard.off('keydown', this.gameOverKeyHandler);
        }

        this.gameOverKeyHandler = (event) => {
            if (!this.isGameOver) {
                return;
            }

            const key = String(event.key || '').toUpperCase();

            if (!this.submittedScore) {
                if (key === 'BACKSPACE') {
                    this.initials = this.initials.slice(0, -1);
                } else if (key === 'ENTER') {
                    if (this.initials.length === 3) {
                        this.submittedScore = true;
                        this.saveHighScore(this.initials, this.score);
                        this.loadHighScores();
                        this.gameOverUi.ranking.setText(this.formatHighScores());
                        this.gameOverUi.hint.setText('');
                        const restartKey = this.isTouchDevice() ? 'gameOver.restartHintTouch' : 'gameOver.restartHint';
                        this.gameOverUi.restartHint.setText(this.t(restartKey));
                    }
                } else if (/^[A-Z0-9]$/.test(key)) {
                    if (this.initials.length < 3) {
                        this.initials += key;
                    }
                }

                const display = (this.initials + '___').slice(0, 3);
                this.gameOverUi.initialsText.setText(display);
            } else {
                if (key === ' ' || key === 'SPACE' || key === 'SPACEBAR') {
                    this.scene.restart();
                }
            }
        };

        this.input.keyboard.on('keydown', this.gameOverKeyHandler);
    }

    createTextures() {
        const keyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        keyGraphics.fillStyle(0xf8fafc, 1);
        keyGraphics.fillRoundedRect(0, 0, 48, 22, 6);
        keyGraphics.lineStyle(2, 0x334155, 1);
        keyGraphics.strokeRoundedRect(1, 1, 46, 20, 6);
        keyGraphics.generateTexture('key', 48, 22);
        keyGraphics.destroy();

        const groundGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groundGraphics.fillStyle(0x1f2933, 1);
        groundGraphics.fillRect(0, 0, 32, 32);
        groundGraphics.generateTexture('ground-body', 32, 32);
        groundGraphics.destroy();

        const makeStarPoints = (cx, cy, spikes, outerRadius, innerRadius) => {
            const points = [];
            const step = Math.PI / spikes;
            let rot = -Math.PI / 2;
            for (let i = 0; i < spikes * 2; i += 1) {
                const r = (i % 2 === 0) ? outerRadius : innerRadius;
                points.push({ x: cx + Math.cos(rot) * r, y: cy + Math.sin(rot) * r });
                rot += step;
            }
            return points;
        };

        const starG = this.make.graphics({ x: 0, y: 0, add: false });
        starG.fillStyle(0xfbbf24, 1);
        starG.lineStyle(2, 0xb45309, 1);
        const starPoints = makeStarPoints(16, 16, 5, 14, 6);
        starG.fillPoints(starPoints, true);
        starG.strokePoints(starPoints, true);
        starG.generateTexture('power-star', 32, 32);
        starG.destroy();

        const shieldG = this.make.graphics({ x: 0, y: 0, add: false });
        shieldG.fillStyle(0x60a5fa, 1);
        shieldG.lineStyle(2, 0x1d4ed8, 1);
        // Forma simple (polígono) para máxima compatibilidad.
        const shieldPoints = [
            { x: 16, y: 2 },
            { x: 28, y: 8 },
            { x: 26, y: 20 },
            { x: 16, y: 30 },
            { x: 6, y: 20 },
            { x: 4, y: 8 }
        ];
        shieldG.fillPoints(shieldPoints, true);
        shieldG.strokePoints(shieldPoints, true);
        shieldG.generateTexture('power-shield', 32, 32);
        shieldG.destroy();
    }

    createPlatforms() {
        const groundHeight = 48;
        const groundY = GAME_HEIGHT - groundHeight / 2;
        const groundTileFrame = 78;

        this.groundTopY = groundY - groundHeight / 2;

        this.add.tileSprite(GAME_WIDTH / 2, groundY, GAME_WIDTH, groundHeight, 'tiles', groundTileFrame);

        this.ground = this.physics.add.staticImage(GAME_WIDTH / 2, groundY, 'ground-body');
        this.ground.setDisplaySize(GAME_WIDTH, groundHeight);
        this.ground.refreshBody();

        this.keys = this.physics.add.staticGroup();

        const keyY = 310;
        this.keyY = keyY;
        const startX = 100;
        const endX = GAME_WIDTH - 100;
        const spacing = (endX - startX) / (this.notes.length - 1);

        for (let i = 0; i < this.notes.length; i += 1) {
            const x = startX + i * spacing;
            const key = this.keys.create(x, keyY, 'key');
            key.setData('noteIndex', i);
            key.setData('noteName', this.notes[i]);
            key.setData('pianoSoundKey', this.getPianoSoundKeyForNoteIndex(i));
            key.setData('lastPianoAt', 0);
            key.refreshBody();

            this.add.text(x, keyY, this.notes[i], {
                fontSize: '14px',
                color: '#0f172a'
            }).setOrigin(0.5, 0.5);
        }

        // Flecha de pista (se muestra solo en modo assist)
        if (!this.hintArrow) {
            this.hintArrow = this.add.triangle(0, 0, 0, 18, 10, 0, 20, 18, 0x2563eb, 0.9).setOrigin(0.5);
            this.hintArrow.setDepth(20);
            this.hintArrow.setVisible(false);
        }
    }

    getPianoSoundKeyForNoteIndex(noteIndex) {
        const num = PIANO_SAMPLE_NUMBERS_BY_NOTE_INDEX[noteIndex];
        if (!num) {
            return null;
        }
        const padded = String(num).padStart(2, '0');
        return `piano-key${padded}`;
    }

    playPianoKeyForSprite(keySprite) {
        const soundKey = keySprite.getData('pianoSoundKey');
        if (!soundKey) {
            return;
        }

        const now = this.time.now;
        const last = keySprite.getData('lastPianoAt') || 0;
        if (now - last < PIANO_KEY_SOUND_COOLDOWN_MS) {
            return;
        }
        keySprite.setData('lastPianoAt', now);

        // Phaser Sound respeta el mismo AudioContext; si no está armado, intentará sonar tras la interacción.
        if (this.sound?.get(soundKey)) {
            this.sound.play(soundKey, { volume: 0.35 });
        } else {
            // Si aún no existe instancia, play lo crea internamente.
            this.sound?.play(soundKey, { volume: 0.35 });
        }
    }

    createPlayer() {
        this.playerStart = { x: 140, y: 420 };
        this.player = this.physics.add.sprite(this.playerStart.x, this.playerStart.y, 'sunnyAtlas', 'player/idle/player-idle-1');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(16, 28, true);

        this.anims.create({
            key: 'player-idle',
            frames: this.anims.generateFrameNames('sunnyAtlas', {
                prefix: 'player/idle/player-idle-',
                start: 1,
                end: 3
            }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'player-run',
            frames: this.anims.generateFrameNames('sunnyAtlas', {
                prefix: 'player/run/player-run-',
                start: 1,
                end: 6
            }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'player-jump',
            frames: this.anims.generateFrameNames('sunnyAtlas', {
                prefix: 'player/jump/player-jump-',
                start: 1,
                end: 2
            }),
            frameRate: 8,
            repeat: -1
        });
    }

    createEnemies() {
        this.enemies = this.physics.add.group();

        this.anims.create({
            key: 'opossum-walk',
            frames: this.anims.generateFrameNames('sunnyAtlas', {
                prefix: 'opossum/opossum-',
                start: 1,
                end: 6
            }),
            frameRate: 10,
            repeat: -1
        });
    }

    createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.input.addPointer(2);

    // Controles táctiles: botones más separados y alargados para mejorar la precisión.
    const buttonHeight = 44;
    const lrWidth = 92;
    const jumpWidth = 110;
    const lrGap = 26;
    const sidePadding = 18;
        const buttonAlpha = 0.6;

    const leftX = (lrWidth / 2) + sidePadding;
    const rightX = leftX + lrWidth + lrGap;
    const jumpX = GAME_WIDTH - (jumpWidth / 2) - sidePadding;

        const leftButton = this.add.rectangle(leftX, 0, lrWidth, buttonHeight, 0x0f172a, buttonAlpha).setInteractive();
        const rightButton = this.add.rectangle(rightX, 0, lrWidth, buttonHeight, 0x0f172a, buttonAlpha).setInteractive();
        const jumpButton = this.add.rectangle(jumpX, 0, jumpWidth, buttonHeight, 0x0f172a, buttonAlpha).setInteractive();

    const leftText = this.add.text(leftX, 0, '<', { fontSize: '22px', color: '#f8fafc' }).setOrigin(0.5);
    const rightText = this.add.text(rightX, 0, '>', { fontSize: '22px', color: '#f8fafc' }).setOrigin(0.5);
    const jumpText = this.add.text(jumpX, 0, this.t('controls.jump'), { fontSize: '16px', color: '#f8fafc' }).setOrigin(0.5);

        this.touchUi = {
            buttonHeight,
            leftX,
            rightX,
            jumpX,
            leftButton,
            rightButton,
            jumpButton,
            leftText,
            rightText,
            jumpText,
        };

        this.positionTouchControls();

        // En algunos móviles (rotación / barras de gestos) el safe-area cambia.
        // Reposicionamos controles en resize.
        try {
            this.scale?.on('resize', () => this.positionTouchControls());
        } catch {
            // ignore
        }

        const bindHoldButton = (button, flag) => {
            // En táctil es fácil que el dedo “se salga” unos píxeles y dispare pointerout.
            // Para que se comporte como una tecla (mantener mientras se pulsa),
            // mantenemos el estado hasta que el mismo puntero levanta.
            button.setData('activePointerId', null);

            const press = (pointer) => {
                this[flag] = true;
                button.setData('activePointerId', pointer?.id ?? null);
            };

            const release = (pointer) => {
                const activeId = button.getData('activePointerId');
                const pointerId = pointer?.id ?? null;
                if (activeId === null || pointerId === activeId) {
                    this[flag] = false;
                    button.setData('activePointerId', null);
                }
            };

            button.on('pointerdown', press);
            button.on('pointerup', release);
            button.on('pointerupoutside', release);

            // Fallback: si el puntero se levanta fuera del botón, liberamos igualmente.
            this.input.on('pointerup', release);
            this.input.on('gameout', () => {
                this[flag] = false;
                button.setData('activePointerId', null);
            });
        };

        bindHoldButton(leftButton, 'touchLeft');
        bindHoldButton(rightButton, 'touchRight');
        bindHoldButton(jumpButton, 'touchJump');
    }

    getSafeAreaInsetBottomPx() {
        // Leemos env(safe-area-inset-bottom) vía un elemento “probe”.
        // Si el navegador no soporta env/constant, devolverá 0.
        try {
            if (typeof document === 'undefined') {
                return 0;
            }
            const probe = document.createElement('div');
            probe.style.cssText = [
                'position:fixed',
                'left:0',
                'bottom:0',
                'height:0',
                'width:0',
                'padding-bottom:constant(safe-area-inset-bottom)',
                'padding-bottom:env(safe-area-inset-bottom)',
                'visibility:hidden',
                'pointer-events:none',
            ].join(';');
            document.body.appendChild(probe);
            const computed = window.getComputedStyle(probe);
            const px = parseFloat(computed.paddingBottom) || 0;
            probe.remove();
            return Number.isFinite(px) ? px : 0;
        } catch {
            return 0;
        }
    }

    positionTouchControls() {
        if (!this.touchUi) {
            return;
        }

        const safeBottom = this.getSafeAreaInsetBottomPx();
        // Deja un pequeño “aire” adicional para que el gesto de home no moleste.
        const bottomMargin = Math.max(0, safeBottom + 6);
        const buttonHeight = this.touchUi.buttonHeight || 50;
        const rawY = GAME_HEIGHT - (buttonHeight / 2) - bottomMargin;
        const buttonY = Phaser.Math.Clamp(rawY, buttonHeight / 2, GAME_HEIGHT - (buttonHeight / 2));

        const leftX = this.touchUi.leftX ?? 70;
        const rightX = this.touchUi.rightX ?? 140;
        const jumpX = this.touchUi.jumpX ?? (GAME_WIDTH - 70);

        this.touchUi.leftButton.setPosition(leftX, buttonY);
        this.touchUi.rightButton.setPosition(rightX, buttonY);
        this.touchUi.jumpButton.setPosition(jumpX, buttonY);

        this.touchUi.leftText.setPosition(leftX, buttonY);
        this.touchUi.rightText.setPosition(rightX, buttonY);
        this.touchUi.jumpText.setPosition(jumpX, buttonY);
    }

    createColliders() {
        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.player, this.keys, this.handleKeyHit, null, this);

        this.physics.add.collider(this.enemies, this.ground);
        this.physics.add.collider(this.enemies, this.keys);
        this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyOverlap, null, this);

        if (this.powerUps) {
            this.physics.add.collider(this.powerUps, this.ground);
            this.physics.add.collider(this.powerUps, this.keys);
            this.physics.add.overlap(this.player, this.powerUps, this.handlePowerUpOverlap, null, this);
        }
    }

    getAllowedNoteIndices() {
        // Orden de dificultad por tramos de 20 puntos:
        // (siempre primero graves y después agudas)
        // Ajuste: al principio los desbloqueos van cada 10 puntos
        // hasta llegar a Si y Do↑; a partir de ahí, cada 20.
        // 0-10: Sol, Mi
        // 10-20: + La
        // 20-30: + Do (grave)
        // 30-40: + Re (grave), Fa (grave)
        // 40-60: + Si (grave), Do↑ (agudo)
        // 60-80: + Re↑
        // 80-100: + Mi↑
        // >100: + Fa↑ (todas hasta Fa↑)
        const s = this.score;

        if (s < 10) {
            return [4, 2];
        }
        if (s < 20) {
            return [4, 2, 5];
        }
        if (s < 30) {
            return [4, 2, 5, 0];
        }
        if (s < 40) {
            return [4, 2, 5, 0, 1, 3];
        }
        if (s < 60) {
            return [4, 2, 5, 0, 1, 3, 6, 7];
        }

        if (s < 80) {
            return [4, 2, 5, 0, 1, 3, 6, 7, 8];
        }

        if (s < 100) {
            return [4, 2, 5, 0, 1, 3, 6, 7, 8, 9];
        }

        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }

    maybeSpawnMilestoneEnemies() {
        // Cada 20 puntos: aparece un enemigo más de forma aleatoria.
        while (this.score >= this.nextEnemyMilestone) {
            this.nextEnemyMilestone += 20;
            const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
            this.spawnEnemy(x);
        }
    }

    maybeSpawnRandomEnemies() {
        // A partir de 10 puntos, añade enemigos aleatorios de vez en cuando.
        // Importante: controlamos un cooldown para que no se convierta en una lluvia de enemigos.
        if (this.score < 10) {
            return;
        }

        const now = this.time?.now ?? Date.now();
        if (now < this.nextRandomEnemyAt) {
            return;
        }

        const tuning = this.getEnemySpawnTuning();

        // Probabilidad suave que sube un poco con la puntuación.
        // En low-perf y/o equipos lentos, mantenemos la presión más baja.
        const base = IS_LOW_PERF ? 0.18 : 0.25;
        const extra = Math.min(0.12, Math.floor(this.score / 20) * 0.03);
        const chance = Math.min(0.45, (base + extra) * tuning.chanceMul);

        if (Math.random() < chance) {
            const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
            this.spawnEnemy(x);

            this.nextRandomEnemyAt = now + Phaser.Math.Between(tuning.minDelay, tuning.maxDelay);
        } else {
            // Reintento pronto pero no cada frame.
            this.nextRandomEnemyAt = now + (IS_LOW_PERF ? 550 : 380);
        }
    }

    maybeGrantExtraLives() {
        // Cada 50 puntos: suma 1 vida.
        while (this.score >= this.nextLifeMilestone) {
            this.nextLifeMilestone += 50;
            this.lives += 1;
            this.livesText.setText(this.t('hud.lives', { lives: this.lives }));
            this.feedbackText.setText(this.t('feedback.extraLife'));
        }
    }

    handlePlayerEnemyOverlap(player, enemy) {
        if (!enemy.body || !enemy.active) {
            return;
        }

        // Pisotón más permisivo: basta con tocar al enemigo claramente desde arriba.
        // Nota: no dependemos solo del signo de la velocidad porque en overlaps/colisiones puede variar.
        const playerAbove = player.body.center.y < enemy.body.center.y - 2;
        const withinTopBand = player.body.bottom <= enemy.body.top + ENEMY_STOMP_EPSILON;
        const notStronglyRising = player.body.velocity.y >= ENEMY_STOMP_VY_THRESHOLD;

        if ((playerAbove || withinTopBand) && notStronglyRising) {
            enemy.disableBody(true, true);
            player.setVelocityY(ENEMY_STOMP_BOUNCE);
            this.feedbackText.setText(this.t('feedback.stomp'));
            this.playStompSound();
            return;
        }

        this.handleEnemyHit(enemy);
    }

    pickNewTarget() {
        const allowed = this.getAllowedNoteIndices();
        let next = allowed[Phaser.Math.Between(0, allowed.length - 1)];
        if (allowed.length > 1) {
            while (next === this.targetIndex) {
                next = allowed[Phaser.Math.Between(0, allowed.length - 1)];
            }
        }
        this.targetIndex = next;
        const dotY = this.notePositions[this.targetIndex];
        this.noteDot.y = dotY;
        this.updateLedger(dotY);

        // Actualiza hints cuando cambia el objetivo.
        this.updateHints();
    }

    updateLedger(dotY) {
        const { staffX, staffWidth, staffY, staffBottom, noteStep } = this.staffMetrics;
        this.noteLedger.clear();
        this.noteLedger.lineStyle(2, 0x1f2933, 0.9);

        if (dotY > staffBottom + noteStep) {
            this.noteLedger.lineBetween(staffX - 60, staffBottom + noteStep * 2, staffX + 60, staffBottom + noteStep * 2);
        } else if (dotY < staffY - noteStep) {
            this.noteLedger.lineBetween(staffX - 60, staffY - noteStep, staffX + 60, staffY - noteStep);
        }
    }

    handleKeyHit(player, key) {
        // Sonido de la tecla siempre que se toque (con cooldown para evitar spam).
        this.playPianoKeyForSprite(key);

        const now = this.time.now;
        if (now < this.keyResolveLockUntil) {
            return;
        }

        // Resolvemos el intento de dos formas:
        // 1) aterrizando sobre la tecla
        // 2) golpeando la tecla desde abajo (salto)
        const epsilon = 4;
        const landedOnKey =
            player.body.touching.down &&
            player.body.bottom <= key.body.top + epsilon;

        const hitFromBelow =
            player.body.touching.up &&
            player.body.top >= key.body.bottom - epsilon;

        if (!landedOnKey && !hitFromBelow) {
            return;
        }

        this.keyResolveLockUntil = now + 220;

        const hitIndex = key.getData('noteIndex');
        if (hitIndex === this.targetIndex) {
            this.recordAdaptiveEvent(true);
            this.bumpComboOnCorrect();
            const points = Math.max(1, Number(this.comboMultiplier) || 1);
            this.score += points;
            this.scoreText.setText(this.t('hud.score', { score: this.score }));
            this.feedbackText.setText(this.t('feedback.correct'));
            this.playSuccessSound();
            key.setTint(0x34d399);
            this.time.delayedCall(120, () => key.clearTint());

            this.maybeSpawnPowerUpOnStreak();

            this.maybeUpdateBackgroundByScore();

            this.maybeSpawnMilestoneEnemies();
            this.maybeSpawnRandomEnemies();
            this.maybeGrantExtraLives();
            this.pickNewTarget();

            this.updateAdaptiveDifficulty();
        } else {
            this.recordAdaptiveEvent(false);
            this.attempts += 1;
            this.attemptsText.setText(this.t('hud.attempts', { attempts: this.attempts }));
            this.feedbackText.setText(this.t('feedback.tryAgain'));
            this.playErrorSound();
            key.setTint(0xf87171);
            this.time.delayedCall(120, () => key.clearTint());
            this.spawnEnemy(key.x);

            this.resetCombo();

            this.updateAdaptiveDifficulty();
        }
    }

    spawnEnemy(spawnNearX) {
        const tuning = this.getEnemySpawnTuning();
        // En equipos lentos, el exceso de cuerpos de físicas degrada rápido.
        const activeCount = this.enemies?.countActive(true) ?? 0;
        if (activeCount >= tuning.maxEnemies) {
            let oldest = null;
            let oldestAt = Infinity;
            for (const child of this.enemies.getChildren()) {
                if (!child?.active) {
                    continue;
                }
                const at = child.getData('spawnAt') ?? 0;
                if (at < oldestAt) {
                    oldestAt = at;
                    oldest = child;
                }
            }
            oldest?.destroy();
        }

        const x = Phaser.Math.Clamp(spawnNearX + Phaser.Math.Between(-140, 140), 40, GAME_WIDTH - 40);
        const y = (this.groundTopY ?? (GAME_HEIGHT - 48)) - 18;

        const enemy = this.enemies.create(x, y, 'sunnyAtlas', 'opossum/opossum-1');
        enemy.setData('spawnAt', this.time?.now ?? Date.now());
        enemy.setCollideWorldBounds(true);
        enemy.setBounce(1, 0);
        const speed = Phaser.Math.Between(tuning.speedMin, tuning.speedMax);
        enemy.setVelocityX((Math.random() < 0.5 ? -1 : 1) * speed);
        // El spritesheet base parece mirar a la izquierda; invertimos al moverse a la derecha.
        enemy.flipX = enemy.body.velocity.x > 0;
        enemy.play('opossum-walk');
    }

    handleEnemyHit(enemy) {
        if (this.hitLock) {
            return;
        }

        const now = this.time?.now ?? Date.now();
        if (now < (this.invincibleUntil || 0)) {
            this.feedbackText.setText(this.t('feedback.blocked'));
            this.playSuccessSound();
            return;
        }

        if ((this.shieldCharges || 0) > 0) {
            this.shieldCharges -= 1;
            this.updateComboUi();
            this.feedbackText.setText(this.t('feedback.blocked'));
            this.playSuccessSound();
            this.resetCombo();
            // Evita que el overlap consuma escudo y, en el siguiente frame,
            // quite vida por seguir tocando al enemigo.
            this.hitLock = true;

            // En vez de reiniciar al inicio, aplicamos un pequeño knockback
            // para separar al jugador del enemigo y permitir continuar.
            const enemyX = (enemy && typeof enemy.x === 'number') ? enemy.x : this.player.x;
            const pushDir = this.player.x < enemyX ? -1 : 1;
            this.player.setVelocity(pushDir * 240, -220);

            this.tweens.add({
                targets: this.player,
                alpha: 0,
                duration: 70,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.player.alpha = 1;
                    this.hitLock = false;
                }
            });
            return;
        }

        this.hitLock = true;

        this.resetCombo();

        this.lives -= 1;
        this.livesText.setText(this.t('hud.lives', { lives: this.lives }));

        if (this.lives <= 0) {
            this.feedbackText.setText(this.t('gameOver.title'));
            this.triggerGameOver();
            return;
        }

        this.feedbackText.setText(this.t('feedback.enemyHit'));

        this.player.setVelocity(0, 0);
        this.player.setPosition(this.playerStart.x, this.playerStart.y);

        this.tweens.add({
            targets: this.player,
            alpha: 0,
            duration: 80,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.player.alpha = 1;
                this.hitLock = false;
            }
        });
    }

    update() {
        if (this.isGameOver) {
            return;
        }

        const now = this.time?.now ?? Date.now();
        const invActive = now < (this.invincibleUntil || 0);
        if (invActive && !this.invincibleTintActive) {
            this.player?.setTint(0xfbbf24);
            this.invincibleTintActive = true;
        } else if (!invActive && this.invincibleTintActive) {
            this.player?.clearTint();
            this.invincibleTintActive = false;
        }

        // Mantén la flecha de pista en su sitio si cambia la escala.
        this.positionHintArrow();

        // Reducimos escrituras por frame en equipos lentos.
        this.parallaxTick += 1;
        if (PARALLAX_EVERY_N_FRAMES <= 1 || (this.parallaxTick % PARALLAX_EVERY_N_FRAMES) === 0) {
            if (this.bgBack) {
                this.bgBack.tilePositionX = this.player.x * 0.06;
            }
            if (this.bgMid) {
                this.bgMid.tilePositionX = this.player.x * 0.12;
            }
        }

        // Asegura que los enemigos “se den la vuelta” al cambiar de dirección.
        // (Arcade cambia la velocidad, pero el sprite no se voltea solo.)
        if (ENEMY_FLIP_EVERY_N_FRAMES <= 1 || (this.parallaxTick % ENEMY_FLIP_EVERY_N_FRAMES) === 0) {
            if (this.enemies) {
                for (const enemy of this.enemies.getChildren()) {
                    if (!enemy?.active || !enemy.body) {
                        continue;
                    }
                    const vx = enemy.body.velocity?.x ?? 0;
                    if (vx < -1) {
                        enemy.flipX = false;
                    } else if (vx > 1) {
                        enemy.flipX = true;
                    }
                }
            }
        }

        const moveLeft = this.cursors.left.isDown || this.touchLeft;
        const moveRight = this.cursors.right.isDown || this.touchRight;

        // En táctil necesitamos distinguir entre “acaba de pulsar” y “mantiene pulsado”.
        // Si tratamos touchJump como JustDown, el salto se recorta inmediatamente y no llega a las notas.
        const touchJumpJustDown = this.touchJump && !this.touchJumpWasDown;
        this.touchJumpWasDown = this.touchJump;

        const wantsJump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
            touchJumpJustDown;

        const jumpHeld = this.cursors.up.isDown || this.jumpKey.isDown || this.touchJump;

        if (moveLeft) {
            this.player.setVelocityX(-PLAYER_SPEED);
            this.player.flipX = true;
        } else if (moveRight) {
            this.player.setVelocityX(PLAYER_SPEED);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
        }

        if (wantsJump && this.player.body.blocked.down) {
            this.player.setVelocityY(PLAYER_JUMP_VELOCITY);
            this.jumpCutApplied = false;
        }

        // Salto variable: si sueltas el botón mientras aún subes, recortamos la velocidad vertical.
        if (!jumpHeld && !this.jumpCutApplied && this.player.body.velocity.y < 0) {
            this.player.setVelocityY(this.player.body.velocity.y * JUMP_CUT_MULTIPLIER);
            this.jumpCutApplied = true;
        }

        if (this.player.body.blocked.down) {
            this.jumpCutApplied = false;
        }

        if (!this.player.body.blocked.down) {
            this.player.play('player-jump', true);
        } else if (moveLeft || moveRight) {
            this.player.play('player-run', true);
        } else {
            this.player.play('player-idle', true);
        }

    }
}

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#bcd7ff',
    render: {
        pixelArt: IS_LOW_PERF,
        antialias: !IS_LOW_PERF,
        roundPixels: IS_LOW_PERF
    },
    fps: {
        target: TARGET_FPS,
        forceSetTimeOut: IS_LOW_PERF
    },
    resolution: IS_LOW_PERF ? 1 : (window.devicePixelRatio || 1),
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1400 },
            debug: false,
            fps: TARGET_FPS
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: 'game-container'
    },
    scene: [EduMarioScene]
};

new Phaser.Game(config);
