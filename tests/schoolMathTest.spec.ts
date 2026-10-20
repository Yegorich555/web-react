import { readFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { expect, Locator, Page, test } from "@playwright/test";
import { formatTerms, getIsolated, parseEquation } from "../src/components/schoolMathTest/equation";

const url = pathToFileURL(path.resolve(__dirname, "../build/schoolMathTest.html")).href;

/** Returns row by index: 0 - example, 1..20 - generated tasks */
const row = (page: Page, i: number): Locator => page.locator("[data-result]").nth(i).locator("..");
const cell = (r: Locator, field: "unwrap" | "isolate" | "answer"): Locator => r.locator(`[data-field="${field}"]`);
const input = (r: Locator, field: "unwrap" | "isolate" | "answer"): Locator => cell(r, field).locator("input");

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

/** Returns correct answers for task like `23 - (x + 5) = 12` */
function solve(task: string): { unwrap: string; isolate: string; x: number } {
  const unwrap = task.split(" = ").map(unwrapSide).join(" = ");
  const nums = getIsolated(parseEquation(unwrap)!);
  return { unwrap, isolate: `x = ${formatTerms(nums)}`, x: nums.reduce((sum, t) => sum + t.v, 0) };
}

/** Type correct answers into row */
async function solveRow(page: Page, i: number): Promise<void> {
  const r = row(page, i);
  const { unwrap, isolate, x } = solve(await r.locator("> div").first().innerText());
  await typeAndLeave(input(r, "unwrap"), unwrap);
  await typeAndLeave(input(r, "isolate"), isolate);
  await typeAndLeave(input(r, "answer"), String(x));
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

test("solves random rows of each complexity", async ({ page }) => {
  const rows = [1, 6, 11, 16, 20]; // 1 row per each level of complexity
  for (let k = 0; k < rows.length; ++k) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, rows[k]);
  }
  await expect(page.locator("[data-summary] > div")).toHaveText(["Итого", /^Потрачено (\d+ мин )?\d+ сек$/, "5 / 0 / 0"]);
});

test.beforeEach(async ({ page }) => {
  await page.clock.install(); // control time for timer checks
  await page.goto(url);
});

test("renders example row and generated rows", async ({ page }) => {
  await expect(page.locator("[data-result]")).toHaveCount(21);
  const ex = row(page, 0);
  await expect(ex.locator("> div").first()).toHaveText("23 - (x + 5) = 12");
  await expect(input(ex, "unwrap")).toHaveValue("23 - x - 5 = 12");
  await expect(input(ex, "isolate")).toHaveValue("x = 23 - 5 - 12");
  await expect(input(ex, "answer")).toHaveValue("x = 6");
  await expect(ex.locator("wup-text[disabled]")).toHaveCount(3);
  await expect(ex.locator("[data-result]")).toHaveText("пример");

  // first 5 rows are simple as example, other rows are more complex
  const texts = await page.locator("[data-result]").locator("..").locator("> div:first-child").allInnerTexts();
  const isSimple = (s: string): boolean => /^\d+ [-+] \((x [-+] \d+|\d+ [-+] x)\) = \d+$/.test(s);
  expect(texts.slice(1, 6).filter(isSimple)).toHaveLength(5);
  expect(texts.slice(1, 6).every((s) => s.match(/\d+/g)!.every((n) => +n <= 20))).toBe(true); // small numbers
  expect(texts.slice(6).filter(isSimple)).toHaveLength(0);
  expect(texts.slice(16).every((s) => (s.match(/\(/g) || []).length === 2)).toBe(true); // last rows have 2 brackets
});

test("validates only filled inputs on focusout and counts mistakes", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate, x } = solve(await r.locator("> div").first().innerText());

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
  await typeAndLeave(input(r, "answer"), String(x + 1));
  await expect(input(r, "answer")).toHaveValue(`x = ${x + 1}`); // mask
  await expect(cell(r, "answer")).toHaveAttribute("data-state", "invalid");
  await expect(r).not.toHaveAttribute("data-done");
  await expect(r.locator("[data-result]")).toHaveText("");

  await typeAndLeave(input(r, "answer"), String(x));
  await expect(r).toHaveAttribute("data-done");
  await expect(cell(r, "answer")).toHaveAttribute("data-state", "fixed");
  await expect(page.locator("[data-summary] > div").nth(1)).toHaveText(/^Потрачено 2\d сек$/); // total time
  // time per input; +several sec since clock keeps going while typing
  await expect(r.locator("[data-result]")).toHaveText(/^ошибки: 2, 2\d;\d;\d сек$/);
  const result = await r.locator("[data-result]").innerText();
  await expect(page.locator("[data-summary] > div").nth(2)).toHaveText("0 / 1 / 2");
  await Promise.all((["unwrap", "isolate", "answer"] as const).map((f) => expect(input(r, f)).not.toBeEditable()));

  // timer is stopped for completed row
  await page.clock.fastForward(10_000);
  await expect(r.locator("[data-result]")).toHaveText(result);
});

