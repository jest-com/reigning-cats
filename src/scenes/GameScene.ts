import * as playerData from "../sdk/data";
import { getEntryPayload, isRegistered } from "../sdk/player";
import * as payments from "../sdk/payments";
import { unscheduleRetentionSeries } from "../sdk/notifications";
import { setLoadingProgress } from "../sdk/loading";

export class GameScene extends Phaser.Scene {
  // Game objects
  private basket!: Phaser.GameObjects.Sprite;
  private cats!: Phaser.Physics.Arcade.Group;
  private catSpawnTimer!: Phaser.Time.TimerEvent;
  private backgroundMusic!: Phaser.Sound.BaseSound;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  // Input keys
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;

  // Game state
  private score = 0;
  private lives = 0;
  private slowDown = false;
  private catSpeed = 200;
  private spawnDelay = 2000;
  private isMobile = false;

  // Cat name → file prefix (molly uses different naming than the others)
  private static readonly CATS: Record<string, string> = {
    bella: "bella-cat",
    black: "black-cat",
    grey: "grey-cat",
    molly: "molly",
    orange: "orange-cat",
  };
  private static readonly BASKET_SPEED = 500;

  constructor() {
    super({ key: "GameScene" });
  }

  // ── Phaser Lifecycle ────────────────────────────────────────

  preload(): void {
    // Report asset loading progress to the platform loading overlay
    this.load.on("progress", (value: number) => {
      setLoadingProgress(Math.round(value * 99));
    });

    for (const [name, prefix] of Object.entries(GameScene.CATS)) {
      for (let i = 1; i <= 3; i++) {
        this.load.image(`${name}-cat${i}`, `cat-images/${prefix}${i}.png`);
      }
    }
    this.load.audio("bgMusic", "retro-game-402454.mp3");
  }

  create(): void {
    this.score = 0;
    this.lives = 0;
    this.slowDown = false;
    this.catSpeed = 200;
    this.spawnDelay = 2000;
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    this.createAnimations();
    this.createBackground();
    this.createSprites();
    this.createBasket();
    this.createCatsGroup();
    this.createRainEffect();
    this.createClouds();
    this.createHUD();
    this.setupInput();

    this.physics.pause();
    this.setupStartScreen();

    // Dismiss the platform loading overlay now that the scene is ready
    setLoadingProgress(100);
  }

  update(): void {
    this.handleInput();
    this.checkMissedCats();
  }

  // ── Game Flow ───────────────────────────────────────────────

