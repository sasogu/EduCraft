(() => {
  const DEFAULT_MAX_ENTRIES = 10;
  const DEFAULT_INITIALS = 'AAA';
  const GENERIC_ANON_INITIALS = new Set(['ANO']);
  const CURRENT_SCRIPT = (typeof document !== 'undefined') ? document.currentScript : null;
  const DEFAULT_CONFIG_URL = (() => {
    if (!CURRENT_SCRIPT || !CURRENT_SCRIPT.src) return null;
    try {
      return new URL('firebase-config.js', CURRENT_SCRIPT.src).href;
    } catch (_) {
      return null;
    }
  })();
  const FIREBASE_SDK_URLS = [
    'https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore-compat.js',
  ];

  let DEBUG = false;
  function debugLog(...args) {
    if (!DEBUG) return;
    try {
      console.log('[ScoreService]', ...args);
    } catch (_) {}
  }

  const FirebaseBackend = {
    sdkUrls: FIREBASE_SDK_URLS,
    scriptPromises: Object.create(null),
    initPromise: null,
    config: undefined,
    app: null,
    db: null,
    configScriptUrl: DEFAULT_CONFIG_URL,
    configScriptPromise: null,

    overrideConfig(value) {
      if (value && typeof value === 'object') {
        this.config = value;
        debugLog('Firebase config overridden', Object.keys(value));
      } else if (value === null) {
        this.config = null;
        debugLog('Firebase explicitly disabled');
      } else {
        this.config = undefined;
        debugLog('Firebase config reset to undefined');
      }
      this.reset();
    },

    reset() {
      this.initPromise = null;
      this.app = null;
      this.db = null;
      this.configScriptPromise = null;
      debugLog('Firebase backend reset');
    },

    readConfig() {
      if (typeof window !== 'undefined') {
        const globalConfig = window.EDUMUSIC_FIREBASE_CONFIG
          || window.EduMusicFirebaseConfig
          || window.firebaseConfig
          || null;
        if (globalConfig && typeof globalConfig === 'object') return globalConfig;
      }
      if (typeof document !== 'undefined') {
        const script = document.querySelector('script[type="application/json"][data-firebase-config]');
        if (script && script.textContent) {
          try {
            const parsed = JSON.parse(script.textContent);
            if (parsed && typeof parsed === 'object') return parsed;
          } catch (_) {}
        }
        const meta = document.querySelector('meta[name="edumusic:firebase-config"]');
        if (meta && typeof meta.content === 'string' && meta.content.trim()) {
          try {
            const parsed = JSON.parse(meta.content);
            if (parsed && typeof parsed === 'object') return parsed;
          } catch (_) {}
        }
      }
      return null;
    },

    async ensureConfigLoaded() {
      if (this.config !== undefined && this.config !== null) return this.config;
      if (typeof window !== 'undefined' && window.EDUMUSIC_FIREBASE_CONFIG !== undefined) {
        this.config = this.readConfig() || null;
        debugLog('Firebase config read from window', !!this.config);
        return this.config;
      }
      if (!this.configScriptUrl || typeof document === 'undefined') {
        if (this.config === undefined) this.config = null;
        debugLog('No firebase config script available, remote disabled');
        return this.config;
      }
      if (!this.configScriptPromise) {
        debugLog('Loading firebase config script', this.configScriptUrl);
        this.configScriptPromise = this.loadScript(this.configScriptUrl).catch((err) => {
          console.warn('[ScoreService] Firebase config script failed to load', err);
        });
      }
      try {
        await this.configScriptPromise;
        debugLog('Firebase config script loaded');
      } catch (_) {}
      if (this.config === undefined) {
        this.config = this.readConfig() || null;
        debugLog('Firebase config after script load', !!this.config);
      }
      return this.config;
    },

    ensureConfig() {
      if (this.config === undefined) {
        this.config = this.readConfig() || null;
      }
      return this.config;
    },

    isConfigured() {
      const cfg = this.ensureConfig();
      const ready = cfg && typeof cfg === 'object' && typeof cfg.apiKey === 'string';
      debugLog('isConfigured?', ready, cfg && cfg.projectId);
      return ready;
    },

    loadScript(src) {
      if (this.scriptPromises[src]) return this.scriptPromises[src];
      if (typeof document === 'undefined') {
        this.scriptPromises[src] = Promise.reject(new Error('Firebase SDK requires a DOM environment'));
        return this.scriptPromises[src];
      }
      this.scriptPromises[src] = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if (existing.dataset && existing.dataset.loaded === 'true') {
            debugLog('Script already loaded', src);
            resolve();
            return;
          }
          existing.addEventListener('load', () => {
            debugLog('Script load event (existing)', src);
            resolve();
          });
          existing.addEventListener('error', () => reject(new Error(`Failed loading ${src}`)));
          return;
        }
        const el = document.createElement('script');
        el.src = src;
        el.async = false;
        el.defer = false;
        el.crossOrigin = 'anonymous';
        el.addEventListener('load', () => {
          if (el.dataset) el.dataset.loaded = 'true';
          debugLog('Script load event', src);
          resolve();
        });
        el.addEventListener('error', () => reject(new Error(`Failed loading ${src}`)));
        document.head.appendChild(el);
        debugLog('Script appended', src);
      });
      return this.scriptPromises[src];
    },

    async ensureScripts() {
      debugLog('Ensuring Firebase SDK scripts');
      for (const src of this.sdkUrls) {
        await this.loadScript(src);
      }
      debugLog('Firebase SDK scripts ready');
    },

    async ensureInit() {
      if (this.db) return this.db;
      await this.ensureConfigLoaded();
      const config = this.ensureConfig();
      if (!config || typeof config !== 'object' || !config.apiKey) {
        debugLog('Firebase config missing apiKey, skipping init');
        return null;
      }
      if (!this.initPromise) {
        debugLog('Initialising Firebase');
        this.initPromise = (async () => {
          await this.ensureScripts();
          const firebase = window.firebase;
          if (!firebase || typeof firebase.initializeApp !== 'function') {
            throw new Error('Firebase SDK not available on window');
          }
          let app;
          try {
            if (firebase.apps && firebase.apps.length) {
              app = firebase.apps.find((candidate) => {
                try {
                  return candidate && candidate.options && candidate.options.projectId === config.projectId;
                } catch (_) {
                  return false;
                }
              }) || firebase.app();
            } else {
              app = firebase.initializeApp(config);
            }
          } catch (err) {
            if (err && err.code === 'app/duplicate-app') {
              app = firebase.app();
            } else {
              throw err;
            }
          }
          const db = firebase.firestore(app);
          try {
            db.settings({ ignoreUndefinedProperties: true });
          } catch (_) {}
          this.app = app;
          this.db = db;
          debugLog('Firebase initialised for project', config.projectId || config.project_id || 'unknown');
          return db;
        })().catch((err) => {
          console.warn('[ScoreService] Firebase initialisation failed', err);
          this.reset();
          return null;
        });
      }
      return this.initPromise;
    },

    collectionRef(board, period = 'all-time', options = {}) {
      const db = this.db;
      if (!db) return null;
      const { weekKey, useLegacyWeekly = false } = options || {};
      const rawKey = (board && board.options && (board.options.rankKey || board.options.gameId)) || 'default';
      const key = sanitizeKey(rawKey) || 'default';
      const docRef = db.collection('leaderboards').doc(key);
      let reference = null;
      if (period === 'weekly') {
        if (useLegacyWeekly) {
          reference = docRef.collection('entries-weekly');
        } else {
          const resolvedWeekKey = weekKey || getWeekKey();
          if (!resolvedWeekKey) return null;
          reference = docRef.collection('weekly').doc(resolvedWeekKey).collection('entries');
        }
      } else {
        reference = docRef.collection('entries');
      }
      const refPath = getRefPath(reference);
      debugLog('collectionRef resolved', {
        period,
        key,
        weekKey: options.weekKey || null,
        legacy: !!useLegacyWeekly,
        path: refPath,
      });
      return reference;
    },

    normaliseEntryPayload(board, entry) {
      const firebase = window.firebase;
      const nowDate = new Date();
      let createdAtLocal = nowDate;
      const weekKey = getWeekKey(nowDate);
      if (firebase && firebase.firestore && firebase.firestore.Timestamp) {
        createdAtLocal = firebase.firestore.Timestamp.fromDate(nowDate);
      }
      debugLog('normaliseEntryPayload', {
        gameId: board && board.options && board.options.gameId,
        weekKey,
        timestamp: nowDate.toISOString(),
      });
      const payload = {
        name: normalizeInitials(entry && entry.name != null ? entry.name : '') || DEFAULT_INITIALS,
        score: Number(entry && entry.score != null ? entry.score : 0) || 0,
        createdAt: firebase && firebase.firestore && firebase.firestore.FieldValue
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null,
        createdAtLocal,
        tsString: entry && entry.ts ? entry.ts : nowDate.toISOString(),
        gameId: (board && board.options && board.options.gameId) || null,
        weekKey,
        version: 2,
      };
      debugLog('normaliseEntryPayload payload keys', Object.keys(payload));
      return payload;
    },

    async addEntry(board, entry) {
      const db = await this.ensureInit();
      if (!db) return false;
      try {
        // Prepare payload and collection references
        const payload = this.normaliseEntryPayload(board, entry);
        const currentWeekKey = payload && payload.weekKey ? payload.weekKey : getWeekKey();
        const payloadAllTime = { ...payload };
        delete payloadAllTime.weekKey;
        const collAllTime = this.collectionRef(board, 'all-time');
        const collWeekly = this.collectionRef(board, 'weekly', { weekKey: currentWeekKey });
        const collWeeklyLegacy = this.collectionRef(board, 'weekly', { weekKey: currentWeekKey, useLegacyWeekly: true });

        if (collAllTime) await collAllTime.add(payloadAllTime);
        debugLog('addEntry remote save complete', {
          gameId: board && board.options && board.options.gameId,
          period: 'all-time',
          path: getRefPath(collAllTime),
        });
        if (collWeekly) {
          await collWeekly.add(payload);
          debugLog('addEntry remote save complete', {
            gameId: board && board.options && board.options.gameId,
            period: 'weekly',
            weekKey: currentWeekKey,
            path: getRefPath(collWeekly),
          });
        }
        if (collWeeklyLegacy) {
          await collWeeklyLegacy.add(payload);
          debugLog('addEntry remote save complete', {
            gameId: board && board.options && board.options.gameId,
            period: 'weekly-legacy',
            weekKey: currentWeekKey,
            path: getRefPath(collWeeklyLegacy),
          });
        }
        
        return true;
      } catch (err) {
        console.warn('[ScoreService] Firebase addEntry failed', {
          gameId: board && board.options && board.options.gameId,
          payloadKeys: payload ? Object.keys(payload) : [],
          weekKey: currentWeekKey,
        }, err);
        return false;
      }
    },

    parseSnapshot(doc) {
      if (!doc) return null;
      const data = doc.data && typeof doc.data === 'function' ? doc.data() : doc;
      if (!data || typeof data !== 'object') return null;
      let ts = null;
      try {
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          ts = data.createdAt.toDate();
        } else if (data.createdAtLocal && typeof data.createdAtLocal.toDate === 'function') {
          ts = data.createdAtLocal.toDate();
        } else if (data.tsString) {
          ts = new Date(data.tsString);
        }
      } catch (_) {
        ts = null;
      }
      if (!(ts instanceof Date) || Number.isNaN(ts.getTime())) ts = new Date();
      return {
        name: normalizeInitials(data.name != null ? data.name : '') || DEFAULT_INITIALS,
        score: Number(data.score != null ? data.score : 0) || 0,
        ts: ts.toISOString(),
      };
    },

    async fetchEntries(board, period = 'all-time') {
      const db = await this.ensureInit();
      if (!db) {
        debugLog('fetchEntries: Firestore unavailable, using local', board && board.options && board.options.gameId);
        return null;
      }
      const weekReference = period === 'weekly' ? new Date() : null;
      const weekStart = weekReference ? getWeekStart(weekReference) : null;
      const weekKey = weekReference ? getWeekKey(weekReference) : null;
      const coll = this.collectionRef(
        board,
        period,
        weekKey ? { weekKey } : undefined,
      );
      if (!coll) {
        debugLog('fetchEntries: collectionRef missing', board && board.options && board.options.gameId);
        return null;
      }
      const limit = (board && board.options && board.options.maxEntries) || DEFAULT_MAX_ENTRIES;

      const processWeeklyEntries = (entries) => {
        if (!weekStart) return entries;
        const filtered = entries.filter((entry) => {
          const ts = new Date(entry.ts);
          return ts >= weekStart;
        });
        filtered.sort((a, b) => b.score - a.score || new Date(a.ts) - new Date(b.ts));
        const top = filtered.slice(0, limit);
        debugLog('fetchEntries: weekly post-process', filtered.length, '->', top.length);
        return top;
      };

      const runQuery = async (query, { weeklyFilter = false, label = 'unnamed' } = {}) => {
        debugLog('fetchEntries: runQuery start', {
          label,
          period,
          gameId: board && board.options && board.options.gameId,
          weeklyFilter,
          path: getRefPath(query),
        });
        const snap = await query.get();
        const entries = [];
        if (snap && typeof snap.forEach === 'function') {
          snap.forEach((doc) => {
            const parsed = this.parseSnapshot(doc);
            if (parsed) entries.push(parsed);
          });
        }
        debugLog('fetchEntries: runQuery done', {
          label,
          rawEntries: entries.length,
          weeklyFilter,
        });
        const result = weeklyFilter ? processWeeklyEntries(entries) : entries;
        debugLog('fetchEntries: runQuery result size', {
          label,
          returned: Array.isArray(result) ? result.length : 0,
        });
        return result;
      };

      const attempts = [];
      const enqueueAttempt = (label, fn) => {
        attempts.push({ label, fn });
      };
      if (period === 'weekly') {
        const weeklyFetchLimit = Math.min(200, Math.max(limit * 5, limit + 40));
        if (coll && weekKey) {
          debugLog('Weekly scoped collection query', weekKey, 'limit', limit);
          enqueueAttempt(
            'weekly-scoped-score+created',
            () => runQuery(
              coll.orderBy('score', 'desc').orderBy('createdAt', 'asc').limit(limit),
              { label: 'weekly-scoped-score+created' },
            ),
          );
          enqueueAttempt(
            'weekly-scoped-score',
            () => runQuery(
              coll.orderBy('score', 'desc').limit(limit),
              { label: 'weekly-scoped-score' },
            ),
          );
        }

        // Legacy structure fallback (single collection)
        const legacyColl = this.collectionRef(board, 'weekly', { useLegacyWeekly: true });
        if (legacyColl) {
          if (weekKey) {
            debugLog('Legacy weekKey query', weekKey, 'limit', limit);
            enqueueAttempt(
              'legacy-weekKey-score+created',
              () => runQuery(
                legacyColl
                  .where('weekKey', '==', weekKey)
                  .orderBy('score', 'desc')
                  .orderBy('createdAt', 'asc')
                  .limit(limit),
                { label: 'legacy-weekKey-score+created' },
              ),
            );
            enqueueAttempt(
              'legacy-weekKey-score',
              () => runQuery(
                legacyColl
                  .where('weekKey', '==', weekKey)
                  .orderBy('score', 'desc')
                  .limit(limit),
                { label: 'legacy-weekKey-score' },
              ),
            );
          }
          const firebase = window.firebase;
          if (firebase && firebase.firestore && firebase.firestore.Timestamp && weekStart) {
            const weekTimestamp = firebase.firestore.Timestamp.fromDate(weekStart);
            debugLog('Legacy createdAt filter: from', weekStart.toISOString(), 'limit', weeklyFetchLimit);
            enqueueAttempt(
              'legacy-createdAt-range',
              () => runQuery(
                legacyColl
                  .where('createdAtLocal', '>=', weekTimestamp)
                  .orderBy('createdAtLocal', 'asc')
                  .limit(weeklyFetchLimit),
                { weeklyFilter: true, label: 'legacy-createdAt-range' },
              ),
            );
          }
          enqueueAttempt(
            'legacy-createdAt-desc',
            () => runQuery(
              legacyColl
                .orderBy('createdAtLocal', 'desc')
                .limit(weeklyFetchLimit),
              { weeklyFilter: true, label: 'legacy-createdAt-desc' },
            ),
          );
        }
      } else {
        enqueueAttempt(
          'all-time-score+created',
          () => runQuery(
            coll.orderBy('score', 'desc').orderBy('createdAt', 'asc').limit(limit),
            { label: 'all-time-score+created' },
          ),
        );
        enqueueAttempt(
          'all-time-score',
          () => runQuery(
            coll.orderBy('score', 'desc').limit(limit),
            { label: 'all-time-score' },
          ),
        );
      }

      for (let i = 0; i < attempts.length; i += 1) {
        try {
          const { label, fn } = attempts[i];
          debugLog('fetchEntries: attempt start', {
            label,
            index: i,
            period,
            gameId: board && board.options && board.options.gameId,
          });
          const entries = await fn();
          if (Array.isArray(entries)) return entries;
        } catch (err) {
          const label = attempts[i] && attempts[i].label ? attempts[i].label : `attempt-${i}`;
          if (i === attempts.length - 1) {
            console.warn('[ScoreService] Firebase fetchEntries failed', label, err);
            return null;
          }
          console.warn('[ScoreService] Firebase fetchEntries retrying with reduced query', label, err);
          debugLog('fetchEntries: retrying with fallback query', { label, nextAttempt: i + 1 });
        }
      }
      return null;
    },
  };

  function normalizeInitials(raw) {
    if (raw == null) return '';
    const upper = raw.toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filtered = upper.replace(/[^A-Z0-9]/g, '');
    return filtered.slice(0, 3);
  }

  function ensureInitials(raw, fallbackRaw) {
    const primary = normalizeInitials(raw);
    if (primary) return primary;
    const fallback = normalizeInitials(fallbackRaw);
    if (fallback && !GENERIC_ANON_INITIALS.has(fallback)) return fallback;
    return DEFAULT_INITIALS;
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function sanitizeKey(str) {
    return (str || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function getWeekStart(referenceDate = new Date()) {
    const now = new Date(referenceDate);
    const dayOfWeek = now.getUTCDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo, retroceder 6 días
    const mondayDate = now.getUTCDate() - daysToMonday;
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      mondayDate,
      0, 1, 0, 0,
    ));
  }

  function getWeekKey(referenceDate = new Date()) {
    const monday = getWeekStart(referenceDate);
    return monday.toISOString().slice(0, 10);
  }
  
  function getRefPath(ref) {
    if (!ref || typeof ref !== 'object') return null;
    try {
      if (typeof ref.path === 'string') return ref.path;
    } catch (_) {
      return null;
    }
    return null;
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value == null) return;
      if (key === 'text') {
        el.textContent = value;
      } else if (key === 'html') {
        el.innerHTML = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    children.forEach((child) => {
      if (child) el.appendChild(child);
    });
    return el;
  }

  function buildMarkup(board) {
    const section = board.root;
    section.classList.add('scoreboard');
    const heading = createEl('h2', {
      'data-i18n': board.options.headingKey,
      text: board.options.headingFallback,
      style: 'margin: 0.5em 0;',
    });

    const saveBox = createEl('div', {
      class: 'scoreboard__save',
      style: 'background:#f8fafc; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-top: 12px;',
    });
    saveBox.style.display = 'none';
    const scoreRow = createEl('div', { class: 'scoreboard__save-row' }, [
      createEl('span', {
        'data-i18n': 'game.save.your_score',
        text: 'Tu puntuación:',
      }),
      createEl('strong', { class: 'scoreboard__final-score', text: '0' }),
    ]);
    const label = createEl('label', {
      for: board.ids.input,
      'data-i18n': 'game.save.your_name',
      text: 'Tus iniciales:',
    });
    const nameInput = createEl('input', {
      id: board.ids.input,
      type: 'text',
      maxlength: '3',
      'data-i18n': 'game.save.placeholder',
      'data-i18n-attr': 'placeholder',
      placeholder: 'Introduce tus iniciales',
      class: 'scoreboard__input',
    });
    const saveButton = createEl('button', {
      id: board.ids.button,
      'data-i18n': 'game.save.button',
      text: 'Guardar puntuación',
      class: 'scoreboard__save-btn',
    });
    const form = createEl('div', { class: 'scoreboard__save-form' }, [
      label,
      nameInput,
      saveButton,
    ]);
    saveBox.appendChild(scoreRow);
    saveBox.appendChild(form);

    const list = createEl('ol', {
      class: 'scoreboard__list',
      style: 'padding-left: 1.2em; margin-top: 12px;',
    });

    section.appendChild(heading);
    section.appendChild(saveBox);
    section.appendChild(list);

    return {
      heading,
      saveBox,
      finalScore: scoreRow.querySelector('strong'),
      nameInput,
      saveButton,
      list,
    };
  }

  class Board {
    constructor(service, element, options) {
      this.service = service;
      this.root = element;
      this.options = {
        gameId: options.gameId,
        rankKey: options.rankKey || options.gameId,
        maxEntries: options.maxEntries || DEFAULT_MAX_ENTRIES,
        headingKey: options.headingKey || 'game.ranking',
        headingFallback: options.headingFallback || 'Ranking',
        showSaveAt: typeof options.showSaveAt === 'number' ? options.showSaveAt : 1,
        period: options.period || 'all-time', // 'all-time' or 'weekly'
      };
      this.ids = {
        input: `${this.options.rankKey}-${this.options.period}-playerName`,
        button: `${this.options.rankKey}-${this.options.period}-saveBtn`,
      };
      this.dom = buildMarkup(this);
      this.state = {
        latestScore: 0,
        entries: [],
        loading: false,
      };
      this.bindEvents();
      this.applyTranslations();
    }

    bindEvents() {
      this.dom.saveButton.addEventListener('click', () => {
        this.submit();
      });
      this.dom.nameInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          this.submit();
        }
      });
      this.dom.nameInput.addEventListener('input', () => {
        const sanitized = normalizeInitials(this.dom.nameInput.value);
        this.dom.nameInput.value = sanitized;
      });
    }

    focusInput() {
      try {
        this.dom.nameInput.focus();
      } catch (_) {}
    }

    toggleSaveBox(visible) {
      this.dom.saveBox.style.display = visible ? '' : 'none';
    }

    isEligibleScore(score) {
      const numeric = Number(score);
      if (!Number.isFinite(numeric) || numeric < this.options.showSaveAt) {
        return false;
      }
      if (!this.service || typeof this.service.projectEntry !== 'function') {
        return true;
      }
      try {
        const projection = this.service.projectEntry(this, {
          name: DEFAULT_INITIALS,
          score: numeric,
          ts: new Date().toISOString(),
        }, { persist: false });
        return !!(projection && projection.included);
      } catch (_) {
        return true;
      }
    }

    showSave(score) {
      this.state.latestScore = score;
      if (!this.isEligibleScore(score)) {
        this.toggleSaveBox(false);
        return;
      }
      this.dom.finalScore.textContent = String(score);
      this.dom.nameInput.value = '';
      this.toggleSaveBox(true);
      setTimeout(() => this.focusInput(), 0);
    }

    hideSave() {
      this.toggleSaveBox(false);
    }

    getDefaultName() {
      if (window.i18n && typeof window.i18n.t === 'function') {
        const value = window.i18n.t('game.save.anon');
        if (value && value !== 'game.save.anon') return value;
      }
      const lang = (window.i18n && typeof window.i18n.getLang === 'function') ? window.i18n.getLang() : 'es';
      if (lang === 'val') return 'Anònim';
      if (lang === 'en') return 'Anonymous';
      return 'Anónimo';
    }

    applyTranslations() {
      if (window.i18n && typeof window.i18n.apply === 'function') {
        window.i18n.apply(this.root);
      }
    }

    async submitWithName(rawName) {
      if (this.state.latestScore < this.options.showSaveAt) return false;
      const name = ensureInitials(rawName, this.getDefaultName());
      this.dom.nameInput.value = name;
      this.dom.saveButton.disabled = true;
      try {
        await this.service.addEntry(this, name, this.state.latestScore);
        this.hideSave();
        
        // Refresh all boards for this game (both all-time and weekly)
        const allBoards = this.service.getBoardsByGame(this.options.gameId);
        for (const board of allBoards) {
          await board.refresh();
        }
        
        window.dispatchEvent(new CustomEvent('score:saved', {
          detail: { gameId: this.options.gameId, score: this.state.latestScore, name },
        }));
        return true;
      } finally {
        this.dom.saveButton.disabled = false;
      }
    }

    async submit() {
      return this.submitWithName(this.dom.nameInput.value || '');
    }

    renderList(entries) {
      this.state.entries = Array.isArray(entries) ? entries : [];
      this.dom.list.innerHTML = '';
      if (this.state.entries.length === 0) {
        const li = createEl('li', {
          'data-i18n': 'game.rank.empty',
          text: 'Aún no hay puntuaciones. ¡Sé el primero!',
        });
        this.dom.list.appendChild(li);
        this.applyTranslations();
        return;
      }
      const ptsLabel = (window.i18n && typeof window.i18n.t === 'function')
        ? window.i18n.t('game.rank.pts')
        : 'pts';
      const formatDateEs = (d) => {
        if (!(d instanceof Date)) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };
      this.state.entries.forEach((entry) => {
        const li = createEl('li');
        const date = new Date(entry.ts || Date.now());
        const normalized = normalizeInitials(entry.name || '');
        const initials = (normalized && !GENERIC_ANON_INITIALS.has(normalized))
          ? normalized
          : DEFAULT_INITIALS;
        const dateLabel = formatDateEs(date);
        li.textContent = `${initials} — ${entry.score} ${ptsLabel} (${dateLabel})`;
        this.dom.list.appendChild(li);
      });
      this.applyTranslations();
    }

    async refresh() {
      const period = this.options.period || 'all-time';
      const entries = await this.service.loadEntries(this, period);
      this.renderList(entries);
    }
  }

  const ScoreService = {
    config: {
    },
    boards: new Map(),
    listenerAttached: false,

    configure(opts = {}) {
      if (Object.prototype.hasOwnProperty.call(opts, 'firebase')) {
        if (opts.firebase && typeof opts.firebase === 'object') {
          if (Array.isArray(opts.firebase.sdkUrls) && opts.firebase.sdkUrls.length) {
            FirebaseBackend.sdkUrls = opts.firebase.sdkUrls.slice();
            FirebaseBackend.scriptPromises = Object.create(null);
            debugLog('configure: sdkUrls override', FirebaseBackend.sdkUrls);
          }
          if (isNonEmptyString(opts.firebase.configUrl)) {
            const baseHref = (CURRENT_SCRIPT && CURRENT_SCRIPT.src)
              || (typeof window !== 'undefined' ? window.location.href : undefined)
              || undefined;
            try {
              FirebaseBackend.configScriptUrl = baseHref
                ? new URL(opts.firebase.configUrl, baseHref).href
                : opts.firebase.configUrl;
            } catch (_) {
              FirebaseBackend.configScriptUrl = opts.firebase.configUrl;
            }
            FirebaseBackend.configScriptPromise = null;
            debugLog('configure: configUrl override', FirebaseBackend.configScriptUrl);
          }
          if (opts.firebase.config) {
            FirebaseBackend.overrideConfig(opts.firebase.config);
            debugLog('configure: direct firebase config provided');
          }
        } else if (opts.firebase === null || opts.firebase === false) {
          FirebaseBackend.overrideConfig(null);
        }
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'firebaseConfig')) {
        FirebaseBackend.overrideConfig(opts.firebaseConfig);
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'debug')) {
        DEBUG = !!opts.debug;
        debugLog('Debug mode set via configure()', DEBUG);
      }
      if (Array.isArray(opts.mount) && opts.mount.length) {
        opts.mount.forEach((item) => this.mountOne(item.element, item.options || {}));
      }
      this.scanDom();
    },

    mountOne(element, options = {}) {
      if (!element || this.boards.has(element)) return;
      const gameId = options.gameId || element.getAttribute('data-game') || element.id;
      if (!gameId) return;
      const rankKey = options.rankKey || element.getAttribute('data-rank-key') || gameId;
      const board = new Board(this, element, {
        gameId,
        rankKey,
        maxEntries: this.parseNumber(
          element.getAttribute('data-max-entries'),
          options.maxEntries,
          { allowZero: false, min: 1 },
        ),
        headingKey: element.getAttribute('data-heading-key') || options.headingKey,
        headingFallback: element.getAttribute('data-heading') || options.headingFallback,
        showSaveAt: this.parseNumber(
          element.getAttribute('data-show-save-at'),
          options.showSaveAt,
          { allowZero: true, min: 0 },
        ),
        period: element.getAttribute('data-period') || options.period || 'all-time',
      });
      this.boards.set(element, board);
      board.refresh();
    },

    parseNumber(value, fallback, { allowZero = false, min = allowZero ? 0 : 1 } = {}) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        if (!allowZero && parsed === 0) {
          // ignore explicit zero when zero not allowed
        } else if (parsed >= min) {
          return parsed;
        }
      }
      const fallbackNum = Number(fallback);
      if (Number.isFinite(fallbackNum)) {
        if (!allowZero && fallbackNum === 0) {
          return undefined;
        }
        if (fallbackNum >= min) return fallbackNum;
      }
      return undefined;
    },

    scanDom() {
      const sections = document.querySelectorAll('[data-scoreboard]');
      sections.forEach((section) => this.mountOne(section, {}));
      if (!this.listenerAttached && window.i18n && typeof window.i18n.onChange === 'function') {
        window.i18n.onChange(() => {
          this.boards.forEach((board) => {
            board.applyTranslations();
            board.refresh();
          });
        });
        this.listenerAttached = true;
      }
    },

    getBoardByGame(gameId) {
      for (const board of this.boards.values()) {
        if (board.options.gameId === gameId) return board;
      }
      return null;
    },

    getBoardsByGame(gameId) {
      const boards = [];
      for (const board of this.boards.values()) {
        if (board.options.gameId === gameId) {
          boards.push(board);
        }
      }
      return boards;
    },

    showSave(gameId, score) {
      const boards = this.getBoardsByGame(gameId);
      if (boards.length === 0) return;
      
      // Check if score qualifies for ANY of the boards (all-time OR weekly)
      let qualifiesForAny = false;
      for (const board of boards) {
        if (board.isEligibleScore(score)) {
          qualifiesForAny = true;
          break;
        }
      }
      
      // Show save form on the first board (usually all-time)
      // but only if the score qualifies for at least one ranking
      if (qualifiesForAny && boards.length > 0) {
        boards[0].showSave(score);
      } else if (boards.length > 0) {
        boards[0].hideSave();
      }
    },

    hideSave(gameId) {
      const board = this.getBoardByGame(gameId);
      if (board) board.hideSave();
    },

    getSaveState(gameId) {
      const board = this.getBoardByGame(gameId);
      if (!board) return null;
      return {
        latestScore: board.state.latestScore,
        showSaveAt: board.options.showSaveAt,
      };
    },

    async submitScore(gameId, name) {
      const boards = this.getBoardsByGame(gameId);
      if (boards.length === 0) return false;
      
      // Submit to the first board (which triggers save to both all-time and weekly)
      const success = await boards[0].submitWithName(name);
      
      // Refresh all boards to show the updated rankings
      if (success) {
        for (const board of boards) {
          await board.refresh();
        }
      }
      
      return success;
    },

    canSaveScore(gameId, score) {
      const boards = this.getBoardsByGame(gameId);
      if (boards.length === 0) {
        const numeric = Number(score);
        return Number.isFinite(numeric) && numeric >= 1;
      }
      
      // Return true if score qualifies for ANY board (all-time OR weekly)
      for (const board of boards) {
        const projection = this.projectEntry(board, {
          name: DEFAULT_INITIALS,
          score,
          ts: new Date().toISOString(),
        }, { persist: false });
        if (projection.included) {
          return true;
        }
      }
      
      return false;
    },

    projectEntry(board, entry, { persist = false } = {}) {
      if (!board) return { top: [], included: false };

      const threshold = typeof board.options.showSaveAt === 'number'
        ? board.options.showSaveAt
        : 1;
      const scoreValue = Number(entry && entry.score != null ? entry.score : NaN);

      const period = board.options.period || 'all-time';
      const existingRaw = this.loadLocal(board, period);
      const existing = Array.isArray(existingRaw)
        ? existingRaw.map((item) => ({
            ...item,
            name: normalizeInitials(item && item.name != null ? item.name : '') || DEFAULT_INITIALS,
            ts: item && item.ts ? item.ts : new Date().toISOString(),
          }))
        : [];

      if (!Number.isFinite(scoreValue) || scoreValue < threshold) {
        return { top: existing, included: false };
      }

      const candidate = {
        ...entry,
        name: normalizeInitials(entry && entry.name != null ? entry.name : '') || DEFAULT_INITIALS,
        score: scoreValue,
        ts: entry && entry.ts ? entry.ts : new Date().toISOString(),
        __candidate: true,
      };
      existing.push(candidate);

      existing.sort((a, b) => b.score - a.score || new Date(a.ts) - new Date(b.ts));
      const cap = typeof board.options.maxEntries === 'number' && board.options.maxEntries > 0
        ? board.options.maxEntries
        : DEFAULT_MAX_ENTRIES;
      const top = existing.slice(0, cap);
      const included = top.some((item) => item.__candidate === true);
      const cleanTop = top.map((item) => {
        const clone = { ...item };
        delete clone.__candidate;
        return clone;
      });

      if (persist) {
        this.persistLocal(board, cleanTop, period);
      }

      return { top: cleanTop, included };
    },

    saveLocalEntry(board, entry) {
      const { included } = this.projectEntry(board, entry, { persist: true });
      return included;
    },

    async addEntry(board, name, score) {
      const entry = { name, score, ts: new Date().toISOString() };
      const gameId = board.options.gameId;
      
      // Get all boards for this game (all-time and weekly)
      const allBoards = this.getBoardsByGame(gameId);
      
      // Save to localStorage for each period
      for (const b of allBoards) {
        const period = b.options.period || 'all-time';
        const included = this.saveLocalEntry(b, entry);
        debugLog('addEntry local save', gameId, period, score, included ? 'top-entry' : 'discarded');
      }
      
      // Save to Firebase (general leaderboard plus weekly scopes/legacy fallback)
      await FirebaseBackend.addEntry(board, entry);
    },

    async loadEntries(board, period = 'all-time') {
      debugLog('loadEntries start', board.options.gameId, period);
      const remote = await FirebaseBackend.fetchEntries(board, period);
      if (Array.isArray(remote)) {
        this.persistLocal(board, remote, period);
        debugLog('loadEntries from remote', board.options.gameId, remote.length);
        return remote;
      }
      const local = this.loadLocal(board, period);
      debugLog('loadEntries from local fallback', board.options.gameId, local.length);
      return local;
    },

    storageKey(board, period = 'all-time') {
      const slug = sanitizeKey(board.options.rankKey || board.options.gameId || 'default') || 'default';
      const suffix = period === 'weekly' ? '_weekly' : '';
      return `EduMúsic_rank_${slug}${suffix}_v1`;
    },

    loadLocal(board, period = 'all-time') {
      try {
        const raw = localStorage.getItem(this.storageKey(board, period));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        let entries = Array.isArray(parsed) ? parsed : [];
        
        // For weekly, filter entries from current week (Monday 00:01)
        if (period === 'weekly') {
          const weekStart = getWeekStart();
          entries = entries.filter(entry => {
            const entryDate = new Date(entry.ts);
            return entryDate >= weekStart;
          });
          debugLog('Weekly local filter: from', weekStart.toISOString(), 'entries:', entries.length);
        }
        
        return entries;
      } catch (_) {
        return [];
      }
    },

    persistLocal(board, list, period = 'all-time') {
      try {
        localStorage.setItem(this.storageKey(board, period), JSON.stringify(list));
      } catch (_) {}
    },
  };

  ScoreService.normalizeInitials = normalizeInitials;
  ScoreService.defaultInitials = DEFAULT_INITIALS;
  ScoreService.setFirebaseConfig = (config) => {
    FirebaseBackend.overrideConfig(config);
    debugLog('setFirebaseConfig called');
  };
  ScoreService.isRemoteEnabled = () => FirebaseBackend.isConfigured();
  ScoreService.setDebug = (value) => {
    DEBUG = !!value;
    debugLog('Debug mode set via setDebug()', DEBUG);
  };

  window.ScoreService = ScoreService;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ScoreService.scanDom());
  } else {
    ScoreService.scanDom();
  }
})();
