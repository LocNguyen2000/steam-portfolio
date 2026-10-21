"use strict";

const WIDTH = 1280;
const TILE_SIZE = 64;
const COLUMNS = 20;
const ROWS = 13;
const HEIGHT = ROWS * TILE_SIZE;
const LEVEL_SETUP_SECONDS = 15;
const LEVEL_TWO_GOLD = 200;
const LEVEL_TWO_SPAWN_INTERVAL = 4;
const AIRSTRIKE_COOLDOWN_MS = 30000;
const TANK_ALLY_COOLDOWN_MS = 30000;
const TANK_ALLY_HEALTH = 600;
const TANK_ALLY_RADIUS = 24;
const TANK_ALLY_SPEED = 0.018;
const TANK_ALLY_RANGE = 350;
const TANK_ALLY_DAMAGE = 30;
const TANK_ALLY_COOLDOWN = 1000;
const TANK_ALLY_BULLET_DURATION = 500;
const AIRSTRIKE_DAMAGE = 100;
const AIRSTRIKE_DROP_INTERVAL_MS = 180;
const AIRSTRIKE_EXPLOSION_MS = 650;

// Both maps use the same symbols: . buildable, # scenery, > < ^ v road,
// F random fork, M merge, E exit, and A-D scenery.
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
  "....##....###....##.",
  "##......##..........",
  "...#.............#..",
  ".....>>>>>>>>>>M>>>E",
  "...##^......#..^##..",
  "##...^...##....^..##",
  "#..#.^.#.....#.^...#",
  "#....^..##..#..^...#",
  "#....^.#..>>>>>^.#.#",
  ">>>>>F>>>>^.........",
  "##....#....##....#..",
  "....##....##....##..",
  "...##.#....#.##.#.##"
];

