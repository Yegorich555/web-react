import { readFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { expect, Locator, Page, test } from "@playwright/test";
import { formatTerms, getIsolated, parseEquation } from "../src/components/schoolMathTest/equation";

const url = pathToFileURL(path.resolve(__dirname, "../build/schoolMathTest.html")).href;
/** Count of generated rows (see ROWS_COUNT in testPlan.ts) */
const ROWS = 10;

type Field = "unwrap" | "isolate" | "answer";
const allFields: Field[] = ["unwrap", "isolate", "answer"];

/** Returns row by index: 0 - example, 1..ROWS - generated tasks */
const row = (page: Page, i: number): Locator => page.locator("[data-result]").nth(i).locator("..");
const cell = (r: Locator, field: Field): Locator => r.locator(`[data-field="${field}"]`);
const input = (r: Locator, field: Field): Locator => cell(r, field).locator("input");
const taskText = (r: Locator): Promise<string> => r.locator("> div").first().innerText();
const levelLabel = (page: Page): Locator => page.getByText(/^Ниво \d от 5$/);
const nextBtn = (page: Page): Locator => page.getByRole("button", { name: "Нов тест" });

/** Type text like user and leave input (validation is fired on focusout) */
async function typeAndLeave(inp: Locator, text: string): Promise<void> {
  await inp.click();
  await inp.press("Control+A");
  await inp.press("Backspace");
  await inp.pressSequentially(text);
  await inp.press("Tab");
}

const flip: Record<string, string> = { "+": "-", "-": "+" };

/** Returns side without brackets: `23 - (x + 5 - 3)` => `23 - x - 5 + 3` */
function unwrapSide(side: string): string {
  const terms: string[] = [];
  let sign = "+";
  let bracketSign = "+";
  side.match(/[-+()]|\d+|x/g)!.forEach((tok) => {
    if (tok === "+" || tok === "-") {
      sign = tok;
    } else if (tok === "(") {
      bracketSign = sign;
      sign = "+";
    } else if (tok === ")") {
      bracketSign = "+";
    } else {
      terms.push(`${bracketSign === "-" ? flip[sign] : sign} ${tok}`);
      sign = "+";
    }
  });
  return terms.join(" ").replace(/^\+ /, "").replace(/^- /, "-");
}

/** Returns correct values of inputs for task like `23 - (x + 5) = 12` */
function solve(task: string): Record<Field, string> & { x: number } {
  const unwrap = task.split(" = ").map(unwrapSide).join(" = ");
  const nums = getIsolated(parseEquation(unwrap)!);
  const x = nums.reduce((sum, t) => sum + t.v, 0);
  return { unwrap, isolate: `x = ${formatTerms(nums)}`, answer: String(x), x };
}

/** Returns editable inputs of row: learned columns are prefilled */
async function editableFields(r: Locator): Promise<Field[]> {
  const prefilled = await Promise.all(allFields.map((f) => cell(r, f).getAttribute("data-prefilled")));
  return allFields.filter((_, k) => prefilled[k] == null);
}

/** Type correct values into editable inputs of row
 * @param only inputs to fill: all editable by default
 * @param mistakeIn inputs where wrong value is typed before correct one */
async function solveRow(page: Page, i: number, only?: Field[], mistakeIn: Field[] = []): Promise<void> {
  const r = row(page, i);
  const correct = solve(await taskText(r));
  const fields = only ?? (await editableFields(r));
  for (let k = 0; k < fields.length; ++k) {
    const f = fields[k];
    if (mistakeIn.includes(f)) {
      // eslint-disable-next-line no-await-in-loop
      await typeAndLeave(input(r, f), "1 = 2");
    }
    // eslint-disable-next-line no-await-in-loop
    await typeAndLeave(input(r, f), correct[f]);
  }
  await expect(r).toHaveAttribute("data-done");
}

/** Returns text content of all files in zip (xlsx is zip with xml-files) */
function readZipText(buf: Buffer): string {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(eocd + 16); // offset of central directory
  let text = "";
  for (let n = buf.readUInt16LE(eocd + 10); n > 0; --n) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const local = buf.readUInt32LE(p + 42);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    text += (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    p += 46 + buf.readUInt16LE(p + 28) + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return text;
}

const setAdmin = (page: Page, isAdmin: boolean): Promise<void> =>
  page.evaluate((v) => {
    window.myUser.isAdmin = v;
  }, isAdmin);

/** Returns function that says if any file was downloaded since calling trackDownloads() */
function trackDownloads(page: Page): () => boolean {
  let isDownloaded = false;
  page.on("download", () => {
    isDownloaded = true;
  });
  return () => isDownloaded;
}

test.beforeEach(async ({ page }) => {
  await page.clock.install(); // control time for timer checks
  await page.goto(url);
});

test("solves random rows of each complexity", async ({ page }) => {
  const rows = [1, 4, 7, 9]; // 1 row per each complexity
  for (let k = 0; k < rows.length; ++k) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, rows[k]);
  }
  await expect(page.locator("[data-summary] > div")).toHaveText(["Общо", /^Време: (\d+ мин )?\d+ сек$/, "4 / 0 / 0"]);
});

