import Phaser from "phaser";

const FONT_FAMILY =
  'Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export class ModalManager {
  private scene: Phaser.Scene;
  private activeModal?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public hasActiveModal(): boolean {
    return !!this.activeModal;
  }

  public dismiss(): void {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = undefined;
    }
  }

  public showConfirmation(opts: {
    title: string;
    disclaimer: string;
    btnColor: number;
    btnLabel: string;
    onConfirm: () => void;
  }): void {
    this.dismiss();
    this.activeModal = this.scene.add.container(240, 400);

    const backdrop = this.scene.add
      .rectangle(0, 0, 480, 800, 0x000000, 0.75)
      .setInteractive();
    const card = this.scene.add.rectangle(0, 0, 360, 230, 0x182030);
    card.setStrokeStyle(1.5, 0x38bdf8);

    const title = this.scene.add
      .text(0, -60, opts.title, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    const desc = this.scene.add
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

    const cancelBtn = this.scene.add
      .rectangle(-80, 60, 120, 38, 0x334155)
      .setInteractive({ useHandCursor: true });
    const cancelText = this.scene.add
      .text(-80, 60, "CANCEL", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    cancelBtn.on("pointerdown", () => this.dismiss());

    const confirmBtn = this.scene.add
      .rectangle(80, 60, 140, 38, opts.btnColor)
      .setInteractive({ useHandCursor: true });
    const confirmText = this.scene.add
      .text(80, 60, opts.btnLabel, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    confirmBtn.on("pointerdown", () => {
      this.dismiss();
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

  public showPowerNudge(opts: {
    canBomb: boolean;
    canSwap: boolean;
    onUseBomb: () => void;
    onUseSwap: () => void;
    onAcceptDefeat: () => void;
  }): void {
    this.dismiss();
    this.activeModal = this.scene.add.container(240, 400);

    const backdrop = this.scene.add
      .rectangle(0, 0, 480, 800, 0x000000, 0.8)
      .setInteractive();
    const card = this.scene.add.rectangle(0, 0, 360, 310, 0x182030);
    card.setStrokeStyle(2, 0xf59e0b);

    const title = this.scene.add
      .text(0, -110, "⚠️ NO MOVES REMAINING!", {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: "#fbbf24",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    const desc = this.scene.add
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

    if (opts.canBomb) {
      const bombBtn = this.scene.add
        .rectangle(0, btnY, 240, 40, 0xdc2626)
        .setInteractive({ useHandCursor: true });
      const bombText = this.scene.add
        .text(0, btnY, "💣 USE 3x3 BOMB", {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0.5);
      bombBtn.on("pointerdown", () => {
        this.dismiss();
        opts.onUseBomb();
      });
      modalElements.push(bombBtn, bombText);
      btnY += 50;
    }

    if (opts.canSwap) {
      const swapBtn = this.scene.add
        .rectangle(0, btnY, 240, 40, 0x0284c7)
        .setInteractive({ useHandCursor: true });
      const swapText = this.scene.add
        .text(0, btnY, "🔄 SWAP FOR NEW PIECES", {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0.5);
      swapBtn.on("pointerdown", () => {
        this.dismiss();
        opts.onUseSwap();
      });
      modalElements.push(swapBtn, swapText);
      btnY += 50;
    }

    const giveUpBtn = this.scene.add
      .rectangle(0, btnY, 200, 32, 0x334155)
      .setInteractive({ useHandCursor: true });
    const giveUpText = this.scene.add
      .text(0, btnY, "Accept Defeat", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#94a3b8",
        resolution: 2,
      })
      .setOrigin(0.5);
    giveUpBtn.on("pointerdown", () => {
      this.dismiss();
      opts.onAcceptDefeat();
    });

    modalElements.push(giveUpBtn, giveUpText);
    this.activeModal.add(modalElements);
  }

  public showGameOver(opts: {
    score: number;
    canUndo: boolean;
    onUndo: () => void;
    onRestart: () => void;
  }): void {
    this.dismiss();
    this.activeModal = this.scene.add.container(240, 400);

    const backdrop = this.scene.add
      .rectangle(0, 0, 480, 800, 0x000000, 0.85)
      .setInteractive();
    const card = this.scene.add.rectangle(0, 0, 360, 270, 0x1e2536);
    card.setStrokeStyle(2, 0xef4444);

    const title = this.scene.add
      .text(0, -80, "GAME OVER", {
        fontFamily: FONT_FAMILY,
        fontSize: "26px",
        color: "#ef4444",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    const finalScore = this.scene.add
      .text(0, -32, `Score: ${opts.score}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    if (opts.canUndo) {
      const undoBtn = this.scene.add
        .rectangle(0, 18, 200, 40, 0x10b981)
        .setInteractive({ useHandCursor: true });
      const undoText = this.scene.add
        .text(0, 18, "↩ UNDO LAST MOVE", {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0.5);
      undoBtn.on("pointerdown", () => {
        this.dismiss();
        opts.onUndo();
      });
      this.activeModal.add([undoBtn, undoText]);
    }

    const restartBtn = this.scene.add
      .rectangle(0, 78, 200, 40, 0x2563eb)
      .setInteractive({ useHandCursor: true });
    const restartText = this.scene.add
      .text(0, 78, "PLAY AGAIN", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    restartBtn.on("pointerdown", () => {
      this.dismiss();
      opts.onRestart();
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
