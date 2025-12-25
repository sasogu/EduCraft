(() => {
  const state = {
    open: false,
    options: null,
    el: null,
    nodes: null,
    saving: false,
    i18nBound: false,
  };

  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const value = window.i18n.t(key);
      if (value && value !== key) return value;
    }
    return fallback != null ? fallback : key;
  }

  function applyTranslations() {
    if (!state.el || !state.nodes) return;
    if (window.i18n && typeof window.i18n.apply === 'function') {
      window.i18n.apply(state.el);
    } else {
      // fallback placeholders
      state.nodes.title.textContent = t('game.over.title', 'GAME OVER');
      state.nodes.subtitle.textContent = t('game.over.subtitle', 'Introduce tus iniciales para el ranking');
      state.nodes.scoreLabel.textContent = t('game.over.score', 'Puntuación');
      state.nodes.nameLabel.textContent = t('game.save.your_name', 'Tu nombre:');
      state.nodes.saveBtn.textContent = t('game.save.button', 'Guardar puntuación');
      state.nodes.retryBtn.textContent = t('game.over.play_again', 'Jugar de nuevo');
      state.nodes.skipBtn.textContent = t('game.over.skip', 'Continuar sin guardar');
      state.nodes.nameInput.placeholder = t('game.over.placeholder', 'AAA');
    }
  }

  function ensureElements() {
    if (state.el) return;
    const overlay = document.createElement('div');
    overlay.className = 'gameover-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="gameover-overlay__panel" role="dialog" aria-modal="true">
        <div class="gameover-overlay__scanlines"></div>
        <h2 class="gameover-overlay__title" id="gameoverTitle" data-i18n="game.over.title">GAME OVER</h2>
        <p class="gameover-overlay__subtitle" id="gameoverSubtitle" data-i18n="game.over.subtitle">
          Introduce tus iniciales para el ranking
        </p>
        <p class="gameover-overlay__scoreline">
          <span data-i18n="game.over.score" class="gameover-overlay__score-label">Puntuación</span>
          <strong class="gameover-overlay__score-value">0</strong>
        </p>
        <div class="gameover-overlay__input-block">
          <label class="gameover-overlay__label" for="gameoverName" data-i18n="game.save.your_name">Tu nombre:</label>
          <input id="gameoverName" type="text" maxlength="3" autocomplete="name"
            class="gameover-overlay__input" data-i18n="game.over.placeholder" data-i18n-attr="placeholder" placeholder="AAA">
        </div>
        <p class="gameover-overlay__error" role="alert" hidden></p>
        <div class="gameover-overlay__buttons">
          <button type="button" class="gameover-overlay__btn gameover-overlay__btn--primary" data-action="save" data-i18n="game.save.button">
            Guardar puntuación
          </button>
          <button type="button" class="gameover-overlay__btn gameover-overlay__btn--ghost" data-action="skip" data-i18n="game.over.skip">
            Continuar sin guardar
          </button>
          <button type="button" class="gameover-overlay__btn gameover-overlay__btn--secondary" data-action="retry" data-i18n="game.over.play_again">
            Jugar de nuevo
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.gameover-overlay__panel');
    panel.setAttribute('aria-labelledby', 'gameoverTitle');
    panel.setAttribute('aria-describedby', 'gameoverSubtitle');
    panel.tabIndex = -1;

    const nodes = {
      overlay,
      panel,
      title: overlay.querySelector('.gameover-overlay__title'),
      subtitle: overlay.querySelector('.gameover-overlay__subtitle'),
      scoreLabel: overlay.querySelector('.gameover-overlay__score-label'),
      scoreValue: overlay.querySelector('.gameover-overlay__score-value'),
      nameWrapper: overlay.querySelector('.gameover-overlay__input-block'),
      nameLabel: overlay.querySelector('.gameover-overlay__label'),
      nameInput: overlay.querySelector('#gameoverName'),
      saveBtn: overlay.querySelector('[data-action="save"]'),
      retryBtn: overlay.querySelector('[data-action="retry"]'),
      skipBtn: overlay.querySelector('[data-action="skip"]'),
      error: overlay.querySelector('.gameover-overlay__error'),
      buttons: overlay.querySelectorAll('.gameover-overlay__btn'),
    };

    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) {
        hide();
      }
    });

    overlay.addEventListener('keydown', (ev) => {
      if (!state.open) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        hide();
      } else if (ev.key === 'Enter' && state.options && state.options.canSave && document.activeElement === nodes.nameInput) {
        ev.preventDefault();
        attemptSave();
      }
    });

    nodes.nameInput.addEventListener('input', () => {
      const helper = (window.ScoreService && typeof window.ScoreService.normalizeInitials === 'function')
        ? window.ScoreService.normalizeInitials
        : (value) => {
            if (value == null) return '';
            const upper = value.toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const filtered = upper.replace(/[^A-Z0-9]/g, '');
            return filtered.slice(0, 3);
          };
      nodes.nameInput.value = helper(nodes.nameInput.value);
    });

    nodes.saveBtn.addEventListener('click', () => attemptSave());
    nodes.retryBtn.addEventListener('click', () => {
      hide();
      if (state.options && typeof state.options.onRetry === 'function') {
        state.options.onRetry();
      }
    });
    nodes.skipBtn.addEventListener('click', () => hide());

    state.el = overlay;
    state.nodes = nodes;

    if (!state.i18nBound && window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => applyTranslations());
      state.i18nBound = true;
    }
    applyTranslations();
  }

  function setSaving(isSaving) {
    if (!state.nodes) return;
    state.saving = isSaving;
    state.nodes.buttons.forEach((btn) => {
      btn.disabled = isSaving;
    });
    if (isSaving) {
      state.nodes.saveBtn.dataset.i18n = 'game.over.saving';
      state.nodes.saveBtn.textContent = t('game.over.saving', 'Guardando...');
    } else {
      state.nodes.saveBtn.dataset.i18n = 'game.save.button';
      state.nodes.saveBtn.textContent = t('game.save.button', 'Guardar puntuación');
      applyTranslations();
    }
  }

  function showError(message) {
    if (!state.nodes) return;
    state.nodes.error.textContent = message || t('game.over.error', 'No se pudo guardar la puntuación.');
    state.nodes.error.hidden = false;
  }

  async function attemptSave() {
    if (!state.open || !state.options || !state.options.canSave) {
      hide();
      return;
    }
    if (!window.ScoreService || typeof window.ScoreService.submitScore !== 'function') {
      showError(t('game.over.error', 'No se pudo guardar la puntuación.'));
      return;
    }
    const helper = (window.ScoreService && typeof window.ScoreService.normalizeInitials === 'function')
      ? window.ScoreService.normalizeInitials
      : (value) => {
          if (value == null) return '';
          const upper = value.toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const filtered = upper.replace(/[^A-Z0-9]/g, '');
          return filtered.slice(0, 3);
        };
    const name = helper(state.nodes.nameInput.value || '');
    setSaving(true);
    state.nodes.error.hidden = true;
    try {
      const ok = await window.ScoreService.submitScore(state.options.gameId, name);
      if (!ok) {
        showError(t('game.over.error', 'No se pudo guardar la puntuación.'));
        setSaving(false);
        return;
      }
      if (typeof state.options.onSaved === 'function') {
        state.options.onSaved({ name: state.nodes.nameInput.value, score: state.options.score });
      }
      hide({ saved: true });
    } catch (err) {
      console.error('[GameOverOverlay] save failed', err);
      showError(t('game.over.error', 'No se pudo guardar la puntuación.'));
      setSaving(false);
    }
  }

  function hide({ saved = false } = {}) {
    if (!state.open) return;
    state.open = false;
    if (state.el) {
      state.el.classList.remove('is-visible');
      state.el.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('has-gameover-overlay');
    if (state.options) {
      if (window.ScoreService && typeof window.ScoreService.hideSave === 'function' && state.options.gameId) {
        if (!saved) {
          window.ScoreService.hideSave(state.options.gameId);
        }
      }
      if (typeof state.options.onClose === 'function') {
        try {
          state.options.onClose({ saved, score: state.options.score });
        } catch (_) {}
      }
    }
    state.options = null;
    state.saving = false;
  }

  function show(opts = {}) {
    ensureElements();
    if (!state.nodes) return;

    const gameId = opts.gameId || 'default';
    const score = Number.isFinite(Number(opts.score)) ? Number(opts.score) : 0;
    let canSave = false;

    if (window.ScoreService && typeof window.ScoreService.showSave === 'function') {
      try {
        window.ScoreService.showSave(gameId, score);
      } catch (_) {}
    }

    if (window.ScoreService && typeof window.ScoreService.canSaveScore === 'function') {
      try {
        canSave = window.ScoreService.canSaveScore(gameId, score);
      } catch (_) {
        canSave = score >= 1;
      }
    } else if (window.ScoreService && typeof window.ScoreService.getBoardByGame === 'function') {
      const board = window.ScoreService.getBoardByGame(gameId);
      if (board) {
        const threshold = typeof board.options.showSaveAt === 'number' ? board.options.showSaveAt : 1;
        canSave = score >= threshold;
      } else {
        canSave = score >= 1;
      }
    } else {
      canSave = score >= 1;
    }

    state.options = {
      gameId,
      score,
      canSave,
      onRetry: typeof opts.onRetry === 'function' ? opts.onRetry : null,
      onSaved: typeof opts.onSaved === 'function' ? opts.onSaved : null,
      onClose: typeof opts.onClose === 'function' ? opts.onClose : null,
    };

    state.saving = false;
    state.nodes.buttons.forEach((btn) => {
      btn.disabled = false;
    });
    state.nodes.saveBtn.dataset.i18n = 'game.save.button';
    state.nodes.saveBtn.textContent = t('game.save.button', 'Guardar puntuación');

    state.nodes.scoreValue.textContent = String(score);
    state.nodes.error.hidden = true;
    state.nodes.nameInput.value = '';
    state.nodes.nameWrapper.hidden = !canSave;
    state.nodes.saveBtn.hidden = !canSave;
    // allow skip button only when can save
    state.nodes.skipBtn.hidden = !canSave;

    if (opts.subtitleKey) {
      state.nodes.subtitle.dataset.i18n = opts.subtitleKey;
    } else {
      state.nodes.subtitle.dataset.i18n = 'game.over.subtitle';
    }
    applyTranslations();

    requestAnimationFrame(() => {
      if (!state.el) return;
      state.el.classList.add('is-visible');
      state.el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('has-gameover-overlay');
      if (canSave) {
        setTimeout(() => {
          try { state.nodes.nameInput.focus(); } catch (_) {}
        }, 60);
      } else {
        setTimeout(() => {
          try { state.nodes.retryBtn.focus(); } catch (_) {}
        }, 60);
      }
      state.open = true;
    });
  }

  window.GameOverOverlay = {
    show,
    hide,
    isOpen: () => state.open,
  };
})();