test("renders example row and generated rows", async ({ page }) => {
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /^data:image\//); // inlined since result is single html-file
  await expect(page).toHaveTitle("Разкриване на скоби");
  await expect(levelLabel(page)).toHaveText("Ниво 1 от 5");
  await expect(page.locator("[data-result]")).toHaveCount(ROWS + 1);
  const ex = row(page, 0);
  await expect(ex.locator("> div").first()).toHaveText("23 - (x + 5) = 12");
  await expect(input(ex, "unwrap")).toHaveValue("23 - x - 5 = 12");
  await expect(input(ex, "isolate")).toHaveValue("x = 23 - 5 - 12");
  await expect(input(ex, "answer")).toHaveValue("6");
  await expect(cell(ex, "answer").locator("[prefix]")).toHaveText(/^x =\s*$/); // prefix is outside of input
  await expect(ex.locator("wup-text[disabled]")).toHaveCount(3);
  await expect(ex.locator("[data-result]")).toHaveText("пример");
  await expect(page.locator("[data-prefilled]")).toHaveCount(0); // the 1st level: every input is editable

  // first 3 rows are simple as example, other rows are more complex
  const texts = await page.locator("[data-result]").locator("..").locator("> div:first-child").allInnerTexts();
  const isSimple = (s: string): boolean => /^\d+ [-+] \((x [-+] \d+|\d+ [-+] x)\) = \d+$/.test(s);
  expect(texts.slice(1, 4).filter(isSimple)).toHaveLength(3);
  expect(texts.slice(1, 4).every((s) => s.match(/\d+/g)!.every((n) => +n <= 20))).toBe(true); // small numbers
  expect(texts.slice(4).filter(isSimple)).toHaveLength(0);
  expect(texts.slice(9).every((s) => (s.match(/\(/g) || []).length === 2)).toBe(true); // last rows have 2 brackets
});

test("validates only filled inputs on focusout and counts mistakes", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate, x } = solve(await taskText(r));

  // typical mistake: sign of the last bracket member isn't changed
  const wrong = unwrap.replace(/ ([-+]) (\S+) = /, (_, s: string, n: string) => ` ${flip[s]} ${n} = `);
  const inp = input(r, "unwrap");
  await inp.click();
  await inp.pressSequentially(wrong);
  await expect(cell(r, "unwrap")).not.toHaveAttribute("data-state"); // no validation while typing
  await inp.press("Tab");
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  await expect(r.locator("wup-text[invalid]")).toHaveCount(0); // only indication without error message
  await expect(r.locator("[data-result]")).toHaveText(""); // result is shown only when row is completed

  // empty input isn't validated
  await input(r, "isolate").press("Tab");
  await expect(cell(r, "isolate")).not.toHaveAttribute("data-state");
  await expect(cell(r, "answer")).not.toHaveAttribute("data-state");

  // leaving the same wrong value isn't counted twice
  await inp.click();
  await inp.press("Tab"); // checked via total mistakes at the end

  await inp.click();
  await page.clock.fastForward(20_000); // time is counted only while input is focused
  await typeAndLeave(inp, unwrap);
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "fixed"); // valid but was mistake before
  await typeAndLeave(input(r, "isolate"), isolate);
  await expect(cell(r, "isolate")).toHaveAttribute("data-state", "valid"); // valid from the 1st attempt
  await typeAndLeave(input(r, "answer"), `-${x}.5`);
  await expect(input(r, "answer")).toHaveValue(`-${x}.5`); // any number is allowed
  await expect(cell(r, "answer")).toHaveAttribute("data-state", "invalid");
  await expect(r).not.toHaveAttribute("data-done");
  await expect(r.locator("[data-result]")).toHaveText("");

  await typeAndLeave(input(r, "answer"), String(x));
  await expect(r).toHaveAttribute("data-done");
  await expect(cell(r, "answer")).toHaveAttribute("data-state", "fixed");
  await expect(page.locator("[data-summary] > div").nth(1)).toHaveText(/^Време: 2\d сек$/); // total time
  // time per input; +several sec since clock keeps going while typing
  await expect(r.locator("[data-result]")).toHaveText(/^грешки: 2, 2\d;\d;\d сек$/);
  const result = await r.locator("[data-result]").innerText();
  await expect(page.locator("[data-summary] > div").nth(2)).toHaveText("0 / 1 / 2");
  await Promise.all(allFields.map((f) => expect(input(r, f)).not.toBeEditable()));

  // timer is stopped for completed row
  await page.clock.fastForward(10_000);
  await expect(r.locator("[data-result]")).toHaveText(result);
});

