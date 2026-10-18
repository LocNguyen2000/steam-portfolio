"use strict";

const WIDTH = 1280;
const HEIGHT = 800;
const TILE_SIZE = 64;
const COLUMNS = 20;
const ROWS = 13;

const INITIAL_MAP = [
  [0, 0, 0, 0, 0, 0, 0, 13, 13, 11, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0],
  [11, 0, 10, 0, 0, 0, 11, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0],
  [13, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 0, 0, 1, 1, 1, 1, 1, 1, 1, 5],
  [0, 0, 0, 3, 0, 0, 0, 0, 0, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 3, 0, 0, 2, 4, 4, 4, 0, 0, 3, 0, 0, 13, 13, 0, 0, 0],
  [0, 0, 0, 3, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0, 0, 11, 0, 13, 10, 0],
  [0, 0, 0, 3, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0, 0, 12, 12, 0, 0, 0],
  [0, 0, 0, 3, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0, 0, 10, 0, 11, 0, 0],
  [1, 1, 1, 3, 0, 0, 1, 1, 1, 1, 1, 1, 3, 0, 0, 13, 11, 0, 0, 0],
  [0, 0, 11, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0],
  [11, 0, 0, 0, 0, 10, 10, 0, 0, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

const TOWERS = {
  normal: { name: "Normal", cost: 40, range: 250, damage: 3, cooldown: 1000, bulletDuration: 500, bulletColor: "#d17d2a", sound: "normalShot", cannon: "normalCannon" },
  sniper: { name: "Sniper", cost: 100, range: 350, damage: 5, cooldown: 3000, bulletDuration: 650, bulletColor: "#d6c827", sound: "sniperShot", cannon: "sniperCannon" },
  machine: { name: "Machine gun", cost: 80, range: 250, damage: 4, cooldown: 1000, bulletDuration: 100, bulletColor: "#27db4b", sound: "machineShot", cannon: "rapidCannon" }
};

const ENEMIES = {
  0: { health: 15, speed: 2, reward: 5, radius: 9, color: "#f0f8ff" },
  1: { health: 30, speed: 1, reward: 10, radius: 10, color: "#ff4500" },
  2: { health: 100, speed: 1, reward: 35, radius: 15, color: "#6495ed" },
  3: { health: 500, speed: 1, reward: 100, radius: 18, color: "#45474d" }
};

const SPRITES = {
  0: [1216, 384],
  1: [384, 448],
  2: [384, 448],
  3: [384, 448],
  4: [384, 448],
  5: [384, 448],
  6: [384, 448],
  7: [1280, 384],
  8: [1344, 384],
  9: [1408, 384],
  10: [1344, 320],
  11: [1408, 320],
  12: [1024, 320],
  13: [960, 320]
};

const assets = {
  tiles: loadImage("assets/tile.jpg"),
  enemySprites: [
    loadImage("assets/enemy_0-transparent.png"),
    loadImage("assets/enemy_1-transparent.png"),
    loadImage("assets/enemy_2-transparent.png"),
    loadImage("assets/enemy_4-transparent.png")
  ],
  normalCannon: loadImage("assets/cannon-normal.png"),
  sniperCannon: loadImage("assets/cannon-sniper.png"),
  rapidCannon: loadImage("assets/cannon-rapid.png"),
  normalShot: loadAudio("assets/normal-cannon.wav"),
  sniperShot: loadAudio("assets/sniper-cannon.mp3"),
  machineShot: loadAudio("assets/shot.wav"),
  enemyDeath: loadAudio("assets/enemy-death.wav"),
  music: loadAudio("assets/under-bright-lights.wav"),
  waveStart: loadAudio("assets/start-wave.wav")
};

assets.normalShot.volume = 0.08;
assets.sniperShot.volume = 0.08;
assets.machineShot.volume = 0.08;
assets.waveStart.volume = 0.1;

const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const menuScreen = document.querySelector("#menu-screen");
const gameScreen = document.querySelector("#game-screen");
const statusMessage = document.querySelector("#status-message");
const buildButtons = [...document.querySelectorAll(".tower-option")];

let game = null;
let lastFrame = 0;
let muted = false;
let audioUnavailable = false;

function loadImage(source) {
  const image = new Image();
  image.src = source;
  return image;
}

function loadAudio(source) {
  const audio = new Audio(source);
  audio.preload = "auto";
  return audio;
}

function playSound(audio) {
  if (muted || audioUnavailable) return;
  audio.currentTime = 0;
  audio.play().catch((error) => {
    if (error.name === "NotSupportedError") {
      audioUnavailable = true;
      const soundButton = document.querySelector("#sound-button");
      soundButton.textContent = "Audio unavailable";
      soundButton.disabled = true;
      soundButton.title = "This browser could not play the bundled audio files.";
      return;
    }
    console.warn(`Unable to play ${audio.src}:`, error);
  });
}

function getPath(map) {
  const path = [{ x: TILE_SIZE / 2, y: 9 * TILE_SIZE + TILE_SIZE / 2 }];
  let x = 0;
  let y = 9;

  while ((x !== 19 || y !== 3) && path.length < 400) {
    const tile = map[y]?.[x];
    let nextX = x;
    let nextY = y;
    if (tile === 1) nextX += 1;
    else if (tile === 2) nextY += 1;
    else if (tile === 3) nextY -= 1;
    else if (tile === 4) nextX -= 1;
    else break;
    const nextTile = map[nextY]?.[nextX];
    if (nextTile === undefined) break;
    if (nextTile !== tile || nextTile === 5) {
      path.push({ x: nextX * TILE_SIZE + TILE_SIZE / 2, y: nextY * TILE_SIZE + TILE_SIZE / 2 });
    }
    x = nextX;
    y = nextY;
    if (nextTile === 5) {
      break;
    }
  }
  return path;
}

function createGame() {
  const map = INITIAL_MAP.map((row) => row.slice());
  return {
    map,
    path: getPath(map),
    enemies: [],
    towers: [],
    bullets: [],
    resources: 400,
    level: 0,
    score: 0,
    lives: 20,
    timer: 10,
    secondElapsed: 0,
    elapsed: 0,
    selectedTower: null,
    hoverTile: null,
    inspectedTower: null,
    over: false
  };
}

function startGame() {
  game = createGame();
  menuScreen.hidden = true;
  gameScreen.hidden = false;
  document.querySelector("#game-over").hidden = true;
  statusMessage.textContent = "Choose a tower to start building.";
  setSelectedTower(null);
  assets.music.loop = true;
  assets.music.volume = 0.22;
  playSound(assets.music);
  updateHud();
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

function setSelectedTower(type) {
  if (!game) return;
  game.selectedTower = type;
  if (type) game.inspectedTower = null;
  buildButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.tower === type));
  });
  document.querySelector(".board-wrap").classList.toggle("building", Boolean(type));
  statusMessage.textContent = type
    ? `Click an open tile to build a ${TOWERS[type].name} tower. Press Esc to cancel.`
    : "Choose a tower to start building.";
  updateTowerInfo();
}

