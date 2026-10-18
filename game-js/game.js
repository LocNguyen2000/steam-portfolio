"use strict";

const WIDTH = 1280;
const TILE_SIZE = 64;
const COLUMNS = 20;
const ROWS = 13;
const HEIGHT = ROWS * TILE_SIZE;
const LEVEL_SETUP_SECONDS = 15;
const LEVEL_TWO_GOLD = 300;

// Both maps use the same symbols: . buildable, # scenery, > < ^ v road,
// F random fork, M merge, E exit, A-D scenery, and P/S tower pads.
const LEVEL_ONE_LAYOUT = [
  ".......DDB...A......",
  "B.A...BCC........A..",
  "DD..................",
  "...>>>>>>v..>>>>>>>E",
  "...^.....v..^.......",
  "...^..v<<<..^..DD...",
  "...^..v.....^..B.DA.",
  "...^..v.....^..CC...",
  "...^..v.....^..A.B..",
  ">>>^..>>>>>>^..DB...",
  "..B....C.......B....",
  "B....AA..D..........",
  "...................."
];

const LEVEL_TWO_LAYOUT = [
  "............###P##..",
  "........SSS.........",
  "................P...",
  "...............>>>>E",
  "............P..^##..",
  ".....>>>>>v.P..^.P..",
  "...P.^.P..v..P.^....",
  ".P...^....v.P..^...S",
  "..P..^.P..M>>>>^..P.",
  ">>>>>F>>>>^.P.......",
  "..P....P.....P...P..",
  ".......P..P.........",
  "...##.#P..P#S##.#S##"
];

const LEVEL_LAYOUTS = [LEVEL_ONE_LAYOUT, LEVEL_TWO_LAYOUT];
const GROUND_TILES = [10, 11, 12, 13];
const MAP_SYMBOL_TILES = {
  ".": 0, ">": 1, v: 2, "^": 3, "<": 4, E: 5,
  A: 10, B: 11, C: 12, D: 13, P: 0, S: 0, F: 14, M: 15
};

for (const [index, layout] of LEVEL_LAYOUTS.entries()) {
  if (layout.length !== ROWS || layout.some((row) => row.length !== COLUMNS)) {
    throw new Error(`Level ${index + 1} map must be ${COLUMNS} columns by ${ROWS} rows.`);
  }
}

function createMap(layout) {
  return layout.map((row, y) =>
    Array.from(row, (cell, x) => {
      if (cell === "#") {
        let terrain = Math.imul(Math.floor(x / 2) + 1, 374761393) ^
          Math.imul(Math.floor(y / 2) + 1, 668265263);
        terrain ^= terrain >>> 16;
        terrain = Math.imul(terrain, 0x7feb352d);
        terrain ^= terrain >>> 15;
        terrain = Math.imul(terrain, 0x846ca68b);
        terrain ^= terrain >>> 16;
        return GROUND_TILES[(terrain >>> 0) % GROUND_TILES.length];
      }
      const tile = MAP_SYMBOL_TILES[cell];
      if (tile === undefined) throw new Error(`Unknown map symbol "${cell}" at (${x}, ${y}).`);
      return tile;
    })
  );
}

const LEVEL_MAPS = LEVEL_LAYOUTS.map(createMap);
const LEVEL_TWO_BUILD_PADS = LEVEL_TWO_LAYOUT.flatMap((row, y) =>
  Array.from(row, (cell, x) => cell === "P" || cell === "S" ? { x, y, marker: cell } : null).filter(Boolean)
);

const TOWERS = {
  normal: { name: "Normal", cost: 40, range: 250, damage: 3, cooldown: 1000, bulletDuration: 500, bulletColor: "#d17d2a", sound: "normalShot", cannon: "normalCannon" },
  sniper: { name: "Sniper", cost: 100, range: 350, damage: 5, cooldown: 3000, bulletDuration: 650, bulletColor: "#d6c827", sound: "sniperShot", cannon: "sniperCannon" },
  machine: { name: "Machine gun", cost: 80, range: 250, damage: 4, cooldown: 1000, bulletDuration: 100, bulletColor: "#27db4b", sound: "machineShot", cannon: "rapidCannon" }
};

