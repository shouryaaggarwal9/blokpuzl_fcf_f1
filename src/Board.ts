import Phaser from "phaser";
import {
  GRID_SIZE,
  CELL_SIZE,
  CELL_GAP,
  BOARD_TOP_Y,
  type ShapeTemplate,
} from "./constants";
import { sounds } from "./SoundManager";

export class Board {
  private scene: Phaser.Scene;
  public gridData: number[][] = [];
  public gridCells: Phaser.GameObjects.Rectangle[][] = [];
  private ghostCells: Phaser.GameObjects.Rectangle[] = [];
  private bombHoverCells: Phaser.GameObjects.Rectangle[] = [];
  public startX = 0;
  public startY = 0;
  public step = CELL_SIZE + CELL_GAP;

  public isBombMode = false;
  private onBombExecuted?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initGridData();
    this.renderBoard();
  }

  private initGridData() {
    this.gridData = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.gridData[r] = new Array(GRID_SIZE).fill(0);
    }
  }

  private renderBoard() {
    this.gridCells = [];
    const totalBoardSpan = GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP;
    this.startX = (480 - totalBoardSpan) / 2 + CELL_SIZE / 2;
    this.startY = BOARD_TOP_Y + CELL_SIZE / 2;

    const boardBg = this.scene.add.rectangle(
      240,
      BOARD_TOP_Y + totalBoardSpan / 2 - CELL_GAP / 2,
      totalBoardSpan + 16,
      totalBoardSpan + 16,
      0x131924,
    );
    boardBg.setStrokeStyle(1, 0x222f44);

    for (let r = 0; r < GRID_SIZE; r++) {
      this.gridCells[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = this.startX + c * this.step;
        const y = this.startY + r * this.step;

        const cell = this.scene.add.rectangle(
          x,
          y,
          CELL_SIZE,
          CELL_SIZE,
          0x1c2536,
        );
        cell.setStrokeStyle(1, 0x27354a);
        cell.setInteractive({ useHandCursor: true });

        // Cell listeners for Bomb power
        cell.on("pointermove", () => {
          if (this.isBombMode) this.showBombReticle(r, c);
        });

        cell.on("pointerdown", () => {
          if (this.isBombMode) {
            this.detonateBomb(r, c);
          }
        });

        this.gridCells[r][c] = cell;
      }
    }
  }

  public enableBombMode(onComplete: () => void) {
    this.isBombMode = true;
    this.onBombExecuted = onComplete;
  }

  public disableBombMode() {
    this.isBombMode = false;
    this.clearBombReticle();
  }

  private showBombReticle(centerR: number, centerC: number) {
    this.clearBombReticle();

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const tr = centerR + dr;
        const tc = centerC + dc;
        if (tr >= 0 && tr < GRID_SIZE && tc >= 0 && tc < GRID_SIZE) {
          const cell = this.gridCells[tr][tc];
          const reticle = this.scene.add.rectangle(
            cell.x,
            cell.y,
            CELL_SIZE,
            CELL_SIZE,
            0xef4444,
            0.45,
          );
          reticle.setStrokeStyle(2, 0xfca5a5);
          this.bombHoverCells.push(reticle);
        }
      }
    }
  }

  private clearBombReticle() {
    this.bombHoverCells.forEach((c) => c.destroy());
    this.bombHoverCells = [];
  }

  private detonateBomb(centerR: number, centerC: number) {
    this.clearBombReticle();
    this.isBombMode = false;

    sounds.playBombExplosion();

    // Flash bomb center
    const cx = this.startX + centerC * this.step;
    const cy = this.startY + centerR * this.step;
    const shockwave = this.scene.add.circle(cx, cy, 10, 0xffffff, 0.8);

    this.scene.tweens.add({
      targets: shockwave,
      radius: 90,
      alpha: 0,
      duration: 300,
      onComplete: () => shockwave.destroy(),
    });

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const tr = centerR + dr;
        const tc = centerC + dc;
        if (tr >= 0 && tr < GRID_SIZE && tc >= 0 && tc < GRID_SIZE) {
          this.gridData[tr][tc] = 0;
          const cell = this.gridCells[tr][tc];

          this.scene.tweens.add({
            targets: cell,
            scaleX: 0.05,
            scaleY: 0.05,
            fillColor: 0xef4444,
            duration: 180,
            yoyo: true,
            onComplete: () => {
              cell.setScale(1);
              cell.setFillStyle(0x1c2536);
              cell.setStrokeStyle(1, 0x27354a);
            },
          });
        }
      }
    }

    if (this.onBombExecuted) this.onBombExecuted();
  }

  public getGridCoords(
    worldX: number,
    worldY: number,
    maxR: number,
    maxC: number,
  ): { row: number; col: number } {
    const scaledW = (maxC + 1) * this.step - CELL_GAP;
    const scaledH = (maxR + 1) * this.step - CELL_GAP;
    const topLeftX = worldX - scaledW / 2 + CELL_SIZE / 2;
    const topLeftY = worldY - scaledH / 2 + CELL_SIZE / 2;

    return {
      col: Math.round((topLeftX - this.startX) / this.step),
      row: Math.round((topLeftY - this.startY) / this.step),
    };
  }

  public canPlaceAt(
    row: number,
    col: number,
    coords: [number, number][],
  ): boolean {
    for (const [r, c] of coords) {
      const tr = row + r;
      const tc = col + c;
      if (
        tr < 0 ||
        tr >= GRID_SIZE ||
        tc < 0 ||
        tc >= GRID_SIZE ||
        this.gridData[tr][tc] !== 0
      ) {
        return false;
      }
    }
    return true;
  }

  public showGhost(
    row: number,
    col: number,
    coords: [number, number][],
    color: number,
  ) {
    this.clearGhost();
    if (this.isBombMode || !this.canPlaceAt(row, col, coords)) return;

    for (const [r, c] of coords) {
      const tr = row + r;
      const tc = col + c;
      const cell = this.gridCells[tr][tc];

      const ghost = this.scene.add.rectangle(
        cell.x,
        cell.y,
        CELL_SIZE,
        CELL_SIZE,
        color,
        0.35,
      );
      ghost.setStrokeStyle(1.5, 0xffffff, 0.7);
      this.ghostCells.push(ghost);
    }
  }

  public clearGhost() {
    this.ghostCells.forEach((g) => g.destroy());
    this.ghostCells = [];
  }

  public placePiece(
    row: number,
    col: number,
    coords: [number, number][],
    color: number,
  ) {
    this.clearGhost();
    coords.forEach(([r, c]) => {
      const tr = row + r;
      const tc = col + c;
      this.gridData[tr][tc] = color;
      this.gridCells[tr][tc].setFillStyle(color);
      this.gridCells[tr][tc].setStrokeStyle(1.5, 0xffffff, 0.4);
    });
  }

  public checkAndClearLines(): number {
    const fullRows: number[] = [];
    const fullCols: number[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      if (this.gridData[r].every((v) => v !== 0)) fullRows.push(r);
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (this.gridData[r][c] === 0) {
          full = false;
          break;
        }
      }
      if (full) fullCols.push(c);
    }

    const totalLines = fullRows.length + fullCols.length;
    if (totalLines === 0) return 0;

    const cellsToClear = new Set<string>();
    fullRows.forEach((r) => {
      for (let c = 0; c < GRID_SIZE; c++) cellsToClear.add(`${r},${c}`);
    });
    fullCols.forEach((c) => {
      for (let r = 0; r < GRID_SIZE; r++) cellsToClear.add(`${r},${c}`);
    });

    cellsToClear.forEach((coordStr) => {
      const [r, c] = coordStr.split(",").map(Number);
      this.gridData[r][c] = 0;
      const cell = this.gridCells[r][c];

      this.scene.tweens.add({
        targets: cell,
        scaleX: 0.1,
        scaleY: 0.1,
        fillColor: 0xffffff,
        duration: 150,
        yoyo: true,
        onComplete: () => {
          cell.setScale(1);
          cell.setFillStyle(0x1c2536);
          cell.setStrokeStyle(1, 0x27354a);
        },
      });
    });

    return totalLines;
  }

  public canAnyPieceFit(pieces: (ShapeTemplate | null)[]): boolean {
    for (const piece of pieces) {
      if (!piece) continue;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.canPlaceAt(r, c, piece.coords)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public restoreGrid(snapshot: number[][]) {
    this.clearGhost();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = snapshot[r][c];
        this.gridData[r][c] = val;
        if (val === 0) {
          this.gridCells[r][c].setFillStyle(0x1c2536);
          this.gridCells[r][c].setStrokeStyle(1, 0x27354a);
        } else {
          this.gridCells[r][c].setFillStyle(val);
          this.gridCells[r][c].setStrokeStyle(1.5, 0xffffff, 0.4);
        }
      }
    }
  }

  public reset() {
    this.clearGhost();
    this.clearBombReticle();
    this.isBombMode = false;
    this.initGridData();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.gridCells[r][c].setFillStyle(0x1c2536);
        this.gridCells[r][c].setStrokeStyle(1, 0x27354a);
      }
    }
  }
}
