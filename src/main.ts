import Phaser from "phaser";
import { Board } from "./Board";
import { Tray } from "./Tray";
import { type ShapeTemplate } from "./constants";
import { sounds } from "./SoundManager";
import { StorageManager } from "./StorageManager";
import { ModalManager } from "./ModalManager";
import { UIManager } from "./UIManager";

interface UndoSnapshot {
  gridData: number[][];
  trayTemplates: (ShapeTemplate | null)[];
  score: number;
  canSwap: boolean;
  canBomb: boolean;
}

class GameScene extends Phaser.Scene {
  private board!: Board;
  private tray!: Tray;
  private ui!: UIManager;
  private modals!: ModalManager;

  private score = 0;
  private bestScore = 0;
  private lastSnapshot: UndoSnapshot | null = null;
  private canUndo = false;
  private canSwapThisRound = true;
  private canBombThisRound = true;

  constructor() {
    super("GameScene");
  }

  create() {
    this.bestScore = StorageManager.getBestScore();
    const streakDays = StorageManager.updateAndGetStreak();

    this.modals = new ModalManager(this);
    this.board = new Board(this);

    this.ui = new UIManager(this, this.bestScore, streakDays, {
      onUndo: () => this.performUndo(),
      onSwapPrompt: () => this.promptSwapConfirmation(),
      onBombPrompt: () => this.promptBombConfirmation(),
      onRestartPrompt: () => this.promptRestartConfirmation(),
    });

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

  private resetRoundPowers(): void {
    this.canSwapThisRound = true;
    this.canBombThisRound = true;
    this.ui.updateActionButtons(
      this.canUndo,
      this.canSwapThisRound,
      this.canBombThisRound,
    );
  }

  private captureSnapshot(): void {
    this.lastSnapshot = {
      gridData: this.board.gridData.map((row) => [...row]),
      trayTemplates: this.tray.getRemainingTemplates(),
      score: this.score,
      canSwap: this.canSwapThisRound,
      canBomb: this.canBombThisRound,
    };
    this.canUndo = true;
    this.ui.updateActionButtons(
      this.canUndo,
      this.canSwapThisRound,
      this.canBombThisRound,
    );
  }

  private performUndo(): void {
    if (!this.canUndo || !this.lastSnapshot) return;

    sounds.playClick();
    this.board.restoreGrid(this.lastSnapshot.gridData);
    this.tray.restoreBatch(this.lastSnapshot.trayTemplates);
    this.score = this.lastSnapshot.score;
    this.canSwapThisRound = this.lastSnapshot.canSwap;
    this.canBombThisRound = this.lastSnapshot.canBomb;
    this.canUndo = false;
    this.lastSnapshot = null;

    this.modals.dismiss();
    this.ui.updateScores(this.score, this.bestScore);
    this.ui.updateActionButtons(
      this.canUndo,
      this.canSwapThisRound,
      this.canBombThisRound,
    );
    this.persistActiveSession();
  }

  private handlePiecePlaced(tileCount: number): void {
    const validCount =
      typeof tileCount === "number" && !isNaN(tileCount) ? tileCount : 1;
    this.score += validCount * 10;

    const linesCleared = this.board.checkAndClearLines();
    if (linesCleared > 0) {
      const lineScore = linesCleared * 100 * linesCleared;
      this.score += lineScore;
      sounds.playLineClear(linesCleared);

      if (linesCleared === 1) {
        this.ui.spawnComboPopup(
          240,
          360,
          `+${lineScore} LINE CLEAR!`,
          "#38bdf8",
        );
      } else if (linesCleared === 2) {
        this.cameras.main.shake(140, 0.006);
        this.ui.spawnComboPopup(
          240,
          360,
          `+${lineScore} DOUBLE COMBO!`,
          "#fbbf24",
        );
      } else {
        this.cameras.main.shake(250, 0.012);
        this.ui.spawnComboPopup(
          240,
          360,
          `+${lineScore} MEGA COMBO x${linesCleared}!`,
          "#ec4899",
        );
      }
    }

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      StorageManager.saveBestScore(this.bestScore);
    }

    this.ui.updateScores(this.score, this.bestScore);
    this.persistActiveSession();
  }

  private promptRestartConfirmation(): void {
    if (this.modals.hasActiveModal()) return;
    this.modals.showConfirmation({
      title: "RESTART GAME?",
      disclaimer:
        "Starting a new game will reset your current board and score.",
      btnColor: 0xdc2626,
      btnLabel: "RESTART",
      onConfirm: () => this.resetGame(),
    });
  }