function getTowerAtTile(tile) {
  if (!tile) return null;
  return game.towers.find((tower) => tower.x === tile.x && tower.y === tile.y) || null;
}

function updateTowerInfo() {
  const panel = document.querySelector("#tower-info");
  const tower = getTowerAtTile(game.inspectedTower) || getTowerAtTile(game.hoverTile);
  if (!tower) {
    panel.hidden = true;
    return;
  }

  panel.querySelector("#tower-info-name").textContent = `${tower.stats.name} Tower`;
  panel.querySelector("#tower-info-cost").textContent = `${tower.stats.cost} gold`;
  panel.querySelector("#tower-info-range").textContent = `${tower.stats.range} px`;
  panel.querySelector("#tower-info-damage").textContent = `${tower.stats.damage} per hit`;
  panel.querySelector("#tower-info-speed").textContent = `${(1000 / tower.stats.cooldown).toFixed(2).replace(/\.?0+$/, "")} shots/sec`;
  panel.hidden = false;
}

function drawMap() {
  if (!assets.tiles.complete || !assets.tiles.naturalWidth) {
    context.fillStyle = "#2ac777";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    return;
  }

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLUMNS; x += 1) {
      const [sourceX, sourceY] = SPRITES[game.map[y][x]] || SPRITES[0];
      context.drawImage(assets.tiles, sourceX, sourceY, TILE_SIZE, TILE_SIZE, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawTowers() {
  for (const tower of game.towers) {
    const cannon = assets[tower.stats.cannon];
    if (cannon.complete && cannon.naturalWidth) {
      context.drawImage(cannon, tower.x * TILE_SIZE, tower.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawRangePreview() {
  const hoveredTower = getTowerAtTile(game.hoverTile);
  const rangeTower = hoveredTower || getTowerAtTile(game.inspectedTower);
  if (!game.hoverTile && !rangeTower) return;

  let centerX;
  let centerY;
  let range;
  let isPlacementPreview = false;

  if (game.selectedTower && !hoveredTower) {
    if (!game.hoverTile) return;
    const { x, y } = game.hoverTile;
    const stats = TOWERS[game.selectedTower];
    centerX = x * TILE_SIZE + TILE_SIZE / 2;
    centerY = y * TILE_SIZE + TILE_SIZE / 2;
    range = stats.range;
    isPlacementPreview = true;
  } else {
    if (!rangeTower) return;
    centerX = rangeTower.centerX;
    centerY = rangeTower.centerY;
    range = rangeTower.stats.range;
  }

  const validPlacement = !isPlacementPreview || (
    game.map[game.hoverTile.y][game.hoverTile.x] === 0 &&
    !game.towers.some((tower) =>
      tower.x === game.hoverTile.x && tower.y === game.hoverTile.y
    ) &&
    game.resources >= TOWERS[game.selectedTower].cost
  );
  const color = isPlacementPreview
    ? (validPlacement ? "116, 230, 176" : "255, 111, 111")
    : "116, 196, 255";

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, range, 0, Math.PI * 2);
  context.fillStyle = `rgba(${color}, 0.14)`;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = `rgba(${color}, 0.8)`;
  context.setLineDash(isPlacementPreview ? [8, 6] : []);
  context.stroke();
  context.restore();
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    if (enemy.removed) continue;
    const sprite = assets.enemySprites[enemy.type];
    const spriteSize = 42;
    if (sprite.complete && sprite.naturalWidth) {
      context.save();
      context.translate(enemy.x, enemy.y);
      context.rotate(enemy.rotation);
      context.drawImage(
        sprite,
        -spriteSize / 2,
        -spriteSize / 2,
        spriteSize,
        spriteSize,
      );
      context.restore();
    } else {
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      context.fillStyle = enemy.color;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "rgba(25, 31, 35, 0.45)";
      context.stroke();
    }
    if (enemy.health < enemy.maxHealth) {
      const width = enemy.radius * 2;
      const barY = enemy.y - spriteSize / 2 - 7;
      context.fillStyle = "rgba(20, 24, 27, 0.8)";
      context.fillRect(enemy.x - width / 2, barY, width, 3);
      context.fillStyle = "#77e4a7";
      context.fillRect(enemy.x - width / 2, barY, width * Math.max(0, enemy.health / enemy.maxHealth), 3);
    }
  }
}

function drawBullets() {
  for (const bullet of game.bullets) {
    const progress = Math.min(1, bullet.elapsed / bullet.duration);
    const x = bullet.startX + (bullet.endX - bullet.startX) * progress;
    const y = bullet.startY + (bullet.endY - bullet.startY) * progress;
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fillStyle = bullet.color;
    context.shadowColor = bullet.color;
    context.shadowBlur = 10;
    context.fill();
    context.shadowBlur = 0;
  }
}

function render() {
  drawMap();
  drawRangePreview();
  drawTowers();
  drawBullets();
  drawEnemies();
}

function getEnemyRotation(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
}

function updateEnemies(delta) {
  for (const enemy of game.enemies) {
    if (enemy.removed || enemy.dead) continue;
    const target = game.path[enemy.pathIndex];
    if (!target) {
      enemy.pathFinished = true;
      removeEnemy(enemy);
      continue;
    }
    const axis = target.x !== enemy.x ? "x" : "y";
    const difference = target[axis] - enemy[axis];
    const movement = enemy.speed * delta / 10;
    if (Math.abs(difference) <= movement) {
      enemy[axis] = target[axis];
      enemy.pathIndex += 1;
      if (enemy.pathIndex >= game.path.length) {
        enemy.pathFinished = true;
        removeEnemy(enemy);
      } else {
        enemy.rotation = getEnemyRotation(target, game.path[enemy.pathIndex]);
      }
    } else {
      enemy[axis] += Math.sign(difference) * movement;
    }
  }
}

function attack(tower, now) {
  if (now < tower.nextAttack) return;
  const target = game.enemies.find((enemy) =>
    !enemy.removed && !enemy.dead &&
    Math.hypot(enemy.x - tower.centerX, enemy.y - tower.centerY) <= tower.stats.range
  );
  if (!target) return;

  tower.nextAttack = now + tower.stats.cooldown;
  target.health -= tower.stats.damage;
  if (target.health <= 0) target.dead = true;
  game.bullets.push({
    startX: tower.centerX,
    startY: tower.centerY,
    endX: target.x,
    endY: target.y,
    target,
    elapsed: 0,
    duration: tower.stats.bulletDuration,
    color: tower.stats.bulletColor
  });
  playSound(assets[tower.stats.sound]);
}

function updateBullets(delta) {
  for (const bullet of game.bullets) {
    bullet.elapsed += delta;
    if (bullet.elapsed >= bullet.duration && bullet.target.dead && !bullet.target.removed) {
      removeEnemy(bullet.target);
    }
  }
  game.bullets = game.bullets.filter((bullet) => bullet.elapsed < bullet.duration);
}

function createEnemy(type) {
  const stats = ENEMIES[type];
  if (!stats || game.path.length < 2) return;
  const start = game.path[0];
  game.enemies.push({
    ...stats,
    type,
    maxHealth: stats.health,
    x: start.x,
    y: start.y,
    pathIndex: 1,
    rotation: getEnemyRotation(start, game.path[1]),
    moveX: true,
    dead: false,
    pathFinished: false,
    removed: false
  });
}

function spawnForTimer() {
  if (game.timer > 110) {
    createEnemy(Math.floor(Math.random() * 2));
  } else if (game.timer > 75 && game.timer <= 95) {
    createEnemy(Math.floor(Math.random() * 3));
  } else if (game.timer >= 30 && game.timer <= 55) {
    createEnemy(Math.floor(Math.random() * 3));
    if (game.timer === 30) createEnemy(3);
  } else if (game.timer <= 0) {
    game.level += 1;
    game.timer = 120;
    playSound(assets.waveStart);
  }
}

function removeEnemy(enemy) {
  if (enemy.removed) return;
  enemy.removed = true;
  if (enemy.pathFinished) {
    game.lives = Math.max(0, game.lives - 1);
    if (game.lives === 0) finishGame();
  } else {
    game.resources += enemy.reward;
    game.score += enemy.reward * game.level;
    playSound(assets.enemyDeath);
  }
  updateHud();
}

function finishGame() {
  game.over = true;
  document.querySelector("#final-score").textContent = game.score;
  document.querySelector("#game-over").hidden = false;
  assets.music.pause();
  setSelectedTower(null);
}

function updateHud() {
  document.querySelector("#level").textContent = game.level;
  document.querySelector("#resources").textContent = game.resources;
  document.querySelector("#score").textContent = game.score;
  document.querySelector("#lives").textContent = game.lives;
  document.querySelector("#timer").textContent = `${game.timer}s`;
}

function update(delta, now) {
  game.elapsed += delta;
  game.secondElapsed += delta;
  while (game.secondElapsed >= 1000) {
    game.secondElapsed -= 1000;
    game.timer -= 1;
    spawnForTimer();
    updateHud();
  }
  updateEnemies(delta);
  for (const tower of game.towers) attack(tower, now);
  updateBullets(delta);
}

function frame(timestamp) {
  if (!game || game.over || gameScreen.hidden) return;
  const delta = Math.min(timestamp - lastFrame, 50);
  lastFrame = timestamp;
  update(delta, timestamp);
  render();
  requestAnimationFrame(frame);
}

function getBoardTile(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * WIDTH / TILE_SIZE);
  const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * HEIGHT / TILE_SIZE);
  if (x < 0 || x >= COLUMNS || y < 0 || y >= ROWS) return null;
  return { x, y };
}

function placeTower(event) {
  if (!game || game.over) return;
  const tile = getBoardTile(event);
  const tower = getTowerAtTile(tile);
  if (tower) {
    game.inspectedTower = { x: tower.x, y: tower.y };
    setSelectedTower(null);
    updateTowerInfo();
    return;
  }
  game.inspectedTower = null;
  updateTowerInfo();
  if (!game.selectedTower) return;
  if (!tile || game.map[tile.y][tile.x] !== 0) {
    statusMessage.textContent = "Choose an open, empty tile.";
    return;
  }

  const { x, y } = tile;
  const stats = TOWERS[game.selectedTower];
  if (game.resources < stats.cost) {
    statusMessage.textContent = `Not enough gold for a ${stats.name} tower.`;
    return;
  }
  game.resources -= stats.cost;
  const sprite = game.selectedTower === "normal" ? 7 : game.selectedTower === "sniper" ? 8 : 9;
  game.map[y][x] = sprite;
  game.towers.push({
    x,
    y,
    centerX: x * TILE_SIZE + TILE_SIZE / 2,
    centerY: y * TILE_SIZE + TILE_SIZE / 2,
    sprite,
    stats,
    nextAttack: performance.now() + 100
  });
  statusMessage.textContent = `${stats.name} tower built. Select another or keep building.`;
  updateHud();
}

buildButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedTower(button.dataset.tower));
});