test("goes to next input on Enter only if value is valid", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate, x } = solve(await r.locator("> div").first().innerText());
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
  await expect(r.locator("[data-result]")).toHaveText(/^ошибки: 1, \d+;\d+;\d+ сек$/);
});

test("accepts alternative forms", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate } = solve(await r.locator("> div").first().innerText());
  const [l, rt] = unwrap.split(" = ");
  await typeAndLeave(input(r, "unwrap"), `${rt}=${l.replace(/ /g, "")}`); // swapped sides without spaces
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "valid");
  const [, nums] = isolate.split(" = ");
  await typeAndLeave(input(r, "isolate"), `${nums} = х`); // cyrillic 'х' at the right side
  await expect(cell(r, "isolate")).toHaveAttribute("data-state", "valid");
});

test("refresh generates new rows", async ({ page }) => {
  await setAdmin(page, true);
  const r = row(page, 1);
  await typeAndLeave(input(r, "unwrap"), "1 = 2");
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  const before = await page.locator("[data-result]").locator("..").allInnerTexts();

  let isDownloaded = false;
  page.on("download", () => {
    isDownloaded = true;
  });
  await page.getByRole("button", { name: "Обновить" }).click();
  await expect(input(r, "unwrap")).toHaveValue("");
  await expect(cell(r, "unwrap")).not.toHaveAttribute("data-state");
  await expect(r.locator("[data-result]")).toHaveText("");
  expect(await page.locator("[data-result]").locator("..").allInnerTexts()).not.toEqual(before);
  await expect(input(row(page, 0), "answer")).toHaveValue("x = 6");
  await page.waitForTimeout(500);
  expect(isDownloaded).toBe(false); // no completed rows => nothing to save
});

test("refresh is enabled only for admin or when all rows are completed", async ({ page }) => {
  test.setTimeout(60_000);
  const btn = page.getByRole("button", { name: "Обновить" });
  await expect(btn).toBeDisabled(); // window.myUser = { isAdmin: false } by default
  expect(await page.evaluate(() => window.myUser.isAdmin)).toBe(false);
  await btn.hover({ force: true });
  await expect(page.locator("wup-popup")).toHaveText("Доступно только если все правильно"); // tooltip for disabled button
  await page.mouse.move(0, 0);
  await setAdmin(page, true);
  await expect(btn).toBeEnabled();
  await expect(btn).not.toHaveAttribute("w-tooltip"); // tooltip only for disabled button
  await setAdmin(page, false);
  await expect(btn).toBeDisabled();
  await page.evaluate(() => {
    window.myUser = { isAdmin: true };
  });
  await expect(btn).toBeEnabled();
  await page.evaluate(() => {
    window.myUser = {} as typeof window.myUser; // partial object: isAdmin is false by default
  });
  await expect(btn).toBeDisabled();
  expect(await page.evaluate(() => window.myUser.isAdmin)).toBe(false);

  for (let i = 1; i <= 20; ++i) {
    // eslint-disable-next-line no-await-in-loop
    await solveRow(page, i);
    // eslint-disable-next-line no-await-in-loop
    await expect(btn).toBeEnabled({ enabled: i === 20 });
  }
});