  private promptSwapConfirmation(): void {
    if (!this.canSwapThisRound || this.modals.hasActiveModal()) return;
    this.modals.showConfirmation({
      title: "SWAP ALL PIECES?",
      disclaimer:
        "Replaces all unplaced tray pieces with 3 fresh shapes.\n(1 use per round)",
      btnColor: 0x0284c7,
      btnLabel: "CONFIRM SWAP",
      onConfirm: () => {
        sounds.playClick();
        this.canSwapThisRound = false;
        this.ui.updateActionButtons(
          this.canUndo,
          this.canSwapThisRound,
          this.canBombThisRound,
        );
        this.tray.swapAllPieces();
        this.persistActiveSession();
      },
    });
  }

  private promptBombConfirmation(): void {
    if (!this.canBombThisRound || this.modals.hasActiveModal()) return;
    this.modals.showConfirmation({
      title: "ACTIVATE 3x3 BOMB?",
      disclaimer:
        "Tap any cell on the board to vaporize a 3x3 area.\n(1 use per round)",
      btnColor: 0xdc2626,
      btnLabel: "ACTIVATE BOMB",
      onConfirm: () => {
        sounds.playClick();
        this.board.enableBombMode(() => {
          this.captureSnapshot();
          this.canBombThisRound = false;
          this.ui.updateActionButtons(
            this.canUndo,
            this.canSwapThisRound,
            this.canBombThisRound,
          );
          this.board.checkAndClearLines();
          this.persistActiveSession();
          this.checkGameOver();
        });
      },
    });
  }

  private checkGameOver(): void {
    const remaining = this.tray.getRemainingTemplates();
    if (this.board.canAnyPieceFit(remaining)) return;

    if (this.canBombThisRound || this.canSwapThisRound) {
      this.modals.showPowerNudge({
        canBomb: this.canBombThisRound,
        canSwap: this.canSwapThisRound,
        onUseBomb: () => {
          this.board.enableBombMode(() => {
            this.captureSnapshot();
            this.canBombThisRound = false;
            this.ui.updateActionButtons(
              this.canUndo,
              this.canSwapThisRound,
              this.canBombThisRound,
            );
            this.board.checkAndClearLines();
            this.persistActiveSession();
            this.checkGameOver();
          });
        },
        onUseSwap: () => {
          this.canSwapThisRound = false;
          this.ui.updateActionButtons(
            this.canUndo,
            this.canSwapThisRound,
            this.canBombThisRound,
          );
          this.tray.swapAllPieces();
          this.persistActiveSession();
        },
        onAcceptDefeat: () => this.showGameOverModal(),
      });
    } else {
      this.showGameOverModal();
    }
  }

  private showGameOverModal(): void {
    StorageManager.clearGameState();
    this.modals.showGameOver({
      score: this.score,
      canUndo: this.canUndo,
      onUndo: () => this.performUndo(),
      onRestart: () => this.resetGame(),
    });
  }

  private resetGame(): void {
    this.score = 0;
    this.canUndo = false;
    this.lastSnapshot = null;
    this.resetRoundPowers();
    this.ui.updateScores(this.score, this.bestScore);
    this.ui.updateActionButtons(
      this.canUndo,
      this.canSwapThisRound,
      this.canBombThisRound,
    );
    this.board.reset();
    this.tray.reset();
    StorageManager.clearGameState();
  }

  private persistActiveSession(): void {
    StorageManager.saveGameState({
      gridData: this.board.gridData,
      trayTemplates: this.tray.getRemainingTemplates(),
      nextBatchTemplates: this.tray.nextBatchTemplates,
      score: this.score,
      canSwap: this.canSwapThisRound,
      canBomb: this.canBombThisRound,
    });
  }

  private restorePreviousSession(): void {
    const saved = StorageManager.getSavedGame();
    if (!saved) return;
    if (
      !saved.gridData.some((row) => row.some((v) => v !== 0)) &&
      saved.score === 0
    )
      return;

    this.board.restoreGrid(saved.gridData);
    this.tray.loadSavedSession(saved.trayTemplates, saved.nextBatchTemplates);
    this.score = saved.score;
    this.canSwapThisRound = saved.canSwap;
    this.canBombThisRound = saved.canBomb;
    this.ui.updateScores(this.score, this.bestScore);
    this.ui.updateActionButtons(
      this.canUndo,
      this.canSwapThisRound,
      this.canBombThisRound,
    );
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
