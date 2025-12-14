export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Retro-style title text
    const titleText = this.add.text(centerX, centerY - 80, "REIGNING CATS", {
      fontSize: "48px",
      fontFamily: "Courier New, monospace",
      color: "#ffff00",
      align: "center",
      stroke: "#000000",
      strokeThickness: 6,
    });
    titleText.setOrigin(0.5);

    // Play button
    const buttonWidth = 160;
    const buttonHeight = 60;
    const buttonX = centerX;
    const buttonY = centerY + 80;

    // Button background
    const buttonBg = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, 0x1AFF44);
    buttonBg.setStrokeStyle(4, 0xffffff);
    buttonBg.setInteractive({ useHandCursor: true });

    // Button text
    const buttonText = this.add.text(buttonX, buttonY, 'Play', {
      fontSize: "32px",
      fontFamily: "Courier New, monospace",
      color: "#ffffff",
      fontStyle: "bold"
    });
    buttonText.setOrigin(0.5);

    // Button hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x15CC37);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x1AFF44);
    });

    buttonBg.on('pointerdown', () => {
      buttonBg.setFillStyle(0x0FA029);
    });

    buttonBg.on('pointerup', () => {
      buttonBg.setFillStyle(0x1AFF44);
      this.scene.start('GameScene');
    });
  }
}
