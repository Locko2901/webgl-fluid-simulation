![TypeScript](https://img.shields.io/badge/Made_with-TypeScript-3178C6?logo=typescript&logoColor=white)
![WebGL](https://img.shields.io/badge/Powered_by-WebGL-990000?logo=webgl&logoColor=white)
![Vite](https://img.shields.io/badge/Built_with-Vite-646CFF?logo=vite&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-green)

# Fluid Simulation

A TypeScript reimplementation of [Pavel Dobryakov's WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) - a real-time, GPU-accelerated fluid dynamics simulation running in the browser.

## Table of Contents

- [Preview](#preview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Controls](#controls)
- [Configuration](#configuration)
- [Credits](#credits)
- [License](#license)

## Preview

![Preview of the Fluid Simulation](docs/preview.png)

**[Live Demo &rarr;](https://lockoo.net/fluid-simulator/)**

## Features

- **Real-time Navier-Stokes solver:** Advection, pressure projection, and vorticity confinement - all running on the GPU via WebGL shaders.
- **Interactive splats:** Click and drag (or touch on mobile) to inject colorful dye into the fluid.
- **Multi-touch support:** Works with touchscreens and mobile devices.
- **Bloom post-processing:** Adds a glow effect to bright areas for a polished look.
- **10 color palettes:** Rainbow, Ocean, Fire, Neon, and more - switch with a keypress or the GUI.
- **Configurable parameters:** Adjust resolution, dissipation, curl, splat size, bloom, and more from the settings panel.
- **Marbling effect:** Toggle a marbling mode for a different visual style.
- **Screenshot export:** Save your creation as a PNG at any time.

## Installation

```bash
# Clone the repository
git clone https://github.com/Locko2901/webgl-fluid-simulation.git
cd webgl-fluid-simulation

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Lint
npm run lint
```

## Controls

| Key | Action |
| --- | --- |
| **Click + Drag** | Create fluid splat |
| **Touch + Drag** | Create fluid splat (mobile) |
| **Space** | Random splats |
| **R** | Reset simulation |
| **P** | Pause / Resume |
| **B** | Toggle bloom effect |
| **M** | Toggle marbling effect |
| **H** | Hide / Show UI |
| **S** | Take screenshot |
| **1–9, 0** | Switch color palette |

## Configuration

The GUI panel (top-right) lets you tweak:

- **Color Palette** - Color scheme for splats.
- **Bloom** - Toggle glow effect, adjust intensity and threshold.
- **Sharpness / Vignette** - Edge enhancement and corner darkening.
- **Sim Resolution** - Physics grid resolution.
- **Dye Resolution** - Color rendering resolution.
- **Density / Velocity Dissipation** - How quickly dye and motion fade.
- **Curl** - Vorticity / swirl strength.
- **Splat Radius / Force** - Size and force of fluid splats.

## Credits

This project is a TypeScript reimplementation of [Pavel Dobryakov's WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) (MIT License), based on the paper [Real-Time Fluid Dynamics for Games](https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/GDC03.pdf) by Jos Stam.

**From the original:**
- Navier-Stokes fluid solver algorithm
- WebGL shader implementations (advection, curl, vorticity, pressure, etc.)
- Bloom post-processing effect

**What I changed:**
- Complete rewrite from JavaScript to TypeScript
- Modular architecture with separated concerns
- Custom GUI implementation
- Extended color palette options

## License

[MIT](LICENSE) - feel free to use in your own projects.