test("resets validation state while typing and shows it again on Enter or focusout", async ({ page }) => {
  const r = row(page, 1);
  const inp = input(r, "unwrap");
  const summary = page.locator("[data-summary] > div").nth(2);
  await inp.click();
  await inp.pressSequentially("1 = 2");
  await inp.press("Enter");
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  await expect(summary).toHaveText("0 / 1 / 1");

  await inp.pressSequentially("3"); // user continues typing
  await expect(cell(r, "unwrap")).not.toHaveAttribute("data-state");
  await inp.press("Enter");
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  await expect(summary).toHaveText("0 / 1 / 2"); // another wrong value

  await inp.pressSequentially("4");
  await expect(cell(r, "unwrap")).not.toHaveAttribute("data-state");
  await inp.press("Backspace"); // the same text as validated before
  await inp.press("Tab");
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  await expect(summary).toHaveText("0 / 1 / 2"); // the same wrong value isn't counted twice

  await typeAndLeave(inp, solve(await taskText(r)).unwrap);
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "fixed");
  await inp.click();
  await inp.press("End");
  await inp.pressSequentially("1"); // valid state is reset too
  await expect(cell(r, "unwrap")).not.toHaveAttribute("data-state");
  await inp.press("Backspace");
  await inp.press("Tab");
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "fixed");
});

test("goes to next input on Enter only if value is valid", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate, x } = solve(await taskText(r));
  const inp = input(r, "unwrap");
  await inp.click();
  await inp.pressSequentially("1 = 2");
  await inp.press("Enter");
  await expect(inp).toBeFocused(); // invalid: stay and show error since input is dirty
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  await inp.press("Enter");
  await inp.press("Tab"); // the same wrong value isn't counted twice

  await typeAndLeave(inp, unwrap);
  await inp.click();
  await inp.press("Enter");
  await expect(input(r, "isolate")).toBeFocused();
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "fixed");
  await input(r, "isolate").press("Enter"); // empty: nothing happens
  await expect(input(r, "isolate")).toBeFocused();
  await expect(cell(r, "isolate")).not.toHaveAttribute("data-state");
  await input(r, "isolate").pressSequentially(isolate);
  await input(r, "isolate").press("Enter");
  await expect(input(r, "answer")).toBeFocused();
  await input(r, "answer").pressSequentially(String(x));
  await input(r, "answer").press("Enter");
  await expect(input(row(page, 2), "unwrap")).toBeFocused(); // next row
  await expect(r).toHaveAttribute("data-done");
  await expect(r.locator("[data-result]")).toHaveText(/^грешки: 1, \d+;\d+;\d+ сек$/);
});

test("accepts alternative forms", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate } = solve(await taskText(r));
  const [l, rt] = unwrap.split(" = ");
  await typeAndLeave(input(r, "unwrap"), `${rt}=${l.replace(/ /g, "")}`); // swapped sides without spaces
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "valid");
  const [, nums] = isolate.split(" = ");
  await typeAndLeave(input(r, "isolate"), `${nums} = х`); // cyrillic 'х' at the right side
  await expect(cell(r, "isolate")).toHaveAttribute("data-state", "valid");
});

