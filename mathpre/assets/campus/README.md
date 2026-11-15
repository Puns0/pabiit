# Campus Map Background Image

Place an optional background image named `campus-map.png` in this directory (`assets/campus/campus-map.png`).

- **Recommended dimensions**: 1000 × 620 pixels (matching the SVG map canvas coordinate system and viewBox).
- **Behavior**: If present, the Campus Network Designer (Slide 8b) automatically displays it as the canvas background at 55% opacity. If missing, it is silently ignored and the notebook graph-paper grid is displayed.
- **Scale Calibration**: In the Designer control panel, set the **Map width (metres)** input (default `500` metres) to match the real-world horizontal width of your campus. The simulator automatically computes euclidean distances (`metresPerPixel = mapWidthMetres / 1000`) and terrain-adjusted trenching costs based on this scale.

