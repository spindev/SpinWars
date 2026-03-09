# SpinWars – Blade Champions

A fast-paced neon battle arena game playable directly in your mobile or desktop browser.

## 🎮 Play Now

**[▶ Play SpinWars on GitHub Pages](https://spindev.github.io/SpinWars/)**

## About the Game

In the neon arena of the future, spinning blade warriors clash for glory. You control a
high-tech spinning blade powered by **Spin Energy (SE)**. Defeat waves of enemy spinners,
collect power-ups, and survive as long as possible!

### Controls

| Action | Mobile | Desktop |
|--------|--------|---------|
| Move   | Virtual joystick (touch anywhere left) | WASD / Arrow Keys |
| Dash   | Dash button (bottom-right) | Space |

### Enemy Types

| Enemy    | Color | Behavior |
|----------|--------|-----------|
| Rusher   | 🔴 Red    | Charges directly at you |
| Circler  | 🟠 Orange | Orbits then strikes |
| Tank     | 🟣 Purple | Slow but heavily armoured |
| Bomber   | 🟡 Yellow | Winds up then launches at full speed |

### Power-ups

| Icon | Effect |
|------|--------|
| **E** (Green)  | Restore Spin Energy |
| **S** (Yellow) | Speed Boost (5 seconds) |
| **P** (Orange) | Power Blade — double damage (5 seconds) |
| **D** (Blue)   | Defence Shield — invincibility (5 seconds) |

### Tips

- **Dash through enemies** for massive damage (3× multiplier)
- Collecting the **Shield (D)** power-up makes you invincible — use it to plow through crowds
- The arena edge is electrified — hitting it hard drains your Spin Energy
- A **boss wave** spawns every 5 waves — prepare yourself!

## Technical Details

- **100% vanilla HTML5 / CSS3 / JavaScript** — zero dependencies, zero build steps
- Rendered entirely on an HTML `<canvas>` element
- Touch joystick for mobile, keyboard for desktop
- High score persisted in `localStorage`
- Responsive to any screen size

## GitHub Pages Setup

The game is served as a static site from the repository root.
A `.nojekyll` file disables Jekyll processing so GitHub Pages serves `index.html` directly.