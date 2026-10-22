import { MathTask, MAX_COMPLEXITY } from "./equation";
import { Field, getCorrectValues, RowResult } from "./mathRow";
import { emptyResult } from "./summary";

const rnd = (min: number, max: number): number => min + Math.floor(Math.random() * (max - min + 1));

/** Admin-only: returns rows filled from scratch like user did it: every editable input gets correct value after 0..2 mistakes;
 * chance of mistake is random per column and grows with complexity of task (to test planNextTest: prefilled columns & more complex tasks) */
export default function simulateResults(tasks: MathTask[], fields: Field[]): RowResult[] {
  const rates = fields.map(() => Math.random() * 0.6);
  return tasks.map((task) => {
    const correct = getCorrectValues(task);
    const r = emptyResult(task);
    fields.forEach((f, i) => {
      const chance = (rates[i] * 2 * (task.complexity + 1)) / (MAX_COMPLEXITY + 1); // x0.5 for simple tasks ... x2 for the most complex
      const mistakes = Math.random() < chance ? rnd(1, 2) : 0;
      const v = f === "answer" ? String(task.x) : correct[f]; // answer input has prefix `x = `
      r.values[f] = v;
      r.checked[f] = v;
      r.states[f] = true;
      r.hadMistakes[f] = mistakes > 0 || undefined;
      r.mistakes += mistakes;
      r.spent[f] = rnd(3, 20) * 1000 * (mistakes + 1);
    });
    r.times = fields.map((f) => Math.round((r.spent[f] ?? 0) / 1000));
    return r;
  });
}
