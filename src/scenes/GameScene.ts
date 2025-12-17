import { scheduleSMSNotification } from "../notifications";
import { scheduleRCSNotification } from "../notifications";

export class GameScene extends Phaser.Scene {
  private basket!: Phaser.GameObjects.Sprite;
  private cats!: Phaser.Physics.Arcade.Group;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private catSpawnTimer!: Phaser.Time.TimerEvent;
  private basketSpeed: number = 500;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private isMobile: boolean = false;
  private catScale: number = 0.25;
  private catSpeed: number = 125; // Base speed (average of 100-150)
  private spawnDelay: number = 2000; // Base spawn delay in ms
  private debugMode: boolean = false;
  private debugText: Phaser.GameObjects.Text | null = null;
  private difficulty: string = "normal";
  private backgroundMusic!: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    // Load cat animation frames
    this.load.image("cat1", "molly-cat-animation/molly1.png");
    this.load.image("cat2", "molly-cat-animation/molly2.png");
    this.load.image("cat3", "molly-cat-animation/molly3.png");
    this.load.image("cat4", "molly-cat-animation/molly4.png");
    this.load.audio("bgMusic", "retro-game-402454.mp3");
  }

  create(): void {
    this.score = 0;
    this.catSpeed = 200; // Reset cat speed
    this.spawnDelay = 2000; // Reset spawn delay

    // Create cat falling animation
    this.anims.create({
      key: "cat-fall",
      frames: [
        { key: "cat1" },
        { key: "cat2" },
        { key: "cat3" },
        { key: "cat4" },
      ],
      frameRate: 8,
      repeat: -1,
    });

    // Initialize Jest SDK and get entry payload
    JestSDK.init().then(() => {
      const playerId = JestSDK.getPlayer().playerId;
      const entryPayload = JestSDK.getEntryPayload();

      // Get difficulty from entry payload (default to "normal")
      this.difficulty = entryPayload.difficulty || "normal";

      // Check for debug mode in entry payload
      if (entryPayload.mode === "debug") {
        this.debugMode = true;
      }

      // Create debug text at bottom of screen
      this.debugText = this.add.text(10, this.scale.height - 10, "", {
        font: "10px monospace",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        padding: { x: 5, y: 3 },
        align: "left",
      });
      this.debugText.setDepth(1000);
      this.debugText.setOrigin(0, 1);

      // Update debug text
      this.updateDebugText(playerId, entryPayload);

      // Setup name input handler
      this.setupNameInput();

      // SDK examples - uncomment to enable
      // Schedule an SMS notification on load
      // scheduleSMSNotification();
      // Schedule an RCS notification on load
      // scheduleRCSNotification();
    });

    // Detect if mobile
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Set cat scale based on device (60% of original size on mobile = 0.25 * 0.6 = 0.15)
    this.catScale = this.isMobile ? 0.15 : 0.25;

    this.createBackground();
    this.createSprites();
    this.createBasket();
    this.createCatsGroup();
    this.createRainEffect();
    this.createClouds();
    this.createScoreDisplay();
    this.setupInput();
    // Don't start spawning cats until player starts the game
  }

  private createBackground(): void {
    // Blue/grey sky gradient background
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x6a8caf, 0x6a8caf, 0x4a6fa5, 0x4a6fa5);
    graphics.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  private createSprites(): void {
    const basketGraphics = this.make.graphics({ x: 0, y: 0 });
    // Main body - tan wicker color
    basketGraphics.fillStyle(0xd2b48c);
    basketGraphics.fillRect(8, 8, 48, 24);
    // Darker rim
    basketGraphics.fillStyle(0xc19a6b);
    basketGraphics.fillRect(4, 4, 56, 8);
    // Bottom
    basketGraphics.fillStyle(0xa0826d);
    basketGraphics.fillRect(12, 28, 40, 4);
    // Weave pattern (horizontal lines)
    basketGraphics.fillStyle(0x8b7355);
    for (let y = 10; y < 30; y += 4) {
      basketGraphics.fillRect(8, y, 48, 1);
    }
    // Weave pattern (vertical lines)
    for (let x = 10; x < 56; x += 6) {
      basketGraphics.fillRect(x, 8, 1, 24);
    }
    // Handle connectors
    basketGraphics.fillRect(16, 4, 4, 6);
    basketGraphics.fillRect(44, 4, 4, 6);
    basketGraphics.generateTexture("basket", 64, 32);
    basketGraphics.destroy();

    // Cloud sprite
    const cloudGraphics = this.make.graphics({ x: 0, y: 0 });
    cloudGraphics.fillStyle(0xd3d3d3);
    cloudGraphics.fillCircle(30, 30, 20);
    cloudGraphics.fillCircle(50, 25, 25);
    cloudGraphics.fillCircle(70, 30, 20);
    cloudGraphics.fillCircle(40, 20, 15);
    cloudGraphics.fillCircle(60, 20, 15);
    cloudGraphics.generateTexture("cloud", 100, 50);
    cloudGraphics.destroy();

    // Rain drop sprite
    const rainGraphics = this.make.graphics({ x: 0, y: 0 });
    rainGraphics.fillStyle(0x87ceeb);
    rainGraphics.fillRect(0, 0, 2, 8);
    rainGraphics.generateTexture("raindrop", 2, 8);
    rainGraphics.destroy();
  }

  private createBasket(): void {
    // Position basket near bottom of screen
    // On mobile (75% down) to leave room for finger, on desktop (90% down)
    const basketY = this.isMobile
      ? this.scale.height * 0.85
      : this.scale.height * 0.9;
    this.basket = this.physics.add.sprite(
      this.scale.width / 2,
      basketY,
      "basket"
    );
    (this.basket.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(
      true
    );
    (this.basket.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    // Make basket half the size for hard difficulty
    if (this.difficulty === "hard") {
      this.basket.setScale(0.5);
    }
  }

  private createCatsGroup(): void {
    this.cats = this.physics.add.group();

    // Collision between basket and cats
    this.physics.add.overlap(
      this.basket,
      this.cats,
      this.catchCat,
      undefined,
      this
    );
  }

  private createRainEffect(): void {
    this.add.particles(0, -10, "raindrop", {
      x: { min: 0, max: this.scale.width },
      y: 0,
      lifespan: 2000,
      speedY: { min: 200, max: 400 },
      scale: { start: 1, end: 0.5 },
      quantity: 2,
      frequency: 50,
      alpha: { start: 0.7, end: 0.3 },
    });
  }

  private createClouds(): void {
    // Add some static clouds
    const cloudPositions = [
      { x: 100, y: 60 },
      { x: 300, y: 40 },
      { x: 500, y: 70 },
      { x: 700, y: 50 },
    ];

    cloudPositions.forEach((pos) => {
      const cloud = this.add.sprite(pos.x, pos.y, "cloud");
      cloud.setAlpha(0.8);

      // Slow cloud movement
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

  private createScoreDisplay(): void {
    // Score text in top-left corner with padding for 4 digits
    this.scoreText = this.add.text(30, 30, "Score: 0", {
      fontSize: "28px",
      fontFamily: "Courier New, monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
    });
    // Hide score until game starts
    this.scoreText.setVisible(false);
  }

  private setupInput(): void {
    // Keyboard controls (A and D)
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Also support arrow keys
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
  }

  private startCatSpawning(): void {
    this.catSpawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      callback: this.spawnCat,
      callbackScope: this,
      loop: true,
    });

    // Spawn first cat immediately
    this.spawnCat();
  }

  private updateSpawnRate(): void {
    // Decrease spawn delay by 25% every 5 cats (faster spawning)
    // Minimum delay of 300ms to allow multiple cats on screen
    this.spawnDelay = Math.max(300, this.spawnDelay * 0.75);

    // Update the timer with new delay
    this.catSpawnTimer.delay = this.spawnDelay;
  }

  private spawnCat(): void {
    // Calculate safe spawn area based on cat size
    const catWidth = 512 * this.catScale; // 512 is the original cat image width
    const margin = catWidth / 2;
    const minX = margin;
    const maxX = this.scale.width - margin;

    const x = Phaser.Math.Between(minX, maxX);
    const cat = this.cats.create(x, -32, "cat1") as Phaser.Physics.Arcade.Sprite;
    cat.setScale(this.catScale);
    cat.play("cat-fall");

    // Use current cat speed with some variation
    const speedVariation = this.catSpeed * 0.2; // ±20% variation
    const minSpeed = this.catSpeed - speedVariation;
    const maxSpeed = this.catSpeed + speedVariation;
    cat.setVelocityY(Phaser.Math.Between(minSpeed, maxSpeed));
  }

  private catchCat(_basket: any, cat: any): void {
    cat.destroy();
    this.score += 1;
    this.scoreText.setText("Score: " + this.score);

    // Increase difficulty every 5 cats
    if (this.score % 5 === 0) {
      this.catSpeed *= 1.25; // Cats fall 25% faster
      this.updateSpawnRate(); // Cats spawn 10% more frequently
    }
  }

  update(): void {
    this.handleInput();
    this.checkMissedCats();
  }

  private handleInput(): void {
    const body = this.basket.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (this.isMobile) {
      // Touch input - follows touch position automatically
      const pointerX = this.input.activePointer.x;
      const basketX = this.basket.x;

      if (pointerX < basketX - 10) {
        body.setVelocityX(-this.basketSpeed);
      } else if (pointerX > basketX + 10) {
        body.setVelocityX(this.basketSpeed);
      }
    } else {
      // Desktop keyboard input (A/D or Arrow keys)
      const leftKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.LEFT
      );
      const rightKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.RIGHT
      );

      if (this.keyA.isDown || leftKey.isDown) {
        body.setVelocityX(-this.basketSpeed);
      } else if (this.keyD.isDown || rightKey.isDown) {
        body.setVelocityX(this.basketSpeed);
      }
    }
  }

  private checkMissedCats(): void {
    this.cats.getChildren().forEach((cat: any) => {
      // Get the bottom of the cat sprite (y position + half of scaled height)
      const catBottom = cat.y + cat.displayHeight / 2;
      // Cat is missed if it passes the play area
      // On mobile (90% down) to match basket position, on desktop (95% down)
      const missThreshold = this.isMobile
        ? this.scale.height * 0.9
        : this.scale.height * 0.95;
      if (catBottom >= missThreshold) {
        this.gameOver();
      }
    });
  }

  private gameOver(): void {
    this.catSpawnTimer.destroy();

    // Stop background music
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
      this.backgroundMusic.stop();
    }

    const playerName = JestSDK.getPlayerDataVal("playerName") || "Player 1";
    this.scene.start("GameOverScene", {
      score: this.score,
      playerName: playerName,
    });
  }

  private async updateDebugText(
    playerId: string,
    entryPayload: Record<string, any>
  ) {
    if (this.debugText) {
      if (this.debugMode) {
        // Fetch available products
        let productsText = "Loading...";
        let products = null;
        try {
          products = await JestSDK.payments.getProducts();
          if (products && products.length > 0) {
            productsText = products
              .map((p) => `${p.name}: ${p.price}`)
              .join(", ");
          } else {
            productsText = "No products configured";
          }
        } catch (error) {
          productsText = `Error: ${error.message || "Failed to load"}`;
        }

        const lines = [
          `Debug data...`,
          `Player ID: ${playerId}`,
          `Difficulty: ${this.difficulty.toUpperCase()}`,
          `Available Products: ${productsText}`,
          `Entry Payload:`,
          JSON.stringify(entryPayload, null, 2),
        ];

        this.debugText.setText(lines.join("\n"));
        this.debugText.setVisible(true);

        // Also log to console
        this.logDebugToConsole(playerId, entryPayload, products);
      } else {
        this.debugText.setVisible(false);
      }
    }
  }

  private logDebugToConsole(
    playerId: string,
    entryPayload: Record<string, any>,
    products: any
  ) {
    if (!this.debugMode) return;

    console.group("🐱 Reigning Cats - Debug Info");
    console.log("Player ID:", playerId);
    console.log("Difficulty:", this.difficulty.toUpperCase());
    console.log("Available Products:", products || "Failed to load");
    console.log("Entry Payload:", entryPayload);
    console.groupEnd();
  }

  private logDebugToConsoleWithPlayerData(
    playerId: string,
    playerName: string,
    entryPayload: Record<string, any>,
    playerData: Record<string, any>,
    products: any
  ) {
    if (!this.debugMode) return;

    console.group("🐱 Reigning Cats - Debug Info (Game Started)");
    console.log("Player ID:", playerId);
    console.log("Player Name:", playerName);
    console.log("Difficulty:", this.difficulty.toUpperCase());
    console.log("Available Products:", products || "Failed to load");
    console.log("Entry Payload:", entryPayload);
    console.log("Player Data:", playerData);
    console.groupEnd();
  }

  private setupNameInput() {
    const nameContainer = document.getElementById("name-input-container");
    let nameInput = document.getElementById("player-name") as HTMLInputElement;
    let startBtn = document.getElementById("start-game-btn");

    if (!nameContainer || !nameInput || !startBtn) {
      console.error("Name input elements not found");
      return;
    }

    // Remove any existing listeners before adding new ones (prevents duplicates on replay)
    // Clone and replace the elements to remove all old event listeners
    const newNameInput = nameInput.cloneNode(true) as HTMLInputElement;
    const newStartBtn = startBtn.cloneNode(true) as HTMLButtonElement;
    nameInput.parentNode?.replaceChild(newNameInput, nameInput);
    startBtn.parentNode?.replaceChild(newStartBtn, startBtn);

    // Update references to point to the new elements
    nameInput = newNameInput;
    startBtn = newStartBtn;

    // Pause the game until name is entered
    this.physics.pause();

    // Only focus on desktop (avoid triggering mobile keyboard)
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (!isMobile) {
      nameInput.focus();
    }

    // Handler for Enter key
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleStart();
      }
    };

    // Handler for start button click
    const handleStart = async () => {
      const playerName = nameInput.value.trim() || "PLAYER 1";

      // Save player name
      JestSDK.setPlayerDataVal("playerName", playerName);

      // Update debug text to include player data and products
      const playerId = JestSDK.getPlayer().playerId;
      const entryPayload = JestSDK.getEntryPayload();
      const playerData = JestSDK.getPlayerData();

      // Update debug text with player data and products included
      if (this.debugText && this.debugMode) {
        // Fetch available products
        let productsText = "Loading...";
        let products = null;
        try {
          products = await JestSDK.payments.getProducts();
          if (products && products.length > 0) {
            productsText = products
              .map((p) => `${p.name}: ${p.price}`)
              .join(", ");
          } else {
            productsText = "No products configured";
          }
        } catch (error) {
          productsText = `Error: ${error.message || "Failed to load"}`;
        }

        const lines = [
          `Debug data...`,
          `Player ID: ${playerId}`,
          `Player Name: ${playerName}`,
          `Difficulty: ${this.difficulty.toUpperCase()}`,
          `Available Products: ${productsText}`,
          `Entry Payload:`,
          JSON.stringify(entryPayload, null, 2),
          `Player Data:`,
          JSON.stringify(playerData, null, 2),
        ];
        this.debugText.setText(lines.join("\n"));

        // Also log to console
        this.logDebugToConsoleWithPlayerData(
          playerId,
          playerName,
          entryPayload,
          playerData,
          products
        );
      }

      // Clean up event listeners
      nameInput.removeEventListener("keypress", handleKeyPress);
      startBtn.removeEventListener("click", handleStart);

      nameContainer.style.display = "none";
      this.physics.resume();

      // Show score text when game starts
      this.scoreText.setVisible(true);

      // Start spawning cats when game starts
      this.startCatSpawning();

      // Start background music
      if (!this.backgroundMusic) {
        this.backgroundMusic = this.sound.add("bgMusic", {
          loop: true,
          volume: 0.5,
        });
      }
      this.backgroundMusic.play();
    };

    // Add event listeners to the new elements
    nameInput.addEventListener("keypress", handleKeyPress);
    startBtn.addEventListener("click", handleStart);
  }
}
