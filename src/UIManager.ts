import Phaser from "phaser";
import { sounds } from "./SoundManager";

const FONT_FAMILY =
  'Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export interface UICallbacks {
  onUndo: () => void;
  onSwapPrompt: () => void;
  onBombPrompt: () => void;
  onRestartPrompt: () => void;
}

export class UIManager {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private undoBtnBg!: Phaser.GameObjects.Rectangle;
  private undoBtnText!: Phaser.GameObjects.Text;
  private swapBtnBg!: Phaser.GameObjects.Rectangle;
  private swapBtnText!: Phaser.GameObjects.Text;
  private bombBtnBg!: Phaser.GameObjects.Rectangle;
  private bombBtnText!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    initialBest: number,
    streakDays: number,
    callbacks: UICallbacks,
  ) {
    this.scene = scene;
    this.createHeader(initialBest, streakDays, callbacks.onRestartPrompt);
    this.createBillboard();
    this.createActionBar(callbacks);
  }

  private createHeader(
    bestScore: number,
    streakDays: number,
    onRestart: () => void,
  ): void {
    this.scene.add.text(35, 22, "SCORE", {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      fontStyle: "bold",
      resolution: 2,
    });
    this.scoreText = this.scene.add.text(35, 36, "0", {
      fontFamily: FONT_FAMILY,
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
      resolution: 2,
    });

    this.scene.add.text(180, 22, "BEST", {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      fontStyle: "bold",
      resolution: 2,
    });
    this.bestScoreText = this.scene.add.text(180, 36, bestScore.toString(), {
      fontFamily: FONT_FAMILY,
      fontSize: "28px",
      color: "#fbbf24",
      fontStyle: "bold",
      resolution: 2,
    });

    const streakPlate = this.scene.add.rectangle(305, 42, 60, 30, 0x182030);
    streakPlate.setStrokeStyle(1, 0xf97316);
    this.scene.add
      .text(305, 42, `🔥 ${streakDays}d`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#fb923c",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    const restartBtn = this.scene.add
      .text(385, 42, "🔄", { fontSize: "20px", resolution: 2 })
      .setOrigin(0.5);
    restartBtn
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", onRestart);

    const muteBtn = this.scene.add
      .text(435, 42, "🔊", { fontSize: "20px", resolution: 2 })
      .setOrigin(0.5);
    muteBtn.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      sounds.isMuted = !sounds.isMuted;
      muteBtn.setText(sounds.isMuted ? "🔇" : "🔊");
    });
  }

  private createBillboard(): void {
    const billboard = this.scene.add.rectangle(240, 100, 420, 60, 0x141b27);
    billboard.setStrokeStyle(1.5, 0x2e3d56);

    this.scene.add
      .text(240, 89, "SPONSOR BILLBOARD", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#38bdf8",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    this.scene.add
      .text(240, 111, "Tap here to outbid this slot ($5)", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#cbd5e1",
        resolution: 2,
      })
      .setOrigin(0.5);

    billboard
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => window.open("https://outbid.lol", "_blank"));
  }

  private createActionBar(callbacks: UICallbacks): void {
    const barY = 620;

    this.undoBtnBg = this.scene.add
      .rectangle(105, barY, 95, 34, 0x161e2e)
      .setStrokeStyle(1.5, 0x223049);
    this.undoBtnText = this.scene.add
      .text(105, barY, "↩ UNDO", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#64748b",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.undoBtnBg
      .setInteractive({ useHandCursor: false })
      .on("pointerdown", callbacks.onUndo);

    this.swapBtnBg = this.scene.add
      .rectangle(235, barY, 125, 34, 0x1e293b)
      .setStrokeStyle(1.5, 0x334155);
    this.swapBtnText = this.scene.add
      .text(235, barY, "🔄 SWAP (1/1)", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#38bdf8",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.swapBtnBg
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", callbacks.onSwapPrompt);

    this.bombBtnBg = this.scene.add
      .rectangle(375, barY, 125, 34, 0x1e293b)
      .setStrokeStyle(1.5, 0x334155);
    this.bombBtnText = this.scene.add
      .text(375, barY, "💣 BOMB (1/1)", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#f87171",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.bombBtnBg
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", callbacks.onBombPrompt);
  }

  public updateScores(score: number, bestScore: number): void {
    this.scoreText.setText(score.toString());
    this.bestScoreText.setText(bestScore.toString());
  }

  public updateActionButtons(
    canUndo: boolean,
    canSwap: boolean,
    canBomb: boolean,
  ): void {
    if (canUndo) {
      this.undoBtnBg.setFillStyle(0x2563eb).setStrokeStyle(1.5, 0x60a5fa);
      this.undoBtnText.setColor("#ffffff");
    } else {
      this.undoBtnBg.setFillStyle(0x161e2e).setStrokeStyle(1.5, 0x223049);
      this.undoBtnText.setColor("#64748b");
    }

    if (canSwap) {
      this.swapBtnBg.setFillStyle(0x075985).setStrokeStyle(1.5, 0x38bdf8);
      this.swapBtnText.setText("🔄 SWAP (1/1)").setColor("#ffffff");
    } else {
      this.swapBtnBg.setFillStyle(0x161e2e).setStrokeStyle(1.5, 0x223049);
      this.swapBtnText.setText("🔄 SWAP (0/1)").setColor("#64748b");
    }

    if (canBomb) {
      this.bombBtnBg.setFillStyle(0x991b1b).setStrokeStyle(1.5, 0xef4444);
      this.bombBtnText.setText("💣 BOMB (1/1)").setColor("#ffffff");
    } else {
      this.bombBtnBg.setFillStyle(0x161e2e).setStrokeStyle(1.5, 0x223049);
      this.bombBtnText.setText("💣 BOMB (0/1)").setColor("#64748b");
    }
  }

  public spawnComboPopup(
    x: number,
    y: number,
    text: string,
    color: string,
  ): void {
    const combo = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5);

    this.scene.children.bringToTop(combo);
    this.scene.tweens.add({
      targets: combo,
      y: y - 55,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: 750,
      ease: "Back.easeOut",
      onComplete: () => combo.destroy(),
    });
  }
}
