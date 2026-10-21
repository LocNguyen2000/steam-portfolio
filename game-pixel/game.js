const ROOM_WIDTH = 1024;
const ROOM_HEIGHT = 559;
const ROOM_BOUNDS = { left: 72, right: 952, top: 224.5, bottom: 495 };
const PLAYER_SPEED = 190;
const PLAYER_COLLIDER = { halfWidth: 9, halfHeight: 7 };
const PLAYER_GROUND_OFFSET = 32;
const INSPECTION_RANGE = 76;
const LIGHTING_TRANSITION_MS = 800;
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
    name: "PS4",
    description: "A PlayStation 4 console on the desk.",
    bounds: { left: 770, right: 870, top: 195, bottom: 260 },
    inspectAt: { x: 800, y: 263 },
    solid: true,
    size: { width: 100, height: 70 },
  },
  {
    name: "Screen",
    description: "A computer screen on the desk.",
    bounds: { left: 300, right: 400, top: 200, bottom: 300 },
    inspectAt: { x: 750, y: 75 },
    size: { width: 140, height: 80 },
    solid: false,
  }
];

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("room", "./assets/empty-room.jpg");
    this.load.on("loaderror", (file) => {
      const status = document.querySelector("#status");
      if (status) {
        status.textContent = `Couldn't load ${file.key}. Check that the asset is available.`;
      }
    });
    this.load.image("whiteboard", "./assets/room-items/item-whiteboard.png");
    this.load.image("ps4", "./assets/room-items/ps4-fixed.png");
    this.load.image("screen", "./assets/room-items/screen.png");
    // this.load.image("badminton", "./assets/room-items/item-badminton.png");

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

    this.windowGlow = this.createWindowGlow();

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

  createWindowGlow() {
    const texture = this.textures.createCanvas("window-glow", 512, 256);
    const context = texture.getContext();
    const gradient = context.createRadialGradient(256, 0, 12, 256, 0, 256);
    gradient.addColorStop(0, "rgba(156, 211, 255, 0.42)");
    gradient.addColorStop(1, "rgba(156, 211, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);
    texture.refresh();

    return this.add
      .image(512, 190, "window-glow")
      .setOrigin(0.5, 0)
      .setDisplaySize(700, 400)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(12);
  }


  placeRoomItems() {
    const ps4Size = ROOM_OBJECTS.find((obj) => obj.name === "PS4")?.size;
    const screenSize = ROOM_OBJECTS.find((obj) => obj.name === "Screen")?.size;

    this.add.image(76, 76, "whiteboard").setOrigin(0).setDepth(1);
    this.add.image(770, 195, "ps4").setOrigin(0).setDisplaySize(ps4Size.width, ps4Size.height).setDepth(1);
    const screen = this.add.image(750, 75, "screen")
      .setOrigin(0)
      .setDisplaySize(screenSize.width, screenSize.height)
      .setDepth(1);
    const screenBounds = screen.getBounds();
    this.add.graphics()
      .lineStyle(4, 0x000000, 1)
      .strokeRect(
        screenBounds.x,
        screenBounds.y,
        screenBounds.width,
        screenBounds.height,
      )
      .setDepth(2);
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
      const nextX = this.player.x + xDirection * distance;
      if (this.canOccupy(nextX, this.player.y)) {
        this.player.x = nextX;
      }
      const nextY = this.player.y + yDirection * distance;
      if (this.canOccupy(this.player.x, nextY)) {
        this.player.y = nextY;
      }

      // console.log('Player position:', this.player.x, this.player.y);

      if (Math.abs(xDirection) > Math.abs(yDirection)) {
        this.facing = xDirection > 0 ? "right" : "left";
      } else {
        this.facing = yDirection > 0 ? "front" : "back";
      }
      this.player.anims.play(this.facing, true);
    } else {
      this.player.anims.play(`${this.facing ?? "front"}-idle`, true);
    }

    this.playerShadow.setPosition(
      this.player.x,
      this.player.y + PLAYER_GROUND_OFFSET,
    );
    this.updateInspection();
  }

  canOccupy(x, y) {
    const playerLeft = x - PLAYER_COLLIDER.halfWidth;
    const playerRight = x + PLAYER_COLLIDER.halfWidth;
    const groundY = y + PLAYER_GROUND_OFFSET;
    const playerTop = groundY - PLAYER_COLLIDER.halfHeight;
    const playerBottom = groundY + PLAYER_COLLIDER.halfHeight;

    const isInsideRoom =
      playerLeft >= ROOM_BOUNDS.left &&
      playerRight <= ROOM_BOUNDS.right &&
      playerTop >= ROOM_BOUNDS.top &&
      playerBottom <= ROOM_BOUNDS.bottom;
    if (!isInsideRoom) return false;

    console.log('Player bounds:', { left: playerLeft, right: playerRight, top: playerTop, bottom: playerBottom });
    console.log('Room bounds:', ROOM_BOUNDS);
    console.log('-------------')

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
