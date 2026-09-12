/* Unwordler — a Wordle solver.
 * Enter the clues from your last guess (greens in position, yellows present but
 * misplaced, grays absent) and see every five-letter word that still fits. */

(function () {
  'use strict';

  var WORDS = Array.isArray(window.WORDS) ? window.WORDS : [];
  var KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  var MAX_RESULTS = 120;

  var state = {
    greens: ['', '', '', '', ''],
    present: '',
    absent: '',
    dark: false,
    focus: 0,
    anim: [0, 0, 0, 0, 0]
  };

  // --- element references -------------------------------------------------
  var el = {
    reset: document.getElementById('reset'),
    theme: document.getElementById('theme'),
    greenTiles: document.getElementById('green-tiles'),
    present: document.getElementById('present'),
    absent: document.getElementById('absent'),
    keyboardRows: document.getElementById('keyboard-rows'),
    count: document.getElementById('count'),
    countLabel: document.getElementById('count-label'),
    hint: document.getElementById('hint'),
    empty: document.getElementById('empty'),
    resultsGrid: document.getElementById('results-grid'),
    more: document.getElementById('more'),
    toast: document.getElementById('toast')
  };

  var greenInputs = [];
  var keyButtons = {};
  var toastTimer = null;

  // --- helpers ------------------------------------------------------------
  function clean(s) {
    return String(s).toLowerCase().replace(/[^a-z]/g, '');
  }

  function dedupeLetters(s) {
    var seen = {};
    var out = '';
    var cleaned = clean(s);
    for (var i = 0; i < cleaned.length; i++) {
      var ch = cleaned[i];
      if (!seen[ch]) { seen[ch] = true; out += ch; }
    }
    return out;
  }

  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('unwordler-theme', dark ? 'dark' : 'light'); } catch (e) {}
    state.dark = dark;
    el.theme.textContent = dark ? '☀' : '☾';
  }

  function showToast(text) {
    el.toast.textContent = text;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, 1400);
  }

  // --- state mutations ----------------------------------------------------
  function setGreen(i, ch) {
    state.greens[i] = ch;
    if (ch) state.anim[i]++;
    if (ch && i < 4) {
      state.focus = i + 1;
      greenInputs[i + 1].focus();
    }
    render();
  }

  // Cycle a keyboard letter: unset → wrong spot (present) → not in word
  // (absent) → clear. Letters locked as a green are left untouched.
  function cycle(letter) {
    if (state.greens.indexOf(letter) !== -1) return;
    if (state.present.indexOf(letter) !== -1) {
      state.present = state.present.replace(letter, '');
      state.absent += letter;
    } else if (state.absent.indexOf(letter) !== -1) {
      state.absent = state.absent.replace(letter, '');
    } else {
      state.present += letter;
    }
    render();
  }

  function reset() {
    state.greens = ['', '', '', '', ''];
    state.present = '';
    state.absent = '';
    render();
  }

  // --- word matching ------------------------------------------------------
  function matches(word) {
    var greens = state.greens;
    var gset = greensSet();
    var i, l;
    for (i = 0; i < 5; i++) {
      if (greens[i] && word[i] !== greens[i]) return false;
    }
    for (i = 0; i < state.present.length; i++) {
      l = state.present[i];
      if (word.indexOf(l) === -1) return false;
    }
    for (i = 0; i < state.absent.length; i++) {
      l = state.absent[i];
      if (!gset[l] && state.present.indexOf(l) === -1 && word.indexOf(l) !== -1) return false;
    }
    return true;
  }

  function greensSet() {
    var set = {};
    for (var i = 0; i < 5; i++) if (state.greens[i]) set[state.greens[i]] = true;
    return set;
  }

  // --- rendering ----------------------------------------------------------
  function buildGreenTiles() {
    for (var i = 0; i < 5; i++) {
      var input = document.createElement('input');
      input.className = 'green-tile';
      input.maxLength = 1;
      input.setAttribute('aria-label', 'Correct letter in position ' + (i + 1));
      input.autocomplete = 'off';
      input.autocapitalize = 'characters';
      input.spellcheck = false;
      bindGreenTile(input, i);
      greenInputs.push(input);
      el.greenTiles.appendChild(input);
    }
  }

  function bindGreenTile(input, i) {
    input.addEventListener('focus', function () {
      state.focus = i;
      render();
    });
    input.addEventListener('input', function (e) {
      setGreen(i, clean(e.target.value).slice(-1));
    });
    input.addEventListener('keydown', function (e) {
      var ch = state.greens[i];
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (ch) { setGreen(i, ''); }
        else if (i > 0) { greenInputs[i - 1].focus(); setGreen(i - 1, ''); }
      } else if (e.key === 'ArrowLeft' && i > 0) {
        greenInputs[i - 1].focus();
      } else if (e.key === 'ArrowRight' && i < 4) {
        greenInputs[i + 1].focus();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        setGreen(i, e.key.toLowerCase());
      }
    });
  }

  function buildKeyboard() {
    KB_ROWS.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      for (var j = 0; j < row.length; j++) {
        (function (letter) {
          var btn = document.createElement('button');
          btn.className = 'key';
          btn.type = 'button';
          btn.textContent = letter;
          btn.addEventListener('click', function () { cycle(letter); });
          keyButtons[letter] = btn;
          rowEl.appendChild(btn);
        })(row[j]);
      }
      el.keyboardRows.appendChild(rowEl);
    });
  }

  function renderGreenTiles() {
    for (var i = 0; i < 5; i++) {
      var ch = state.greens[i];
      var input = greenInputs[i];
      var upper = ch.toUpperCase();
      if (input.value !== upper) input.value = upper;
      input.style.background = ch ? 'var(--green)' : 'var(--tile)';
      input.style.color = ch ? '#fff' : 'var(--ink)';
      input.style.borderColor = ch ? 'var(--green)' : (state.focus === i ? 'var(--ink)' : 'var(--tileb)');
      if (ch) {
        input.style.animation = 'pop .2s ' + (state.anim[i] % 2 ? 'linear' : 'ease');
      } else {
        input.style.animation = 'none';
      }
    }
  }

  function renderKeyboard() {
    var gset = greensSet();
    Object.keys(keyButtons).forEach(function (letter) {
      var btn = keyButtons[letter];
      var g = gset[letter];
      var p = state.present.indexOf(letter) !== -1;
      var a = state.absent.indexOf(letter) !== -1;
      btn.style.background = g ? 'var(--green)' : p ? 'var(--yellow)' : a ? 'var(--gray)' : 'var(--key)';
      btn.style.color = (g || p || a) ? '#fff' : 'var(--keyink)';
    });
  }

  function renderResults(words) {
    var frag = document.createDocumentFragment();
    var shown = words.slice(0, MAX_RESULTS);
    shown.forEach(function (word) {
      var btn = document.createElement('button');
      btn.className = 'word-btn';
      btn.type = 'button';
      btn.title = 'Copy';
      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        var isGreen = state.greens[i] === ch;
        var isYellow = !isGreen && state.present.indexOf(ch) !== -1;
        var tile = document.createElement('span');
        tile.className = 'word-tile';
        tile.textContent = ch;
        if (isGreen) {
          tile.style.background = 'var(--green)';
          tile.style.borderColor = 'var(--green)';
          tile.style.color = '#fff';
        } else if (isYellow) {
          tile.style.background = 'var(--yellow)';
          tile.style.borderColor = 'var(--yellow)';
          tile.style.color = '#fff';
        }
        btn.appendChild(tile);
      }
      btn.addEventListener('click', function () {
        copyWord(word);
      });
      frag.appendChild(btn);
    });
    el.resultsGrid.innerHTML = '';
    el.resultsGrid.appendChild(frag);
  }

  function copyWord(word) {
    var done = function () { showToast('Copied "' + word.toUpperCase() + '"'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(word).then(done, done);
    } else {
      done();
    }
  }

  function render() {
    var seen = {};
    var words = [];
    for (var i = 0; i < WORDS.length; i++) {
      var w = WORDS[i];
      if (seen[w]) continue;
      if (matches(w)) { seen[w] = true; words.push(w); }
    }

    var gset = greensSet();
    var clues = Object.keys(gset).length + state.present.length + state.absent.length;

    // header + inputs
    el.present.value = state.present.toUpperCase();
    el.absent.value = state.absent.toUpperCase();
    renderGreenTiles();
    renderKeyboard();

    // results summary
    el.count.textContent = words.length;
    el.countLabel.textContent = words.length === 1 ? 'word fits' : 'words fit';
    el.hint.textContent = clues === 0 ? 'Add clues from your last guess'
      : clues < 3 ? 'Keep adding clues'
      : 'Tap a word to copy it';
    el.empty.hidden = words.length !== 0;
    el.more.hidden = words.length <= MAX_RESULTS;

    renderResults(words);
  }

  // --- wiring -------------------------------------------------------------
  function init() {
    buildGreenTiles();
    buildKeyboard();

    el.reset.addEventListener('click', reset);
    el.theme.addEventListener('click', function () { applyTheme(!state.dark); render(); });

    el.present.addEventListener('input', function (e) {
      state.present = dedupeLetters(e.target.value);
      render();
    });
    el.absent.addEventListener('input', function (e) {
      state.absent = dedupeLetters(e.target.value);
      render();
    });

    var saved;
    try { saved = localStorage.getItem('unwordler-theme'); } catch (e) {}
    var dark = saved ? saved === 'dark'
      : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(!!dark);

    render();
  }

  init();
})();