const LEVEL_LAYOUTS = [LEVEL_ONE_LAYOUT, LEVEL_TWO_LAYOUT];
const GROUND_TILES = [10, 11, 12, 13];
const MAP_SYMBOL_TILES = {
  ".": 0, ">": 1, v: 2, "^": 3, "<": 4, E: 5,
  A: 10, B: 11, C: 12, D: 13, F: 14, M: 15
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

const TOWERS = {
  normal: { name: "Normal", cost: 40, range: 250, damage: 3, cooldown: 1000, bulletDuration: 500, bulletColor: "#d17d2a", sound: "normalShot" },
  sniper: { name: "Sniper", cost: 100, range: 350, damage: 5, cooldown: 3000, bulletDuration: 650, bulletColor: "#d6c827", sound: "sniperShot" },
  machine: { name: "Machine gun", cost: 80, range: 250, damage: 4, cooldown: 1000, bulletDuration: 100, bulletColor: "#27db4b", sound: "machineShot" }
};

const LEVEL_TWO_SNIPER_STATS = { ...TOWERS.sniper, damage: 30, cooldown: 1000 };
const TOWER_SPRITES = { normal: 7, sniper: 8, machine: 9 };

const ENEMIES = {
  0: { health: 15, speed: 2, reward: 5, livesLost: 1, radius: 9, blockDamage: 10, color: "#f0f8ff" },
  1: { health: 30, speed: 1, reward: 10, livesLost: 1, radius: 10, blockDamage: 15, color: "#ff4500" },
  2: { health: 100, speed: 1, reward: 35, livesLost: 2, radius: 15, blockDamage: 25, color: "#6495ed" },
  3: { health: 500, speed: 1, reward: 100, livesLost: 3, radius: 18, blockDamage: 40, color: "#45474d" },
  4: { health: 600, speed: 0.8, reward: 150, livesLost: 4, radius: 21, blockDamage: 50, color: "#b36bff" }
};

const SPRITES = {
  0: [1216, 384],
  1: [384, 448],
  2: [384, 448],
  3: [384, 448],
  4: [384, 448],
  5: [384, 448],
  6: [384, 448],
  7: [1216, 384],
  8: [1216, 384],
  9: [1216, 384],
  10: [1344, 320],
  11: [1408, 320],
  12: [1024, 320],
  13: [960, 320],
  14: [384, 448],
  15: [384, 448]
};

const assets = {
  tiles: loadImage("assets/tile.webp"),
  plane: loadImage("assets/plane-transparent.webp"),
  airstrikeExplosion: loadImage("assets/airstrike-explosion.webp"),
  tank: loadImage("assets/tank.webp"),
  tankCannon: loadImage("assets/tank-cannon.webp"),
  enemySprites: [
    loadImage("assets/enemy_0-transparent.webp"),
    loadImage("assets/enemy_1-transparent.webp"),
    loadImage("assets/enemy_2-transparent.webp"),
    loadImage("assets/enemy_4-transparent.webp")
  ],
  towerArt: {
    normal: loadImage("assets/tower-normal.webp"),
    sniper: loadImage("assets/tower-sniper.webp"),
    machine: loadImage("assets/tower-machine.webp")
  },
  towerPlatform: loadImage("assets/platform.webp"),
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
const airstrikeButton = document.querySelector("#airstrike-button");
const airstrikeStatus = document.querySelector("#airstrike-status");
const tankSkillButton = document.querySelector("#tank-skill-button");
const tankSkillStatus = document.querySelector("#tank-skill-status");

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
    tank: null,
    tankReadyAt: 0,
    tankTargeting: false,
    airstrike: null,
    airstrikeTargetStart: null,
    airstrikeTargeting: false,
    airstrikeReadyAt: 0,
    resources: level === 2 ? LEVEL_TWO_GOLD : 350,
    level,
    score: 0,
    lives: level === 2 ? 25 : 20,
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
  if (type) {
    game.airstrikeTargeting = false;
    game.airstrikeTargetStart = null;
    game.tankTargeting = false;
  }
  game.selectedTower = type;
  if (type) game.inspectedTower = null;
  buildButtons.forEach((button) => {
    button.disabled = false;
    button.setAttribute("aria-pressed", String(button.dataset.tower === type));
  });
  document.querySelector(".board-wrap").classList.toggle("building", Boolean(type));
  statusMessage.textContent = type
    ? `Click an open tile to build a ${TOWERS[type].name} tower. Press Esc to cancel.`
    : "Choose a tower to start building.";
  updateTowerInfo();
  updateAirstrikeButton();
  updateTankSkillButton();
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
  tower.type = type;
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
      const tileX = x * TILE_SIZE;
      const tileY = y * TILE_SIZE;
      context.drawImage(assets.tiles, sourceX, sourceY, TILE_SIZE, TILE_SIZE, tileX, tileY, TILE_SIZE, TILE_SIZE);

      const light = context.createLinearGradient(tileX, tileY, tileX + TILE_SIZE, tileY + TILE_SIZE);
      light.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      light.addColorStop(0.55, "rgba(255, 255, 255, 0)");
      light.addColorStop(1, "rgba(8, 19, 24, 0.13)");
      context.fillStyle = light;
      context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
      context.fillStyle = "rgba(230, 255, 246, 0.13)";
      context.fillRect(tileX + 1, tileY + 1, TILE_SIZE - 2, 1);
      context.fillRect(tileX + 1, tileY + 1, 1, TILE_SIZE - 2);
      context.fillStyle = "rgba(5, 15, 18, 0.16)";
      context.fillRect(tileX + TILE_SIZE - 2, tileY + 2, 1, TILE_SIZE - 3);
      context.fillRect(tileX + 2, tileY + TILE_SIZE - 2, TILE_SIZE - 3, 1);

      if (game.map[y][x] >= 1 && game.map[y][x] <= 6) {
        const roadLip = context.createLinearGradient(tileX, tileY + TILE_SIZE - 8, tileX, tileY + TILE_SIZE);
        roadLip.addColorStop(0, "rgba(255, 255, 255, 0)");
        roadLip.addColorStop(1, "rgba(12, 18, 20, 0.2)");
        context.fillStyle = roadLip;
        context.fillRect(tileX + 2, tileY + TILE_SIZE - 8, TILE_SIZE - 4, 6);
      }
    }
  }
}