const LEVEL_TWO_SNIPER_STATS = { ...TOWERS.sniper, damage: 30, cooldown: 1000 };
const TOWER_SPRITES = { normal: 7, sniper: 8, machine: 9 };

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
  13: [960, 320],
  14: [384, 448],
  15: [384, 448]
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
const HIGH_SCORE_KEY = "tower-defense-high-score";
const MAX_CLEARED_LEVEL_KEY = "tower-defense-max-cleared-level";
let highScore = loadHighScore();
let maxClearedLevel = loadMaxClearedLevel();
let selectedLevel = 1;
document.querySelector("#high-score").textContent = highScore;
updateLevelSelection();

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

function loadHighScore() {
  try {
    const storedScore = window.localStorage.getItem(HIGH_SCORE_KEY);
    if (storedScore === null) return 0;
    const parsedScore = Number(storedScore);
    if (Number.isSafeInteger(parsedScore) && parsedScore >= 0) return parsedScore;
    console.warn(`Ignoring invalid stored high score: ${storedScore}`);
    return 0;
  } catch (error) {
    console.warn("Unable to load the saved high score:", error);
    return 0;
  }
}

function loadMaxClearedLevel() {
  try {
    const storedLevel = window.localStorage.getItem(MAX_CLEARED_LEVEL_KEY);
    if (storedLevel === null) return 0;
    const parsedLevel = Number(storedLevel);
    if (Number.isSafeInteger(parsedLevel) && parsedLevel >= 0 && parsedLevel <= LEVEL_MAPS.length) {
      return parsedLevel;
    }
    console.warn(`Ignoring invalid stored level progress: ${storedLevel}`);
    return 0;
  } catch (error) {
    console.warn("Unable to load saved level progress:", error);
    return 0;
  }
}

function saveLevelProgress(level) {
  if (level <= maxClearedLevel) return;
  maxClearedLevel = level;
  try {
    window.localStorage.setItem(MAX_CLEARED_LEVEL_KEY, String(maxClearedLevel));
  } catch (error) {
    console.warn("Unable to save level progress:", error);
  }
  updateLevelSelection();
}

function updateLevelSelection() {
  document.querySelectorAll(".level-option").forEach((button) => {
    const level = Number(button.dataset.level);
    const isCleared = level <= maxClearedLevel;
    button.disabled = level > Math.min(maxClearedLevel + 1, LEVEL_MAPS.length);
    button.setAttribute("aria-pressed", String(level === selectedLevel));
    button.querySelector("small").textContent = button.disabled
      ? "Locked"
      : isCleared
        ? "Cleared"
        : "Available";
  });
  document.querySelector("#start-button").textContent = `Start Level ${selectedLevel}`;
}

function getTowerStats(type) {
  return game && game.level === 2 && type === "sniper"
    ? LEVEL_TWO_SNIPER_STATS
    : TOWERS[type];
}

function saveHighScore(score) {
  if (score <= highScore) return;
  highScore = score;
  document.querySelector("#high-score").textContent = highScore;
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  } catch (error) {
    console.warn("Unable to save the high score:", error);
  }
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
    else if (tile === 14) {
      if (Math.random() < 0.5) nextY -= 1;
      else nextX += 1;
    } else if (tile === 15) nextX += 1;
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

function createGame(level = 1) {
  const map = LEVEL_MAPS[level - 1].map((row) => row.slice());
  return {
    map,
    path: getPath(map),
    enemies: [],
    towers: [],
    bullets: [],
    coinRewards: [],
    resources: level === 2 ? LEVEL_TWO_GOLD : 400,
    level,
    score: 0,
    lives: 20,
    timer: LEVEL_SETUP_SECONDS,
    secondElapsed: 0,
    elapsed: 0,
    selectedTower: null,
    hoverTile: null,
    inspectedTower: null,
    waveStarted: false,
    spawningComplete: false,
    levelComplete: false,
    over: false
  };
}

