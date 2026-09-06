import Phaser from "phaser";
import { Board } from "./Board";
import { Tray } from "./Tray";
import { type ShapeTemplate } from "./constants";
import { sounds } from "./SoundManager";
import { StorageManager } from "./StorageManager";

interface UndoSnapshot {
  gridData: number[][];
  trayTemplates: (ShapeTemplate | null)[];
  score: number;
}

const FONT_FAMILY =
  'Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

class GameScene extends Phaser.Scene {
  private board!: Board;
  private tray!: Tray;
  private score = 0;
  private bestScore = 0;
  private streakCount = 1;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private activeModal?: Phaser.GameObjects.Container;

  // Action Buttons
  private lastSnapshot: UndoSnapshot | null = null;
  private canUndo = false;
  private undoBtnBg!: Phaser.GameObjects.Rectangle;
  private undoBtnText!: Phaser.GameObjects.Text;

  private canSwapThisRound = true;
  private swapBtnBg!: Phaser.GameObjects.Rectangle;
  private swapBtnText!: Phaser.GameObjects.Text;

  private canBombThisRound = true;
  private bombBtnBg!: Phaser.GameObjects.Rectangle;
  private bombBtnText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  create() {
    this.bestScore = StorageManager.getBestScore();
    this.streakCount = StorageManager.updateAndGetStreak();

    this.createHeader();
    this.createAdBillboard();
    this.board = new Board(this);
    this.createActionBar();

    this.tray = new Tray(
      this,
      this.board,
      () => this.captureSnapshot(),
      (tileCount) => this.handlePiecePlaced(tileCount),
      () => this.checkGameOver(),
      () => this.resetRoundPowers(),
    );

    this.restorePreviousSession();
  }

  private createHeader() {
    // Score display
    this.add.text(35, 22, "SCORE", {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      fontStyle: "bold",
      resolution: 2,
    });

    this.scoreText = this.add.text(35, 36, "0", {
      fontFamily: FONT_FAMILY,
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
      resolution: 2,
    });

    // Best Score display
    this.add.text(210, 22, "BEST", {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      fontStyle: "bold",
      resolution: 2,
    });

    this.bestScoreText = this.add.text(210, 36, this.bestScore.toString(), {
      fontFamily: FONT_FAMILY,
      fontSize: "28px",
      color: "#fbbf24",
      fontStyle: "bold",
      resolution: 2,
    });

    // Daily Streak Badge
    const streakPlate = this.add.rectangle(350, 42, 65, 30, 0x182030);
    streakPlate.setStrokeStyle(1, 0xf97316);

    this.add
      .text(350, 42, `🔥 ${this.streakCount}d`, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#fb923c",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    // Audio Mute Toggle Button
    const muteBtn = this.add
      .text(435, 42, "🔊", {
        fontSize: "20px",
        resolution: 2,
      })
      .setOrigin(0.5);
    muteBtn.setInteractive({ useHandCursor: true });
    muteBtn.on("pointerdown", () => {
      sounds.isMuted = !sounds.isMuted;
      muteBtn.setText(sounds.isMuted ? "🔇" : "🔊");
    });
  }

  private createAdBillboard() {
    const billboard = this.add.rectangle(240, 100, 420, 60, 0x141b27);
    billboard.setStrokeStyle(1.5, 0x2e3d56);

    this.add
      .text(240, 89, "SPONSOR BILLBOARD", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#38bdf8",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(240, 111, "Tap here to outbid this slot ($5)", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#cbd5e1",
        resolution: 2,
      })
      .setOrigin(0.5);

    billboard.setInteractive({ useHandCursor: true });
    billboard.on("pointerdown", () =>
      window.open("https://outbid.lol", "_blank"),
    );
  }