test("saves rows into excel on refresh if at least 1 row is completed", async ({ page }) => {
  await setAdmin(page, true);
  const task1 = await row(page, 1).locator("> div").first().innerText();
  await solveRow(page, 1);
  await typeAndLeave(input(row(page, 2), "unwrap"), "1 = 2");
  const summary = page.locator("[data-summary] > div");
  await expect(summary).toHaveText(["Итого", /^Потрачено \d+ сек$/, "1 / 1 / 1"]);

  const btn = page.getByRole("button", { name: "Обновить" });
  let [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  expect(download.suggestedFilename()).toBe("mathTest_1.xlsx");
  const text = readZipText(readFileSync((await download.path())!));
  expect(text).toContain(task1);
  expect(text).toContain("1 = 2"); // invalid values are saved too
  expect(text).toContain("Решено");
  expect(text).toContain("да");
  expect(text.toUpperCase()).toContain("1E9E4A"); // green font for valid inputs
  expect(text.toUpperCase()).toContain("E02424"); // red font for invalid inputs
  // summary row: row 1 is solved without mistakes, row 2 has 1 mistake
  expect(text).toContain("Итого");
  expect(text).toContain("без ошибок: 1");
  expect(text).toContain("Потрачено ");
  expect(text).toContain("с ошибками: 1");
  expect(text).toContain("1 из 20");

  await solveRow(page, 1);
  [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  expect(download.suggestedFilename()).toBe("mathTest_2.xlsx");
  await expect(summary).toHaveText(["Итого", "Потрачено 0 сек", "0 / 0 / 0"]); // reset by refresh
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
  /** Returns spent seconds from summary: `Потрачено 1 мин 2 сек` */
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
  await expect(row(page, 1).locator("[data-result]")).toHaveText(/^ошибки: 0, \d+;\d+;\d+ сек$/);
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
  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Обновить" }).click()]);
  const fresh = await getTasks();
  expect(fresh).not.toEqual(tasks);
  await page.waitForTimeout(600);
  await page.reload();
  expect(await getTasks()).toEqual(fresh);
  expect((await getValues()).slice(3).every((v) => !v)).toBe(true); // only example row is filled
  await expect(summary.locator("> div").nth(2)).toHaveText("0 / 0 / 0");
});

test("time & mistakes are visible only for admin", async ({ page }) => {
  const header = page.getByText("Время и ошибки");
  const summary = page.locator("[data-summary]");
  await solveRow(page, 1);
  await expect(row(page, 1).locator("[data-result]")).toHaveText(/^ошибки: 0, /); // it's calculated but hidden
  await expect(row(page, 1).locator("[data-result]")).toBeHidden();
  await expect(row(page, 0).locator("[data-result]")).toBeHidden();
  await expect(header).toBeHidden();
  await expect(summary).toBeHidden();

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
  await expect(page.locator("[data-summary] > div").nth(1)).toHaveText(/^Потрачено 1 мин \d+ сек$/);
});

test("spaces can't split numbers", async ({ page }) => {
  const r = row(page, 20); // the last row always has 2-digit number in extra brackets
  const { unwrap } = solve(await r.locator("> div").first().innerText());
  await typeAndLeave(input(r, "unwrap"), unwrap.replace(/(\d)(\d)/, "$1 $2"));
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "invalid");
  await typeAndLeave(input(r, "unwrap"), unwrap.replaceAll(" ", "  "));
  await expect(cell(r, "unwrap")).toHaveAttribute("data-state", "fixed");
});

test("tooltips with correct values are shown only for admin", async ({ page }) => {
  const r = row(page, 1);
  const { unwrap, isolate, x } = solve(await r.locator("> div").first().innerText());
  const setIsAdmin = (v: unknown): Promise<void> =>
    page.evaluate((isAdmin) => {
      window.myUser.isAdmin = isAdmin as number;
    }, v);
  const fields = ["unwrap", "isolate", "answer"] as const;

  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(0);
  await setIsAdmin(1); // any truthy value
  await expect(cell(r, "unwrap")).toHaveAttribute("w-tooltip", unwrap);
  await expect(cell(r, "isolate")).toHaveAttribute("w-tooltip", isolate);
  await expect(cell(r, "answer")).toHaveAttribute("w-tooltip", `x = ${x}`);
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(20 * fields.length); // except example row
  await cell(r, "isolate").hover();
  await expect(page.locator("wup-popup").getByText(isolate)).toBeVisible();

  await setIsAdmin(0); // any falsy value
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(0);
  await setIsAdmin(true);
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(20 * fields.length);
  await setIsAdmin(false);
  await expect(page.locator("[data-field][w-tooltip]")).toHaveCount(0);
});