test("buttons Test & Refresh are visible only for admin", async ({ page }) => {
  const testBtn = page.getByRole("button", { name: "Test", exact: true });
  const refreshBtn = page.getByRole("button", { name: "Refresh" });
  expect(await page.evaluate(() => window.myUser.isAdmin)).toBe(false); // prod-build: isAdmin is false by default
  await expect(testBtn).toHaveCount(0);
  await expect(refreshBtn).toHaveCount(0);
  await setAdmin(page, true);
  await expect(testBtn).toBeVisible();
  await expect(refreshBtn).toBeEnabled();
  await page.evaluate(() => {
    window.myUser = {} as typeof window.myUser; // partial object: isAdmin is false by default
  });
  await expect(testBtn).toHaveCount(0);
  await expect(refreshBtn).toHaveCount(0);
  await page.evaluate(() => {
    window.myUser = { isAdmin: 1 }; // any truthy value
  });
  await expect(refreshBtn).toBeVisible();
});

test("button 'Нов тест' is enabled only when all rows are completed without errors (for admin too)", async ({ page }) => {
  test.setTimeout(60_000);
  const btn = nextBtn(page);
  await expect(btn).toBeDisabled();
  await btn.hover({ force: true });
  await expect(page.locator("wup-popup")).toHaveText("Достъпно само когато всичко е вярно"); // tooltip for disabled button
  await page.mouse.move(0, 0);
  await setAdmin(page, true);
  await expect(btn).toBeDisabled();
  await setAdmin(page, false);

  for (let i = 1; i < ROWS; ++i) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, i, allFields, i === 1 ? ["unwrap"] : []); // 1 mistake otherwise perfect result finishes the round
    // eslint-disable-next-line no-await-in-loop
    await expect(btn).toBeDisabled();
  }
  // every input is filled but the last one is invalid
  const last = row(page, ROWS);
  const correct = solve(await taskText(last));
  await typeAndLeave(input(last, "unwrap"), correct.unwrap);
  await typeAndLeave(input(last, "isolate"), correct.isolate);
  await typeAndLeave(input(last, "answer"), String(correct.x + 1));
  await expect(cell(last, "answer")).toHaveAttribute("data-state", "invalid");
  await expect(btn).toBeDisabled();
  await typeAndLeave(input(last, "answer"), correct.answer);
  await expect(btn).toBeEnabled();
  await expect(btn).toHaveAttribute("w-tooltip", "Преминаване към ниво 2"); // every column is learned => every input is editable

  const isDownloaded = trackDownloads(page);
  await btn.click();
  await expect(levelLabel(page)).toHaveText("Ниво 2 от 5");
  await expect(page.locator("[data-prefilled]")).toHaveCount(0);
  await expect(input(row(page, 1), "unwrap")).toHaveValue("");
  await expect(btn).toBeDisabled();
  await page.waitForTimeout(500);
  expect(isDownloaded()).toBe(false); // results are saved only when the last level is finished
});

test("learned columns are prefilled & readonly at the next level", async ({ page }) => {
  test.setTimeout(60_000);
  for (let i = 1; i <= ROWS; ++i) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, i, allFields, ["unwrap"]); // mistakes only in the 1st column
  }
  await expect(nextBtn(page)).toHaveAttribute("w-tooltip", "Преминаване към ниво 2, упражнение: Разкрийте скобите");
  await nextBtn(page).click();
  await expect(levelLabel(page)).toHaveText("Ниво 2 от 5");

  await expect(page.locator("[data-prefilled]")).toHaveCount(ROWS * 2); // except example row
  const r = row(page, 1);
  const correct = solve(await taskText(r));
  await expect(cell(r, "unwrap")).not.toHaveAttribute("data-prefilled");
  await expect(input(r, "unwrap")).toHaveValue("");
  await expect(input(r, "unwrap")).toBeEditable();
  await Promise.all(
    (["isolate", "answer"] as const).flatMap((f) => [
      expect(cell(r, f)).toHaveAttribute("data-prefilled"),
      expect(input(r, f)).toHaveValue(correct[f]),
      expect(input(r, f)).not.toBeEditable(),
    ]),
  );

  // admin: tooltips with correct values only for editable inputs
  await setAdmin(page, true);
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(ROWS);
  await expect(cell(r, "unwrap")).toHaveAttribute("w-tooltip", correct.unwrap);

  // row is completed when editable inputs are valid; Enter skips prefilled inputs
  await input(r, "unwrap").click();
  await input(r, "unwrap").pressSequentially(correct.unwrap);
  await input(r, "unwrap").press("Enter");
  await expect(input(row(page, 2), "unwrap")).toBeFocused();
  await expect(r).toHaveAttribute("data-done");
  await expect(r.locator("[data-result]")).toHaveText(/^грешки: 0, \d+ сек$/); // time only for editable input
});

