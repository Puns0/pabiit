# Computer Network Design Using Spanning Trees

An interactive, scroll-driven web presentation for college Mathematics (2nd-year Computer Science & Engineering, Graph Theory chapter).

This deck demonstrates how fundamental graph theory theorems and spanning tree algorithms (Cayley's theorem, Kirchhoff's matrix-tree theorem, Kruskal's algorithm, Prim's algorithm, the Cut and Cycle properties, and the IEEE 802.1D Spanning Tree Protocol) solve real-world computer network design challenges through live interactive simulations.

---

## Quick Start (How to Run)

1. **Double-click `index.html`** to open the presentation directly in any modern web browser.
   - **Recommended Browsers**: Google Chrome or Microsoft Edge (modern Chromium-based browser recommended for optimal SVG rendering).
   - **100% Offline**: Runs purely through `file://` with no web server, no `node_modules`, no bundlers, and no runtime CDN requests.
2. **Classroom / Projector Mode**:
   - Press **`F`** to toggle full-screen mode.
   - Designed for standard projectors and displays (1366×768, 1536×864, 1920×1080, and 2560×1440).

---

## Keyboard Shortcuts

The deck is fully keyboard-accessible:

| Shortcut | Action |
|---|---|
| <kbd>↓</kbd> / <kbd>→</kbd> / <kbd>PageDown</kbd> / <kbd>Space</kbd> | Next slide |
| <kbd>↑</kbd> / <kbd>←</kbd> / <kbd>PageUp</kbd> / <kbd>Shift+Space</kbd> | Previous slide |
| <kbd>Home</kbd> / <kbd>End</kbd> | First slide / Last slide |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>N</kbd> | Toggle Presenter Notes drawer |
| <kbd>M</kbd> | Toggle Reduced Motion mode |
| <kbd>?</kbd> | Show Keyboard Shortcuts help overlay |
| <kbd>Esc</kbd> | Close open overlays / drawer / dialogs |

*(Note: Slide navigation keys are automatically ignored when typing inside text inputs, number pickers, or range sliders).*

---

## Configuration (`js/config.js`)

Team member details and presentation metadata are configured in [js/config.js](file:///c:/Projects/mathpre/js/config.js). The slides read these values dynamically at runtime:

```javascript
window.NG_CONFIG = {
  names: ["Member 1", "Member 2", "Member 3"],
  college: "Department of Computer Science and Engineering",
  department: "Computer Science and Engineering",
  course: "Discrete Mathematics / Graph Theory",
  faculty: "Course Instructor",
  date: "November 2026"
};
```

---

## Campus Network Designer (Sub-Slide 10·b)

Sub-Slide 10·b is an interactive CAD-style campus network designer that computes the minimum spanning tree over building nodes while taking physical terrain obstacles into account.

### Adding an Aerial Campus Map
1. Place your campus aerial photograph or blueprint image in:
   ```
   assets/campus/campus-map.png
   ```
2. The simulation automatically detects and displays the map image as the canvas background. If missing, it falls back to graph-paper styling.

### Setting Scale and Cable Costs
- **Map width (metres)**: Change the physical width in metres (default: `500m`). Cable distances and pixel-to-metre ratios scale dynamically.
- **Rupees per metre (₹/m)**: Set the trenching/cabling rate per metre (default: `₹500/m`). Total network cost is formatted in standard Indian numbering format (e.g., `₹12,45,000`).
- **Obstacle Multipliers**:
  - **Roads**: 2× cost multiplier.
  - **Rocky Ground**: 3× cost multiplier.
  - **No-go Zones (Water/Protected Areas)**: $\infty$ multiplier (blocks cables and forces topological rerouting).

---

## Running Unit Tests & Visual Harness

- **Automated Unit Tests**: Double-click [tests/tests.html](file:///c:/Projects/mathpre/tests/tests.html) in your browser.
  - Runs all 107 automated unit assertions across `NG.Graph`, `NG.Algo` (Cayley, Kirchhoff, Kruskal, Prim, Dijkstra, Bridges, Detours), `NG.Stepper`, `NG.View`, and `NG.STP` (analytical solver, BPDU simulator, broadcast frame flooding engine).
- **Interactive Component Playground**: Open [tests/harness.html](file:///c:/Projects/mathpre/tests/harness.html) to test `NG.View` rendering, node dragging, and edge states in isolation.

---

## Project Structure

```
mathpre/
├── index.html              # Presentation single-page application (19 slides: 18 main + 1 sub-slide)
├── README.md               # User guide and documentation
├── css/
│   ├── base.css            # Color tokens, typography, grid backgrounds, resets
│   ├── components.css      # Buttons, cards, pills, chips, pseudocode, SVGs
│   ├── deck.css            # Navigation rail, progress bar, overlays, transitions
│   └── slides.css          # Scoped styles for all slides (#s01 through #s16, #s08b)
├── js/
│   ├── config.js           # Team member names, college, and presentation details
│   ├── deck.js             # Presentation engine (navigation, observers, shortcuts)
│   ├── core/
│   │   ├── util.js         # Pure helper functions (math, formatting, RNG, easing)
│   │   ├── graph.js        # NG.Graph data structure
│   │   ├── algo.js         # Graph algorithms (Kruskal, Prim, Dijkstra, Cayley, etc.)
│   │   ├── stepper.js      # Discrete step-by-step animation controller
│   │   ├── view.js         # Layered SVG graph visualization and drag interactions
│   │   └── stp-model.js    # IEEE 802.1D Spanning Tree Protocol simulation engine
│   └── slides/
│       ├── s01.js, s01b.js, s02.js, s02b.js ... s16.js  # Dedicated controller modules per slide
│       └── s08b.js            # Campus Network Designer simulation module
├── assets/
│   ├── fonts/              # Optional local WOFF2 font storage
│   └── campus/             # Campus map placeholder and documentation
├── docs/
│   └── SPEC.md             # Authoritative technical specification
└── tests/
    ├── tests.html          # Browser-based test suite (107 unit tests)
    └── harness.html        # Interactive sandbox for graph components
```

---

## Known Limitations

1. **Desktop / Projector Landscape Viewports**: The presentation is optimized for landscape desktop resolutions ($\ge 900\text{px}$ width). If loaded on a mobile screen under $900\text{px}$, a polite recommendation overlay asks the viewer to open on a laptop or projector.
2. **Typography Fallbacks**: Bundled custom web fonts (`Fraunces`, `Source Sans 3`, `JetBrains Mono`) fall back seamlessly to system fonts (`Georgia`, `Segoe UI`, `Courier New`) when viewed completely offline.
3. **Pointer Precision on Touch Devices**: Node dragging and drawing support touch and stylus input via W3C Pointer Events (`setPointerCapture`); however, mouse or precision trackpad input is recommended when drawing narrow polygon obstacles in Sub-Slide 10·b.
4. **Broadcast Frame Explosion Clamping**: In Slide 15 (STP, id s13 with STP OFF), frame flooding on cyclic graphs generates exponential frame proliferation ($2^{\text{hops}}$). The simulation clamps rendering counters and particle counts to keep the frame rate smooth at 60 FPS without crashing the browser thread.