function drawTowers(towers = game.towers) {
  for (const tower of towers) {
    const centerX = tower.centerX;
    const centerY = tower.centerY;
    const art = assets.towerArt[tower.type];

    context.save();
    context.fillStyle = "rgba(6, 18, 18, 0.38)";
    context.beginPath();
    context.ellipse(centerX + 2, centerY + 20, 25, 11, 0, 0, Math.PI * 2);
    context.fill();

    context.restore();

    if (assets.towerPlatform.complete && assets.towerPlatform.naturalWidth) {
      context.drawImage(assets.towerPlatform, centerX - 24, centerY - 24, 48, 48);
    }
    if (art.complete && art.naturalWidth) {
      const drawWidth = tower.type === "sniper" ? 28 : 42;
      const drawHeight = tower.type === "sniper" ? 38 : 42;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(tower.rotation);
      context.drawImage(art, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      context.restore();
    }
  }
}

function drawTankAlly() {
  const tank = game.tank;
  if (!tank) return;

  context.save();
  context.fillStyle = "rgba(5, 16, 20, 0.42)";
  context.beginPath();
  context.ellipse(tank.centerX + 2, tank.centerY + 15, 25, 12, 0, 0, Math.PI * 2);
  context.fill();
  if (assets.tank.complete && assets.tank.naturalWidth) {
    context.save();
    context.translate(tank.centerX, tank.centerY);
    context.rotate(tank.heading - Math.PI / 2);
    context.drawImage(assets.tank, -24, -24, 48, 48);
    context.restore();
  } else {
    context.fillStyle = "#277d51";
    context.fillRect(tank.centerX - 20, tank.centerY - 16, 40, 32);
  }
  context.translate(tank.centerX, tank.centerY);
  context.rotate(tank.rotation - Math.PI / 2);
  if (assets.tankCannon.complete && assets.tankCannon.naturalWidth) {
    context.drawImage(assets.tankCannon, -14, -10, 56, 20);
  } else {
    context.fillStyle = "#456f55";
    context.fillRect(-7, -7, 20, 14);
    context.fillStyle = "#b4c0b5";
    context.fillRect(5, -3, 17, 6);
  }
  context.restore();

  const healthRatio = Math.max(0, tank.health / tank.maxHealth);
  context.fillStyle = "rgba(20, 24, 27, 0.85)";
  context.fillRect(tank.centerX - 23, tank.centerY - 30, 46, 5);
  context.fillStyle = "#77e4a7";
  context.fillRect(tank.centerX - 23, tank.centerY - 30, 46 * healthRatio, 5);
}

function isRoadTile(tile) {
  return (tile >= 1 && tile <= 4) || tile === 14 || tile === 15;
}

function projectOntoPath(x, y, path) {
  let pathPosition = 0;
  let closestPoint = null;
  let closestDistance = Infinity;
  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLength = Math.hypot(segmentX, segmentY);
    const projection = segmentLength === 0
      ? 0
      : Math.max(0, Math.min(1, (
        (x - start.x) * segmentX + (y - start.y) * segmentY
      ) / (segmentLength * segmentLength)));
    const projectedX = start.x + segmentX * projection;
    const projectedY = start.y + segmentY * projection;
    const distance = Math.hypot(x - projectedX, y - projectedY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = {
        x: projectedX,
        y: projectedY,
        heading: Math.atan2(segmentY, segmentX),
        pathPosition: pathPosition + segmentLength * projection
      };
    }
    pathPosition += segmentLength;
  }
  return closestPoint ? { ...closestPoint, distance: closestDistance } : null;
}

function getPathPointAtDistance(path, requestedDistance) {
  let remainingDistance = Math.max(0, requestedDistance);
  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLength = Math.hypot(segmentX, segmentY);
    if (remainingDistance <= segmentLength || index === path.length - 2) {
      const progress = segmentLength === 0 ? 0 : Math.min(1, remainingDistance / segmentLength);
      return {
        x: start.x + segmentX * progress,
        y: start.y + segmentY * progress,
        heading: Math.atan2(segmentY, segmentX)
      };
    }
    remainingDistance -= segmentLength;
  }
  return path[0] || { x: 0, y: 0, heading: 0 };
}

