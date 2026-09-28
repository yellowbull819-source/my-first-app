const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const coinsEl = document.querySelector("#coins");
const livesEl = document.querySelector("#lives");
const messageEl = document.querySelector("#message");
const messageKicker = document.querySelector("#message-kicker");
const messageTitle = document.querySelector("#message-title");
const messageDetail = document.querySelector("#message-detail");
const restartButton = document.querySelector("#restart-button");
const messageButton = document.querySelector("#message-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = {};
const levelWidth = 3600;
const gravity = 0.72;
let player, cameraX, score, collected, lives, gameState, lastTime, particles, jumpWasDown, beamWasDown, beams;
const backgroundPhoto = new Image();
backgroundPhoto.crossOrigin = "anonymous";
backgroundPhoto.src = "https://upload.wikimedia.org/wikipedia/commons/c/c9/20260429_Burg_Himeji_01%2C_Hy%C5%8Dgo%2C_Japan_anagoria.jpg";

const platforms = [
  { x: 0, y: 470, w: 650, h: 70 }, { x: 760, y: 470, w: 480, h: 70 },
  { x: 1360, y: 470, w: 630, h: 70 }, { x: 2110, y: 470, w: 490, h: 70 },
  { x: 2720, y: 470, w: 880, h: 70 },
  { x: 430, y: 375, w: 150, h: 18 }, { x: 850, y: 355, w: 175, h: 18 },
  { x: 1120, y: 300, w: 145, h: 18 }, { x: 1480, y: 370, w: 155, h: 18 },
  { x: 1770, y: 315, w: 180, h: 18 }, { x: 2210, y: 370, w: 180, h: 18 },
  { x: 2490, y: 295, w: 150, h: 18 }, { x: 2860, y: 365, w: 190, h: 18 },
];
const coinSpots = [
  [260, 420], [485, 325], [900, 305], [1160, 250], [1540, 320], [1830, 265], [2280, 320], [2550, 245],
];
const enemySpots = [[540, 426], [930, 311], [1570, 426], [1840, 271], [2320, 426], [2940, 321], [3200, 426]];
const goal = { x: 3440, y: 350, w: 48, h: 120 };
let coins, enemies;

function resetGame() {
  player = { x: 90, y: 400, w: 28, h: 42, vx: 0, vy: 0, facing: 1, grounded: false, jumps: 0, attacking: 0, invincible: 0 };
  cameraX = 0; score = 0; collected = 0; lives = 3; gameState = "playing"; particles = [];
  jumpWasDown = false; beamWasDown = false; beams = [];
  coins = coinSpots.map(([x, y]) => ({ x, y, collected: false, bob: Math.random() * 6 }));
  enemies = enemySpots.map(([x, y]) => ({ x, y, w: 30, h: 28, vx: -0.7, alive: true, home: x }));
  messageEl.hidden = true; updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(6, "0");
  coinsEl.textContent = `${collected} / ${coins.length}`;
  livesEl.textContent = `${"♥ ".repeat(lives)}${"♡ ".repeat(3 - lives)}`.trim();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
  if (gameState !== "playing") return;
  const step = Math.min(dt / 16.67, 2);
  const left = keys.ArrowLeft || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;
  const jump = keys.Space || keys.ArrowUp || keys.KeyW;
  const beam = keys.KeyZ;
  const jumpPressed = jump && !jumpWasDown;
  const beamPressed = beam && !beamWasDown;
  player.vx += (right ? 0.55 : left ? -0.55 : 0) * step;
  if (!left && !right) player.vx *= Math.pow(0.78, step);
  player.vx = Math.max(-4.7, Math.min(4.7, player.vx));
  if (player.vx) player.facing = Math.sign(player.vx);
  if (jump && !player.grounded) {
    player.vx += player.facing * 0.18 * step;
    player.vx = Math.max(-5.4, Math.min(5.4, player.vx));
  }
  if (jumpPressed && player.jumps < 2) {
    player.vy = -12.5;
    player.grounded = false;
    player.jumps++;
  }
  player.vy += gravity * step; player.x += player.vx * step; player.y += player.vy * step;
  player.x = Math.max(0, Math.min(levelWidth - player.w, player.x));
  player.grounded = false;
  for (const platform of platforms) {
    if (player.vy >= 0 && player.x + player.w > platform.x && player.x < platform.x + platform.w &&
        player.y + player.h >= platform.y && player.y + player.h - player.vy * step <= platform.y) {
      player.y = platform.y - player.h; player.vy = 0; player.grounded = true; player.jumps = 0;
    }
  }
  if (keys.KeyX && player.attacking <= 0) player.attacking = 13;
  if (player.attacking > 0) player.attacking -= step;
  if (player.invincible > 0) player.invincible -= step;
  if (beamPressed) {
    beams.push({
      x: player.facing > 0 ? player.x + player.w : player.x - 30,
      y: player.y + 17,
      w: 30,
      h: 8,
      vx: player.facing * 9,
      life: 70,
    });
  }
  const attackBox = { x: player.facing > 0 ? player.x + player.w : player.x - 28, y: player.y + 10, w: 28, h: 22 };
  for (const currentBeam of beams) {
    currentBeam.x += currentBeam.vx * step;
    currentBeam.life -= step;
    for (const enemy of enemies) {
      if (enemy.alive && rectsOverlap(currentBeam, enemy)) {
        enemy.alive = false;
        currentBeam.life = 0;
        score += 100;
        burst(enemy.x + enemy.w / 2, enemy.y, "#e7b84b");
      }
    }
  }
  beams = beams.filter(currentBeam => currentBeam.life > 0 && currentBeam.x > -100 && currentBeam.x < levelWidth + 100);
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.vx * step;
    if (Math.abs(enemy.x - enemy.home) > 70) enemy.vx *= -1;
    if (player.attacking > 0 && rectsOverlap(attackBox, enemy)) {
      enemy.alive = false; score += 100; burst(enemy.x + enemy.w / 2, enemy.y, "#ffca63");
    } else if (player.invincible <= 0 && rectsOverlap(player, enemy)) hitPlayer();
  }
  for (const coin of coins) {
    if (!coin.collected && rectsOverlap(player, { x: coin.x - 10, y: coin.y - 10, w: 20, h: 20 })) {
      coin.collected = true; collected++; score += 50; burst(coin.x, coin.y, "#ffe184"); updateHud();
    }
  }
  if (player.y > HEIGHT + 80) hitPlayer();
  if (rectsOverlap(player, goal)) finish(true);
  cameraX += (player.x - cameraX - 330) * 0.1 * step;
  cameraX = Math.max(0, Math.min(levelWidth - WIDTH, cameraX));
  updateParticles(step); updateHud();
  jumpWasDown = jump;
  beamWasDown = beam;
}

