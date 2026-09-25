# Copilot instructions for Pixel Runner

## Project shape

This is a dependency-free browser game implemented with plain HTML, CSS, and JavaScript. Open `index.html` directly or serve the repository with a static server such as VS Code Live Server.

- `index.html` defines the game shell, HUD, end-state overlay, and keyboard/touch controls.
- `style.css` owns the dark/purple responsive UI, layout, typography, and mobile touch-control presentation. The canvas itself is styled responsively but keeps its fixed logical resolution.
- `script.js` contains the complete game: state, input, physics, collision detection, camera scrolling, entity data, canvas rendering, particles, HUD updates, and win/loss transitions.
- `README.md` is the user-facing source for controls and the current MVP feature set.

The gameplay world uses a fixed logical canvas of `960 x 540` and a level width of `3600`. World entities use absolute level coordinates; `cameraX` is applied only during the world drawing transform. The background is drawn in screen coordinates with parallax offsets.

## Commands and validation

There is no `package.json`, build system, test runner, or linter in this repository. Do not add a dependency or toolchain for small gameplay/UI changes unless the task specifically calls for it.

- Syntax check JavaScript: `node --check script.js`
- Check whitespace errors: `git diff --check`
- Manual smoke test: open `index.html` in a browser and verify movement (`ArrowLeft`/`ArrowRight` or `A`/`D`), jump (`Space`/`W`), attack (`X`), coin collection, enemy collision, falling/lives, goal completion, restart, and mobile pointer controls.
- There are currently no automated tests or individual test command.

## Runtime and code conventions

- Keep the existing plain-browser architecture. `script.js` is loaded at the end of `body`, so it queries existing DOM elements at module load without a framework or bundler.
- Keep gameplay state in the existing module-level variables and reset all per-run state in `resetGame()`. Use `gameState === "playing"`, `"won"`, or `"lost"` to gate simulation and overlays.
- Run simulation from `update(dt)` and rendering from `draw()`. Scale movement/physics by the frame delta (`step`) and cap unusually large deltas as the current loop does.
- Store level geometry and spawn points in the top-level arrays (`platforms`, `coinSpots`, `enemySpots`) and create mutable runtime entities in `resetGame()`. Use rectangle overlap through `rectsOverlap()` for gameplay collisions.
- Keep world coordinates separate from screen coordinates: update entities in level space, translate by `-cameraX` only inside the world portion of `draw()`, and clamp the camera to the level bounds.
- Use `updateHud()` as the single place that writes score, coin, and life values to the DOM. Call it after state changes that affect those values.
- Use `finish(won)` for both terminal outcomes so the overlay text and `gameState` remain consistent. Use `resetGame()` for both restart buttons.
- Add keyboard controls through `event.code` and update the shared `keys` map. Touch controls should use the existing `data-key` attributes and pointer handlers rather than a separate gameplay path.
- Preserve the current visual language: CSS custom properties for colors, responsive rules under `600px`, and pixel-art canvas rendering. Keep DOM/UI text in Japanese unless the surrounding feature is explicitly localized otherwise.
- Explanations and user-facing descriptions should be written in Japanese.
- If changing level dimensions, spawn points, or collision geometry, update the related constants/data together and manually test the complete route from the starting point to the goal.
