import { MathTask, MAX_COMPLEXITY } from "./equation";
import { allFields, Field, getCorrectValues, RowResult } from "./mathRow";
import { emptyResult } from "./summary";

const rnd = (min: number, max: number): number => min + Math.floor(Math.random() * (max - min + 1));

/** Admin-only: returns rows filled from scratch like user did it: every editable input gets correct value after 0..2 mistakes;
 * chance of mistake is random per column and grows with complexity of task (to test planNextTest: prefilled columns & more complex tasks);
 * at least 1 input has mistake otherwise perfect result finishes the round */
export default function simulateResults(tasks: MathTask[], rowFields: Field[][]): RowResult[] {
  const rates = allFields.map(() => Math.random() * 0.6);
  const forcedRow = rnd(0, tasks.length - 1);
  const forcedField = rowFields[forcedRow][rnd(0, rowFields[forcedRow].length - 1)];
  return tasks.map((task, i) => {
    const correct = getCorrectValues(task);
    const r = emptyResult(task);
    const fields = rowFields[i];
    fields.forEach((f) => {
      const rate = rates[allFields.indexOf(f)];
      const chance = (rate * 2 * (task.complexity + 1)) / (MAX_COMPLEXITY + 1); // x0.5 for simple tasks ... x2 for the most complex
      const isForced = i === forcedRow && f === forcedField;
      const mistakes = isForced || Math.random() < chance ? rnd(1, 2) : 0;
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