function drawRangePreview() {
  if (game.tankTargeting && game.hoverTile) {
    const { x, y } = game.hoverTile;
    const centerX = x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = y * TILE_SIZE + TILE_SIZE / 2;
    const deployPoint = isRoadTile(game.map[y][x])
      ? projectOntoPath(centerX, centerY, game.path)
      : null;
    const canDeploy = Boolean(deployPoint && deployPoint.distance <= TILE_SIZE / 2);
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, TANK_ALLY_RANGE, 0, Math.PI * 2);
    context.fillStyle = canDeploy ? "rgba(116, 196, 255, 0.12)" : "rgba(255, 111, 111, 0.08)";
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = canDeploy ? "rgba(116, 196, 255, 0.8)" : "rgba(255, 111, 111, 0.7)";
    context.setLineDash([8, 6]);
    context.stroke();
    context.restore();
    return;
  }

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

function drawEnemies(enemies = game.enemies) {
  for (const enemy of enemies) {
    if (enemy.removed) continue;
    const sprite = assets.enemySprites[Math.min(enemy.type, assets.enemySprites.length - 1)];
    const spriteSize = enemy.type === 4 ? 50 : 42;
    context.save();
    context.fillStyle = "rgba(5, 16, 20, 0.36)";
    context.beginPath();
    context.ellipse(enemy.x + 2, enemy.y + enemy.radius * 0.78, enemy.radius * 1.18, enemy.radius * 0.55, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (enemy.type === 4) {
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius + 4, 0, Math.PI * 2);
      context.lineWidth = 3;
      context.strokeStyle = enemy.color;
      context.stroke();
    }
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
  const towersByDepth = game.towers.slice().sort((a, b) => a.centerY - b.centerY);
  const enemiesByDepth = game.enemies.filter((enemy) => !enemy.removed).slice().sort((a, b) => a.y - b.y);
  const worldEntities = [
    ...towersByDepth.map((tower) => ({ depth: tower.centerY + 16, draw: () => drawTowers([tower]) })),
    ...(game.tank ? [{ depth: game.tank.centerY + 18, draw: drawTankAlly }] : []),
    ...enemiesByDepth.map((enemy) => ({ depth: enemy.y + enemy.radius, draw: () => drawEnemies([enemy]) }))
  ].sort((a, b) => a.depth - b.depth);
  for (const entity of worldEntities) entity.draw();
  drawBullets();
  drawCoinRewards();
  drawAirstrike();
}

function updateAirstrikeButton() {
  if (!game) {
    airstrikeButton.hidden = true;
    return;
  }
  airstrikeButton.hidden = false;
  const cooldownRemaining = Math.max(0, game.airstrikeReadyAt - game.elapsed);
  airstrikeButton.disabled = cooldownRemaining > 0 || game.over || game.levelComplete;
  airstrikeButton.setAttribute("aria-pressed", String(game.airstrikeTargeting));
  airstrikeStatus.textContent = game.airstrikeTargeting
    ? game.airstrikeTargetStart ? "Choose direction" : "Choose first tile"
    : cooldownRemaining > 0
      ? `Ready in ${Math.ceil(cooldownRemaining / 1000)}s`
      : "Ready";
}

function updateTankSkillButton() {
  if (!game || game.level !== 2) {
    tankSkillButton.hidden = true;
    return;
  }
  tankSkillButton.hidden = false;
  const cooldownRemaining = Math.max(0, game.tankReadyAt - game.elapsed);
  tankSkillButton.disabled = Boolean(game.tank) || cooldownRemaining > 0 || game.over || game.levelComplete;
  tankSkillButton.setAttribute("aria-pressed", String(game.tankTargeting));
  tankSkillStatus.textContent = game.tank
    ? `Holding · ${Math.ceil(game.tank.health)} HP`
    : game.tankTargeting
      ? "Choose a route tile"
      : cooldownRemaining > 0
        ? `Ready in ${Math.ceil(cooldownRemaining / 1000)}s`
        : "Ready";
}

function beginTankTargeting() {
  if (!game || game.level !== 2 || game.over || game.levelComplete || game.tank) return;
  if (game.elapsed < game.tankReadyAt) return;
  if (game.tankTargeting) {
    game.tankTargeting = false;
    statusMessage.textContent = "Tank summon cancelled.";
  } else {
    game.airstrikeTargeting = false;
    game.airstrikeTargetStart = null;
    game.selectedTower = null;
    game.tankTargeting = true;
    document.querySelector(".board-wrap").classList.remove("building");
    buildButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
    statusMessage.textContent = "Tank Ally: choose a tile on the active route to deploy.";
  }
  updateTowerInfo();
  updateAirstrikeButton();
  updateTankSkillButton();
}

function summonTankAlly(tile) {
  if (!game || game.level !== 2) return;
  if (!tile) {
    statusMessage.textContent = "Choose a tile on the active route for the Tank Ally.";
    return;
  }
  if (!isRoadTile(game.map[tile.y][tile.x])) {
    statusMessage.textContent = "The Tank Ally can only deploy on a road tile.";
    return;
  }

  const requestedX = tile.x * TILE_SIZE + TILE_SIZE / 2;
  const requestedY = tile.y * TILE_SIZE + TILE_SIZE / 2;
  const closestPoint = projectOntoPath(requestedX, requestedY, game.path);
  if (!closestPoint || closestPoint.distance > TILE_SIZE / 2) {
    statusMessage.textContent = "Choose a road tile on the Tank Ally's route.";
    return;
  }

  const centerX = closestPoint.x;
  const centerY = closestPoint.y;
  game.tank = {
    x: tile.x,
    y: tile.y,
    centerX,
    centerY,
    health: TANK_ALLY_HEALTH,
    maxHealth: TANK_ALLY_HEALTH,
    range: TANK_ALLY_RANGE,
    path: game.path,
    pathPosition: closestPoint.pathPosition,
    moveTarget: null,
    heading: closestPoint.heading,
    rotation: 0,
    nextAttack: performance.now(),
    stats: {
      range: TANK_ALLY_RANGE,
      damage: TANK_ALLY_DAMAGE,
      cooldown: TANK_ALLY_COOLDOWN,
      bulletDuration: TANK_ALLY_BULLET_DURATION,
      bulletColor: "#d6c827",
      sound: "sniperShot"
    }
  };
  game.tankReadyAt = game.elapsed + TANK_ALLY_COOLDOWN_MS;
  game.tankTargeting = false;
  statusMessage.textContent = "Tank Ally deployed! Click another road tile to move it.";
  updateHud();
}

function commandTankAlly(tile) {
  if (!game || game.level !== 2 || !game.tank) return;
  if (!tile || !isRoadTile(game.map[tile.y][tile.x])) {
    statusMessage.textContent = "Click a road tile on the active route to move the Tank Ally.";
    return;
  }

  const target = projectOntoPath(
    tile.x * TILE_SIZE + TILE_SIZE / 2,
    tile.y * TILE_SIZE + TILE_SIZE / 2,
    game.tank.path
  );
  if (!target || target.distance > TILE_SIZE / 2) {
    statusMessage.textContent = "That road is not part of the active route.";
    return;
  }

  game.tank.moveTarget = target.pathPosition;
  statusMessage.textContent = "Tank Ally moving to your selected road tile.";
}

function beginAirstrikeTargeting() {
  if (!game || game.over || game.levelComplete) return;
  if (game.elapsed < game.airstrikeReadyAt || game.airstrike) return;
  game.tankTargeting = false;
  game.selectedTower = null;
  game.airstrikeTargetStart = null;
  game.airstrikeTargeting = !game.airstrikeTargeting;
  document.querySelector(".board-wrap").classList.remove("building");
  buildButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  statusMessage.textContent = game.airstrikeTargeting
    ? "Airstrike: click a starting tile, then a second tile to set direction."
    : "Airstrike cancelled.";
  updateTowerInfo();
  updateAirstrikeButton();
  updateTankSkillButton();
}

function launchAirstrike(start, directionX, directionY) {
  const cells = Array.from({ length: 6 }, (_, index) => ({
    x: start.x + directionX * index,
    y: start.y + directionY * index,
    dropped: false
  }));
  if (cells.some((cell) =>
    cell.x < 0 || cell.x >= COLUMNS || cell.y < 0 || cell.y >= ROWS
  )) {
    statusMessage.textContent = "That direction needs six clear map tiles. Choose another direction.";
    game.airstrikeTargetStart = start;
    return;
  }

  game.airstrike = { cells, directionX, directionY, elapsed: 0 };
  game.airstrikeReadyAt = game.elapsed + AIRSTRIKE_COOLDOWN_MS;
  game.airstrikeTargeting = false;
  game.airstrikeTargetStart = null;
  statusMessage.textContent = "Airstrike inbound!";
  updateAirstrikeButton();
}

function targetAirstrike(tile) {
  if (!tile) {
    statusMessage.textContent = "Choose a tile on the map.";
    return;
  }
  if (!game.airstrikeTargetStart) {
    game.airstrikeTargetStart = tile;
    statusMessage.textContent = "Now click another tile to set the bombing direction.";
    updateAirstrikeButton();
    return;
  }

  const deltaX = tile.x - game.airstrikeTargetStart.x;
  const deltaY = tile.y - game.airstrikeTargetStart.y;
  if (deltaX === 0 && deltaY === 0) {
    statusMessage.textContent = "Choose a different tile to set the direction.";
    return;
  }
  const directionX = Math.abs(deltaX) >= Math.abs(deltaY)
    ? Math.sign(deltaX)
    : 0;
  const directionY = directionX === 0 ? Math.sign(deltaY) : 0;
  launchAirstrike(game.airstrikeTargetStart, directionX, directionY);
  updateAirstrikeButton();
}

function updateAirstrike(delta) {
  if (!game.airstrike) return;
  const airstrike = game.airstrike;
  airstrike.elapsed += delta;
  airstrike.cells.forEach((cell, index) => {
    const dropTime = index * AIRSTRIKE_DROP_INTERVAL_MS;
    if (cell.dropped || airstrike.elapsed < dropTime) return;
    cell.dropped = true;
    for (const enemy of game.enemies) {
      if (
        enemy.removed || enemy.dead ||
        Math.floor(enemy.x / TILE_SIZE) !== cell.x ||
        Math.floor(enemy.y / TILE_SIZE) !== cell.y
      ) continue;
      enemy.health -= AIRSTRIKE_DAMAGE;
      if (enemy.health <= 0) removeEnemy(enemy);
    }
  });
  const effectDuration =
    (airstrike.cells.length - 1) * AIRSTRIKE_DROP_INTERVAL_MS + AIRSTRIKE_EXPLOSION_MS;
  if (airstrike.elapsed >= effectDuration) game.airstrike = null;
}

function drawAirstrike() {
  if (!game.airstrike) return;
  const airstrike = game.airstrike;
  const { cells, directionX, directionY, elapsed } = airstrike;
  cells.forEach((cell, index) => {
    const explosionElapsed = elapsed - index * AIRSTRIKE_DROP_INTERVAL_MS;
    if (explosionElapsed < 0 || explosionElapsed >= AIRSTRIKE_EXPLOSION_MS) return;
    const progress = explosionElapsed / AIRSTRIKE_EXPLOSION_MS;
    const size = TILE_SIZE * (0.65 + progress * 0.35);
    if (assets.airstrikeExplosion.complete && assets.airstrikeExplosion.naturalWidth) {
      const explosionWidth =
        size * (assets.airstrikeExplosion.naturalWidth / assets.airstrikeExplosion.naturalHeight);
      context.save();
      context.globalAlpha = 1 - progress * 0.7;
      const centerX = (cell.x + 0.5) * TILE_SIZE;
      const centerY = (cell.y + 0.5) * TILE_SIZE;
      const glow = context.createRadialGradient(centerX, centerY, 2, centerX, centerY, size * 0.55);
      glow.addColorStop(0, "rgba(255, 177, 72, 0.42)");
      glow.addColorStop(1, "rgba(255, 101, 33, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.ellipse(centerX, centerY + 9, size * 0.48, size * 0.25, 0, 0, Math.PI * 2);
      context.fill();
      context.drawImage(
        assets.airstrikeExplosion,
        centerX - explosionWidth / 2,
        centerY - size / 2,
        explosionWidth,
        size
      );
      context.restore();
    }
  });

  const flightProgress = Math.min(
    1,
    elapsed / ((cells.length - 1) * AIRSTRIKE_DROP_INTERVAL_MS)
  );
  const planeX = (cells[0].x + directionX * (cells.length - 1) * flightProgress + 0.5) * TILE_SIZE;
  const planeY = (cells[0].y + directionY * (cells.length - 1) * flightProgress + 0.5) * TILE_SIZE;
  context.save();
  context.translate(planeX, planeY);
  context.rotate(Math.atan2(directionY, directionX));
  if (assets.plane.complete && assets.plane.naturalWidth) {
    context.drawImage(assets.plane, -22, -28, 44, 56);
  } else {
    context.fillStyle = "#e8f0f7";
    context.beginPath();
    context.moveTo(20, 0);
    context.lineTo(-16, -11);
    context.lineTo(-9, 0);
    context.lineTo(-16, 11);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function getEnemyRotation(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
}

function updateTankAlly(delta) {
  const tank = game.tank;
  if (!tank || tank.moveTarget === null) return;

  const difference = tank.moveTarget - tank.pathPosition;
  if (Math.abs(difference) <= 0.01) {
    tank.pathPosition = tank.moveTarget;
    tank.moveTarget = null;
    return;
  }

  const movement = Math.min(Math.abs(difference), TANK_ALLY_SPEED * delta);
  const direction = Math.sign(difference);
  const nextPosition = tank.pathPosition + movement * direction;
  const nextPoint = getPathPointAtDistance(tank.path, nextPosition);
  const blockedByEnemy = game.enemies.some((enemy) =>
    !enemy.removed && !enemy.dead &&
    Math.hypot(nextPoint.x - enemy.x, nextPoint.y - enemy.y) <= TANK_ALLY_RADIUS + enemy.radius
  );
  if (blockedByEnemy) return;

  tank.pathPosition = nextPosition;
  tank.centerX = nextPoint.x;
  tank.centerY = nextPoint.y;
  tank.x = Math.floor(nextPoint.x / TILE_SIZE);
  tank.y = Math.floor(nextPoint.y / TILE_SIZE);
  tank.heading = nextPoint.heading + (direction < 0 ? Math.PI : 0);
  if (Math.abs(tank.moveTarget - tank.pathPosition) <= 0.01) {
    tank.pathPosition = tank.moveTarget;
    tank.moveTarget = null;
  }
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
    const nextX = axis === "x"
      ? enemy.x + Math.sign(difference) * Math.min(Math.abs(difference), movement)
      : enemy.x;
    const nextY = axis === "y"
      ? enemy.y + Math.sign(difference) * Math.min(Math.abs(difference), movement)
      : enemy.y;
    if (
      game.tank &&
      Math.hypot(nextX - game.tank.centerX, nextY - game.tank.centerY) <=
        TANK_ALLY_RADIUS + enemy.radius
    ) {
      game.tank.health -= enemy.blockDamage * delta / 1000;
      if (game.tank.health <= 0) {
        game.tank = null;
        statusMessage.textContent = "Your Tank Ally was destroyed.";
        updateTankSkillButton();
      }
      continue;
    }
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

function attack(tower, now, delta) {
  const target = game.enemies.find((enemy) =>
    !enemy.removed && !enemy.dead &&
    Math.hypot(enemy.x - tower.centerX, enemy.y - tower.centerY) <= tower.stats.range
  );
  if (!target) return;

  const targetAngle = Math.atan2(target.y - tower.centerY, target.x - tower.centerX) + Math.PI / 2;
  const angleDifference = Math.atan2(
    Math.sin(targetAngle - tower.rotation),
    Math.cos(targetAngle - tower.rotation)
  );
  const turnAmount = Math.min(Math.abs(angleDifference), delta * 0.012);
  tower.rotation += Math.sign(angleDifference) * turnAmount;

  if (now < tower.nextAttack) return;
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
    if (game.level !== 2 || game.timer % LEVEL_TWO_SPAWN_INTERVAL === 0) {
      createEnemy(
        game.level === 2
          ? 2 + Math.floor(Math.random() * 3)
          : Math.floor(Math.random() * 3)
      );
    }
  } else if (game.timer >= 30 && game.timer <= 55) {
    if (game.level !== 2 || game.timer % LEVEL_TWO_SPAWN_INTERVAL === 0) {
      createEnemy(
        game.level === 2
          ? 2 + Math.floor(Math.random() * 3)
          : Math.floor(Math.random() * 3)
      );
    }
    if (game.timer === 30) createEnemy(game.level === 2 ? 4 : 3);
  } else if (game.timer <= 0) {
    game.spawningComplete = true;
    game.timer = 0;
  }
}

function removeEnemy(enemy) {
  if (enemy.removed) return;
  enemy.removed = true;
  if (enemy.pathFinished) {
    const livesLost = game.level === 2
      ? Math.max(1, enemy.livesLost - 1)
      : enemy.livesLost;
    game.lives = Math.max(0, game.lives - livesLost);
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
  game.airstrikeTargeting = false;
  game.airstrikeTargetStart = null;
  game.tankTargeting = false;
  document.querySelector("#final-score").textContent = game.score;
  document.querySelector("#game-over").hidden = false;
  assets.music.pause();
  setSelectedTower(null);
  updateAirstrikeButton();
  updateTankSkillButton();
}

function completeLevel() {
  if (game.levelComplete || game.over) return;
  game.levelComplete = true;
  game.airstrikeTargeting = false;
  game.airstrikeTargetStart = null;
  game.tankTargeting = false;
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
  updateAirstrikeButton();
  updateTankSkillButton();
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
  game.airstrike = null;
  game.airstrikeTargetStart = null;
  game.airstrikeTargeting = false;
  game.airstrikeReadyAt = 0;
  game.tank = null;
  game.tankReadyAt = 0;
  game.tankTargeting = false;
  game.timer = LEVEL_SETUP_SECONDS;
  game.secondElapsed = 0;
  game.waveStarted = false;
  game.spawningComplete = false;
  game.levelComplete = false;
  game.hoverTile = null;
  game.inspectedTower = null;
  document.querySelector("#level-complete").hidden = true;
  statusMessage.textContent = "Choose a tower to start building.";
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
  updateAirstrikeButton();
  updateTankSkillButton();
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
  updateTankAlly(delta);
  updateEnemies(delta);
  updateAirstrike(delta);
  for (const tower of game.towers) attack(tower, now, delta);
  if (game.tank) attack(game.tank, now, delta);
  updateBullets(delta);
  updateCoinRewards(delta);
  updateTankSkillButton();
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
  if (game.airstrikeTargeting) {
    targetAirstrike(tile);
    return;
  }
  if (game.tankTargeting) {
    summonTankAlly(tile);
    return;
  }
  if (game.tank && tile && isRoadTile(game.map[tile.y][tile.x])) {
    commandTankAlly(tile);
    return;
  }
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
    type: game.selectedTower,
    rotation: 0,
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

airstrikeButton.addEventListener("click", beginAirstrikeTargeting);
tankSkillButton.addEventListener("click", beginTankTargeting);

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
    event.target.closest(".airstrike-button") ||
    event.target.closest(".tank-skill-button") ||
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
    game.airstrikeTargeting = false;
    game.airstrikeTargetStart = null;
    game.tankTargeting = false;
    game.inspectedTower = null;
    updateTowerInfo();
    updateAirstrikeButton();
    updateTankSkillButton();
  }
  if (event.key === "1") setSelectedTower("normal");
  if (event.key === "2") setSelectedTower("sniper");
  if (event.key === "3") setSelectedTower("machine");
  if (event.key === "4") beginTankTargeting();
});
