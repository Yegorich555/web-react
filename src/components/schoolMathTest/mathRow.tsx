import { memo, useEffect, useState } from "react";
import TextControl from "@/elements/controls/text";
import { formatTerms, getIsolated, isAnswerValid, isIsolateValid, isUnwrapValid, MathTask } from "./equation";
import { emptyResult } from "./summary";
import * as styles from "./schoolMathTest.m.scss";

export type Field = "unwrap" | "isolate" | "answer";
export const allFields: Field[] = ["unwrap", "isolate", "answer"];
export const fieldTitles: Record<Field, string> = {
  unwrap: "Разкрийте скобите",
  isolate: "Оставете x от едната страна",
  answer: "Отговор",
};

/** Current state of row: it's enough to restore row after page reload */
export interface RowResult {
  task: MathTask;
  /** Current text per input */
  values: Partial<Record<Field, string>>;
  /** Last validated text per input: to avoid counting the same mistake several times */
  checked: Partial<Record<Field, string>>;
  /** true - valid, false - invalid, undefined - empty */
  states: Partial<Record<Field, boolean>>;
  /** Inputs that were invalid at least once */
  hadMistakes: Partial<Record<Field, boolean>>;
  mistakes: number;
  /** Ms spent per input (sum of all focus periods) */
  spent: Partial<Record<Field, number>>;
  /** Seconds spent per editable input; defined only when row is completed */
  times?: number[];
}

const validators: Record<Field, (task: MathTask, text: string) => boolean> = {
  unwrap: isUnwrapValid,
  isolate: isIsolateValid,
  answer: isAnswerValid,
};

/** Returns true - valid, false - invalid, undefined - empty */
export function check(task: MathTask, field: Field, text: string): boolean | undefined {
  return text ? validators[field](task, text) : undefined;
}

export type FieldState = "valid" | "invalid" | "fixed";

/** Returns value of attribute [data-state] used for styling (UI & excel-export) */
export function getStateAttr(isValid: boolean | undefined, hadMistake: boolean | undefined): FieldState | undefined {
  if (isValid == null) {
    return undefined;
  }
  if (!isValid) {
    return "invalid";
  }
  return hadMistake ? "fixed" : "valid"; // fixed: valid but was invalid before
}

/** Returns correct values: prefilled for example row & tooltips for admin */
export function getCorrectValues(task: MathTask): Record<Field, string> {
  const { left, right } = task.unwrapped;
  return {
    unwrap: `${formatTerms(left)} = ${formatTerms(right)}`,
    isolate: `x = ${formatTerms(getIsolated(task.unwrapped))}`,
    answer: `x = ${task.x}`,
  };
}

/** Input in focus: only 1 input can be focused on the page so it's shared between rows */
let focused: { task: string; field: Field; at: number } | undefined;

/** Returns results with time of focused input that isn't counted yet (it's counted on blur): use it when page is closing */
export function withFocusedSpent(results: RowResult[]): RowResult[] {
  const f = focused;
  if (!f) {
    return results;
  }
  return results.map((r) =>
    r.task.text === f.task && !r.times ? { ...r, spent: { ...r.spent, [f.field]: (r.spent[f.field] ?? 0) + Date.now() - f.at } } : r,
  );
}

interface Props {
  task: MathTask;
  /** Editable inputs: row is completed when all of them are valid; others are prefilled with correct values & readonly */
  fields: Field[];
  /** Row with prefilled values in disabled mode */
  isExample?: boolean;
  /** State to restore row (after page reload) */
  initial?: RowResult;
  /** Fired on each change; WARN: point stable function otherwise it's fired on each render */
  onChange?: (r: RowResult) => void;
  /** Show correct values in tooltips */
  isAdmin?: boolean;
}

