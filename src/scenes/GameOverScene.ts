import {
  scheduleRCSNotification,
  scheduleSMSNotification,
} from "../notifications";

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private playerName: string = "Player 1";
  private isMobile: boolean = false;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: { score: number; playerName: string }): void {
    this.finalScore = data.score || 0;
    this.playerName = data.playerName || "Player 1";
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
  }

  create(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Game Over text - positioned higher on mobile
    const gameOverY = this.isMobile ? centerY - 140 : centerY - 100;
    const gameOverSize = this.isMobile ? "48px" : "64px";
    const gameOverText = this.add.text(centerX, gameOverY, "GAME OVER", {
      fontSize: gameOverSize,
      fontFamily: "Courier New, monospace",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 6,
    });
    gameOverText.setOrigin(0.5);

    // Score text - split into two lines on mobile
    const scoreY = this.isMobile ? centerY - 50 : centerY - 20;
    const scoreFontSize = this.isMobile ? "24px" : "36px";
    const scoreMessage = this.isMobile
      ? `Well done ${this.playerName}\nyour score is: ${this.finalScore}`
      : `Well done ${this.playerName} your score is: ${this.finalScore}`;

    const scoreText = this.add.text(centerX, scoreY, scoreMessage, {
      fontSize: scoreFontSize,
      fontFamily: "Courier New, monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
      align: "center",
    });
    scoreText.setOrigin(0.5);

    // Play Again button
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = centerX;
    const buttonY = centerY + 100;

    // Button background
    const buttonBg = this.add.rectangle(
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x1aff44
    );
    buttonBg.setStrokeStyle(4, 0xffffff);
    buttonBg.setInteractive({ useHandCursor: true });

    // Button text
    const buttonText = this.add.text(buttonX, buttonY, "Play Again", {
      fontSize: "28px",
      fontFamily: "Courier New, monospace",
      color: "#ffffff",
      fontStyle: "bold",
    });
    buttonText.setOrigin(0.5);

    // Button hover effects
    buttonBg.on("pointerover", () => {
      buttonBg.setFillStyle(0x15cc37);
    });

    buttonBg.on("pointerout", () => {
      buttonBg.setFillStyle(0x1aff44);
    });

    buttonBg.on("pointerdown", () => {
      buttonBg.setFillStyle(0x0fa029);
    });

    buttonBg.on("pointerup", () => {
      buttonBg.setFillStyle(0x1aff44);

      // Show the name input container again
      const nameContainer = document.getElementById("name-input-container");

      if (nameContainer) {
        nameContainer.style.display = "block";
      }

      // Restart the GameScene
      this.scene.start("GameScene");
    });

    // Debug buttons - only show in debug mode
    const entryPayload = JestSDK.getEntryPayload();
    if (entryPayload.mode === "debug") {
      // Adjust font size for mobile vs desktop
      const debugFontSize = this.isMobile ? "18px" : "24px";

      // Send test SMS notification button
      const smsButton = this.add.text(
        centerX,
        buttonY + 100,
        "Send Test SMS",
        {
          fontSize: debugFontSize,
          fontFamily: "Courier New, monospace",
          color: "#00ffff",
          backgroundColor: "rgba(0, 100, 100, 0.5)",
          padding: { x: 10, y: 5 },
          fontStyle: "bold",
        }
      );
      smsButton.setOrigin(0.5);
      smsButton.setInteractive({ useHandCursor: true });

      smsButton.on("pointerdown", () => {
        scheduleSMSNotification();
        smsButton.setText("Message scheduled!");
        smsButton.setStyle({ color: "#00ff00" });
        console.log("SMS notification scheduled");
      });

      // Send test RCS notification button
      const rcsButton = this.add.text(
        centerX,
        buttonY + 160,
        "Send Test RCS",
        {
          fontSize: debugFontSize,
          fontFamily: "Courier New, monospace",
          color: "#00ffff",
          backgroundColor: "rgba(0, 100, 100, 0.5)",
          padding: { x: 10, y: 5 },
          fontStyle: "bold",
        }
      );
      rcsButton.setOrigin(0.5);
      rcsButton.setInteractive({ useHandCursor: true });

      rcsButton.on("pointerdown", () => {
        scheduleRCSNotification();
        rcsButton.setText("Message scheduled!");
        rcsButton.setStyle({ color: "#00ff00" });
        console.log("RCS notification scheduled");
      });
    }
  }
}
