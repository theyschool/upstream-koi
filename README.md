# Upstream — A Koi's Journey

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/theyschool/upstream-koi/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/theyschool/upstream-koi/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A koi swims home. Three reaches of river stand between it and the spawning
pool: Willow Bend, Heron Hollow, and the Spawning Pool itself. The current
pushes back, rocks and nets drift down, eels hunt, and a heron strikes from
above. Gather pearls to build a combo, catch golden scales and lotus
flowers, and dash through bubbles to reach the top.

## How to play

- **Mouse or WASD / arrow keys** — steer the koi
- **Space or click** — dash (briefly invulnerable, then a short cooldown)
- **P** — pause, **M** — mute, **Enter** — start / continue

Swim upward to fill the reach progress bar. Finish all three reaches to
win. Three hearts: a hit costs one, a lotus restores one. Pearls collected
quickly in a row raise the combo multiplier.

## Running it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network requests: the game is plain static files under `game/`.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game,
staged by `game/src/shots.js` (`?shot=start|play|reach|victory&seed=1`):

1. Title screen
2. Play in progress, with the HUD
3. A reach complete
4. Victory at the spawning pool

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — tuning, palette, reaches
- `game/src/random.js` — the seeded river generator
- `game/src/input.js` — keyboard and pointer steering
- `game/src/audio.js` — procedural WebAudio sound
- `game/src/world.js` — the rules: koi, current, spawning, scoring
- `game/src/render.js` — the river, the koi, the HUD and the panels
- `game/src/shots.js` — the deterministic screenshot scenes
- `game/src/main.js` — the loop and the six screens
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
