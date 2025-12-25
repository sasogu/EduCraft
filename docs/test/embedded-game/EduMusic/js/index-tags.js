(() => {
  const TAG_ORDER = [
    'inicial',
    'intermedio',
    'avanzado',
    'ritmo',
    'melodia',
    'dictado',
    'audicion',
    'quiz',
    
  ];

  const FALLBACK_LABELS = {
    ritmo: 'Ritmo',
    melodia: 'Melodía',
    dictado: 'Dictado',
    audicion: 'Audición',
    inicial: 'Inicial',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
    quiz: 'Quiz',
  };

  const KNOWN_TAGS = new Set([
    ...TAG_ORDER,
    ...Object.keys(FALLBACK_LABELS),
  ]);

  const VIRTUAL_CARDS = [
    {
      href: 'html/solmi.html',
      i18n: 'gamehub.solmi',
      fallback: {
        title: 'Sol & Mi',
        desc: 'Pulsa las teclas correspondientes para atrapar las notas SOL y MI.',
        small: 'Dificultad progresiva · Ranking online',
      },
      tags: ['juego', 'melodia', 'inicial'],
    },
    {
      href: 'html/solmila.html',
      i18n: 'gamehub.solmila',
      fallback: {
        title: 'Sol, Mi y La',
        desc: 'Añade la nota LA al reto y mantén la precisión en el pentagrama.',
        small: 'Tres notas · Misma dinámica de juego',
      },
      tags: ['juego', 'melodia', 'inicial'],
    },
    {
      href: 'html/solmilado.html',
      i18n: 'gamehub.solmilado',
      fallback: {
        title: 'Sol, Mi, La & Do',
        desc: 'Incluye el DO grave y trabaja con líneas adicionales del pentagrama.',
        small: 'Cuatro notas · Lectura con líneas adicionales',
      },
      tags: ['juego', 'melodia', 'intermedio'],
    },
    {
      href: 'html/solmiladore.html',
      i18n: 'gamehub.solmiladore',
      fallback: {
        title: 'Sol, Mi, La, Do y Re',
        desc: 'Añade el RE agudo y refuerza la lectura en el pentagrama.',
        small: 'Cinco notas · Líneas y espacios adicionales',
      },
      tags: ['juego', 'melodia', 'intermedio'],
    },
    {
      href: 'html/solmiladorefa.html',
      i18n: 'gamehub.solmiladorefa',
      fallback: {
        title: 'Sol, Mi, La, Do, Re y Fa',
        desc: 'Suma el FA y practica todo el grado para afianzar la lectura.',
        small: 'Seis notas · Escala incompleta ascendiente',
      },
      tags: ['juego', 'melodia', 'avanzado'],
    },
    {
      href: 'html/todas.html',
      i18n: 'gamehub.allnotes',
      fallback: {
        title: "De DO a DO'",
        desc: "Sube desde el DO grave hasta DO' y refuerza el salto final.",
        small: 'Ocho notas · Escala extendida',
      },
      tags: ['juego', 'melodia', 'avanzado'],
    },
    {
      href: 'html/dofa.html',
      i18n: 'gamehub.fullstaff',
      fallback: {
        title: "De DO a FA'",
        desc: "Atrapa todas las notas del pentagrama: del DO grave al FA'.",
        small: 'Once notas · Pentagrama completo',
      },
      tags: ['juego', 'melodia', 'avanzado'],
    },
    {
      href: 'html/instruments.html',
      i18n: 'gamehub.instruments',
      fallback: {
        title: 'Familias de instrusmentos',
        desc: 'Reconoce las familias de la orquesta con audios e imágenes reales.',
        small: 'Audición · Nivel avanzado',
      },
      tags: ['juego', 'audicion', 'avanzado'],
    },
  ];

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function parseTags(raw) {
    return (raw || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((tag) => tag && KNOWN_TAGS.has(tag));
  }

  ready(() => {
    const container = document.querySelector('[data-tag-filter]');
    const listEl = container && container.querySelector('[data-tag-filter-list]');
    const grid = document.querySelector('.activity-grid');
    if (!container || !listEl || !grid) return;

    const allTags = new Set();
    const cardEntries = [];

    const baseCards = Array.from(grid.querySelectorAll('.activity-card[data-tags]'));
    baseCards.forEach((card) => {
      const tags = parseTags(card.getAttribute('data-tags'));
      card.dataset.tags = tags.join(',');
      cardEntries.push({ element: card, tags, isVirtual: false });
      tags.forEach((tag) => allTags.add(tag));
    });
    const existingBaseHrefs = new Set(
      baseCards.map((card) => card.getAttribute('href')).filter(Boolean)
    );

    VIRTUAL_CARDS.forEach((def) => {
      if (existingBaseHrefs.has(def.href)) return;
      const tags = def.tags.filter((tag) => KNOWN_TAGS.has(tag));
      if (!tags.length) return;
      const el = document.createElement('a');
      el.className = 'activity-card activity-card--virtual is-hidden';
      el.href = def.href;
      el.setAttribute('data-tags', tags.join(','));

      const titleEl = document.createElement('h2');
      titleEl.setAttribute('data-i18n', `${def.i18n}.title`);
      titleEl.textContent = def.fallback.title;

      const descEl = document.createElement('p');
      descEl.setAttribute('data-i18n', `${def.i18n}.desc`);
      descEl.textContent = def.fallback.desc;

      const smallEl = document.createElement('small');
      smallEl.setAttribute('data-i18n', `${def.i18n}.small`);
      smallEl.textContent = def.fallback.small;

      el.append(titleEl, descEl, smallEl);
      grid.appendChild(el);

      cardEntries.push({ element: el, tags, isVirtual: true });
      tags.forEach((tag) => allTags.add(tag));
    });

    if (!allTags.size) {
      container.hidden = true;
      return;
    }

    const orderedTags = Array.from(allTags).sort((a, b) => {
      const ia = TAG_ORDER.indexOf(a);
      const ib = TAG_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    listEl.innerHTML = '';
    const active = new Set();
    const emptyEl = container.querySelector('[data-tag-filter-empty]');
    const clearBtn = container.querySelector('[data-tag-filter-clear]');

    function applyTranslations() {
      if (window.i18n && typeof window.i18n.apply === 'function') {
        window.i18n.apply(container);
      }
    }

    function updateCards() {
      const required = Array.from(active);
      const hasFilter = required.length > 0;
      let visibleCount = 0;

      cardEntries.forEach((entry) => {
        const matches = required.every((tag) => entry.tags.includes(tag));
        const shouldShow = matches && (!entry.isVirtual || hasFilter);
        entry.element.classList.toggle('is-hidden', !shouldShow);
        if (shouldShow) visibleCount += 1;
      });

      if (emptyEl) {
        emptyEl.hidden = visibleCount !== 0;
      }
    }

    orderedTags.forEach((tag) => {
      const label = document.createElement('label');
      label.className = 'tag-filter__option';
      const id = `tag-filter-${tag}`;
      label.innerHTML = `
        <input type="checkbox" id="${id}" value="${tag}">
        <span data-i18n="tags.${tag}">${FALLBACK_LABELS[tag] || tag}</span>
      `;
      listEl.appendChild(label);
    });

    listEl.addEventListener('change', (event) => {
      const target = event.target;
      if (!target || target.tagName !== 'INPUT') return;
      const value = String(target.value || '').toLowerCase();
      if (!value) return;
      if (target.checked) active.add(value);
      else active.delete(value);
      updateCards();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        active.clear();
        const inputs = listEl.querySelectorAll('input[type="checkbox"]');
        inputs.forEach((input) => {
          input.checked = false;
        });
        updateCards();
      });
    }

    updateCards();
    applyTranslations();

    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => applyTranslations());
    }
  });
})();
