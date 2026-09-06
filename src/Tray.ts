import Phaser from "phaser";
import { SHAPES, type ShapeTemplate, CELL_SIZE, CELL_GAP } from "./constants";
import { Board } from "./Board";
import { sounds } from "./SoundManager";

export interface TraySlot {
  container: Phaser.GameObjects.Container;
  originX: number;
  originY: number;
  template: ShapeTemplate;
}

export class Tray {
  private scene: Phaser.Scene;
  private board: Board;
  public slots: (TraySlot | null)[] = [null, null, null];
  public nextBatchTemplates: ShapeTemplate[] = [];
  private nextPreviewContainer!: Phaser.GameObjects.Container;

  private onBeforePiecePlaced: () => void;
  private onPiecePlaced: (coordsCount: number) => void;
  private onGameOverCheck: () => void;
  private onRoundRefreshed: () => void;

  private readonly slotXPositions = [85, 240, 395];
  private readonly trayY = 715;

  constructor(
    scene: Phaser.Scene,
    board: Board,
    onBeforePiecePlaced: () => void,
    onPiecePlaced: (coordsCount: number) => void,
    onGameOverCheck: () => void,
    onRoundRefreshed: () => void,
  ) {
    this.scene = scene;
    this.board = board;
    this.onBeforePiecePlaced = onBeforePiecePlaced;
    this.onPiecePlaced = onPiecePlaced;
    this.onGameOverCheck = onGameOverCheck;
    this.onRoundRefreshed = onRoundRefreshed;

    this.createNextPreviewArea();
    this.prepareNextBatch();
    this.spawnBatch();
  }

  private createNextPreviewArea() {
    this.nextPreviewContainer = this.scene.add.container(240, 658);

    const bg = this.scene.add.rectangle(0, 0, 420, 24, 0x111722, 0.9);
    bg.setStrokeStyle(1, 0x1e293b);

    const label = this.scene.add
      .text(-165, 0, "NEXT ROUND:", {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "11px",
        color: "#94a3b8",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.nextPreviewContainer.add([bg, label]);
  }

  private prepareNextBatch() {
    this.nextBatchTemplates = [
      Phaser.Utils.Array.GetRandom(SHAPES),
      Phaser.Utils.Array.GetRandom(SHAPES),
      Phaser.Utils.Array.GetRandom(SHAPES),
    ];
    this.renderNextPreview();
  }

  private renderNextPreview() {
    while (this.nextPreviewContainer.length > 2) {
      this.nextPreviewContainer.removeAt(2, true);
    }

    const previewXs = [-60, 40, 140];
    const microSize = 5;
    const microGap = 1;

    for (let i = 0; i < 3; i++) {
      const t = this.nextBatchTemplates[i];
      const px = previewXs[i];

      t.coords.forEach(([r, c]) => {
        const dot = this.scene.add.rectangle(
          px + c * (microSize + microGap),
          r * (microSize + microGap) - 5,
          microSize,
          microSize,
          t.color,
        );
        this.nextPreviewContainer.add(dot);
      });
    }
  }

  public spawnBatch() {
    this.slots.forEach((s) => s?.container.destroy());
    this.slots = [null, null, null];

    for (let i = 0; i < 3; i++) {
      const template =
        this.nextBatchTemplates[i] || Phaser.Utils.Array.GetRandom(SHAPES);
      this.slots[i] = this.createPiece(
        this.slotXPositions[i],
        this.trayY,
        template,
        i,
      );
    }

    this.prepareNextBatch();
    this.onRoundRefreshed();
  }

  public swapAllPieces() {
    this.slots.forEach((s) => s?.container.destroy());
    this.slots = [null, null, null];

    for (let i = 0; i < 3; i++) {
      const template = Phaser.Utils.Array.GetRandom(SHAPES);
      this.slots[i] = this.createPiece(
        this.slotXPositions[i],
        this.trayY,
        template,
        i,
      );
    }
    this.onGameOverCheck();
  }

  public restoreBatch(templates: (ShapeTemplate | null)[]) {
    this.slots.forEach((s) => s?.container.destroy());
    this.slots = [null, null, null];
    for (let i = 0; i < 3; i++) {
      if (templates[i]) {
        this.slots[i] = this.createPiece(
          this.slotXPositions[i],
          this.trayY,
          templates[i]!,
          i,
        );
      }
    }
  }

  private createPiece(
    x: number,
    y: number,
    template: ShapeTemplate,
    slotIndex: number,
  ): TraySlot {
    const container = this.scene.add.container(x, y);
    const miniSize = 20;
    const miniGap = 3;

    let maxR = 0,
      maxC = 0;
    template.coords.forEach(([r, c]) => {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    });

    const pW = (maxC + 1) * (miniSize + miniGap) - miniGap;
    const pH = (maxR + 1) * (miniSize + miniGap) - miniGap;
    const offX = -pW / 2 + miniSize / 2;
    const offY = -pH / 2 + miniSize / 2;

    template.coords.forEach(([r, c]) => {
      const rect = this.scene.add.rectangle(
        offX + c * (miniSize + miniGap),
        offY + r * (miniSize + miniGap),
        miniSize,
        miniSize,
        template.color,
      );
      rect.setStrokeStyle(1, 0xffffff, 0.4);
      container.add(rect);
    });

    container.setSize(Math.max(60, pW + 16), Math.max(60, pH + 16));
    container.setInteractive({ useHandCursor: true, draggable: true });
    this.scene.input.setDraggable(container);

    const scaleFactor = (CELL_SIZE + CELL_GAP) / (miniSize + miniGap);

    container.on("dragstart", () => {
      if (this.board.isBombMode) return;
      sounds.playPickup();
      this.scene.children.bringToTop(container);
      this.scene.tweens.add({
        targets: container,
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        duration: 80,
      });
    });

    container.on(
      "drag",
      (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.board.isBombMode) return;
        container.x = dragX;
        container.y = dragY - 60;

        const { row, col } = this.board.getGridCoords(
          container.x,
          container.y,
          maxR,
          maxC,
        );
        this.board.showGhost(row, col, template.coords, template.color);
      },
    );

    container.on("dragend", () => {
      if (this.board.isBombMode) return;
      sounds.playDrop();
      const { row, col } = this.board.getGridCoords(
        container.x,
        container.y,
        maxR,
        maxC,
      );

      if (this.board.canPlaceAt(row, col, template.coords)) {
        this.onBeforePiecePlaced();

        this.board.placePiece(row, col, template.coords, template.color);
        container.destroy();
        this.slots[slotIndex] = null;
        this.onPiecePlaced(template.coords.length);

        if (this.slots.every((s) => s === null)) {
          this.spawnBatch();
        }

        this.onGameOverCheck();
      } else {
        this.board.clearGhost();
        this.scene.tweens.add({
          targets: container,
          x,
          y,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: "Back.easeOut",
        });
      }
    });

    return { container, originX: x, originY: y, template };
  }

  public getRemainingTemplates(): (ShapeTemplate | null)[] {
    return this.slots.map((s) => (s ? s.template : null));
  }

  public reset() {
    this.slots.forEach((s) => s?.container.destroy());
    this.slots = [null, null, null];
    this.prepareNextBatch();
    this.spawnBatch();
  }
}
