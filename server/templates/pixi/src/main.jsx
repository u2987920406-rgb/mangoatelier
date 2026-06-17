// Starter PixiJS v8 — démo Vampire Survivors
// WASD / Flèches = déplacement · Ennemis = cercles rouges qui chassent le joueur
// Décris le jeu dans le chat : Mango ajoute les mécaniques, assets, effets
import { Application, Graphics, Text } from 'pixi.js';

(async () => {
  const app = new Application();
  await app.init({ resizeTo: window, background: '#0d0d1a', antialias: true });
  document.body.appendChild(app.canvas);

  const { screen } = app;

  // ── Joueur ──────────────────────────────────────────────
  const player = new Graphics();
  player.rect(-14, -14, 28, 28).fill('#4fc3f7').stroke({ color: '#81d4fa', width: 2 });
  player.x = screen.width / 2;
  player.y = screen.height / 2;
  app.stage.addChild(player);

  // ── HUD ─────────────────────────────────────────────────
  const hud = new Text({
    text: 'Score: 0',
    style: { fill: '#ffffff', fontSize: 16, fontFamily: 'monospace' },
  });
  hud.x = 12; hud.y = 12;
  app.stage.addChild(hud);

  // ── État global ──────────────────────────────────────────
  const keys = {};
  const enemies = [];
  let score = 0;
  let wave = 1;
  let spawnCd = 90;

  window.addEventListener('keydown', e => { keys[e.key] = true; e.preventDefault(); });
  window.addEventListener('keyup',   e => { delete keys[e.key]; });

  function spawnEnemy() {
    const side = (Math.random() * 4) | 0;
    const w = screen.width, h = screen.height;
    const [ex, ey] = side === 0 ? [Math.random() * w, -20]
                   : side === 1 ? [w + 20, Math.random() * h]
                   : side === 2 ? [Math.random() * w, h + 20]
                   :              [-20, Math.random() * h];
    const g = new Graphics();
    g.circle(0, 0, 10).fill('#ef5350').stroke({ color: '#ff8a80', width: 1.5 });
    g.x = ex; g.y = ey;
    app.stage.addChild(g);
    enemies.push(g);
  }

  // ── Game loop ────────────────────────────────────────────
  app.ticker.add(() => {
    const spd = 3;
    if (keys['ArrowLeft'] || keys['a']) player.x -= spd;
    if (keys['ArrowRight'] || keys['d']) player.x += spd;
    if (keys['ArrowUp'] || keys['w']) player.y -= spd;
    if (keys['ArrowDown'] || keys['s']) player.y += spd;
    player.x = Math.max(14, Math.min(screen.width - 14, player.x));
    player.y = Math.max(14, Math.min(screen.height - 14, player.y));

    if (--spawnCd <= 0) {
      spawnEnemy();
      spawnCd = Math.max(20, 90 - wave * 5);
    }

    const eSpd = 1.2 + wave * 0.15;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = player.x - e.x, dy = player.y - e.y;
      const d = Math.hypot(dx, dy);
      e.x += (dx / d) * eSpd;
      e.y += (dy / d) * eSpd;
      if (d < 22) { app.stage.removeChild(e); enemies.splice(i, 1); score -= 10; }
    }

    score++;
    if (score > 0 && score % 600 === 0) wave++;
    hud.text = `Score: ${Math.max(0, score)}  Vague: ${wave}  Ennemis: ${enemies.length}`;
  });
})();
