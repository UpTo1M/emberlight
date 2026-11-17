# Emberlight

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/UpTo1M/emberlight/rank.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/UpTo1M/emberlight/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Emberlight** is an atmospheric single-mechanic game: carry a living ember
through a dark world, light every brazier before your flame dies, and don't
let the shadow wisps snuff you out.

## How to play

- **Move** with WASD / arrow keys, or hold the mouse button to drift toward
  the cursor.
- **Light braziers** by standing close to one — hold still for a moment while
  the kindling catches. Every lit brazier feeds your flame.
- **Catch fireflies** for a burst of flame and points.
- **Avoid shadow wisps.** They hunt your light. A touch steals a big chunk
  of your flame.
- **Win a level** by lighting every brazier. **Lose** when your flame burns
  out. Clear all 8 levels to win the game.

## The loop

Your flame drains the whole time, so every route is a choice: the short way
past the wisps, or the long way past the fireflies. Lighting braziers
quickly in a row builds a combo. Each level adds more braziers, faster
wisps, and a hungrier flame.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move the ember |
| Mouse (hold) | Drift toward the cursor |
| Enter / Space | Start, continue |
| P / Esc | Pause |
| H | Help |
| M | Mute |
| R | Restart (on game over / victory) |

## Play it

Serve `game/` with any static server (or `node serve.ts`) and open
`game/index.html` in desktop Chrome. No network, no build step — every
file the game loads lives under `game/`, and all sound is synthesized
live with WebAudio.

## License

MIT — see [LICENSE](LICENSE).
