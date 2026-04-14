import * as playerData from "../sdk/data";
import { isRegistered, promptLogin } from "../sdk/player";
import { scheduleRetentionSeries } from "../sdk/notifications";
import { shareGame } from "../sdk/referrals";

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private playerName = "Player 1";
  private isMobile = false;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: { score: number; playerName: string }): void {
    this.finalScore = data.score ?? 0;
    this.playerName = data.playerName ?? "Player 1";
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
  }

  create(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Game Over title
    this.add
      .text(centerX, centerY - 120, "GAME OVER", {
        fontSize: this.isMobile ? "48px" : "64px",
        fontFamily: "Courier New, monospace",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Player score
    this.add
      .text(centerX, centerY - 40, `${this.playerName}: ${this.finalScore}`, {
        fontSize: this.isMobile ? "24px" : "36px",
        fontFamily: "Courier New, monospace",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    // Persisted high score
    const highScore = (playerData.get("highScore") as number) ?? 0;
    this.add
      .text(centerX, centerY + 10, `High Score: ${highScore}`, {
        fontSize: "22px",
        fontFamily: "Courier New, monospace",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Play Again
    this.createButton(centerX, centerY + 90, "Play Again", () => {
      const container = document.getElementById("name-input-container");
      if (container) {
        container.style.display = "block";
      }
      this.scene.start("GameScene");
    });

    if (isRegistered()) {
      // Schedule a D1/D3/D7 retention notification series
      scheduleRetentionSeries(this.finalScore);

      // Let registered players share via referral link
      this.createButton(centerX, centerY + 170, "Share", () => {
        shareGame({
          reference: "share_score",
          shareTitle: "Reigning Cats",
          shareText: `I scored ${this.finalScore} in Reigning Cats! Can you beat me?`,
        });
      });
    } else {
      // Prompt guest players to sign up (required for notifications)
      this.createButton(centerX, centerY + 170, "Sign Up", () => {
        promptLogin();
      });
    }
  }

  // ── UI Helpers ──────────────────────────────────────────────

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): void {
    const bg = this.add.rectangle(x, y, 200, 60, 0x1aff44);
    bg.setStrokeStyle(4, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontSize: "28px",
        fontFamily: "Courier New, monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => bg.setFillStyle(0x15cc37));
    bg.on("pointerout", () => bg.setFillStyle(0x1aff44));
    bg.on("pointerdown", () => bg.setFillStyle(0x0fa029));
    bg.on("pointerup", () => {
      bg.setFillStyle(0x1aff44);
      onClick();
    });
  }
}
