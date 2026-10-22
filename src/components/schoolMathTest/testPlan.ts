import { generateTask, MathTask, MAX_COMPLEXITY } from "./equation";
import { allFields, Field, RowResult } from "./mathRow";
import type { SavedState } from "./storage";

/** Count of generated rows (example row isn't included) */
export const ROWS_COUNT = 10;
/** Max level of the test: every next level has more complex tasks */
export const MAX_LEVEL = 5;
/** Part of rows solved without mistakes in a column to consider it as learned: such column is prefilled in the next test */
const PASS_RATE = 0.85;

/** Weights of rows per task complexity (0..MAX_COMPLEXITY) for every level: every next level has more complex tasks */
const levelWeights: number[][] = [
  [3, 3, 2, 2],
  [1, 3, 3, 3],
  [0, 2, 4, 4],
  [0, 1, 3, 6],
  [0, 0, 2, 8],
];

/** Settings to generate the test */
export interface TestPlan {
  /** 1..MAX_LEVEL */
  level: number;
  /** Editable columns: others are prefilled with correct values & readonly since user already learned them */
  fields: Field[];
  /** Weights of rows per task complexity */
  weights: number[];
}

export interface Test extends Omit<TestPlan, "weights"> {
  /** Unique id to re-mount rows on refresh */
  id: number;
  /** Sorted by complexity */
  tasks: MathTask[];
}

/** Returns plan with all columns & default weights for pointed level */
export const levelPlan = (level: number): TestPlan => ({ level, fields: allFields, weights: levelWeights[level - 1] });

/** Returns plan to generate the same test with new tasks */
export const samePlan = (test: Test): TestPlan => ({
  level: test.level,
  fields: test.fields,
  weights: Array.from({ length: MAX_COMPLEXITY + 1 }, (_, c) => test.tasks.filter((t) => t.complexity === c).length),
});

/** Returns integer counts proportional to weights with pointed sum */
function distribute(weights: number[], total: number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  const exact = weights.map((w) => (w * total) / sum);
  const counts = exact.map((v) => Math.floor(v));
  // the rest goes to items with the largest fractional parts
  const order = exact.map((_, i) => i).sort((a, b) => exact[b] - counts[b] - (exact[a] - counts[a]));
  const rest = total - counts.reduce((s, n) => s + n, 0);
  order.slice(0, rest).forEach((i) => ++counts[i]);
  return counts;
}

let lastId = 0;
export function generateTest({ level, fields, weights }: TestPlan): Test {
  const texts = new Set<string>(); // avoid duplicated tasks
  const tasks = distribute(weights, ROWS_COUNT).flatMap((count, complexity) =>
    Array.from({ length: count }, () => {
      let t: MathTask;
      do {
        t = generateTask(complexity);
      } while (texts.has(t.text));
      texts.add(t.text);
      return t;
    }),
  );
  return { id: ++lastId, level, fields, tasks };
}

/** Returns the same test with new id: to re-mount rows with new initial values */
export const remountTest = (test: Test): Test => ({ ...test, id: ++lastId });

/** Returns test restored from storage (after page reload) */
export const restoreTest = ({ level, fields, tasks }: SavedState): Test => ({ id: ++lastId, level, fields, tasks });

/** Returns true if user filled input without any mistake */
const isCorrect = (r: RowResult, f: Field): boolean => r.states[f] === true && !r.hadMistakes[f];

/** Returns plan of the next test (the next level; the last level => new round from the 1st level) based on mistakes of the current one:
 * * learned columns are prefilled (readonly) so user focuses on columns with mistakes; all columns are learned => all of them are editable again
 * * more tasks of complexity where user made mistakes: `first rows are ok but last ones with mistakes => more complex tasks` */
export function planNextTest(test: Test, results: RowResult[]): TestPlan {
  if (test.level === MAX_LEVEL) {
    return levelPlan(1);
  }
  const level = test.level + 1;
  const learned = test.fields.filter((f) => results.filter((r) => isCorrect(r, f)).length >= results.length * PASS_RATE);
  const fields = learned.length === test.fields.length ? allFields : test.fields.filter((f) => !learned.includes(f));
  const weights = levelWeights[level - 1].map((w, c) => {
    const rows = results.filter((r) => r.task.complexity === c);
    if (!rows.length) {
      return w;
    }
    const failed = rows.filter((r) => r.mistakes || !r.times).length;
    return w * (0.5 + (1.5 * failed) / rows.length); // x0.5 if everything is correct ... x2 if every row has mistakes
  });
  return { level, fields, weights };
}