canvas.addEventListener("click", placeTower);
canvas.addEventListener("pointermove", (event) => {
  if (game && !game.over) {
    game.hoverTile = getBoardTile(event);
    updateTowerInfo();
  }
});
canvas.addEventListener("pointerleave", () => {
  if (game) {
    game.hoverTile = null;
    updateTowerInfo();
  }
});
document.addEventListener("click", (event) => {
  if (!game || !(event.target instanceof Element)) return;
  if (event.target.closest(".tower-option") || event.target.closest("#board")) return;
  if (game.selectedTower) setSelectedTower(null);
  game.inspectedTower = null;
  updateTowerInfo();
});
document.querySelector("#start-button").addEventListener("click", startGame);
document.querySelector("#restart-button").addEventListener("click", startGame);
document.querySelector("#home-button").addEventListener("click", (event) => {
  event.preventDefault();
  assets.music.pause();
  gameScreen.hidden = true;
  menuScreen.hidden = false;
});
document.querySelector("#sound-button").addEventListener("click", (event) => {
  muted = !muted;
  event.currentTarget.textContent = muted ? "Sound off" : "Sound on";
  event.currentTarget.setAttribute("aria-label", muted ? "Turn sound on" : "Mute sound");
  if (muted) assets.music.pause();
  else if (game && !game.over) playSound(assets.music);
});
document.addEventListener("keydown", (event) => {
  if (!game || gameScreen.hidden) return;
  if (event.key === "Escape") {
    setSelectedTower(null);
    game.inspectedTower = null;
    updateTowerInfo();
  }
  if (event.key === "1") setSelectedTower("normal");
  if (event.key === "2") setSelectedTower("sniper");
  if (event.key === "3") setSelectedTower("machine");
});