  private startGame(playerName: string): void {
    playerData.set("playerName", playerName);

    // Apply powerups purchased on the start screen
    if (this.slowDown) {
      this.catSpeed *= 0.5;
    }

    this.scoreText.setVisible(true);
    this.livesText.setText(`Lives: ${this.lives}`);
    this.livesText.setVisible(true);
    this.physics.resume();

    // Start spawning cats
    this.catSpawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      callback: this.spawnCat,
      callbackScope: this,
      loop: true,
    });
    this.spawnCat();

    // Start music
    if (!this.backgroundMusic) {
      this.backgroundMusic = this.sound.add("bgMusic", {
        loop: true,
        volume: 0.5,
      });
    }
    this.backgroundMusic.play();
  }

  private spawnCat(): void {
    const scale = this.isMobile ? 0.15 : 0.25;
    const margin = (512 * scale) / 2;
    const x = Phaser.Math.Between(margin, this.scale.width - margin);

    const type = Phaser.Math.RND.pick(Object.keys(GameScene.CATS));
    const cat = this.cats.create(
      x,
      -32,
      `${type}-cat1`,
    ) as Phaser.Physics.Arcade.Sprite;
    cat.setScale(scale);
    cat.play(`${type}-fall`);

    const variation = this.catSpeed * 0.2;
    cat.setVelocityY(
      Phaser.Math.Between(this.catSpeed - variation, this.catSpeed + variation),
    );
  }

  private catchCat(_basket: any, cat: any): void {
    cat.destroy();
    this.score++;
    this.scoreText.setText(`Score: ${this.score}`);

    // Ramp difficulty every 5 catches
    if (this.score % 5 === 0) {
      this.catSpeed *= 1.25;
      this.spawnDelay = Math.max(300, this.spawnDelay * 0.75);
      this.catSpawnTimer.destroy();
      this.catSpawnTimer = this.time.addEvent({
        delay: this.spawnDelay,
        callback: this.spawnCat,
        callbackScope: this,
        loop: true,
      });
    }
  }

  private checkMissedCats(): void {
    const threshold = this.scale.height * (this.isMobile ? 0.9 : 0.95);

    this.cats.getChildren().forEach((cat: any) => {
      if (cat.y + cat.displayHeight / 2 >= threshold) {
        if (this.lives > 0) {
          this.lives--;
          this.livesText.setText(`Lives: ${this.lives}`);
          cat.destroy();
        } else {
          this.gameOver();
        }
      }
    });
  }

  private gameOver(): void {
    this.catSpawnTimer.destroy();
    if (this.backgroundMusic?.isPlaying) {
      this.backgroundMusic.stop();
    }

    // Persist high score
    const highScore = (playerData.get("highScore") as number) ?? 0;
    if (this.score > highScore) {
      playerData.set("highScore", this.score);
    }
    playerData.flush();

    const playerName = (playerData.get("playerName") as string) ?? "Player 1";
    this.scene.start("GameOverScene", {
      score: this.score,
      playerName,
    });
  }

  // ── Payments (shop on start screen) ─────────────────────────

  private async renderProducts(): Promise<void> {
    const container = document.getElementById("shop-products");
    if (!container) {
      return;
    }

    try {
      const products = await payments.getProducts();
      container.innerHTML = "";

      for (const product of products) {
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.textContent = `${product.name} (${product.price} Token${product.price !== 1 ? "s" : ""})`;
        btn.addEventListener("click", () => this.buyProduct(product.sku));
        container.appendChild(btn);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }

  private async buyProduct(sku: string): Promise<void> {
    try {
      await payments.purchaseProduct(sku, (grantedSku) => {
        this.grantProduct(grantedSku);
      });
    } catch (err) {
      console.error("Purchase error:", err);
    }
  }

  private grantProduct(sku: string): void {
    switch (sku) {
      case "extra_life":
        this.lives++;
        break;
      case "slow_down":
        this.slowDown = true;
        break;
    }
    this.updateShopStatus();
  }

  private updateShopStatus(): void {
    const el = document.getElementById("shop-status");
    if (!el) {
      return;
    }

    const parts: string[] = [];
    if (this.lives > 0) {
      parts.push(`Extra Lives: ${this.lives}`);
    }
    if (this.slowDown) {
      parts.push("Slow Down: Active");
    }
    el.textContent = parts.join("  |  ");
  }

  // ── Input ───────────────────────────────────────────────────

  private handleInput(): void {
    const body = this.basket.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (this.isMobile) {
      const diff = this.input.activePointer.x - this.basket.x;
      if (Math.abs(diff) > 10) {
        body.setVelocityX(Math.sign(diff) * GameScene.BASKET_SPEED);
      }
    } else if (this.keyA.isDown || this.keyLeft.isDown) {
      body.setVelocityX(-GameScene.BASKET_SPEED);
    } else if (this.keyD.isDown || this.keyRight.isDown) {
      body.setVelocityX(GameScene.BASKET_SPEED);
    }
  }

  // ── Scene Setup ─────────────────────────────────────────────

  private createAnimations(): void {
    for (const name of Object.keys(GameScene.CATS)) {
      if (this.anims.exists(`${name}-fall`)) {
        continue;
      }
      this.anims.create({
        key: `${name}-fall`,
        frames: [
          { key: `${name}-cat1` },
          { key: `${name}-cat2` },
          { key: `${name}-cat3` },
          { key: `${name}-cat2` },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x6a8caf, 0x6a8caf, 0x4a6fa5, 0x4a6fa5);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  private createSprites(): void {
    // Basket texture
    const b = this.make.graphics({ x: 0, y: 0 });
    b.fillStyle(0xd2b48c);
    b.fillRect(8, 8, 48, 24);
    b.fillStyle(0xc19a6b);
    b.fillRect(4, 4, 56, 8);
    b.fillStyle(0xa0826d);
    b.fillRect(12, 28, 40, 4);
    b.fillStyle(0x8b7355);
    for (let y = 10; y < 30; y += 4) b.fillRect(8, y, 48, 1);
    for (let x = 10; x < 56; x += 6) b.fillRect(x, 8, 1, 24);
    b.fillRect(16, 4, 4, 6);
    b.fillRect(44, 4, 4, 6);
    b.generateTexture("basket", 64, 32);
    b.destroy();

    // Cloud texture
    const c = this.make.graphics({ x: 0, y: 0 });
    c.fillStyle(0xd3d3d3);
    c.fillCircle(30, 30, 20);
    c.fillCircle(50, 25, 25);
    c.fillCircle(70, 30, 20);
    c.fillCircle(40, 20, 15);
    c.fillCircle(60, 20, 15);
    c.generateTexture("cloud", 100, 50);
    c.destroy();

    // Raindrop texture
    const r = this.make.graphics({ x: 0, y: 0 });
    r.fillStyle(0x87ceeb);
    r.fillRect(0, 0, 2, 8);
    r.generateTexture("raindrop", 2, 8);
    r.destroy();
  }

  private createBasket(): void {
    const y = this.scale.height * (this.isMobile ? 0.85 : 0.9);
    this.basket = this.physics.add.sprite(this.scale.width / 2, y, "basket");
    const body = this.basket.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setImmovable(true);

    if (getEntryPayload().difficulty === "hard") {
      this.basket.setScale(0.5);
    }
  }

  private createCatsGroup(): void {
    this.cats = this.physics.add.group();
    this.physics.add.overlap(
      this.basket,
      this.cats,
      this.catchCat,
      undefined,
      this,
    );
  }

  private createRainEffect(): void {
    this.add.particles(0, -10, "raindrop", {
      x: { min: 0, max: this.scale.width },
      lifespan: 2000,
      speedY: { min: 200, max: 400 },
      scale: { start: 1, end: 0.5 },
      quantity: 2,
      frequency: 50,
      alpha: { start: 0.7, end: 0.3 },
    });
  }

  private createClouds(): void {
    const positions = [
      { x: 100, y: 60 },
      { x: 300, y: 40 },
      { x: 500, y: 70 },
      { x: 700, y: 50 },
    ];

    positions.forEach((pos) => {
      const cloud = this.add.sprite(pos.x, pos.y, "cloud");
      cloud.setAlpha(0.8);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 30,
        duration: 4000,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    });
  }

  private createHUD(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "28px",
      fontFamily: "Courier New, monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
    };

    this.scoreText = this.add.text(30, 30, "Score: 0", style);
    this.scoreText.setVisible(false);

    this.livesText = this.add.text(
      this.scale.width - 30,
      30,
      "Lives: 0",
      style,
    );
    this.livesText.setOrigin(1, 0);
    this.livesText.setVisible(false);
  }

  private setupInput(): void {
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyLeft = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.LEFT,
    );
    this.keyRight = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    );
  }

  private setupStartScreen(): void {
    const container = document.getElementById("name-input-container");
    if (!container) {
      return;
    }

    // Cancel stale retention notifications — the player is back
    if (isRegistered()) {
      unscheduleRetentionSeries();
    }

    // If the player entered from a notification and has a saved name,
    // skip the start screen and jump straight into gameplay
    const entry = getEntryPayload();
    const savedName = playerData.get("playerName") as string | undefined;
    if (entry.notification_template && savedName) {
      container.style.display = "none";
      payments
        .recoverPurchases((sku) => this.grantProduct(sku))
        .catch((err) => console.error("Failed to recover purchases:", err));
      this.startGame(savedName);
      return;
    }

    // Normal flow: show name input and shop
    let nameInput = document.getElementById("player-name");
    let startBtn = document.getElementById(
      "start-game-btn",
    ) as HTMLButtonElement;
    if (!nameInput || !startBtn) {
      return;
    }

    // Clone elements to remove stale listeners from previous game sessions
    const freshInput = nameInput.cloneNode(true) as HTMLInputElement;
    const freshBtn = startBtn.cloneNode(true) as HTMLButtonElement;
    nameInput.parentNode!.replaceChild(freshInput, nameInput);
    startBtn.parentNode!.replaceChild(freshBtn, startBtn);

    // Pre-fill saved player name
    if (savedName) {
      freshInput.value = savedName;
    }
    if (!this.isMobile) {
      freshInput.focus();
    }

    // Recover incomplete purchases, then list available products
    payments
      .recoverPurchases((sku) => this.grantProduct(sku))
      .then(() => this.renderProducts())
      .catch((err) => console.error("Failed to recover purchases:", err));

    const handleStart = () => {
      container.style.display = "none";
      this.startGame(freshInput.value.trim() || "PLAYER 1");
    };

    freshInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleStart();
      }
    });
    freshBtn.addEventListener("click", handleStart);
  }
}