test("learned column keeps editable inputs as many as rows with mistakes", async ({ page }) => {
  test.setTimeout(60_000);
  for (let i = 1; i <= ROWS; ++i) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, i, allFields, i === ROWS ? ["unwrap", "isolate"] : ["unwrap"]); // `isolate` is learned with 1 mistake
  }
  await nextBtn(page).click();
  await expect(levelLabel(page)).toHaveText("Ниво 2 от 5");

  await expect(page.locator("[data-prefilled]")).toHaveCount(ROWS * 2 - 1);
  await expect(page.locator('[data-field="answer"][data-prefilled]')).toHaveCount(ROWS);
  await expect(page.locator('[data-field="unwrap"][data-prefilled]')).toHaveCount(0);
  const editable = page.locator('[data-field="isolate"]:not([data-prefilled])');
  await expect(editable).toHaveCount(2); // example row + 1 random row
  await expect(editable.nth(1).locator("input")).toHaveValue("");
  await expect(editable.nth(1).locator("input")).toBeEditable();

  // row with retried input is completed only when it's valid too
  const isEditable = await page.locator('[data-field="isolate"]').evaluateAll((els) => els.map((el) => !el.hasAttribute("data-prefilled")));
  const i = isEditable.indexOf(true, 1); // skip example row
  await solveRow(page, i, ["unwrap", "isolate"]);
  await expect(row(page, i).locator("[data-result]")).toHaveText(/^грешки: 0, \d+;\d+ сек$/);

  // reload keeps the same editable inputs
  await page.waitForTimeout(600); // debounce of saving
  await page.reload();
  await expect(page.locator("[data-prefilled]")).toHaveCount(ROWS * 2 - 1);
  await expect(cell(row(page, i), "isolate")).not.toHaveAttribute("data-prefilled");
});

test("saves all levels into excel when the last level is finished", async ({ page }) => {
  const isDownloaded = trackDownloads(page);
  await setAdmin(page, true);
  const testBtn = page.getByRole("button", { name: "Test", exact: true });
  /** Returns count of rows solved without mistakes from summary */
  const getWithoutMistakes = async (): Promise<number> =>
    Number((await page.locator("[data-summary] > div").nth(2).innerText()).split(" / ")[0]);
  let withoutMistakes = 0;
  for (let level = 2; level <= 5; ++level) {
    // eslint-disable-next-line no-await-in-loop
    await testBtn.click(); // fill all rows with at least 1 mistake => the next level
    // eslint-disable-next-line no-await-in-loop
    withoutMistakes += await getWithoutMistakes();
    // eslint-disable-next-line no-await-in-loop
    await nextBtn(page).click();
    // eslint-disable-next-line no-await-in-loop
    await expect(levelLabel(page)).toHaveText(`Ниво ${level} от 5`);
  }
  expect(isDownloaded()).toBe(false);

  const [download] = await Promise.all([page.waitForEvent("download"), testBtn.click()]); // fill all rows => the last level is finished
  expect(download.suggestedFilename()).toBe("mathTest_1.xlsx");
  const text = readZipText(readFileSync((await download.path())!));
  for (let level = 1; level <= 5; ++level) {
    expect(text).toContain(`Ниво ${level}`); // 1 sheet per level
  }
  expect(text).toContain(`Общо, ниво 5`);
  expect(text).toContain(`${ROWS} от ${ROWS}`);
  await expect(page.locator("[data-done]")).toHaveCount(ROWS);

  // congratulations: score is % of rows without mistakes of all levels
  const modal = page.locator("wup-modal");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("heading")).toHaveText("Поздравления!");
  await expect(modal.locator("[data-spent]")).toHaveText(/^(\d+ ч )?(\d+ мин )?\d+ сек$/);
  withoutMistakes += await getWithoutMistakes();
  await expect(modal.locator("[data-score]")).toHaveText(`${Math.round((withoutMistakes * 100) / (ROWS * 5))} / 100`);

  // page is reloaded before closing congratulations: it isn't saved again & finished test is kept
  let downloads = 0;
  page.on("download", () => ++downloads);
  await page.waitForTimeout(600); // debounce of saving
  await page.reload();
  await expect(levelLabel(page)).toHaveText("Ниво 5 от 5");
  await expect(page.locator("[data-done]")).toHaveCount(ROWS);
  await page.waitForTimeout(500);
  expect(downloads).toBe(0);
  await expect(page.locator("wup-modal")).toHaveCount(0); // congratulations are shown only once

  // so the next test starts new round via button
  await expect(nextBtn(page)).toHaveAttribute("w-tooltip", "Нов кръг от ниво 1");
  await nextBtn(page).click();
  await expect(levelLabel(page)).toHaveText("Ниво 1 от 5");
  await expect(page.locator("[data-done]")).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(downloads).toBe(0);
});

