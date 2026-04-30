import { scheduleRetentionSeries } from "../retention";

const SCORE_THRESHOLD_FOR_REG_PROMPT = 5;
const REG_PROMPT_COOLDOWN_GAMES = 5;
const REFERRAL_REFERENCE = "share_score";

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private playerName = "Player 1";
  private gamesPlayed = 1;
  private isNewHighScore = false;
  private isMobile = false;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: {
    score: number;
    playerName: string;
    gamesPlayed?: number;
    isNewHighScore?: boolean;
  }): void {
    this.finalScore = data.score ?? 0;
    this.playerName = data.playerName ?? "Player 1";
    this.gamesPlayed = data.gamesPlayed ?? 1;
    this.isNewHighScore = data.isNewHighScore ?? false;
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

    // Persisted high score (with a "NEW!" badge if applicable)
    const highScore = (JestSDK.data.get("highScore") as number) ?? 0;
    const highScoreLabel = this.isNewHighScore
      ? `NEW High Score: ${highScore}`
      : `High Score: ${highScore}`;
    this.add
      .text(centerX, centerY + 10, highScoreLabel, {
        fontSize: "22px",
        fontFamily: "Courier New, monospace",
        color: this.isNewHighScore ? "#1AFF44" : "#ffff00",
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

    if (JestSDK.getPlayer().registered) {
      // Schedule a personalized D1/D3/D7 retention series tied to the
      // player's current high score
      scheduleRetentionSeries({
        score: highScore,
        playerName: this.playerName,
      });

      // Share button (referrals)
      this.createButton(centerX, centerY + 170, "Share", () => {
        JestSDK.referrals.shareReferralLink({
          reference: REFERRAL_REFERENCE,
          shareTitle: "Reigning Cats",
          shareText: `I scored ${this.finalScore} in Reigning Cats! Can you beat me?`,
          entryPayload: { referrer_name: this.playerName },
        });
      });

      // Surface referral conversions the player has earned
      this.showReferralCount(centerX, centerY + 240);
    } else {
      // Trigger registration at a meaningful moment instead of showing
      // a button. Criteria: first game with a score that shows real
      // engagement. The platform dialog explains the benefits.
      this.maybePromptRegistration();
    }
  }

  private maybePromptRegistration(): void {
    const hasMeaningfulScore =
      this.finalScore >= SCORE_THRESHOLD_FOR_REG_PROMPT;
    if (!hasMeaningfulScore) {
      return;
    }

    // Prompt on the first meaningful game, then re-prompt every
    // REG_PROMPT_COOLDOWN_GAMES meaningful games if the player declined.
    // The platform's own autoLoginReminders handles longer-term nudging.
    const lastPromptGame =
      (JestSDK.data.get("lastRegPromptGame") as number) ?? 0;
    const isFirstPrompt = lastPromptGame === 0;
    const gamesSincePrompt = this.gamesPlayed - lastPromptGame;

    if (!isFirstPrompt && gamesSincePrompt < REG_PROMPT_COOLDOWN_GAMES) {
      return;
    }

    JestSDK.data.set("lastRegPromptGame", this.gamesPlayed);
    // Pass context through the entry payload so the game can react
    // appropriately when the player returns after registering.
    JestSDK.login({
      entryPayload: {
        reason: "save_first_score",
        score: this.finalScore,
      },
    });
  }

  private async showReferralCount(x: number, y: number): Promise<void> {
    try {
      // referralsSigned is also returned for server-side verification
      // — recommended before granting any reward in production.
      const { referrals } = await JestSDK.referrals.listReferrals();
      const count = (referrals[REFERRAL_REFERENCE] ?? []).length;
      if (count === 0) {
        return;
      }
      this.add
        .text(x, y, `Friends invited: ${count}`, {
          fontSize: "18px",
          fontFamily: "Courier New, monospace",
          color: "#1AFF44",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    } catch (err) {
      console.error("Failed to fetch referral count:", err);
    }
  }

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
