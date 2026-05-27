import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

const gameWidth = isMobile ? Math.min(window.innerWidth, 600) : 800;
const gameHeight = isMobile ? window.innerHeight : 1000;

// Initialize the Jest SDK before starting the game
JestSDK.init().then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    width: gameWidth,
    height: gameHeight,
    parent: "game-container",
    backgroundColor: "#4a6fa5",
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: gameWidth,
      height: gameHeight,
      fullscreenTarget: "game-container",
    },
    scene: [GameScene, GameOverScene],
  });
});
