(() => {
  const canvas = document.querySelector(".contour-map__canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const segments = {
    1: [["L", "B"]], 2: [["B", "R"]], 3: [["L", "R"]], 4: [["T", "R"]],
    5: [["T", "L"], ["B", "R"]], 6: [["T", "B"]], 7: [["T", "L"]],
    8: [["T", "L"]], 9: [["T", "B"]], 10: [["T", "R"], ["L", "B"]],
    11: [["T", "R"]], 12: [["L", "R"]], 13: [["B", "R"]], 14: [["L", "B"]]
  };
  const cursor = { x: .72, y: .34 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;

  function drawContours() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const columns = Math.ceil(width / 28) + 1;
    const rows = Math.ceil(height / 28) + 1;
    const dx = width / (columns - 1);
    const dy = height / (rows - 1);
    const values = new Float32Array(columns * rows);
    const peaks = [[.72, .34, 1.25, .18, .23], [.25, .79, .88, .21, .28], [.95, .87, .62, .14, .2]];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = column / (columns - 1);
        const y = row / (rows - 1);
        let value = .38 * Math.sin(x * 13 + y * 4) + .34 * Math.cos(y * 12 - x * 5) + .2 * Math.sin((x + y) * 19);
        peaks.forEach(([px, py, scale, sx, sy]) => {
          const ox = (x - px) / sx;
          const oy = (y - py) / sy;
          value += scale * Math.exp(-.5 * (ox * ox + oy * oy));
        });
        const ox = (x - cursor.x) / .15;
        const oy = (y - cursor.y) / .2;
        value += .9 * Math.exp(-.5 * (ox * ox + oy * oy));
        values[row * columns + column] = value;
      }
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let levelIndex = 0; levelIndex <= 20; levelIndex += 1) {
      const level = -1.15 + levelIndex * .16;
      ctx.beginPath();
      for (let row = 0; row < rows - 1; row += 1) {
        for (let column = 0; column < columns - 1; column += 1) {
          const index = row * columns + column;
          const a = values[index];
          const b = values[index + 1];
          const c = values[index + columns + 1];
          const d = values[index + columns];
          const code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
          const edges = segments[code];
          if (!edges) continue;

          const x = column * dx;
          const y = row * dy;
          const cross = (u, v) => (level - u) / (v - u || 1e-6);
          const points = {
            T: [x + dx * cross(a, b), y],
            R: [x + dx, y + dy * cross(b, c)],
            B: [x + dx * cross(d, c), y + dy],
            L: [x, y + dy * cross(a, d)]
          };
          edges.forEach(([from, to]) => {
            ctx.moveTo(...points[from]);
            ctx.lineTo(...points[to]);
          });
        }
      }
      const major = levelIndex % 5 === 0;
      ctx.strokeStyle = major ? "rgba(30,100,200,.48)" : "rgba(50,120,210,.22)";
      ctx.lineWidth = major ? 1.35 : .8;
      ctx.stroke();
    }
  }

  function scheduleDraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      drawContours();
    });
  }

  window.addEventListener("resize", scheduleDraw, { passive: true });
  window.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || event.pointerType === "touch") return;
    const bounds = canvas.getBoundingClientRect();
    cursor.x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    cursor.y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    scheduleDraw();
  }, { passive: true });
  drawContours();
})();
