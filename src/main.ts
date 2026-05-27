import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { isMobile } from "./platform";

const gameWidth = isMobile() ? Math.min(window.innerWidth, 600) : 800;
const gameHeight = isMobile() ? window.innerHeight : 1000;

// Initialize the Jest SDK before starting the game
JestSDK.init().then(() => {
  const game = new Phaser.Game({
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
    scene: [GameScene],
  });

  // Lazy-load the game-over scene into its own chunk.
  void import("./scenes/GameOverScene").then(({ GameOverScene }) => {
    game.scene.add("GameOverScene", GameOverScene);
  });
});