  private createActionBar() {
    const barY = 620;

    // 1. UNDO
    this.undoBtnBg = this.add.rectangle(105, barY, 95, 34, 0x161e2e);
    this.undoBtnBg.setStrokeStyle(1.5, 0x223049);
    this.undoBtnText = this.add
      .text(105, barY, "↩ UNDO", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#64748b",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.undoBtnBg.setInteractive({ useHandCursor: false });
    this.undoBtnBg.on("pointerdown", () => this.performUndo());

    // 2. SWAP
    this.swapBtnBg = this.add.rectangle(235, barY, 125, 34, 0x1e293b);
    this.swapBtnBg.setStrokeStyle(1.5, 0x334155);
    this.swapBtnText = this.add
      .text(235, barY, "🔄 SWAP (1/1)", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#38bdf8",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.swapBtnBg.setInteractive({ useHandCursor: true });
    this.swapBtnBg.on("pointerdown", () => this.promptSwapConfirmation());

    // 3. BOMB
    this.bombBtnBg = this.add.rectangle(375, barY, 125, 34, 0x1e293b);
    this.bombBtnBg.setStrokeStyle(1.5, 0x334155);
    this.bombBtnText = this.add
      .text(375, barY, "💣 BOMB (1/1)", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#f87171",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.bombBtnBg.setInteractive({ useHandCursor: true });
    this.bombBtnBg.on("pointerdown", () => this.promptBombConfirmation());

    this.updateActionButtons();
  }

  private resetRoundPowers() {
    this.canSwapThisRound = true;
    this.canBombThisRound = true;
    this.updateActionButtons();
  }

  private updateActionButtons() {
    if (this.canUndo) {
      this.undoBtnBg.setFillStyle(0x2563eb);
      this.undoBtnBg.setStrokeStyle(1.5, 0x60a5fa);
      this.undoBtnText.setColor("#ffffff");
    } else {
      this.undoBtnBg.setFillStyle(0x161e2e);
      this.undoBtnBg.setStrokeStyle(1.5, 0x223049);
      this.undoBtnText.setColor("#64748b");
    }

    if (this.canSwapThisRound) {
      this.swapBtnBg.setFillStyle(0x075985);
      this.swapBtnBg.setStrokeStyle(1.5, 0x38bdf8);
      this.swapBtnText.setText("🔄 SWAP (1/1)").setColor("#ffffff");
    } else {
      this.swapBtnBg.setFillStyle(0x161e2e);
      this.swapBtnBg.setStrokeStyle(1.5, 0x223049);
      this.swapBtnText.setText("🔄 SWAP (0/1)").setColor("#64748b");
    }

    if (this.canBombThisRound) {
      this.bombBtnBg.setFillStyle(0x991b1b);
      this.bombBtnBg.setStrokeStyle(1.5, 0xef4444);
      this.bombBtnText.setText("💣 BOMB (1/1)").setColor("#ffffff");
    } else {
      this.bombBtnBg.setFillStyle(0x161e2e);
      this.bombBtnBg.setStrokeStyle(1.5, 0x223049);
      this.bombBtnText.setText("💣 BOMB (0/1)").setColor("#64748b");
    }
  }

  private promptSwapConfirmation() {
    if (!this.canSwapThisRound || this.activeModal) return;

    this.showConfirmationModal({
      title: "SWAP ALL PIECES?",
      disclaimer:
        "Replaces all unplaced tray pieces with 3 fresh shapes.\n(1 use per round)",
      btnColor: 0x0284c7,
      btnLabel: "CONFIRM SWAP",
      onConfirm: () => {
        sounds.playClick();
        this.canSwapThisRound = false;
        this.updateActionButtons();
        this.tray.swapAllPieces();
        this.persistActiveSession();
      },
    });
  }

  private promptBombConfirmation() {
    if (!this.canBombThisRound || this.activeModal) return;

    this.showConfirmationModal({
      title: "ACTIVATE 3x3 BOMB?",
      disclaimer:
        "Tap any cell on the board to vaporize a 3x3 area.\n(1 use per round)",
      btnColor: 0xdc2626,
      btnLabel: "ACTIVATE BOMB",
      onConfirm: () => {
        sounds.playClick();
        this.canBombThisRound = false;
        this.updateActionButtons();
        this.board.enableBombMode(() => {
          this.board.checkAndClearLines();
          this.persistActiveSession();
          this.checkGameOver();
        });
      },
    });
  }

  private showConfirmationModal(opts: {
    title: string;
    disclaimer: string;
    btnColor: number;
    btnLabel: string;
    onConfirm: () => void;
  }) {
    this.activeModal = this.add.container(240, 400);

    const backdrop = this.add.rectangle(0, 0, 480, 800, 0x000000, 0.75);
    backdrop.setInteractive();

    const card = this.add.rectangle(0, 0, 360, 230, 0x182030);
    card.setStrokeStyle(1.5, 0x38bdf8);

    const title = this.add
      .text(0, -60, opts.title, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -12, opts.disclaimer, {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: "#cbd5e1",
        align: "center",
        wordWrap: { width: 310 },
        lineSpacing: 4,
        resolution: 2,
      })
      .setOrigin(0.5);

    const cancelBtn = this.add.rectangle(-80, 60, 120, 38, 0x334155);
    cancelBtn.setInteractive({ useHandCursor: true });
    const cancelText = this.add
      .text(-80, 60, "CANCEL", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    cancelBtn.on("pointerdown", () => {
      this.activeModal?.destroy();
      this.activeModal = undefined;
    });

    const confirmBtn = this.add.rectangle(80, 60, 140, 38, opts.btnColor);
    confirmBtn.setInteractive({ useHandCursor: true });
    const confirmText = this.add
      .text(80, 60, opts.btnLabel, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    confirmBtn.on("pointerdown", () => {
      this.activeModal?.destroy();
      this.activeModal = undefined;
      opts.onConfirm();
    });

    this.activeModal.add([
      backdrop,
      card,
      title,
      desc,
      cancelBtn,
      cancelText,
      confirmBtn,
      confirmText,
    ]);
  }

  private captureSnapshot() {
    this.lastSnapshot = {
      gridData: this.board.gridData.map((row) => [...row]),
      trayTemplates: this.tray.getRemainingTemplates(),
      score: this.score,
    };
    this.canUndo = true;
    this.updateActionButtons();
  }

  private performUndo() {
    if (!this.canUndo || !this.lastSnapshot) return;

    sounds.playClick();
    this.board.restoreGrid(this.lastSnapshot.gridData);
    this.tray.restoreBatch(this.lastSnapshot.trayTemplates);
    this.score = this.lastSnapshot.score;
    this.updateScores();

    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = undefined;
    }

    this.canUndo = false;
    this.lastSnapshot = null;
    this.updateActionButtons();
    this.persistActiveSession();
  }

  private handlePiecePlaced(tileCount: number) {
    const validCount =
      typeof tileCount === "number" && !isNaN(tileCount) ? tileCount : 1;
    this.score += validCount * 10;

    const linesCleared = this.board.checkAndClearLines();
    if (linesCleared > 0) {
      this.score += linesCleared * 100 * linesCleared;
      sounds.playLineClear(linesCleared);
    }

    this.updateScores();
    this.persistActiveSession();
  }

  private updateScores() {
    this.scoreText.setText(this.score.toString());
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.bestScoreText.setText(this.bestScore.toString());
      StorageManager.saveBestScore(this.bestScore);
    }
  }

  private persistActiveSession() {
    StorageManager.saveGameState({
      gridData: this.board.gridData,
      trayTemplates: this.tray.getRemainingTemplates(),
      nextBatchTemplates: this.tray.nextBatchTemplates,
      score: this.score,
      canSwap: this.canSwapThisRound,
      canBomb: this.canBombThisRound,
    });
  }

  private restorePreviousSession() {
    const saved = StorageManager.getSavedGame();
    if (!saved) return;

    // Check if saved state has any tiles or score
    const hasTiles = saved.gridData.some((row) => row.some((v) => v !== 0));
    if (!hasTiles && saved.score === 0) return;

    this.board.restoreGrid(saved.gridData);
    this.tray.loadSavedSession(saved.trayTemplates, saved.nextBatchTemplates);
    this.score = saved.score;
    this.canSwapThisRound = saved.canSwap;
    this.canBombThisRound = saved.canBomb;
    this.updateScores();
    this.updateActionButtons();
  }

  private checkGameOver() {
    const remaining = this.tray.getRemainingTemplates();
    const canMove = this.board.canAnyPieceFit(remaining);

    if (canMove) return;

    if (this.canBombThisRound || this.canSwapThisRound) {
      this.showPowerNudgeModal();
    } else {
      this.showGameOver();
    }
  }

  private showPowerNudgeModal() {
    this.activeModal = this.add.container(240, 400);

    const backdrop = this.add.rectangle(0, 0, 480, 800, 0x000000, 0.8);
    backdrop.setInteractive();

    const card = this.add.rectangle(0, 0, 360, 310, 0x182030);
    card.setStrokeStyle(2, 0xf59e0b);

    const title = this.add
      .text(0, -110, "⚠️ NO MOVES REMAINING!", {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: "#fbbf24",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(
        0,
        -65,
        "You still have superpowers available!\nUse them to clear space or roll new pieces:",
        {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          color: "#cbd5e1",
          align: "center",
          lineSpacing: 4,
          resolution: 2,
        },
      )
      .setOrigin(0.5);

    const modalElements: Phaser.GameObjects.GameObject[] = [
      backdrop,
      card,
      title,
      desc,
    ];
    let btnY = -10;

    if (this.canBombThisRound) {
      const bombNudgeBtn = this.add.rectangle(0, btnY, 240, 40, 0xdc2626);
      bombNudgeBtn.setInteractive({ useHandCursor: true });
      const bombNudgeText = this.add
        .text(0, btnY, "💣 USE 3x3 BOMB", {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0.5);

      bombNudgeBtn.on("pointerdown", () => {
        this.activeModal?.destroy();
        this.activeModal = undefined;
        this.canBombThisRound = false;
        this.updateActionButtons();
        this.board.enableBombMode(() => {
          this.board.checkAndClearLines();
          this.persistActiveSession();
          this.checkGameOver();
        });
      });

      modalElements.push(bombNudgeBtn, bombNudgeText);
      btnY += 50;
    }

    if (this.canSwapThisRound) {
      const swapNudgeBtn = this.add.rectangle(0, btnY, 240, 40, 0x0284c7);
      swapNudgeBtn.setInteractive({ useHandCursor: true });
      const swapNudgeText = this.add
        .text(0, btnY, "🔄 SWAP FOR NEW PIECES", {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0.5);

      swapNudgeBtn.on("pointerdown", () => {
        this.activeModal?.destroy();
        this.activeModal = undefined;
        this.canSwapThisRound = false;
        this.updateActionButtons();
        this.tray.swapAllPieces();
        this.persistActiveSession();
      });

      modalElements.push(swapNudgeBtn, swapNudgeText);
      btnY += 50;
    }

    const giveUpBtn = this.add.rectangle(0, btnY, 200, 32, 0x334155);
    giveUpBtn.setInteractive({ useHandCursor: true });
    const giveUpText = this.add
      .text(0, btnY, "Accept Defeat", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#94a3b8",
        resolution: 2,
      })
      .setOrigin(0.5);

    giveUpBtn.on("pointerdown", () => {
      this.activeModal?.destroy();
      this.activeModal = undefined;
      this.showGameOver();
    });

    modalElements.push(giveUpBtn, giveUpText);
    this.activeModal.add(modalElements);
  }

  private showGameOver() {
    StorageManager.clearGameState(); // Clear match state on real loss
    this.activeModal = this.add.container(240, 400);

    const backdrop = this.add.rectangle(0, 0, 480, 800, 0x000000, 0.85);
    backdrop.setInteractive();

    const card = this.add.rectangle(0, 0, 360, 270, 0x1e2536);
    card.setStrokeStyle(2, 0xef4444);

    const title = this.add
      .text(0, -80, "GAME OVER", {
        fontFamily: FONT_FAMILY,
        fontSize: "26px",
        color: "#ef4444",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    const finalScore = this.add
      .text(0, -32, `Score: ${this.score}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    if (this.canUndo) {
      const undoModalBtn = this.add.rectangle(0, 18, 200, 40, 0x10b981);
      undoModalBtn.setInteractive({ useHandCursor: true });
      const undoModalText = this.add
        .text(0, 18, "↩ UNDO LAST MOVE", {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0.5);

      undoModalBtn.on("pointerdown", () => this.performUndo());
      this.activeModal.add([undoModalBtn, undoModalText]);
    }

    const restartBtn = this.add.rectangle(0, 78, 200, 40, 0x2563eb);
    restartBtn.setInteractive({ useHandCursor: true });
    const restartText = this.add
      .text(0, 78, "PLAY AGAIN", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    restartBtn.on("pointerdown", () => {
      this.activeModal?.destroy();
      this.activeModal = undefined;
      this.score = 0;
      this.canUndo = false;
      this.lastSnapshot = null;
      this.resetRoundPowers();
      this.updateScores();
      this.board.reset();
      this.tray.reset();
      StorageManager.clearGameState();
    });

    this.activeModal.add([
      backdrop,
      card,
      title,
      finalScore,
      restartBtn,
      restartText,
    ]);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  parent: "game-container",
  backgroundColor: "#0c1017",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 480,
    height: 800,
  },
  input: {
    activePointers: 1,
  },
  scene: [GameScene],
};

new Phaser.Game(config);