test("perfect result finishes the round instead of the next level", async ({ page }) => {
  test.setTimeout(60_000);
  await setAdmin(page, true);
  await page.getByRole("button", { name: "Test", exact: true }).click(); // fill all rows with at least 1 mistake => the next level
  const level1 = Number((await page.locator("[data-summary] > div").nth(2).innerText()).split(" / ")[0]); // rows without mistakes
  await nextBtn(page).click();
  await expect(levelLabel(page)).toHaveText("Ниво 2 от 5");
  await setAdmin(page, false);

  for (let i = 1; i < ROWS; ++i) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, i);
  }
  const [download] = await Promise.all([page.waitForEvent("download"), solveRow(page, ROWS)]);
  const text = readZipText(readFileSync((await download.path())!));
  expect(text).toContain("Ниво 1"); // previous level is saved too
  expect(text).toContain("Общо, ниво 2");
  expect(text).not.toContain("Ниво 3");

  const modal = page.locator("wup-modal");
  await expect(modal.getByRole("heading")).toHaveText("Поздравления!");
  await expect(modal).toContainText("Решихте ниво 2 без нито една грешка");
  await expect(modal.locator("[data-score]")).toHaveText(`${Math.round(((level1 + ROWS) * 100) / (ROWS * 2))} / 100`); // both levels

  // closing congratulations starts new round
  let downloads = 0;
  page.on("download", () => ++downloads);
  await modal.getByRole("button", { name: "Добре" }).click();
  await expect(modal).toHaveCount(0);
  await expect(levelLabel(page)).toHaveText("Ниво 1 от 5");
  await expect(page.locator("[data-done]")).toHaveCount(0);
  await expect(page.locator("[data-prefilled]")).toHaveCount(0);
  await expect(nextBtn(page)).toBeDisabled();
  await page.waitForTimeout(600); // debounce of saving
  expect(downloads).toBe(0); // the round is already saved

  // new round is kept after page reload
  await page.reload();
  await expect(levelLabel(page)).toHaveText("Ниво 1 от 5");
  await expect(page.locator("[data-done]")).toHaveCount(0);
  await expect(page.locator("wup-modal")).toHaveCount(0);
});

test("button Test fills all rows with simulated mistakes on every click", async ({ page }) => {
  await setAdmin(page, true);
  const testBtn = page.getByRole("button", { name: "Test", exact: true });
  const summary = page.locator("[data-summary] > div").nth(2);
  await testBtn.click();
  await expect(page.locator("[data-done]")).toHaveCount(ROWS);
  await expect(page.locator("[data-state=invalid]")).toHaveCount(0); // mistakes are fixed
  const [valid, withMistakes] = (await summary.innerText()).split(" / ").map(Number);
  expect(valid + withMistakes).toBe(ROWS);
  const values = await page.locator("[data-field] input").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  expect(values.slice(3).every(Boolean)).toBe(true); // every input is filled

  // every click overrides previous results: time per row is random
  const results = page.locator("[data-result]");
  const before = await results.allInnerTexts();
  await testBtn.click();
  await expect(page.locator("[data-done]")).toHaveCount(ROWS);
  await expect.poll(() => results.allInnerTexts()).not.toEqual(before);
});

test("refresh generates new rows", async ({ page }) => {
  await setAdmin(page, true);
  const r = row(page, 1);
  await typeAndLeave(input(r, "unwrap"), "1 = 2");
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  const before = await page.locator("[data-result]").locator("..").allInnerTexts();

  const isDownloaded = trackDownloads(page);
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(input(r, "unwrap")).toHaveValue("");
  await expect(cell(r, "unwrap")).not.toHaveAttribute("data-state");
  await expect(r.locator("[data-result]")).toHaveText("");
  expect(await page.locator("[data-result]").locator("..").allInnerTexts()).not.toEqual(before);
  await expect(input(row(page, 0), "answer")).toHaveValue("6");
  await expect(levelLabel(page)).toHaveText("Ниво 1 от 5"); // the same level
  await page.waitForTimeout(500);
  expect(isDownloaded()).toBe(false); // no completed rows => nothing to save
});

