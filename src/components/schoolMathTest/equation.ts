/** Member of linear expression: number or `x` with coefficient */
export interface Term {
  /** Signed value: number itself or coefficient of `x` */
  v: number;
  isX?: boolean;
}

export interface Equation {
  left: Term[];
  right: Term[];
}

export interface MathTask {
  /** Task text like `23 - (x + 5) = 12` */
  text: string;
  /** Correct root */
  x: number;
  /** Expected equation after unwrapping brackets: `23 - x - 5 = 12` */
  unwrapped: Equation;
}

/** Returns text of expression: `23 - x - 5` */
export function formatTerms(terms: Term[]): string {
  return terms
    .map((t, i) => {
      const abs = t.isX ? "x" : Math.abs(t.v);
      if (i === 0) {
        return t.v < 0 ? `-${abs}` : `${abs}`;
      }
      return `${t.v < 0 ? "-" : "+"} ${abs}`;
    })
    .join(" ");
}

/** Part of equation side: number OR brackets with terms */
interface Group {
  /** Sign before group */
  sign: number;
  /** Single positive number OR terms inside brackets */
  terms: Term[];
  isBracket?: boolean;
}

/** Returns text of side: `23 - (x + 5)` */
function formatGroups(groups: Group[]): string {
  return groups
    .map((g, i) => {
      const s = g.isBracket ? `(${formatTerms(g.terms)})` : formatTerms(g.terms);
      if (i === 0) {
        return g.sign < 0 ? `-${s}` : s;
      }
      return `${g.sign < 0 ? "-" : "+"} ${s}`;
    })
    .join(" ");
}

/** Returns terms without brackets: `23 - (x + 5)` => `23 - x - 5` */
const unwrap = (groups: Group[]): Term[] => groups.flatMap((g) => g.terms.map((t) => ({ ...t, v: t.v * g.sign })));

const evaluate = (terms: Term[], x: number): number => terms.reduce((sum, t) => sum + (t.isX ? t.v * x : t.v), 0);

/** Returns group with single number */
const num = (v: number): Group => ({ sign: v < 0 ? -1 : 1, terms: [{ v: Math.abs(v) }] });

function createTask(left: Group[], right: Group[], x: number): MathTask {
  return {
    text: `${formatGroups(left)} = ${formatGroups(right)}`,
    x,
    unwrapped: { left: unwrap(left), right: unwrap(right) },
  };
}

/** Example for end-user (prefilled first row): `23 - (x + 5) = 12` */
export const EXAMPLE_TASK = createTask([num(23), { sign: -1, terms: [{ v: 1, isX: true }, { v: 5 }], isBracket: true }], [num(12)], 6);

const rnd = (min: number, max: number): number => min + Math.floor(Math.random() * (max - min + 1));
/** Returns -1 with pointed chance otherwise 1 */
const randomSign = (minusChance: number): number => (Math.random() < minusChance ? -1 : 1);

/** Returns new array with random order of items */
const shuffle = <T>(arr: T[]): T[] =>
  arr
    .map((v) => ({ v, k: Math.random() }))
    .sort((p1, p2) => p1.k - p2.k)
    .map((p) => p.v);

/** Returns brackets without x: `(12 - 4)` */
const numBracket = (): Group => ({
  sign: randomSign(0.7),
  terms: [{ v: rnd(10, 30) }, { v: rnd(2, 9) * randomSign(0.5) }], // 1 digit for 2nd number otherwise equation doesn't fit into inputs
  isBracket: true,
});

/** Max level of complexity for generateTask() */
export const MAX_LEVEL = 3;

/** Returns random task with positive integer root and different numbers
 * @param level complexity where every next level adds new feature:
 * * 0: like example but numbers <= 20: `17 - (x + 5) = 8`, `14 - (5 - x) = 12`
 * * 1: any order & sides: `(x - 7) + 30 = 20`, `-(14 - x) + 30 = 21`, `12 = 23 - (x + 5)`
 * * 2: 3 terms in brackets: `12 = 40 - (x + 8 - 3)`
 * * 3: extra brackets without x: `(x - 7) + 30 - (12 - 4) = 20`, `23 - (x + 5) = 30 - (12 - 4)`
 * @tutorial rules
 * * each side contains max 1 number outside brackets: `15 - 8 + (x + 19)` is useless for testing
 * * only 1 extra term per level: otherwise equation doesn't fit into inputs */
