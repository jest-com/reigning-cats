import Phaser from "phaser";
import { dpr } from "../platform";
import { scheduleRetentionSeries } from "../retention";
import { captureCanvas } from "../snapshot";

const REG_PROMPT_COOLDOWN_GAMES = 5;
const REFERRAL_REFERENCE = "share_score";

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private playerName = "Player 1";
  private gamesPlayed = 1;
  private isNewHighScore = false;
  private uiScale = 1;

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
  }

  create(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    // Scale all UI down on narrow screens (full size at >= 800px wide).
    const f = Phaser.Math.Clamp(this.cameras.main.width / 800, 0.6, 1);
    this.uiScale = f;

    // Game Over title
    this.add
      .text(centerX, centerY - 210 * f, "GAME OVER", {
        fontSize: `${Math.round(64 * f)}px`,
        fontFamily: "Courier New, monospace",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 6,
        resolution: dpr(),
      })
      .setOrigin(0.5);

    // Player score
    this.add
      .text(
        centerX,
        centerY - 160 * f,
        `${this.playerName}: ${this.finalScore}`,
        {
          fontSize: `${Math.round(36 * f)}px`,
          fontFamily: "Courier New, monospace",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
          fontStyle: "bold",
          align: "center",
          resolution: dpr(),
        },
      )
      .setOrigin(0.5);

    // Persisted high score (with a "NEW!" badge if applicable)
    const highScore = (JestSDK.data.get("highScore") as number) ?? 0;
    const highScoreLabel = this.isNewHighScore
      ? `NEW High Score: ${highScore}`
      : `High Score: ${highScore}`;
    this.add
      .text(centerX, centerY - 126 * f, highScoreLabel, {
        fontSize: `${Math.round(22 * f)}px`,
        fontFamily: "Courier New, monospace",
        color: this.isNewHighScore ? "#1AFF44" : "#ffff00",
        stroke: "#000000",
        strokeThickness: 3,
        resolution: dpr(),
      })
      .setOrigin(0.5);

    // Leaderboard with bot avatars
    this.buildLeaderboard(centerX, centerY - 86 * f, f);

    // Play Again
    this.createButton(centerX, centerY + 110 * f, "Play Again", () => {
      const container = document.getElementById("name-input-container");
      if (container) {
        container.style.display = "flex";
      }
      this.scene.start("GameScene");
    });

    if (JestSDK.getPlayer().registered) {
      // Schedule a personalized D1 to D7 retention series tied to the
      // player's current high score
      scheduleRetentionSeries({
        score: highScore,
        playerName: this.playerName,
      });

      // Share button (referrals)
      this.createButton(centerX, centerY + 172 * f, "Share", () => {
        void this.shareScore();
      });

      // Surface referral conversions the player has earned
      this.showReferralCount(centerX, centerY + 212 * f);
    } else {
      // Ask a guest to register at a meaningful moment rather than parking
      // a button on screen. The gate below explains what registering buys.
      this.maybePromptRegistration();
    }
  }

  private buildLeaderboard(centerX: number, labelY: number, f: number): void {
    const highScore = (JestSDK.data.get("highScore") as number) ?? 0;
    const entries = this.leaderboardEntries(highScore);

    this.add
      .text(centerX, labelY, "TOP CATS", {
        fontSize: `${Math.round(18 * f)}px`,
        fontFamily: "Courier New, monospace",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 3,
        resolution: dpr(),
      })
      .setOrigin(0.5);

    const rowStep = 32 * f;
    const rowW = 280 * f;
    const avatar = 26 * f;
    const leftX = centerX - rowW / 2;

    const addAvatar = (key: string, x: number, y: number) =>
      this.add.image(x, y, key).setDisplaySize(avatar, avatar).setOrigin(0.5);

    const pending: { key: string; x: number; y: number }[] = [];
    this.load.crossOrigin = "anonymous";

    entries.forEach((e, i) => {
      const y = labelY + 28 * f + i * rowStep;
      const color = e.isPlayer ? "#1AFF44" : "#ffffff";
      const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: `${Math.round(16 * f)}px`,
        fontFamily: "Courier New, monospace",
        color,
        stroke: "#000000",
        strokeThickness: 3,
        resolution: dpr(),
      };

      this.add
        .text(leftX + avatar + 10 * f, y, e.username, rowStyle)
        .setOrigin(0, 0.5);
      this.add
        .text(centerX + rowW / 2, y, `${e.score}`, rowStyle)
        .setOrigin(1, 0.5);

      const key = `lb_${e.username}`;
      const x = leftX + avatar / 2;
      if (this.textures.exists(key)) {
        addAvatar(key, x, y);
      } else {
        pending.push({ key, x, y });
        this.load.image(key, e.avatarUrl);
      }
    });

    if (pending.length > 0) {
      this.load.once("complete", () => {
        if (!this.scene.isActive()) {
          return;
        }
        for (const p of pending) {
          if (this.textures.exists(p.key)) {
            addAvatar(p.key, p.x, p.y);
          }
        }
      });
      this.load.start();
    }
  }

  private leaderboardEntries(highScore: number): Array<{
    username: string;
    score: number;
    isPlayer: boolean;
    avatarUrl: string;
  }> {
    const profile = JestSDK.social.getProfile({ avatarSize: 64 });
    // Guests have no avatar, so fall back to a deterministic bot avatar.
    const playerAvatar =
      profile?.avatarUrl ??
      JestSDK.social.getBotAvatar({ username: this.playerName, size: 64 });

    const bots = [
      { username: "SirPounce", score: highScore + 6 },
      { username: "Mittens9k", score: highScore + 2 },
      { username: "NapQueen", score: Math.max(0, highScore - 3) },
    ];

    const entries = [
      ...bots.map((b) => ({
        username: b.username,
        score: b.score,
        isPlayer: false,
        avatarUrl: JestSDK.social.getBotAvatar({
          username: b.username,
          size: 64,
        }),
      })),
      {
        username: this.playerName,
        score: highScore,
        isPlayer: true,
        avatarUrl: playerAvatar,
      },
    ];

    entries.sort((a, b) => b.score - a.score);
    return entries;
  }

  private maybePromptRegistration(): void {
    // Ask once the player has finished a round: that is the same "they got the
    // point" signal markFirstMilestone() reports, and a score they might not
    // want to lose. Re-prompt every REG_PROMPT_COOLDOWN_GAMES rounds if they
    // declined, and let the platform's autoLoginReminders nudge in between.
    const lastPromptGame =
      (JestSDK.data.get("lastRegPromptGame") as number) ?? 0;
    const isFirstPrompt = lastPromptGame === 0;
    const gamesSincePrompt = this.gamesPlayed - lastPromptGame;

    if (!isFirstPrompt && gamesSincePrompt < REG_PROMPT_COOLDOWN_GAMES) {
      return;
    }

    JestSDK.data.set("lastRegPromptGame", this.gamesPlayed);
    this.showRegistrationScreen();
  }

  /**
   * A full-screen gate over the game-over scene, not a card tucked beside
   * other UI: registration is the only thing being asked here. The game draws
   * the screen and drives the flow through the two actions
   * showRegistrationOverlay hands back, so the ask matches the game's art.
   *
   * The platform renders its own legal text and close button on top. The game
   * must not hide, recreate, or obstruct either, or block the player skipping.
   */
  private showRegistrationScreen(): void {
    const screen = document.getElementById("register-screen");
    const registerBtn = document.getElementById("register-btn");
    const laterBtn = document.getElementById("register-later-btn");
    if (!screen || !registerBtn || !laterBtn) {
      return;
    }

    const hide = () => {
      screen.style.display = "none";
    };

    const { loginButtonAction, closeButtonAction } =
      JestSDK.showRegistrationOverlay({
        theme: "dark",
        // Must contain {{registrationCode}} exactly once and stay inside the
        // 140-character SMS budget once the code is substituted in.
        message: "Let me into Reigning Cats! {{registrationCode}} is my code.",
        // Delivered back via getEntryPayload() when the player returns, so the
        // game knows which ask converted them.
        entryPayload: { reason: "save_first_score", score: this.finalScore },
        // Fires on either dismissal route, but only once the platform
        // confirms it. Covers the close button the platform draws itself.
        onClose: hide,
      });

    // Assigned rather than added: replaying reaches this screen again, and
    // addEventListener would stack a handler per round.
    registerBtn.onclick = loginButtonAction;
    laterBtn.onclick = () => {
      // Dismiss the game's own screen without waiting for a round trip. The
      // platform overlay keeps its own close button either way.
      hide();
      closeButtonAction();
    };
    screen.style.display = "flex";
  }

  private async shareScore(): Promise<void> {
    // A snapshot of this screen becomes the referral link's OG image, so the
    // preview in the messaging app shows the real score instead of static art.
    // JPEG keeps it well inside the 2 MB data-URL limit.
    const shareImage = await captureCanvas(this.game, "image/jpeg");

    try {
      await JestSDK.referrals.shareReferralLink({
        reference: REFERRAL_REFERENCE,
        shareTitle: "Reigning Cats",
        shareText: `I scored ${this.finalScore} in Reigning Cats! Can you beat me?`,
        entryPayload: { referrer_name: this.playerName },
        shareImage: shareImage ?? undefined,
        // Tell the referrer when invites convert. The platform picks the
        // template with the highest threshold the player has passed.
        notificationTemplates: [
          {
            minConversionCount: 1,
            variants: [
              {
                title: "Your invite landed",
                body: `${this.playerName}, a friend just joined Reigning Cats through your link.`,
                ctaText: "See Scores",
              },
            ],
          },
          {
            minConversionCount: 3,
            variants: [
              {
                title: "Three friends in",
                body: `${this.playerName}, three friends are chasing your ${this.finalScore} in Reigning Cats.`,
                ctaText: "Defend It",
              },
            ],
          },
        ],
      });
    } catch (err) {
      console.error("Failed to share referral link:", err);
    }
  }

  private async showReferralCount(x: number, y: number): Promise<void> {
    try {
      // referralsSigned is also returned for server-side verification
      // Recommended before granting any reward in production.
      const { referrals } = await JestSDK.referrals.listReferrals();
      const count = (referrals[REFERRAL_REFERENCE] ?? []).length;
      if (count === 0) {
        return;
      }
      this.add
        .text(x, y, `Friends invited: ${count}`, {
          fontSize: `${Math.round(18 * this.uiScale)}px`,
          fontFamily: "Courier New, monospace",
          color: "#1AFF44",
          stroke: "#000000",
          strokeThickness: 3,
          resolution: dpr(),
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
    const f = this.uiScale;
    const bg = this.add.rectangle(x, y, 200 * f, 60 * f, 0x1aff44);
    bg.setStrokeStyle(4, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontSize: `${Math.round(28 * f)}px`,
        fontFamily: "Courier New, monospace",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: dpr(),
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