test("saves rows into excel on refresh if at least 1 row is completed", async ({ page }) => {
  await setAdmin(page, true);
  const task1 = await taskText(row(page, 1));
  await solveRow(page, 1);
  await typeAndLeave(input(row(page, 2), "unwrap"), "1 = 2");
  const summary = page.locator("[data-summary] > div");
  await expect(summary).toHaveText(["Общо", /^Време: \d+ сек$/, "1 / 1 / 1"]);

  const btn = page.getByRole("button", { name: "Refresh" });
  let [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  expect(download.suggestedFilename()).toBe("mathTest_1.xlsx");
  const text = readZipText(readFileSync((await download.path())!));
  expect(text).toContain("Ниво 1"); // sheet name
  expect(text).toContain(task1);
  expect(text).toContain("1 = 2"); // invalid values are saved too
  expect(text).toContain("Решено");
  expect(text).toContain("да");
  expect(text.toUpperCase()).toContain("1E9E4A"); // green font for valid inputs
  expect(text.toUpperCase()).toContain("E02424"); // red font for invalid inputs
  // summary row: row 1 is solved without mistakes, row 2 has 1 mistake
  expect(text).toContain("Общо, ниво 1");
  expect(text).toContain("без грешки: 1");
  expect(text).toContain("Време: ");
  expect(text).toContain("с грешки: 1");
  expect(text).toContain(`1 от ${ROWS}`);

  await solveRow(page, 1);
  [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  expect(download.suggestedFilename()).toBe("mathTest_2.xlsx");
  await expect(summary).toHaveText(["Общо", "Време: 0 сек", "0 / 0 / 0"]); // reset by refresh
});

test("restores the whole state after page reload; refresh clears it", async ({ page }) => {
  const getTasks = (): Promise<string[]> => page.locator("[data-result]").locator("..").locator("> div:first-child").allInnerTexts();
  const getValues = (): Promise<string[]> =>
    page.locator("[data-field] input").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  const summary = page.locator("[data-summary]");
  const tasks = await getTasks();

  await solveRow(page, 1);
  await typeAndLeave(input(row(page, 2), "unwrap"), "1 = 2");
  await input(row(page, 3), "isolate").click();
  await input(row(page, 3), "isolate").pressSequentially("x = 5"); // typed but not validated yet
  const values = await getValues();
  const mistakesText = await summary.locator("> div").nth(2).innerText();
  /** Returns spent seconds from summary: `Време: 1 мин 2 сек` */
  const getSpent = async (): Promise<number> => {
    const [sec, min = 0] = ((await summary.locator("> div").nth(1).innerText()).match(/\d+/g) ?? []).map(Number).reverse();
    return min * 60 + sec;
  };
  const spent = await getSpent();
  await page.waitForTimeout(600); // debounce of saving

  await page.reload();
  expect(await getTasks()).toEqual(tasks);
  expect(await getValues()).toEqual(values);
  await expect(row(page, 1)).toHaveAttribute("data-done");
  await expect(row(page, 1).locator("[data-result]")).toHaveText(/^грешки: 0, \d+;\d+;\d+ сек$/);
  await expect(input(row(page, 1), "unwrap")).not.toBeEditable();
  await expect(cell(row(page, 2), "unwrap")).toHaveAttribute("data-state", "invalid");
  await expect(cell(row(page, 3), "isolate")).not.toHaveAttribute("data-state");
  expect(await summary.locator("> div").nth(2).innerText()).toBe(mistakesText);
  expect(await getSpent()).toBeGreaterThanOrEqual(spent); // time of focused input is added on page closing

  // continue: the same wrong value isn't counted twice & fixed value is orange
  await typeAndLeave(input(row(page, 2), "unwrap"), "1 = 2");
  await expect(summary.locator("> div").nth(2)).toHaveText("1 / 1 / 1");
  await typeAndLeave(input(row(page, 2), "unwrap"), solve(tasks[2]).unwrap);
  await expect(cell(row(page, 2), "unwrap")).toHaveAttribute("data-state", "fixed");

  // refresh clears storage: the new test is stored instead
  await setAdmin(page, true);
  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Refresh" }).click()]);
  const fresh = await getTasks();
  expect(fresh).not.toEqual(tasks);
  await page.waitForTimeout(600);
  await page.reload();
  expect(await getTasks()).toEqual(fresh);
  expect((await getValues()).slice(3).every((v) => !v)).toBe(true); // only example row is filled
  await expect(summary.locator("> div").nth(2)).toHaveText("0 / 0 / 0");
});

test("restores level & prefilled columns after page reload", async ({ page }) => {
  test.setTimeout(60_000);
  for (let i = 1; i <= ROWS; ++i) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, i, allFields, ["answer"]);
  }
  await nextBtn(page).click();
  await expect(levelLabel(page)).toHaveText("Ниво 2 от 5");
  await solveRow(page, 1, ["answer"]);
  await page.waitForTimeout(600); // debounce of saving

  await page.reload();
  await expect(levelLabel(page)).toHaveText("Ниво 2 от 5");
  await expect(page.locator("[data-prefilled]")).toHaveCount(ROWS * 2);
  await expect(cell(row(page, 2), "answer")).not.toHaveAttribute("data-prefilled");
  await expect(row(page, 1)).toHaveAttribute("data-done");
  await expect(page.locator("[data-done]")).toHaveCount(1);
});

