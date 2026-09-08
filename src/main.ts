import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { isMobile } from "./platform";
import { captureCanvas } from "./snapshot";

const gameWidth = isMobile() ? Math.min(window.innerWidth, 600) : 800;
const gameHeight = isMobile() ? window.innerHeight : 1000;

// Initialize the Jest SDK before starting the game.
// autoLoginReminders stays on: the game only prompts guests after a meaningful
// score, and leans on the platform for the longer-term nudging in between.
JestSDK.init({ autoLoginReminders: true }).then(() => {
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

  // Wired once here, not per scene: visibility is game-wide. Phaser sleeps its
  // own loop when the tab hides, so these hooks exist to silence music and stop
  // timers. Tracking the keys avoids resuming a scene the game itself paused.
  let pausedByHide: string[] = [];

  JestSDK.lifecycle.onHide(() => {
    pausedByHide = game.scene.getScenes(true).map((scene) => scene.scene.key);
    for (const key of pausedByHide) {
      game.scene.pause(key);
    }
    game.sound.pauseAll();
  });

  JestSDK.lifecycle.onShow(() => {
    for (const key of pausedByHide) {
      game.scene.resume(key);
    }
    pausedByHide = [];
    game.sound.resumeAll();
  });

  // Replace the SDK's automatic canvas capture. The start screen, shop and
  // membership panels are HTML overlays above the canvas, so capturing the
  // canvas while one is open would show the game behind it instead.
  // Registered here, not in a scene, so it survives scene transitions.
  JestSDK.social.setScreenshotProvider(() => {
    const overlay = document.getElementById("name-input-container");
    if (overlay && overlay.offsetParent !== null) {
      return null;
    }
    return captureCanvas(game, "image/png");
  });
});
