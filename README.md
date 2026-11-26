# Langit Biru — Island Hopper

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/funtoons/flight-game-bot-v1/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/funtoons/flight-game-bot-v1/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete little flight game for the [make.fun "Make the best flight game" bounty](https://make.fun/bounty/best-flight-game-20261126-0057). Fly the prop plane **Elang Laut** across the Merpati archipelago, thread all 8 golden rings, then put her down on runway 09 — before the fuel runs out.

## How to play

Serve `game/` with any static server (or `node serve.ts`, then open http://localhost:8080) and fly in desktop Chrome. No network, no build step, no files outside `game/`.

| Control | Action |
| --- | --- |
| ↑ / ↓ | Pitch (climb / dive) |
| ← / → | Bank and turn |
| W / S | Throttle up / down |
| Mouse drag | Steer |
| Enter / click | Start flying |
| P | Pause |
| R | Restart |
| M | Mute |

## The mission

- **8 golden rings** weave across the islands — each one is worth 150 points. The next ring is always marked, with a bearing arrow when it is off-screen.
- **Land on runway 09** on Pulau Merpati's southern shore: arrive slow, level and lined up with the strip. A clean landing pays 500 points plus fuel and time bonuses.
- **Fuel drains** with the throttle, and slow flight sinks — a dry tank means a glide, and the sea is not a runway. Hit terrain or water and the sortie ends.
- **HUD**: altitude, speed, heading and vertical speed up top, a compass tape, ring pips and score; below, lit instruments — airspeed, altimeter, attitude ball, compass, fuel, throttle and hull.

## Files

- `game/index.html` — the page, nothing but a canvas
- `game/src/config.js` — tuning, ring course, runway, start
- `game/src/world.js` — the archipelago, terrain height, clouds, palms
- `game/src/physics.js` — the flight model and landing/crash rules
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised engine, wind, chimes (WebAudio, no files)
- `game/src/render.js` — the pseudo-3D chase view, plane, HUD and overlays
- `game/src/main.js` — game loop and state machine
- `game/src/shots.js` — deterministic screenshot staging (`?shot=start|play|rings|landing&seed=1`)
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — four real renders of the game: menu, chasing ring 1, diving on ring 4, final approach to runway 09

## License

MIT — see [LICENSE](LICENSE).