function hitPlayer() {
  if (player.invincible > 0) return;
  lives--; burst(player.x, player.y, "#ff6b9d");
  if (lives <= 0) finish(false);
  else { player.x = Math.max(60, player.x - 180); player.y = 300; player.vx = 0; player.vy = -6; player.invincible = 100; }
}
function finish(won) {
  gameState = won ? "won" : "lost";
  if (won && collected === coins.length) score += 500;
  messageKicker.textContent = won ? "STAGE CLEAR!" : "GAME OVER";
  messageTitle.textContent = won ? "ゴールに到達しました" : "もう一度挑戦しよう";
  messageDetail.textContent = won && collected === coins.length ? "全コインボーナス +500！" : `SCORE ${String(score).padStart(6, "0")}`;
  messageEl.hidden = false; updateHud();
}
function burst(x, y, color) {
  for (let i = 0; i < 10; i++) particles.push({ x, y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .7) * 5, life: 25 + Math.random() * 15, color });
}
function updateParticles(step) {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => { p.x += p.vx * step; p.y += p.vy * step; p.vy += .12 * step; p.life -= step; });
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  ctx.save(); ctx.translate(-Math.floor(cameraX), 0);
  platforms.forEach(drawPlatform); coins.forEach(drawCoin); enemies.forEach(drawEnemy); drawGoal(); drawPlayer();
  beams.forEach(drawBeam);
  particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / 35); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 5, 5); }); ctx.globalAlpha = 1;
  ctx.restore();
}
function drawBackground() {
  if (backgroundPhoto.complete && backgroundPhoto.naturalWidth > 0) {
    const scale = Math.max(WIDTH / backgroundPhoto.naturalWidth, HEIGHT / backgroundPhoto.naturalHeight);
    const photoWidth = backgroundPhoto.naturalWidth * scale;
    const photoHeight = backgroundPhoto.naturalHeight * scale;
    const offset = -((cameraX * 0.16) % photoWidth);
    for (let x = offset - photoWidth; x < WIDTH; x += photoWidth) {
      ctx.drawImage(backgroundPhoto, x, (HEIGHT - photoHeight) * 0.5, photoWidth, photoHeight);
    }
    ctx.fillStyle = "#151b2770";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#321d1d38";
    ctx.fillRect(0, HEIGHT * 0.55, WIDTH, HEIGHT * 0.45);
    ctx.fillStyle = "#00f6ff18";
    for (let y = 0; y < HEIGHT; y += 6) ctx.fillRect(0, y, WIDTH, 1);
    ctx.strokeStyle = "#ff2bd655";
    ctx.lineWidth = 2;
    for (let x = -200; x < WIDTH + 300; x += 90) {
      ctx.beginPath(); ctx.moveTo(x - cameraX * .08, HEIGHT); ctx.lineTo(x + 180 - cameraX * .08, HEIGHT * .62); ctx.stroke();
    }
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT); sky.addColorStop(0, "#263d59"); sky.addColorStop(1, "#c47b78"); ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#ffffff22"; for (let i = 0; i < 7; i++) ctx.fillRect(100 + i * 180 - cameraX * .15, 90 + (i % 3) * 38, 80, 8);
  ctx.fillStyle = "#3b4c59"; for (let i = -1; i < 12; i++) { const x = i * 330 - cameraX * .3; ctx.beginPath(); ctx.moveTo(x, 410); ctx.lineTo(x + 160, 210); ctx.lineTo(x + 350, 410); ctx.fill(); }
  ctx.fillStyle = "#26333f"; for (let i = -1; i < 14; i++) { const x = i * 260 - cameraX * .55; ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x + 120, 300); ctx.lineTo(x + 250, 470); ctx.fill(); }
}
function drawPlatform(p) {
  ctx.fillStyle = "#111735"; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.shadowColor = "#00f6ff"; ctx.shadowBlur = 12;
  ctx.fillStyle = "#00f6ff"; ctx.fillRect(p.x, p.y, p.w, 4); ctx.shadowBlur = 0;
  ctx.fillStyle = "#24305b"; for (let x = p.x + 12; x < p.x + p.w; x += 32) ctx.fillRect(x, p.y + 13, 4, 10);
}
function drawCoin(c) {
  if (c.collected) return; const bob = Math.sin(Date.now() / 180 + c.bob) * 4;
  ctx.shadowColor = "#ffe600"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffe600"; ctx.beginPath(); ctx.arc(c.x, c.y + bob, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff8a0"; ctx.fillRect(c.x - 2, c.y - 5 + bob, 4, 10);
}
function drawEnemy(e) {
  if (!e.alive) return; ctx.shadowColor = "#ff2bd6"; ctx.shadowBlur = 10; ctx.fillStyle = "#7d1b78"; ctx.fillRect(e.x, e.y + 5, e.w, e.h - 5); ctx.shadowBlur = 0;
  ctx.fillStyle = "#b6e9ed"; ctx.fillRect(e.x + 5, e.y, 20, 13); ctx.fillStyle = "#160d35";
  ctx.fillRect(e.x + 9, e.y + 4, 4, 4); ctx.fillRect(e.x + 19, e.y + 4, 4, 4);
}
function drawBeam(beam) {
  ctx.shadowColor = "#00f6ff"; ctx.shadowBlur = 12; ctx.fillStyle = "#e8ffff";
  ctx.fillRect(beam.x, beam.y, beam.w, beam.h);
  ctx.shadowBlur = 0; ctx.fillStyle = "#ff2bd6";
  ctx.fillRect(beam.x, beam.y + 2, beam.w, 4);
}
function drawGoal() {
  ctx.shadowColor = "#00f6ff"; ctx.shadowBlur = 12; ctx.fillStyle = "#00f6ff"; ctx.fillRect(goal.x, goal.y, 6, goal.h); ctx.shadowBlur = 0; ctx.fillStyle = "#ff2bd6";
  ctx.beginPath(); ctx.moveTo(goal.x + 6, goal.y); ctx.lineTo(goal.x + 48, goal.y + 14); ctx.lineTo(goal.x + 6, goal.y + 28); ctx.fill();
}
function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) return;
  ctx.save(); ctx.translate(player.x, player.y); if (player.facing < 0) ctx.scale(-1, 1);
  // 笠をかぶった、オリジナルの和風旅人キャラクター。
  ctx.shadowColor = "#00f6ff"; ctx.shadowBlur = 10; ctx.fillStyle = "#9a53ff"; ctx.fillRect(1, 3, 29, 5); ctx.shadowBlur = 0;
  ctx.fillStyle = "#dffcff"; ctx.fillRect(7, 8, 18, 4);
  ctx.fillStyle = "#ff8ce9"; ctx.fillRect(8, 11, 16, 12);
  ctx.fillStyle = "#160d35"; ctx.fillRect(19, 15, 3, 3);
  ctx.fillStyle = "#153e68"; ctx.fillRect(5, 22, 22, 18);
  ctx.fillStyle = "#00f6ff"; ctx.fillRect(5, 27, 22, 5);
  ctx.fillStyle = "#ff2bd6"; ctx.fillRect(14, 22, 4, 18);
  ctx.fillStyle = "#17314d"; ctx.fillRect(4, 39, 10, 4); ctx.fillRect(19, 39, 10, 4);
  if (player.attacking > 0) {
    ctx.fillStyle = "#f7ead0"; ctx.fillRect(27, 16, 20, 3);
    ctx.fillStyle = "#b8834e"; ctx.fillRect(43, 13, 4, 9);
  }
  ctx.restore();
}

function loop(time) { const dt = lastTime ? time - lastTime : 16.67; lastTime = time; update(dt); draw(); requestAnimationFrame(loop); }
function setKey(key, value) { keys[key] = value; }
window.addEventListener("keydown", event => { if (event.code === "Space") event.preventDefault(); setKey(event.code, true); });
window.addEventListener("keyup", event => setKey(event.code, false));
document.querySelectorAll("[data-key]").forEach(button => {
  const key = button.dataset.key;
  button.addEventListener("pointerdown", event => { event.preventDefault(); setKey(key, true); });
  button.addEventListener("pointerup", () => setKey(key, false));
  button.addEventListener("pointerleave", () => setKey(key, false));
});
restartButton.addEventListener("click", resetGame);
messageButton.addEventListener("click", resetGame);
resetGame(); requestAnimationFrame(loop);
