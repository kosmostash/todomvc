import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

/**
 * The TodoMVC spec is behavioural, so this suite drives the real thing:
 * production build, server-rendered pages, SQLite behind the API.
 */

const newTodoField = (page: Page) => page.getByPlaceholder("What needs to be done?");
const items = (page: Page) => page.locator(".todo-list li");
const counter = (page: Page) => page.locator(".todo-count");

const addTodos = async (page: Page, ...titles: Array<string>) => {
  for (const title of titles) {
    await newTodoField(page).fill(title);
    await newTodoField(page).press("Enter");
    await expect(items(page).filter({ hasText: title })).toHaveCount(1);
  }
};

const editTodo = async (page: Page, title: string, value: string) => {
  const item = items(page).filter({ hasText: title });
  await item.locator("label").dblclick();
  await item.locator(".edit").fill(value);
  return item;
};

const clearTodos = async (request: APIRequestContext) => {
  const todos: Array<{ id: number }> = await (await request.get("/api/todos")).json();

  for (const { id } of todos) {
    await request.delete(`/api/todos/${id}`);
  }
};

/** The page is server-rendered, so wait for the client bundle before driving it. */
const open = async (page: Page, path = "/") => {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
};

test.beforeEach(async ({ page, request }) => {
  await clearTodos(request);
  await open(page);
});

test("renders the list on the server", async ({ page, request }) => {
  await addTodos(page, "Taste JavaScript");

  const html = await (await request.get("/")).text();

  // present in the markup itself, before any JavaScript runs
  expect(html).toContain("Taste JavaScript");
  expect(html).toContain('<span class="todo-count">');
});

test("adds todos and ignores blank input", async ({ page }) => {
  await addTodos(page, "Taste JavaScript", "Buy a unicorn");

  await newTodoField(page).fill("   ");
  await newTodoField(page).press("Enter");

  // a blank title is not a todo, and the field keeps what was typed
  await expect(items(page)).toHaveCount(2);
  await expect(counter(page)).toHaveText("2 items left");
});

test("toggles a todo and keeps the counter honest", async ({ page }) => {
  await addTodos(page, "Taste JavaScript", "Buy a unicorn");

  await items(page).first().locator(".toggle").check();

  await expect(items(page).first()).toHaveClass(/completed/);
  await expect(counter(page)).toHaveText("1 item left");

  await items(page).first().locator(".toggle").uncheck();
  await expect(counter(page)).toHaveText("2 items left");
});

test("edits a todo, cancelling on Escape and committing on Enter", async ({ page }) => {
  await addTodos(page, "Taste JavaScript");

  let item = await editTodo(page, "Taste JavaScript", "Taste Rust");
  await item.locator(".edit").press("Escape");
  await expect(items(page).first()).toHaveText("Taste JavaScript");

  item = await editTodo(page, "Taste JavaScript", "Taste TypeScript");
  await item.locator(".edit").press("Enter");
  await expect(items(page).first()).toHaveText("Taste TypeScript");

  // the change reached the database, not just the component
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(items(page).first()).toHaveText("Taste TypeScript");
});

test("destroys a todo, by button and by emptying its title", async ({ page }) => {
  await addTodos(page, "Taste JavaScript", "Buy a unicorn");

  const first = items(page).first();
  await first.hover();
  await first.locator(".destroy").click();
  await expect(items(page)).toHaveCount(1);

  const item = await editTodo(page, "Buy a unicorn", "   ");
  await item.locator(".edit").press("Enter");
  await expect(items(page)).toHaveCount(0);

  // an empty list hides the main section and the footer
  await expect(page.locator(".main")).toHaveCount(0);
  await expect(page.locator(".footer")).toHaveCount(0);
});

test("toggles all todos and clears the completed ones", async ({ page }) => {
  await addTodos(page, "Taste JavaScript", "Buy a unicorn");

  await page.locator("label[for=toggle-all]").click();
  await expect(counter(page)).toHaveText("0 items left");
  await expect(items(page).filter({ has: page.locator(".toggle:checked") })).toHaveCount(2);

  await page.locator(".clear-completed").click();
  await expect(items(page)).toHaveCount(0);
});

test("filters through routed pages, on click and on direct hit", async ({ page }) => {
  await addTodos(page, "Taste JavaScript", "Buy a unicorn");
  await items(page).first().locator(".toggle").check();

  await page.getByRole("link", { name: "Active" }).click();
  await expect(page).toHaveURL(/\/active$/);
  await expect(items(page)).toHaveText(["Buy a unicorn"]);

  await page.getByRole("link", { name: "Completed" }).click();
  await expect(page).toHaveURL(/\/completed$/);
  await expect(items(page)).toHaveText(["Taste JavaScript"]);

  // the filter is a URL, so it survives a cold load
  await open(page, "/completed");
  await expect(items(page)).toHaveText(["Taste JavaScript"]);
  await expect(page.locator(".filters .selected")).toHaveText("Completed");

  await page.getByRole("link", { name: "All" }).click();
  await expect(items(page)).toHaveCount(2);
});

test("keeps todos across a reload", async ({ page }) => {
  await addTodos(page, "Taste JavaScript");
  await items(page).first().locator(".toggle").check();

  await page.reload();
  await page.waitForLoadState("networkidle");

  await expect(items(page)).toHaveCount(1);
  await expect(items(page).first()).toHaveClass(/completed/);
});

test("surfaces an API error instead of failing silently", async ({ page }) => {
  await addTodos(page, "Taste JavaScript");

  // the todo is gone by the time the click lands
  await page.route("**/api/todos/*", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "No todo with id 1" }),
    }),
  );

  await items(page).first().locator(".toggle").check();

  await expect(page.getByRole("alert")).toContainText("No todo with id 1");
});

test("shows a 404 page for an unknown URL", async ({ page, request }) => {
  const response = await request.get("/nope", { maxRedirects: 0 });
  expect(response.status()).toBe(404);

  await open(page, "/nope");
  await expect(page.getByText("nothing to do here")).toBeVisible();
});