export function generateTask(level = MAX_LEVEL): MathTask {
  for (;;) {
    const isSimple = level === 0;
    const maxNum = isSimple ? 20 : 99; // simple tasks have small numbers
    const x = isSimple ? rnd(1, 12) : rnd(1, 40); // WARN: tied with mask of answer
    const isNumBracketX = level === 3 && Math.random() < 0.5;
    const isNumBracketOther = level === 3 && !isNumBracketX;

    // brackets with x: (x ± b), (b ± x), (x ± b ± d), (b ± x ± d), (b ± d ± x)
    const inner: Term[] = Array.from({ length: level === 2 ? 3 : 2 }, (_, i) => ({
      v: rnd(2, isSimple ? 9 : 20) * (i ? randomSign(0.5) : 1),
    }));
    const xi = rnd(0, inner.length - 1);
    inner[xi] = { v: xi ? randomSign(0.5) : 1, isX: true };
    const bracket: Group = { sign: randomSign(0.7), terms: inner, isBracket: true }; // minus before brackets is the main point of the test
    const balancer = num(0); // value is calculated below to get the pointed root
    const xSide = level === 0 ? [balancer, bracket] : shuffle(isNumBracketX ? [bracket, balancer, numBracket()] : [bracket, balancer]);
    if (xSide[0].isBracket && xSide[0].sign < 0 && Math.random() < 0.5) {
      xSide[0].sign = 1; // `-(x + 5) + 23` is allowed but less often
    }
    const other = isNumBracketOther ? [num(rnd(10, 60)), { ...numBracket(), sign: -1 }] : [num(rnd(1, isSimple ? 15 : 60))];
    const isSwapped = level > 0 && Math.random() < (level === 1 ? 0.4 : 0.2);

    const target = evaluate(unwrap(other), x);
    const v = target - evaluate(unwrap(xSide.filter((g) => g !== balancer)), x);
    Object.assign(balancer, num(v));

    const numbers = [...unwrap(xSide), ...unwrap(other)].filter((t) => !t.isX).map((t) => Math.abs(t.v));
    if (
      target > 0 &&
      Math.abs(v) >= 2 &&
      numbers.every((n) => n <= maxNum) &&
      (xSide[0].isBracket || xSide[0].sign > 0) && // avoid `-23 + ...`
      new Set(numbers).size === numbers.length && // avoid the same numbers: they can confuse
      !(level === 1 && !isSwapped && xSide[0] === balancer) // otherwise it's the same as level 0
    ) {
      return isSwapped ? createTask(other, xSide, x) : createTask(xSide, other, x);
    }
  }
}

/** Returns numbers of `x = ...` that must be got by moving terms between sides: `23 - x - 5 = 12` => `x = 23 - 5 - 12` */
export function getIsolated(eq: Equation): Term[] {
  // c*x + L = R  =>  x = c*(R - L) since c is 1 or -1
  const isXLeft = eq.left.some((t) => t.isX);
  const xSide = isXLeft ? eq.left : eq.right;
  const other = isXLeft ? eq.right : eq.left;
  const c = xSide.find((t) => t.isX)!.v;
  const r = [...xSide.filter((t) => !t.isX).map((t) => ({ v: -t.v * c })), ...other.map((t) => ({ v: t.v * c }))];
  // start from positive number since it looks natural: `x = 23 - 5 - 12` instead of `x = -12 + 23 - 5`
  const i = r.findIndex((t) => t.v > 0);
  return i > 0 ? [r[i], ...r.filter((_, j) => j !== i)] : r;
}

/** Normalize user input: unify minus chars & cyrillic 'х', remove spaces */
function normalize(s: string): string {
  return s.replace(/[−–—]/g, "-").replace(/[хХX]/g, "x").replace(/\s+/g, "");
}

/** Parse expression without brackets like `23-x-5`; returns null if it's invalid */
function parseSide(s: string): Term[] | null {
  const terms: Term[] = [];
  const re = /([+-]?)(\d+|x)/y;
  while (re.lastIndex < s.length) {
    const m = re.exec(s);
    if (!m || (!m[1] && terms.length)) {
      return null; // sign is optional only for the first term
    }
    const sign = m[1] === "-" ? -1 : 1;
    terms.push(m[2] === "x" ? { v: sign, isX: true } : { v: sign * Number(m[2]) });
  }
  return terms.length ? terms : null;
}

/** Parse equation without brackets like `23 - x - 5 = 12`; returns null if it's invalid */
export function parseEquation(text: string): Equation | null {
  const sides = normalize(text).split("=");
  if (sides.length !== 2) {
    return null;
  }
  const left = parseSide(sides[0]);
  const right = parseSide(sides[1]);
  return left && right ? { left, right } : null;
}

/** Returns key of terms ignoring order */
const toKey = (terms: Term[]): string =>
  terms
    .map((t) => (t.isX ? `${t.v}x` : `${t.v}`))
    .sort()
    .join();

/** Returns true if user only unwrapped brackets: `23 - x - 5 = 12` (terms can be reordered but not moved between sides or calculated) */
export function isUnwrapValid(task: MathTask, text: string): boolean {
  const eq = parseEquation(text);
  if (!eq) {
    return false;
  }
  const l = toKey(eq.left);
  const r = toKey(eq.right);
  const el = toKey(task.unwrapped.left);
  const er = toKey(task.unwrapped.right);
  return (l === el && r === er) || (l === er && r === el);
}

/** Returns true if user moved terms so x is alone: `x = 23 - 5 - 12` OR `23 - 5 - 12 = x` OR `-x = 12 - 23 + 5` */
export function isIsolateValid(task: MathTask, text: string): boolean {
  const eq = parseEquation(text);
  if (!eq) {
    return false;
  }
  const isOnlyX = (side: Term[]): boolean => side.length === 1 && !!side[0].isX;
  const hasX = (side: Term[]): boolean => side.some((t) => t.isX);
  let xSide: Term[];
  let numSide: Term[];
  if (isOnlyX(eq.left) && !hasX(eq.right)) {
    [xSide, numSide] = [eq.left, eq.right];
  } else if (isOnlyX(eq.right) && !hasX(eq.left)) {
    [xSide, numSide] = [eq.right, eq.left];
  } else {
    return false;
  }
  const s = xSide[0].v; // -x = N  =>  x = -N
  return toKey(numSide.map((t) => ({ v: t.v * s }))) === toKey(getIsolated(task.unwrapped));
}

/** Returns true if answer `x = 6` is correct */
export function isAnswerValid(task: MathTask, text: string): boolean {
  const m = /^\s*[xхХX]?\s*=?\s*(\d+)\s*$/.exec(text);
  return !!m && Number(m[1]) === task.x;
}
