import { MathTask } from "./equation";
import type { RowResult } from "./mathRow";

export interface Summary {
  /** Count of completed rows */
  done: number;
  total: number;
  /** Count of completed rows without any mistake */
  withoutMistakes: number;
  /** Count of rows with at least 1 mistake */
  withMistakes: number;
  /** Total count of mistakes */
  mistakes: number;
  /** Total ms spent on all rows */
  spentMs: number;
}

/** Returns result of row that isn't touched yet */
export const emptyResult = (task: MathTask): RowResult => ({
  task,
  values: {},
  checked: {},
  states: {},
  hadMistakes: {},
  mistakes: 0,
  spent: {},
});

/** Returns text of time: `20 сек`, `34 мин 20 сек`, `1 ч 23 мин 5 сек` */
export function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  const min = Math.floor(sec / 60);
  const hours = Math.floor(min / 60);
  if (hours) {
    return `${hours} ч ${min % 60} мин ${sec % 60} сек`;
  }
  return min ? `${min} мин ${sec % 60} сек` : `${sec} сек`;
}

export function getSummary(rows: RowResult[]): Summary {
  const done = rows.filter((r) => r.times);
  return {
    done: done.length,
    total: rows.length,
    withoutMistakes: done.filter((r) => !r.mistakes).length,
    withMistakes: rows.filter((r) => r.mistakes).length,
    mistakes: rows.reduce((sum, r) => sum + r.mistakes, 0),
    spentMs: rows.reduce((sum, r) => Object.values(r.spent).reduce((s, ms) => s + ms, sum), 0),
  };
}
