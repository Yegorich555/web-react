import { generateTask, MathTask, MAX_COMPLEXITY } from "./equation";
import { allFields, Field, RowResult } from "./mathRow";
import type { SavedState } from "./storage";

/** Count of generated rows (example row isn't included) */
export const ROWS_COUNT = 10;
/** Max level of the test: every next level has more complex tasks */
export const MAX_LEVEL = 5;
/** Part of rows solved without mistakes in a column to consider it as learned: such column is prefilled in the next test
 * except count of rows with mistakes (see TestPlan.retry) */
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
  /** Count of editable inputs (in random rows) per learned column: so user continues to practice it as many times as it was failed */
  retry: Partial<Record<Field, number>>;
  /** Weights of rows per task complexity */
  weights: number[];
}

export interface Test {
  /** Unique id to re-mount rows on refresh */
  id: number;
  /** 1..MAX_LEVEL */
  level: number;
  /** Sorted by complexity */
  tasks: MathTask[];
  /** Editable inputs per row: others are prefilled with correct values & readonly */
  fields: Field[][];
}

/** Returns plan with all columns & default weights for pointed level */
export const levelPlan = (level: number): TestPlan => ({ level, fields: allFields, retry: {}, weights: levelWeights[level - 1] });

/** Returns plan to generate the same test with new tasks */
export function samePlan(test: Test): TestPlan {
  const fields = allFields.filter((f) => test.fields.every((rf) => rf.includes(f)));
  const retry: TestPlan["retry"] = {};
  allFields.forEach((f) => {
    const count = test.fields.filter((rf) => rf.includes(f)).length;
    count && !fields.includes(f) && (retry[f] = count);
  });
  return {
    level: test.level,
    fields,
    retry,
    weights: Array.from({ length: MAX_COMPLEXITY + 1 }, (_, c) => test.tasks.filter((t) => t.complexity === c).length),
  };
}

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

/** Returns pointed count of random distinct indexes in range 0..length-1 */
function randomIndexes(count: number, length: number): number[] {
  const all = Array.from({ length }, (_, i) => i);
  for (let i = all.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
}

let lastId = 0;
export function generateTest({ level, fields, retry, weights }: TestPlan): Test {
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
  const retryRows = allFields.map((f) => randomIndexes(retry[f] ?? 0, tasks.length));
  const rowFields = tasks.map((_, i) => allFields.filter((f, k) => fields.includes(f) || retryRows[k].includes(i)));
  return { id: ++lastId, level, tasks, fields: rowFields };
}

/** Returns the same test with new id: to re-mount rows with new initial values */
export const remountTest = (test: Test): Test => ({ ...test, id: ++lastId });

/** Returns test restored from storage (after page reload) */
export const restoreTest = ({ level, fields, tasks }: SavedState): Test => ({ id: ++lastId, level, tasks, fields });

/** Returns true if user filled input without any mistake */
const isCorrect = (r: RowResult, f: Field): boolean => r.states[f] === true && !r.hadMistakes[f];

/** Returns true if every row is solved without mistakes: it doesn't make sense to level up so the round is finished */
export const isPerfect = (results: RowResult[]): boolean => results.every((r) => !!r.times && !r.mistakes);

/** Returns plan of the next test (the next level; the last level or perfect result => new round from the 1st level) based on mistakes of the current one:
 * * learned columns are prefilled (readonly) so user focuses on columns with mistakes; all columns are learned => all of them are editable again
 * * learned column keeps editable inputs (in random rows) as many as rows with mistakes in it: `9 of 10 are correct => 1 editable input`
 * * more tasks of complexity where user made mistakes: `first rows are ok but last ones with mistakes => more complex tasks` */
export function planNextTest(test: Test, results: RowResult[]): TestPlan {
  if (test.level === MAX_LEVEL || isPerfect(results)) {
    return levelPlan(1);
  }
  const level = test.level + 1;
  // prefilled inputs are already learned so only editable ones can be failed
  const fails = allFields.map((f) => results.filter((r, i) => test.fields[i].includes(f) && !isCorrect(r, f)).length);
  const learned = allFields.filter((_, k) => results.length - fails[k] >= results.length * PASS_RATE);
  const isAllLearned = learned.length === allFields.length;
  const fields = isAllLearned ? allFields : allFields.filter((f) => !learned.includes(f));
  const retry: TestPlan["retry"] = {};
  if (!isAllLearned) {
    allFields.forEach((f, k) => {
      learned.includes(f) && fails[k] && (retry[f] = fails[k]);
    });
  }
  const weights = levelWeights[level - 1].map((w, c) => {
    const rows = results.filter((r) => r.task.complexity === c);
    if (!rows.length) {
      return w;
    }
    const failed = rows.filter((r) => r.mistakes || !r.times).length;
    return w * (0.5 + (1.5 * failed) / rows.length); // x0.5 if everything is correct ... x2 if every row has mistakes
  });
  return { level, fields, retry, weights };
}
