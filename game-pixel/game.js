const ROOM_WIDTH = 1024;
const ROOM_HEIGHT = 559;
const ROOM_BOUNDS = { left: 72, right: 952, top: 48, bottom: 495 };
const PLAYER_SPEED = 190;
const PLAYER_COLLIDER = { halfWidth: 9, halfHeight: 7 };
const INSPECTION_RANGE = 76;
const FRAME_DIRECTIONS = ["front", "right", "back", "left"];
const ROOM_OBJECTS = [
  {
    name: "Whiteboard",
    description: "A wall-mounted whiteboard above the desk.",
    bounds: { left: 76, right: 230, top: 76, bottom: 166 },
    inspectAt: { x: 153, y: 174 },
    solid: true,
  },
  {
    name: "Window",
    description: "A large window looking out from the room.",
    bounds: { left: 388, right: 637, top: 31, bottom: 199 },
    inspectAt: { x: 512, y: 207 },
    solid: true,
  },
  {
    name: "Potted plant",
    description: "A small potted plant beside the window.",
    bounds: { left: 387, right: 439, top: 164, bottom: 239 },
    inspectAt: { x: 413, y: 247 },
    solid: true,
  },
  {
    name: "Window-side wastebasket",
    description: "A small wastebasket beside the window.",
    bounds: { left: 597, right: 636, top: 193, bottom: 239 },
    inspectAt: { x: 617, y: 247 },
    solid: true,
  },
  {
    name: "Desk",
    description: "A wooden desk with a laptop, a note, and a mouse on top.",
    bounds: { left: 49, right: 258, top: 187, bottom: 271 },
    inspectAt: { x: 249, y: 318 },
    solid: true,
  },
  {
    name: "Laptop",
    description: "A laptop open on the desk.",
    bounds: { left: 117, right: 194, top: 176, bottom: 256 },
    inspectAt: { x: 155, y: 269 },
    solid: true,
  },
  {
    name: "Note",
    description: "A small handwritten note on the desk.",
    bounds: { left: 64, right: 102, top: 208, bottom: 252 },
    inspectAt: { x: 83, y: 267 },
    solid: true,
  },
  {
    name: "Mouse",
    description: "A computer mouse beside the laptop.",
    bounds: { left: 199, right: 222, top: 220, bottom: 254 },
    inspectAt: { x: 211, y: 268 },
    solid: true,
  },
  {
    name: "Chair",
    description: "A chair pulled up to the desk.",
    bounds: { left: 125, right: 183, top: 263, bottom: 322 },
    inspectAt: { x: 154, y: 329 },
    solid: true,
  },
  {
    name: "Television",
    description: "A wall-mounted screen displaying a game.",
    bounds: { left: 784, right: 939, top: 49, bottom: 143 },
    inspectAt: { x: 861, y: 152 },
    solid: true,
  },
  {
    name: "PS4 and controllers",
    description: "A PlayStation console with two controllers.",
    bounds: { left: 770, right: 892, top: 195, bottom: 273 },
    inspectAt: { x: 831, y: 282 },
    solid: true,
  },
  {
    name: "Game cases",
    description: "A couple of game cases stacked beside the console.",
    bounds: { left: 921, right: 965, top: 256, bottom: 294 },
    inspectAt: { x: 943, y: 302 },
    solid: true,
  },
  {
    name: "Badminton set",
    description: "Two rackets, shuttlecocks, and a racket case.",
    bounds: { left: 263, right: 389, top: 400, bottom: 506 },
    inspectAt: { x: 326, y: 514 },
    solid: true,
  },
  {
    name: "Door",
    description: "The doorway leading out of the room.",
    bounds: { left: 116, right: 187, top: 437, bottom: 559 },
    inspectAt: { x: 199, y: 473 },
    solid: true,
  },
  {
    name: "Wastebasket",
    description: "A wastebasket near the right side of the room.",
    bounds: { left: 920, right: 961, top: 349, bottom: 400 },
    inspectAt: { x: 913, y: 374 },
    solid: true,
  },
  {
    name: "Rug",
    description: "A large rug in the middle of the room.",
    bounds: { left: 429, right: 669, top: 246, bottom: 419 },
    inspectAt: { x: 550, y: 426 },
    solid: false,
  },
];

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("room", "./assets/room.png");
    this.load.on("loaderror", (file) => {
      const status = document.querySelector("#status");
      if (status) {
        status.textContent = `Couldn't load ${file.key}. Check that the asset is available.`;
      }
    });
    this.load.image("table", "./assets/room-items/room-table.png");
    this.load.image("whiteboard", "./assets/room-items/room-whiteboard.png");
    this.load.image("laptop", "./assets/room-items/room-laptop.png");
    this.load.image("note", "./assets/room-items/room-note.png");
    this.load.image("mouse", "./assets/room-items/room-mouse.png");
    this.load.image("ps4", "./assets/room-items/room-ps4.png");
    this.load.image("badminton", "./assets/room-items/room-badminton.png");

    for (const direction of FRAME_DIRECTIONS) {
      for (let frame = 1; frame <= 4; frame += 1) {
        const key = `${direction}_${String(frame).padStart(2, "0")}`;
        this.load.image(key, `./frames_16x16/${key}.png`);
      }
    }
  }

  create() {
    this.add
      .image(0, 0, "room")
      .setOrigin(0)
      .setDisplaySize(ROOM_WIDTH, ROOM_HEIGHT);

    this.placeRoomItems();
    this.createPlayerAnimations();

    this.playerShadow = this.add
      .ellipse(540, 362, 42, 14, 0x10151d, 0.48)
      .setDepth(9);
    this.player = this.add
      .sprite(540, 330, "front_01")
      .setDisplaySize(76, 76)
      .setDepth(10);
    this.player.play("front");

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.inspectKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
    this.status = document.querySelector("#status");
    this.inspection = document.querySelector("#inspection");
    if (this.status) {
      this.status.textContent =
        "Move with WASD or arrow keys. Approach an item and press E to inspect.";
    }
  }

  placeRoomItems() {
    this.add.image(49, 187, "table").setOrigin(0).setDepth(1);
    this.add.image(76, 76, "whiteboard").setOrigin(0).setDepth(1);
    this.add.image(117, 176, "laptop").setOrigin(0).setDepth(2);
    this.add.image(64, 208, "note").setOrigin(0).setDepth(2);
    this.add.image(199, 220, "mouse").setOrigin(0).setDepth(2);
    this.add.image(770, 195, "ps4").setOrigin(0).setDepth(1);
    this.add.image(209, 400, "badminton").setOrigin(0).setDepth(1);
  }

  createPlayerAnimations() {
    for (const direction of FRAME_DIRECTIONS) {
      const frames = Array.from({ length: 4 }, (_, index) => ({
        key: `${direction}_${String(index + 1).padStart(2, "0")}`,
      }));
      this.anims.create({
        key: direction,
        frames,
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${direction}-idle`,
        frames: [{ key: `${direction}_01` }],
        frameRate: 1,
        repeat: -1,
      });
    }
  }

  update(_time, delta) {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    let xDirection = Number(right) - Number(left);
    let yDirection = Number(down) - Number(up);
    const isMoving = xDirection !== 0 || yDirection !== 0;

    if (isMoving) {
      const length = Math.hypot(xDirection, yDirection);
      xDirection /= length;
      yDirection /= length;
      const distance = (PLAYER_SPEED * delta) / 1000;
      const nextX = Phaser.Math.Clamp(
        this.player.x + xDirection * distance,
        ROOM_BOUNDS.left + PLAYER_COLLIDER.halfWidth,
        ROOM_BOUNDS.right - PLAYER_COLLIDER.halfWidth,
      );
      if (this.canOccupy(nextX, this.player.y)) {
        this.player.x = nextX;
      }
      const nextY = Phaser.Math.Clamp(
        this.player.y + yDirection * distance,
        ROOM_BOUNDS.top + PLAYER_COLLIDER.halfHeight,
        ROOM_BOUNDS.bottom - PLAYER_COLLIDER.halfHeight,
      );
      if (this.canOccupy(this.player.x, nextY)) {
        this.player.y = nextY;
      }

      if (Math.abs(xDirection) > Math.abs(yDirection)) {
        this.facing = xDirection > 0 ? "right" : "left";
      } else {
        this.facing = yDirection > 0 ? "front" : "back";
      }
      this.player.anims.play(this.facing, true);
    } else {
      this.player.anims.play(`${this.facing ?? "front"}-idle`, true);
    }

    this.playerShadow.setPosition(this.player.x, this.player.y + 32);
    this.updateInspection();
  }

  canOccupy(x, y) {
    const playerLeft = x - PLAYER_COLLIDER.halfWidth;
    const playerRight = x + PLAYER_COLLIDER.halfWidth;
    const playerTop = y - PLAYER_COLLIDER.halfHeight;
    const playerBottom = y + PLAYER_COLLIDER.halfHeight;

    return !ROOM_OBJECTS.some((object) => {
      if (!object.solid) return false;
      const { left, right, top, bottom } = object.bounds;
      return (
        playerLeft < right &&
        playerRight > left &&
        playerTop < bottom &&
        playerBottom > top
      );
    });
  }

  updateInspection() {
    let nearest = null;
    let nearestDistance = INSPECTION_RANGE;

    for (const object of ROOM_OBJECTS) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        object.inspectAt.x,
        object.inspectAt.y,
      );
      if (distance < nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    }

    if (!nearest) {
      this.activeInspection = null;
      this.inspection?.setAttribute("hidden", "");
      return;
    }

    if (this.activeInspection?.name !== nearest.name) {
      this.activeInspection = nearest;
      this.inspection?.classList.remove("is-inspected");
      this.inspection?.removeAttribute("hidden");
      const title = this.inspection?.querySelector("[data-inspection-title]");
      const detail = this.inspection?.querySelector("[data-inspection-detail]");
      if (title) title.textContent = nearest.name;
      if (detail) detail.textContent = "Press E to inspect";
    }

    if (Phaser.Input.Keyboard.JustDown(this.inspectKey)) {
      this.inspection?.classList.add("is-inspected");
      const title = this.inspection?.querySelector("[data-inspection-title]");
      const detail = this.inspection?.querySelector("[data-inspection-detail]");
      if (title) title.textContent = nearest.name;
      if (detail) detail.textContent = nearest.description;
    }
  }
}

const mount = document.querySelector("#game");
const status = document.querySelector("#status");
if (!(mount instanceof HTMLElement) || !(status instanceof HTMLElement)) {
  throw new Error("The game container or status element is missing.");
}
if (typeof Phaser === "undefined") {
  status.textContent = "Couldn't load Phaser. Check your internet connection.";
  throw new Error("Phaser failed to load.");
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: mount,
  backgroundColor: "#a9c5d4",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
  },
  scene: [GameScene],
});