function startGame(level = selectedLevel) {
  if (!Number.isInteger(level) || level < 1 || level > Math.min(maxClearedLevel + 1, LEVEL_MAPS.length)) {
    console.warn(`Cannot start locked or invalid level: ${level}`);
    return;
  }
  game = createGame(level);
  menuScreen.hidden = true;
  gameScreen.hidden = false;
  document.querySelector("#game-over").hidden = true;
  statusMessage.textContent = "Choose a tower to start building.";
  setSelectedTower(null);
  document.querySelector("#level-complete").hidden = true;
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
    button.disabled = false;
    button.setAttribute("aria-pressed", String(button.dataset.tower === type));
  });
  document.querySelector(".board-wrap").classList.toggle("building", Boolean(type));
  statusMessage.textContent = type
    ? `Click an open tile to build a ${TOWERS[type].name} tower. Press Esc to cancel.`
    : game.level === 2
      ? "Level 2: P pads suit Normal/Rapid range; S pads suit Snipers. Any tower can use either."
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
  const upgrades = panel.querySelector(".tower-upgrades");
  if (!tower) {
    panel.hidden = true;
    return;
  }

  panel.querySelector("#tower-info-name").textContent = `${tower.stats.name} Tower`;
  panel.querySelector("#tower-info-cost").textContent = `${tower.stats.cost} gold`;
  panel.querySelector("#tower-info-range").textContent = `${tower.stats.range} px`;
  panel.querySelector("#tower-info-damage").textContent = `${tower.stats.damage} per hit`;
  panel.querySelector("#tower-info-speed").textContent = `${(1000 / tower.stats.cooldown).toFixed(2).replace(/\.?0+$/, "")} shots/sec`;
  upgrades.hidden = tower.stats !== TOWERS.normal || !game.inspectedTower;
  upgrades.querySelectorAll(".tower-upgrade").forEach((button) => {
    const type = button.dataset.upgrade;
    const stats = TOWERS[type];
    const cost = stats.cost - tower.stats.cost;
    button.textContent = `Upgrade to ${stats.name} · ${cost} gold`;
    button.disabled = game.resources < cost;
  });
  panel.hidden = false;
}

