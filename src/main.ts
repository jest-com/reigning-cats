import Phaser from "phaser";
import { TitleScene } from "./scenes/TitleScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

// Detect device type and screen size
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

// Set game dimensions based on device and orientation
let gameWidth: number;
let gameHeight: number;

// Initialize Jest
JestSDK.init().then(() => {
  // initialized
});

if (isMobile) {
  // Mobile device - portrait orientation, fill screen vertically
  gameWidth = Math.min(screenWidth, 600);
  gameHeight = screenHeight;
} else {
  // Desktop
  gameWidth = 800;
  gameHeight = 1000;
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: gameWidth,
  height: gameHeight,
  parent: "game-container",
  backgroundColor: "#4a6fa5",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Enable responsive scaling
    width: gameWidth,
    height: gameHeight,
    fullscreenTarget: "game-container",
  },
  scene: [GameScene, TitleScene, GameOverScene],
};

const game = new Phaser.Game(config);

// Handle window resize for orientation changes
window.addEventListener("resize", () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  // Update game scale on orientation change
  game.scale.resize(
    Math.min(newWidth, gameWidth),
    Math.min(newHeight, gameHeight)
  );
});