test("time & mistakes per row are visible only for admin; summary is visible for everyone", async ({ page }) => {
  const header = page.getByText("Време и грешки");
  const summary = page.locator("[data-summary]");
  await solveRow(page, 1);
  await expect(row(page, 1).locator("[data-result]")).toHaveText(/^грешки: 0, /); // it's calculated but hidden
  await expect(row(page, 1).locator("[data-result]")).toBeHidden();
  await expect(row(page, 0).locator("[data-result]")).toBeHidden();
  await expect(header).toBeHidden();
  await expect(summary).toBeVisible();
  await expect(summary.locator("> div")).toHaveText(["Общо", /^Време: \d+ сек$/, "1 / 0 / 0"]);

  await setAdmin(page, true);
  await expect(row(page, 1).locator("[data-result]")).toBeVisible();
  await expect(row(page, 0).locator("[data-result]")).toBeVisible();
  await expect(header).toBeVisible();
  await expect(summary).toBeVisible();
});

test("counts time of focused input when page is closed", async ({ page }) => {
  await input(row(page, 1), "unwrap").click();
  await page.clock.fastForward(65_000);
  await page.reload();
  await expect(page.locator("[data-summary] > div").nth(1)).toHaveText(/^Време: 1 мин \d+ сек$/);

  await input(row(page, 1), "unwrap").click();
  await page.clock.fastForward(3_600_000);
  await input(row(page, 1), "unwrap").press("Tab");
  await expect(page.locator("[data-summary] > div").nth(1)).toHaveText(/^Време: 1 ч 1 мин \d+ сек$/);
});

test("spaces can't split numbers", async ({ page }) => {
  const r = row(page, ROWS); // the last row always has 2-digit number in extra brackets
  const { unwrap } = solve(await taskText(r));
  await typeAndLeave(input(r, "unwrap"), unwrap.replace(/(\d)(\d)/, "$1 $2"));
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  await typeAndLeave(input(r, "unwrap"), unwrap.replaceAll(" ", "  "));
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "fixed");
});

test("tooltips with correct values are shown only for admin", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate, x } = solve(await taskText(r));
  const setIsAdmin = (v: unknown): Promise<void> =>
    page.evaluate((isAdmin) => {
      window.myUser.isAdmin = isAdmin as number;
    }, v);

  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(0);
  await setIsAdmin(1); // any truthy value
  await expect(cell(r, "unwrap")).toHaveAttribute("w-tooltip", unwrap);
  await expect(cell(r, "isolate")).toHaveAttribute("w-tooltip", isolate);
  await expect(cell(r, "answer")).toHaveAttribute("w-tooltip", `x = ${x}`);
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(ROWS * allFields.length); // except example row
  await cell(r, "isolate").hover();
  await expect(page.locator("wup-popup").getByText(isolate)).toBeVisible();

  await setIsAdmin(0); // any falsy value
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(0);
  await setIsAdmin(true);
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(ROWS * allFields.length);
  await setIsAdmin(false);
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(0);
});