function MathRow({ task, fields, isExample, initial, onChange, isAdmin }: Props): React.JSX.Element {
  const [first] = useState<RowResult>(() => initial ?? emptyResult(task));
  const [r, setR] = useState(first);
  // WARN: initValue must be stable otherwise control resets value on each render
  const [correct] = useState(() => getCorrectValues(task));
  const [prefilled] = useState(() => ({ ...correct, answer: String(task.x) })); // answer has prefix `x = `
  const [initValues] = useState(r.values);
  const isDone = r.times != null;
  /** Returns true if input isn't editable so it isn't validated & time isn't counted */
  const isLocked = (field: Field): boolean => isDone || !!isExample || !fields.includes(field);

  useEffect(() => {
    // skip initial state: parent already has it
    r !== first && !isExample && onChange?.(r);
  }, [r, first, isExample, onChange]);

  const onFocus = (field: Field): void => {
    if (isLocked(field)) {
      return;
    }
    focused = { task: task.text, field, at: Date.now() };
  };

  /** Store value & reset validation state while user is typing: it's shown again on focusout or Enter */
  const onInput = (field: Field, v: string | undefined): void => {
    setR((prev) => {
      const text = v ?? "";
      // WARN: $change is fired async so it can come after Enter with the same text that is already validated
      const isEdited = prev.checked[field] !== text.trim();
      return {
        ...prev,
        values: { ...prev.values, [field]: text },
        states: isEdited ? { ...prev.states, [field]: undefined } : prev.states,
      };
    });
  };

  /** Show state & count mistake & complete row if everything is valid; returns validation result */
  const validate = (field: Field, text: string, spentMs = 0): boolean | undefined => {
    const isValid = check(task, field, text);
    setR((prev) => {
      const isNewMistake = isValid === false && prev.checked[field] !== text;
      const next: RowResult = {
        ...prev,
        checked: { ...prev.checked, [field]: text },
        states: { ...prev.states, [field]: isValid },
        hadMistakes: isNewMistake ? { ...prev.hadMistakes, [field]: true } : prev.hadMistakes,
        mistakes: prev.mistakes + (isNewMistake ? 1 : 0),
        spent: spentMs ? { ...prev.spent, [field]: (prev.spent[field] ?? 0) + spentMs } : prev.spent,
      };
      if (!next.times && fields.every((f) => next.states[f])) {
        next.times = fields.map((f) => Math.round((next.spent[f] ?? 0) / 1000));
      }
      return next;
    });
    return isValid;
  };

  const onBlur = (field: Field, e: React.FocusEvent): void => {
    const f = focused;
    if (isLocked(field) || f?.task !== task.text || f.field !== field) {
      return;
    }
    focused = undefined;
    validate(field, (e.target as HTMLInputElement).value.trim(), Date.now() - f.at);
  };

  /** Go to next input on Enter if value is valid otherwise show error (since input is dirty) */
  const onKeyDown = (field: Field, e: React.KeyboardEvent): void => {
    const el = e.target as HTMLInputElement;
    if (e.key !== "Enter" || isLocked(field)) {
      return;
    }
    const text = el.value.trim();
    const isValid = check(task, field, text);
    if (isValid === false) {
      validate(field, text); // show error since input is dirty
    }
    if (!isValid) {
      return; // empty input isn't validated
    }
    e.preventDefault(); // valid value is validated on focusout
    const all = Array.from(document.querySelectorAll<HTMLInputElement>("[data-field] input"));
    const next = all.slice(all.indexOf(el) + 1).find((inp) => !inp.disabled && !inp.readOnly);
    if (next) {
      next.focus();
    } else {
      el.blur(); // the last input on the page
    }
  };

  let result = "";
  if (isExample) {
    result = "пример";
  } else if (r.times) {
    result = `грешки: ${r.mistakes}, ${r.times.join(";")} сек`; // result is shown only when row is completed
  }

  return (
    <div className={styles.row} data-done={isDone || undefined}>
      <div className={styles.task}>{task.text}</div>
      {allFields.map((f) => {
        const isPrefilled = !isExample && !fields.includes(f); // column is already learned (except several rows to practice)
        return (
          // events are bubbled from <input/> inside wup-text so div isn't interactive itself
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div
            key={f}
            data-field={f}
            data-state={getStateAttr(r.states[f], r.hadMistakes[f])}
            data-prefilled={isPrefilled || undefined}
            w-tooltip={isAdmin && !isExample && !isPrefilled ? correct[f] : undefined} // prefilled inputs already show correct values
            onFocus={() => onFocus(f)}
            onBlur={(e) => onBlur(f, e)}
            onKeyDown={(e) => onKeyDown(f, e)}
          >
            <TextControl
              name={null}
              label=""
              clearButton={false}
              // not wup-num: it declines leading `-`, ignores `,` and sets inputmode=numeric (no `-` & `.` on iOS keyboard)
              prefix={f === "answer" ? "x = " : undefined}
              initValue={isExample || isPrefilled ? prefilled[f] : initValues[f]}
              onChange={(_e, c) => onInput(f, c.$value)}
              disabled={isExample}
              readOnly={isDone || isPrefilled}
            />
          </div>
        );
      })}
      <div className={styles.result} data-result>
        {result}
      </div>
    </div>
  );
}

export default memo(MathRow);