function upgradeTower(type) {
  if (!game || !game.inspectedTower || !TOWERS[type]) return;
  const tower = getTowerAtTile(game.inspectedTower);
  if (!tower || tower.stats !== TOWERS.normal) return;

  const stats = TOWERS[type];
  const cost = stats.cost - tower.stats.cost;
  if (game.resources < cost) {
    statusMessage.textContent = `Not enough gold to upgrade to ${stats.name}.`;
    return;
  }

  game.resources -= cost;
  tower.stats = stats;
  tower.sprite = TOWER_SPRITES[type];
  tower.nextAttack = performance.now();
  game.map[tower.y][tower.x] = tower.sprite;
  statusMessage.textContent = `Tower upgraded to ${stats.name}.`;
  updateHud();
  updateTowerInfo();
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

  if (game.level === 2) {
    context.save();
    context.strokeStyle = "rgba(119, 223, 255, 0.9)";
    context.fillStyle = "rgba(119, 223, 255, 0.9)";
    context.lineWidth = 2;
    context.setLineDash([4, 3]);
    for (const { x, y, marker } of LEVEL_TWO_BUILD_PADS) {
      if (game.map[y][x] !== 0) continue;
      const centerX = x * TILE_SIZE + TILE_SIZE / 2;
      const centerY = y * TILE_SIZE + TILE_SIZE / 2;
      context.beginPath();
      context.arc(centerX, centerY, 20, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.font = "bold 12px Segoe UI, Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(marker, centerX, centerY);
      context.setLineDash([4, 3]);
    }
    context.restore();
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
    const stats = getTowerStats(game.selectedTower);
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
    game.resources >= getTowerStats(game.selectedTower).cost
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

function drawCoinRewards() {
  for (const reward of game.coinRewards) {
    const progress = reward.elapsed / reward.duration;
    const opacity = 1 - progress;
    const y = reward.y - progress * 42;

    context.save();
    context.globalAlpha = opacity;
    context.beginPath();
    context.arc(reward.x - 20, y - 5, 9, 0, Math.PI * 2);
    context.fillStyle = "#ffd45c";
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "#a86d1e";
    context.stroke();
    context.fillStyle = "#754411";
    context.font = "bold 11px Segoe UI, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("$", reward.x - 20, y - 5);
    context.fillStyle = "#ffe38a";
    context.font = "bold 16px Segoe UI, Arial, sans-serif";
    context.textAlign = "left";
    context.shadowColor = "rgba(0, 0, 0, 0.8)";
    context.shadowBlur = 4;
    context.fillText(`+${reward.amount}`, reward.x - 7, y);
    context.restore();
  }
}

function updateCoinRewards(delta) {
  for (const reward of game.coinRewards) reward.elapsed += delta;
  game.coinRewards = game.coinRewards.filter((reward) => reward.elapsed < reward.duration);
}

function render() {
  drawMap();
  drawRangePreview();
  drawTowers();
  drawBullets();
  drawEnemies();
  drawCoinRewards();
}

function getEnemyRotation(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
}

function updateEnemies(delta) {
  for (const enemy of game.enemies) {
    if (enemy.removed || enemy.dead) continue;
    const target = enemy.path[enemy.pathIndex];
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
      if (enemy.pathIndex >= enemy.path.length) {
        enemy.pathFinished = true;
        removeEnemy(enemy);
      } else {
        enemy.rotation = getEnemyRotation(target, enemy.path[enemy.pathIndex]);
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
  const path = getPath(game.map);
  if (!stats || path.length < 2) return;
  const start = path[0];
  game.enemies.push({
    ...stats,
    type,
    maxHealth: stats.health,
    path,
    x: start.x,
    y: start.y,
    pathIndex: 1,
    rotation: getEnemyRotation(start, path[1]),
    moveX: true,
    dead: false,
    pathFinished: false,
    removed: false
  });
}

function spawnForTimer() {
  if (!game.waveStarted) {
    if (game.timer > 0) return;
    game.waveStarted = true;
    game.timer = 120;
    playSound(assets.waveStart);
    return;
  }
  if (game.timer > 110) {
    createEnemy(Math.floor(Math.random() * 2));
  } else if (game.timer > 75 && game.timer <= 95) {
    createEnemy(Math.floor(Math.random() * 3));
  } else if (game.timer >= 30 && game.timer <= 55) {
    createEnemy(Math.floor(Math.random() * 3));
    if (game.timer === 30) createEnemy(3);
  } else if (game.timer <= 0) {
    game.spawningComplete = true;
    game.timer = 0;
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
    game.coinRewards.push({
      x: enemy.x,
      y: enemy.y,
      amount: enemy.reward,
      elapsed: 0,
      duration: 1100
    });
    saveHighScore(game.score);
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

function completeLevel() {
  if (game.levelComplete || game.over) return;
  game.levelComplete = true;
  saveLevelProgress(game.level);
  const panel = document.querySelector("#level-complete");
  const heading = document.querySelector("#level-complete-title");
  const message = document.querySelector("#level-complete-message");
  const button = document.querySelector("#continue-button");
  heading.textContent = game.level < LEVEL_MAPS.length ? `Level ${game.level} complete!` : "All levels complete!";
  message.textContent = game.level < LEVEL_MAPS.length
    ? `You cleared Level ${game.level}. Your lives and score carry over; Level 2 starts with ${LEVEL_TWO_GOLD} gold.`
    : "You defended every map. Great work!";
  button.textContent = game.level < LEVEL_MAPS.length ? `Continue to Level ${game.level + 1}` : "Play again";
  panel.hidden = false;
  setSelectedTower(null);
}

function continueToNextLevel() {
  if (!game) return;
  if (game.level >= LEVEL_MAPS.length) {
    startGame();
    return;
  }

  game.level += 1;
  game.map = LEVEL_MAPS[game.level - 1].map((row) => row.slice());
  game.path = getPath(game.map);
  game.resources = LEVEL_TWO_GOLD;
  game.enemies = [];
  game.towers = [];
  game.bullets = [];
  game.coinRewards = [];
  game.timer = LEVEL_SETUP_SECONDS;
  game.secondElapsed = 0;
  game.waveStarted = false;
  game.spawningComplete = false;
  game.levelComplete = false;
  game.hoverTile = null;
  game.inspectedTower = null;
  document.querySelector("#level-complete").hidden = true;
  statusMessage.textContent = "Level 2: P pads suit Normal/Rapid range; S pads suit Snipers. Any tower can use either.";
  setSelectedTower(null);
  updateHud();
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

function updateHud() {
  document.querySelector("#level").textContent = game.level;
  document.querySelector("#resources").textContent = game.resources;
  document.querySelector("#score").textContent = game.score;
  document.querySelector("#lives").textContent = game.lives;
  document.querySelector("#timer").textContent = `${game.timer}s`;
  document.querySelector(".timer-stat span").textContent = game.waveStarted ? "TIME LEFT" : "STARTS IN";
  const startWarning = document.querySelector("#level-start-warning");
  startWarning.hidden = game.waveStarted || game.timer > 5;
  if (!startWarning.hidden) {
    startWarning.textContent = `Level ${game.level} starts in ${game.timer} second${game.timer === 1 ? "" : "s"}`;
  }
}

function update(delta, now) {
  game.elapsed += delta;
  if (!game.spawningComplete) {
    game.secondElapsed += delta;
    while (game.secondElapsed >= 1000 && !game.spawningComplete) {
      game.secondElapsed -= 1000;
      game.timer -= 1;
      spawnForTimer();
      updateHud();
    }
  }
  updateEnemies(delta);
  for (const tower of game.towers) attack(tower, now);
  updateBullets(delta);
  updateCoinRewards(delta);
  if (
    game.spawningComplete &&
    game.enemies.every((enemy) => enemy.removed) &&
    game.coinRewards.length === 0
  ) {
    completeLevel();
  }
}

function frame(timestamp) {
  if (!game || game.over || game.levelComplete || gameScreen.hidden) return;
  const delta = Math.min(timestamp - lastFrame, 50);
  lastFrame = timestamp;
  update(delta, timestamp);
  render();
  requestAnimationFrame(frame);
}

function getBoardTile(event) {
  const bounds = canvas.getBoundingClientRect();
  if (window.matchMedia("(max-width: 760px) and (orientation: portrait)").matches) {
    const x = Math.floor(((event.clientY - bounds.top) / bounds.height) * WIDTH / TILE_SIZE);
    const y = Math.floor(((bounds.right - event.clientX) / bounds.width) * HEIGHT / TILE_SIZE);
    if (x < 0 || x >= COLUMNS || y < 0 || y >= ROWS) return null;
    return { x, y };
  }
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
  const stats = getTowerStats(game.selectedTower);
  if (game.resources < stats.cost) {
    statusMessage.textContent = `Not enough gold for a ${stats.name} tower.`;
    return;
  }
  game.resources -= stats.cost;
  const sprite = TOWER_SPRITES[game.selectedTower];
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

document.querySelectorAll(".tower-upgrade").forEach((button) => {
  button.addEventListener("click", () => upgradeTower(button.dataset.upgrade));
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
  if (
    event.target.closest(".tower-option") ||
    event.target.closest("#board") ||
    event.target.closest("#tower-info")
  ) return;
  if (game.selectedTower) setSelectedTower(null);
  game.inspectedTower = null;
  updateTowerInfo();
});
document.querySelectorAll(".level-option").forEach((button) => {
  button.addEventListener("click", () => {
    const level = Number(button.dataset.level);
    if (level > Math.min(maxClearedLevel + 1, LEVEL_MAPS.length)) return;
    selectedLevel = level;
    updateLevelSelection();
  });
});
document.querySelector("#start-button").addEventListener("click", () => startGame());
document.querySelector("#restart-button").addEventListener("click", () => {
  startGame(game ? game.level : selectedLevel);
});
document.querySelector("#continue-button").addEventListener("click", continueToNextLevel);
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
