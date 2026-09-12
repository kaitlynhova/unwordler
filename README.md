# Unwordler

A Wordle cracker. Enter the clues from your last guess — the letters you've
placed correctly (green), the letters that are in the word but in the wrong
spot (yellow), and the letters that aren't in the word (gray) — and Unwordler
shows every five-letter word that still fits. Tap any word to copy it.

## Running it

It's a dependency-free static site. Open `index.html` directly, or serve the
folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

- `index.html` — page structure
- `styles.css` — theme tokens (light/dark) and layout
- `app.js` — clue state, word matching, keyboard cycling, theme, copy toast
- `words.js` — the five-letter word list (`window.WORDS`)

## Features

- Five position tiles for correct letters — type, or tap a tile and use the
  on-screen keyboard
- Present / absent letter inputs
- On-screen keyboard where tapping a key cycles: wrong spot → not in word → clear
- Live results grid, colored per letter, that updates as you add clues
- Light / dark theme (remembered, follows system preference by default)
- Responsive two-column layout that collapses to one column on small screens

Wordle is by [Josh Wardle](https://twitter.com/powerlanguish). Powered by Hova Labs.
