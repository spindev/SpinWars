// SpinWars — Battle of the Spinning Tops
// Mobile-first arena combat game

(function () {
  'use strict';

  // ─── Canvas setup ────────────────────────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Keep a portrait phone-like ratio; fill the screen
    canvas.width = Math.min(W, 480);
    canvas.height = H;
  }

  window.addEventListener('resize', resize);
  resize();

  // ─── Arena helper ────────────────────────────────────────────────────────────
  function getArena() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(canvas.width, canvas.height) * 0.38;
    return { cx, cy, r };
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────
  function randBetween(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ─── Game state ──────────────────────────────────────────────────────────────
  let state   = 'menu';   // menu | playing | waveclear | gameover
  let score   = 0;
  let wave    = 1;
  let lives   = 3;
  let player, enemies, particles, stars;
  let lastTime = 0;

  // Touch / pointer target
  let pointerActive = false;
  let pointerX = 0;
  let pointerY = 0;

  // ─── Stars ───────────────────────────────────────────────────────────────────
  function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x:    randBetween(0, canvas.width),
        y:    randBetween(0, canvas.height),
        r:    randBetween(0.5, 2),
        bri:  randBetween(0.3, 1),
        twinkle: randBetween(0, Math.PI * 2)
      });
    }
  }

  function drawStars(t) {
    stars.forEach(s => {
      const alpha = s.bri * (0.6 + 0.4 * Math.sin(s.twinkle + t * 1.2));
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ─── Particle ────────────────────────────────────────────────────────────────
  class Particle {
    constructor(x, y, color, vx, vy, size) {
      this.x = x; this.y = y;
      this.color = color;
      this.vx = vx; this.vy = vy;
      this.size = size || randBetween(2, 5);
      this.life = 1;
      this.decay = randBetween(0.018, 0.04);
    }
    update(dt) {
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= 0.96;
      this.vy *= 0.96;
      this.life -= this.decay;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0, this.size * this.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = randBetween(0, Math.PI * 2);
      const speed = randBetween(0.5, 3.5);
      particles.push(new Particle(x, y, color,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed));
    }
  }

  // ─── SpinTop base class ───────────────────────────────────────────────────────
  class SpinTop {
    constructor(x, y, color, radius) {
      this.x = x; this.y = y;
      this.color = color;
      this.radius = radius || 22;
      this.vx = 0; this.vy = 0;
      this.spinAngle = 0;
      this.spinSpeed = 0.1;
      this.alive = true;
      this.invincible = 0;
      this.trail = [];
      this.hitFlash = 0;
    }

    update(dt) {
      // trail
      this.trail.push({ x: this.x, y: this.y, a: 0.35 });
      if (this.trail.length > 10) this.trail.shift();
      this.trail.forEach(t => { t.a -= 0.035; });
      this.trail = this.trail.filter(t => t.a > 0);

      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= 0.90;
      this.vy *= 0.90;
      this.spinAngle += this.spinSpeed * dt * 60;

      if (this.invincible > 0) this.invincible -= dt;
      if (this.hitFlash  > 0) this.hitFlash  -= dt;
    }

    constrainToArena() {
      const a = getArena();
      const dx = this.x - a.cx;
      const dy = this.y - a.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const max  = a.r - this.radius;
      if (dist > max) {
        const nx = dx / dist;
        const ny = dy / dist;
        this.x = a.cx + nx * max;
        this.y = a.cy + ny * max;
        const dot = this.vx * nx + this.vy * ny;
        this.vx -= 1.6 * dot * nx;
        this.vy -= 1.6 * dot * ny;
        this.vx *= 0.55;
        this.vy *= 0.55;
      }
    }

    isOffArena() {
      const a = getArena();
      const dx = this.x - a.cx;
      const dy = this.y - a.cy;
      return Math.sqrt(dx * dx + dy * dy) > a.r + this.radius * 0.5;
    }

    draw() {
      // trail
      this.trail.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.a;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.spinAngle);

      // glow
      if (this.hitFlash > 0) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 30;
      } else {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;
      }

      // body
      ctx.fillStyle = (this.hitFlash > 0) ? '#ffffff' : this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // blades (3 arms)
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(i * (Math.PI * 2 / 3));
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.55, 0, this.radius * 0.38, this.radius * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // center hub
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ─── Player ───────────────────────────────────────────────────────────────────
  class Player extends SpinTop {
    constructor(x, y) {
      super(x, y, '#00d4ff', 22);
      this.maxHealth = 3;
      this.health    = 3;
      this.spinSpeed = 0.14;
    }

    drawHealthBar() {
      const heartSize = Math.floor(canvas.width * 0.038);
      ctx.font = `${heartSize}px Arial`;
      ctx.textAlign = 'center';
      let hearts = '';
      for (let i = 0; i < this.maxHealth; i++) {
        hearts += i < this.health ? '❤️' : '🖤';
      }
      ctx.fillText(hearts, this.x, this.y + this.radius + 18);
    }
  }

  // ─── Enemy ────────────────────────────────────────────────────────────────────
  const ENEMY_COLORS = ['#ff6b6b', '#ff9f1c', '#ef476f', '#ffd166', '#e07a5f', '#f4845f'];

  class Enemy extends SpinTop {
    constructor(x, y, waveNum) {
      const color = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
      const r = waveNum >= 4 ? 26 : 22;
      super(x, y, color, r);
      this.maxHealth = waveNum >= 5 ? 3 : (waveNum >= 3 ? 2 : 1);
      this.health    = this.maxHealth;
      this.baseSpeed = clamp(0.7 + waveNum * 0.18, 0.7, 2.2);
      this.spinSpeed = randBetween(0.06, 0.12);
      this.dashTimer   = randBetween(1.5, 4);
      this.dashCooldown= randBetween(2, 4);
      this.scored      = false;
    }

    aiUpdate(dt, px, py) {
      const dx = px - this.x;
      const dy = py - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        // Dash toward player
        this.vx += nx * this.baseSpeed * 9;
        this.vy += ny * this.baseSpeed * 9;
        this.dashTimer = this.dashCooldown;
      } else {
        // Drift toward player
        this.vx += nx * this.baseSpeed * 0.4;
        this.vy += ny * this.baseSpeed * 0.4;
      }
    }
  }

  // ─── Collision ────────────────────────────────────────────────────────────────
  function resolveCollision(a, b) {
    const dx   = b.x - a.x;
    const dy   = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const min  = a.radius + b.radius;
    if (dist >= min || dist === 0) return false;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = min - dist;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dot = dvx * nx + dvy * ny;
    if (dot > 0) {
      const imp = dot * 1.25;
      a.vx -= imp * nx;
      a.vy -= imp * ny;
      b.vx += imp * nx;
      b.vy += imp * ny;
    }
    return true;
  }

  // ─── Init game ────────────────────────────────────────────────────────────────
  function initGame() {
    const a = getArena();
    player    = new Player(a.cx, a.cy);
    player.health = lives;
    enemies   = [];
    particles = [];
    spawnWave();
  }

  function spawnWave() {
    const a     = getArena();
    const count = 2 + wave * 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const d = a.r * 0.7;
      enemies.push(new Enemy(
        a.cx + Math.cos(angle) * d,
        a.cy + Math.sin(angle) * d,
        wave
      ));
    }
  }

  // ─── Pointer input ───────────────────────────────────────────────────────────
  function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width  / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    const p = getCanvasPos(t.clientX, t.clientY);
    pointerX = p.x; pointerY = p.y; pointerActive = true;
    handleTap();
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const p = getCanvasPos(t.clientX, t.clientY);
    pointerX = p.x; pointerY = p.y;
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    pointerActive = false;
  }, { passive: false });

  canvas.addEventListener('mousedown', e => {
    const p = getCanvasPos(e.clientX, e.clientY);
    pointerX = p.x; pointerY = p.y; pointerActive = true;
    handleTap();
  });
  canvas.addEventListener('mousemove', e => {
    if (!pointerActive) return;
    const p = getCanvasPos(e.clientX, e.clientY);
    pointerX = p.x; pointerY = p.y;
  });
  canvas.addEventListener('mouseup', () => { pointerActive = false; });

  function handleTap() {
    if (state === 'menu')      { startGame();  return; }
    if (state === 'gameover')  { state = 'menu'; return; }
    if (state === 'waveclear') { nextWave();    return; }
  }

  function startGame() {
    score = 0; wave = 1; lives = 3;
    state = 'playing';
    initStars();
    initGame();
  }

  function nextWave() {
    wave++;
    initGame();
    state = 'playing';
  }

  // ─── Update & Draw ───────────────────────────────────────────────────────────
  function updateAndDraw(dt) {
    drawArena();

    // Move player toward pointer
    if (pointerActive) {
      const dx = pointerX - player.x;
      const dy = pointerY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4) {
        const force = Math.min(dist * 0.05, 7);
        player.vx += (dx / dist) * force * 0.32;
        player.vy += (dy / dist) * force * 0.32;
      }
    }

    player.update(dt);
    player.constrainToArena();

    // Update enemies
    enemies.forEach(e => {
      e.aiUpdate(dt, player.x, player.y);
      e.update(dt);
      if (e.alive) e.constrainToArena();
    });

    // Player ↔ enemy collisions
    enemies.forEach(e => {
      if (!e.alive) return;
      if (resolveCollision(player, e)) {
        e.hitFlash = 0.12;
        if (player.invincible <= 0) {
          player.health--;
          player.hitFlash  = 0.18;
          player.invincible = 1.5;
          spawnBurst(player.x, player.y, '#ffffff', 10);
          if (player.health <= 0) {
            player.alive = false;
          }
        }
      }
    });

    // Enemy ↔ enemy collisions
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        if (enemies[i].alive && enemies[j].alive) {
          resolveCollision(enemies[i], enemies[j]);
        }
      }
    }

    // Check enemies that fell off
    enemies.forEach(e => {
      if (!e.alive) return;
      if (e.isOffArena()) {
        e.alive = false;
        if (!e.scored) {
          score += 100 * wave;
          e.scored = true;
        }
        spawnBurst(e.x, e.y, e.color, 18);
      }
    });
    enemies = enemies.filter(e => e.alive);

    // Check if player fell off
    if (!player.alive || player.isOffArena()) {
      spawnBurst(player.x, player.y, '#00d4ff', 20);
      lives--;
      if (lives <= 0) {
        state = 'gameover';
        return;
      }
      // Respawn player
      const a = getArena();
      player    = new Player(a.cx, a.cy);
      player.health    = clamp(lives, 1, 3);
      player.invincible = 2;
    }

    // Check wave clear
    if (enemies.length === 0) {
      score += 500 * wave;
      state = 'waveclear';
    }

    // Particles
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.draw());

    // Entities
    enemies.forEach(e => e.draw());
    player.draw();
    player.drawHealthBar();

    drawHUD();
  }

  function drawArena() {
    const a = getArena();

    // outer soft glow ring
    const glow = ctx.createRadialGradient(a.cx, a.cy, a.r * 0.85, a.cx, a.cy, a.r + 20);
    glow.addColorStop(0, 'rgba(68,136,255,0)');
    glow.addColorStop(1, 'rgba(68,136,255,0.22)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(a.cx, a.cy, a.r + 20, 0, Math.PI * 2);
    ctx.fill();

    // floor
    const floor = ctx.createRadialGradient(a.cx, a.cy - a.r * 0.1, 0, a.cx, a.cy, a.r);
    floor.addColorStop(0,   'rgba(25, 40, 90, 0.92)');
    floor.addColorStop(0.75,'rgba(12, 20, 55, 0.88)');
    floor.addColorStop(1,   'rgba(5,  10, 30, 0.5)');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2);
    ctx.fill();

    // concentric grid rings
    ctx.strokeStyle = 'rgba(100,160,255,0.1)';
    ctx.lineWidth   = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(a.cx, a.cy, a.r * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }
    // cross lines
    ctx.strokeStyle = 'rgba(100,160,255,0.07)';
    for (let i = 0; i < 4; i++) {
      const angle = i * (Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(a.cx + Math.cos(angle) * a.r * 0.05, a.cy + Math.sin(angle) * a.r * 0.05);
      ctx.lineTo(a.cx + Math.cos(angle) * a.r,        a.cy + Math.sin(angle) * a.r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a.cx - Math.cos(angle) * a.r * 0.05, a.cy - Math.sin(angle) * a.r * 0.05);
      ctx.lineTo(a.cx - Math.cos(angle) * a.r,        a.cy - Math.sin(angle) * a.r);
      ctx.stroke();
    }

    // arena border
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth   = 3;
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawHUD() {
    const fs = Math.max(14, Math.floor(canvas.width * 0.048));
    ctx.font      = `bold ${fs}px Arial, sans-serif`;
    ctx.shadowBlur = 0;

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`${score}`, 14, fs + 6);

    // Wave
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${wave}`, canvas.width - 14, fs + 6);

    // Lives
    ctx.textAlign = 'center';
    let livesStr = '';
    for (let i = 0; i < 3; i++) livesStr += i < lives ? '🔴' : '⚫';
    ctx.font = `${Math.max(12, Math.floor(canvas.width * 0.04))}px Arial, sans-serif`;
    ctx.fillText(livesStr, canvas.width / 2, fs + 6);
  }

  // ─── Screens ─────────────────────────────────────────────────────────────────
  function drawMenu(t) {
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;

    // Animated title tops
    const demoCount = 5;
    ctx.save();
    for (let i = 0; i < demoCount; i++) {
      const angle = (i / demoCount) * Math.PI * 2 + t * 0.4;
      const r     = Math.min(W, H) * 0.28;
      const x     = cx + Math.cos(angle) * r;
      const y     = H  * 0.42 + Math.sin(angle) * r * 0.4;
      const color = ENEMY_COLORS[i % ENEMY_COLORS.length];
      ctx.shadowColor = color;
      ctx.shadowBlur  = 20;
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      // blades
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + i * 1.2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let b = 0; b < 3; b++) {
        ctx.save();
        ctx.rotate(b * (Math.PI * 2 / 3));
        ctx.beginPath();
        ctx.ellipse(10, 0, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();

    // Floating player top in center
    ctx.save();
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = 30;
    ctx.fillStyle   = '#00d4ff';
    ctx.beginPath();
    ctx.arc(cx, H * 0.42, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, H * 0.42);
    ctx.rotate(t * 5);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let b = 0; b < 3; b++) {
      ctx.save();
      ctx.rotate(b * (Math.PI * 2 / 3));
      ctx.beginPath();
      ctx.ellipse(14, 0, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // Title
    const titleSize = clamp(Math.floor(W * 0.13), 38, 72);
    ctx.font      = `900 ${titleSize}px Arial Black, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = 25;
    ctx.fillStyle   = '#ffffff';
    ctx.fillText('SPIN', cx, H * 0.14);
    ctx.fillStyle   = '#00d4ff';
    ctx.fillText('WARS', cx, H * 0.14 + titleSize * 1.05);
    ctx.shadowBlur  = 0;

    // Subtitle
    const subSize = clamp(Math.floor(W * 0.045), 14, 22);
    ctx.font      = `${subSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(180,210,255,0.85)';
    ctx.fillText('Battle of the Spinning Tops', cx, H * 0.14 + titleSize * 2.2);

    // Tap to play (pulsing)
    const pulse = 0.7 + 0.3 * Math.sin(t * 3);
    const btnSize = clamp(Math.floor(W * 0.052), 16, 26);
    ctx.font      = `bold ${btnSize}px Arial, sans-serif`;
    ctx.fillStyle = `rgba(0, 212, 255, ${pulse.toFixed(2)})`;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = 12 * pulse;
    ctx.fillText('TAP TO PLAY', cx, H * 0.82);
    ctx.shadowBlur  = 0;

    // How to play
    const hintSize = clamp(Math.floor(W * 0.038), 12, 18);
    ctx.font      = `${hintSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(150,180,220,0.7)';
    ctx.fillText('Drag to move · Knock enemies off the arena', cx, H * 0.88);
    ctx.fillText('Survive all waves to win!', cx, H * 0.92);
  }

  function drawOverlay(title, titleColor, lines, btnText) {
    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    const bgW = W * 0.82;
    const bgH = H * 0.44;
    const bgX = cx - bgW / 2;
    const bgY = H * 0.28;
    ctx.fillStyle = 'rgba(10,18,45,0.95)';
    ctx.strokeStyle = titleColor;
    ctx.lineWidth   = 2;
    ctx.shadowColor = titleColor;
    ctx.shadowBlur  = 14;
    roundRect(bgX, bgY, bgW, bgH, 18);
    ctx.shadowBlur  = 0;

    const tsz = clamp(Math.floor(W * 0.1), 30, 56);
    ctx.font      = `900 ${tsz}px Arial Black, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = titleColor;
    ctx.shadowColor = titleColor;
    ctx.shadowBlur  = 18;
    ctx.fillText(title, cx, bgY + tsz + 16);
    ctx.shadowBlur  = 0;

    const lsz = clamp(Math.floor(W * 0.048), 14, 22);
    ctx.font      = `${lsz}px Arial, sans-serif`;
    ctx.fillStyle = '#cce8ff';
    lines.forEach((line, i) => {
      ctx.fillText(line, cx, bgY + tsz + 50 + i * (lsz + 8));
    });

    const bsz = clamp(Math.floor(W * 0.05), 16, 24);
    const pulse = 0.75 + 0.25 * Math.sin(lastTime * 0.003);
    ctx.font      = `bold ${bsz}px Arial, sans-serif`;
    ctx.fillStyle = `rgba(0,212,255,${pulse.toFixed(2)})`;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillText(btnText, cx, bgY + bgH - bsz - 14);
    ctx.shadowBlur = 0;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawWaveClear() {
    drawArena();
    particles.forEach(p => { p.update(1 / 60); p.draw(); });
    player.draw();
    drawHUD();
    drawOverlay(
      `WAVE ${wave} CLEAR!`,
      '#00ff88',
      [`Score: ${score}`, `Get ready for Wave ${wave + 1}…`],
      'TAP TO CONTINUE'
    );
  }

  function drawGameOver() {
    drawArena();
    particles.forEach(p => { p.update(1 / 60); p.draw(); });
    drawHUD();
    drawOverlay(
      'GAME OVER',
      '#ff4466',
      [`Final Score: ${score}`, `Reached Wave ${wave}`],
      'TAP TO RETURN'
    );
  }

  // ─── Main loop ───────────────────────────────────────────────────────────────
  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStars(timestamp / 1000);

    if      (state === 'menu')      drawMenu(timestamp / 1000);
    else if (state === 'playing')   updateAndDraw(dt);
    else if (state === 'waveclear') drawWaveClear();
    else if (state === 'gameover')  drawGameOver();

    requestAnimationFrame(loop);
  }

  // ─── Kickoff ──────────────────────────────────────────────────────────────────
  initStars();
  requestAnimationFrame(loop);
})();
