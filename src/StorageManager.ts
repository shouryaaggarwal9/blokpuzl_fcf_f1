import { type ShapeTemplate } from "./constants";

export interface SavedGameState {
  gridData: number[][];
  trayTemplates: (ShapeTemplate | null)[];
  nextBatchTemplates: ShapeTemplate[];
  score: number;
  canSwap: boolean;
  canBomb: boolean;
}

interface StreakData {
  count: number;
  lastDateStr: string; // "YYYY-MM-DD"
}

export class StorageManager {
  private static readonly BEST_SCORE_KEY = "bp_best_score";
  private static readonly STREAK_KEY = "bp_streak";
  private static readonly GAME_STATE_KEY = "bp_active_session";

  private static getTodayStr(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // --- BEST SCORE ---
  public static getBestScore(): number {
    try {
      const val = localStorage.getItem(this.BEST_SCORE_KEY);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public static saveBestScore(score: number): void {
    try {
      localStorage.setItem(this.BEST_SCORE_KEY, score.toString());
    } catch {
      // Quota or incognito fallback
    }
  }

  // --- DAILY STREAK ---
  public static updateAndGetStreak(): number {
    try {
      const today = this.getTodayStr();
      const raw = localStorage.getItem(this.STREAK_KEY);

      if (!raw) {
        const initial: StreakData = { count: 1, lastDateStr: today };
        localStorage.setItem(this.STREAK_KEY, JSON.stringify(initial));
        return 1;
      }

      const streak: StreakData = JSON.parse(raw);

      if (streak.lastDateStr === today) {
        return streak.count;
      }

      // Check if last played was yesterday
      const last = new Date(streak.lastDateStr);
      const current = new Date(today);
      const diffDays = Math.round(
        (current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        streak.count += 1;
      } else {
        streak.count = 1;
      }

      streak.lastDateStr = today;
      localStorage.setItem(this.STREAK_KEY, JSON.stringify(streak));
      return streak.count;
    } catch {
      return 1;
    }
  }

  // --- SESSION RECOVERY ---
  public static getSavedGame(): SavedGameState | null {
    try {
      const raw = localStorage.getItem(this.GAME_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public static saveGameState(state: SavedGameState): void {
    try {
      localStorage.setItem(this.GAME_STATE_KEY, JSON.stringify(state));
    } catch {
      // Quota fallback
    }
  }

  public static clearGameState(): void {
    try {
      localStorage.removeItem(this.GAME_STATE_KEY);
    } catch {
      // Ignore
    }
  }
}
