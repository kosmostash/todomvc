import { load } from "cheerio";
import type { Locator, Page } from "playwright";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { prepareHarness } from "_/test/pages";
import { useBrowser } from "~/lib/browser";
import type { Todo } from "~/types/todo";

const { page: filterPage, route, base } = await prepareHarness("{filter}");

const browser = useBrowser();

const TODO_ITEMS = ["buy some cheese", "feed the cat", "book a doctors appointment"];
const [ITEM_0, ITEM_1, ITEM_2] = TODO_ITEMS as [string, string, string];

const api = (path: string, init?: RequestInit) =>
  fetch(new URL(`/api/${path}`, base), {
    ...init,
    headers: { "content-type": "application/json" },
  });

const storedTodos = async (): Promise<Array<Todo>> => (await api("todos")).json();

// retrying assertion helpers, playwright locators are lazy
const texts = (locator: Locator) => expect.poll(() => locator.allTextContents());
const classes = (locator: Locator) =>
  expect.poll(async () =>
    (await locator.evaluateAll((els) => els.map((el) => el.className))),
  );
const count = (locator: Locator) => expect.poll(() => locator.count());
const visible = (locator: Locator) => expect.poll(() => locator.isVisible());

let page: Page;

const newTodo = () => page.getByPlaceholder("What needs to be done?");
const todoItems = () => page.locator(".todo-list li");
const toggleAll = () => page.getByLabel("Mark all as complete");
const clearCompleted = () => page.getByRole("button", { name: "Clear completed" });

const createTodos = async (items = TODO_ITEMS) => {
  for (const item of items) {
    await newTodo().fill(item);
    await newTodo().press("Enter");
    await expect.poll(() => todoItems().last().textContent()).toBe(item);
  }
};

const visit = async (filter?: "active" | "completed") => {
  await page.goto(filterPage.href(filter ? [filter] : []));
  // wait until hydrated and initial todos loaded
  await page.waitForLoadState("networkidle");
};

const resetTodos = async () => {
  await api("todos", { method: "PATCH", body: JSON.stringify({ completed: true }) });
  await api("todos", { method: "DELETE" });
};

describe(`${route}: server-rendered HTML`, () => {
  const render = async (filter?: string) => {
    const response = await fetch(filterPage.href(filter ? [filter] : []));
    return { status: response.status, $: load(await response.text()) };
  };

  const listed = ($: ReturnType<typeof load>) =>
    $(".todo-list li")
      .toArray()
      .map((li) => ({
        title: $(li).find("label").text(),
        className: $(li).attr("class") ?? "",
        checked: $(li).find(".toggle").is("[checked]"),
      }));

  const seed = async (todos: Array<[string, boolean]>) => {
    for (const [title, completed] of todos) {
      const todo: Todo = await (
        await api("todos", { method: "POST", body: JSON.stringify({ title }) })
      ).json();
      if (completed) {
        await api(`todos/${todo.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed }),
        });
      }
    }
  };

  beforeEach(resetTodos);

  test("renders only the header when there are no todos", async () => {
    const { status, $ } = await render();
    expect(status).toBe(200);
    expect($(".todoapp h1").text()).toBe("todos");
    expect($("input.new-todo").attr("placeholder")).toBe("What needs to be done?");
    expect($(".main")).toHaveLength(0);
    expect($(".footer")).toHaveLength(0);
  });

  describe("with todos", () => {
    beforeEach(() => seed([[ITEM_0, false], [ITEM_1, true], [ITEM_2, false]]));

    test("/ renders all todos", async () => {
      const { $ } = await render();
      expect(listed($)).toEqual([
        { title: ITEM_0, className: "", checked: false },
        { title: ITEM_1, className: "completed", checked: true },
        { title: ITEM_2, className: "", checked: false },
      ]);
      expect($(".filters a.selected").text()).toBe("All");
      expect($(".filters a.selected").attr("href")).toBe("/");
    });

    test("/active renders active todos only", async () => {
      const { $ } = await render("active");
      expect(listed($).map((t) => t.title)).toEqual([ITEM_0, ITEM_2]);
      expect($(".filters a.selected").text()).toBe("Active");
      expect($(".filters a.selected").attr("href")).toBe("/active");
    });

    test("/completed renders completed todos only", async () => {
      const { $ } = await render("completed");
      expect(listed($)).toEqual([{ title: ITEM_1, className: "completed", checked: true }]);
      expect($(".filters a.selected").text()).toBe("Completed");
      expect($(".filters a.selected").attr("href")).toBe("/completed");
    });

    test("footer reflects all todos regardless of filter", async () => {
      for (const filter of [undefined, "active", "completed"]) {
        const { $ } = await render(filter);
        expect($(".todo-count").text()).toBe("2 items left");
        expect($(".todo-count strong").text()).toBe("2");
        expect($("button.clear-completed").text()).toBe("Clear completed");
        expect($("#toggle-all").is("[checked]")).toBe(false);
      }
    });

    test("toggle-all is checked when all todos are completed", async () => {
      await api("todos", { method: "PATCH", body: JSON.stringify({ completed: true }) });
      const { $ } = await render();
      expect($("#toggle-all").is("[checked]")).toBe(true);
      expect($(".todo-count").text()).toBe("0 items left");
    });

    test("clear completed is not rendered without completed todos", async () => {
      await api("todos", { method: "PATCH", body: JSON.stringify({ completed: false }) });
      const { $ } = await render();
      expect($("button.clear-completed")).toHaveLength(0);
      expect($(".todo-count").text()).toBe("3 items left");
    });
  });

  test("singular item counter", async () => {
    await seed([[ITEM_0, false]]);
    const { $ } = await render();
    expect($(".todo-count").text()).toBe("1 item left");
  });

  test("unknown filter renders the 404 page", async () => {
    const { $ } = await render("unknown");
    expect($(".todoapp h1").text()).toBe("404");
    expect($(".todo-list")).toHaveLength(0);
  });
});

describe(route, () => {
  beforeEach(async () => {
    await resetTodos();
    page = await browser.newPage();
    await visit();
  });

  afterEach(async () => {
    await page.close();
  });

  describe("No Todos", () => {
    test("should hide #main and #footer", async () => {
      await count(todoItems()).toBe(0);
      await visible(page.locator(".main")).toBe(false);
      await visible(page.locator(".footer")).toBe(false);
    });
  });

  describe("New Todo", () => {
    test("should focus the input on load", async () => {
      await expect
        .poll(() => newTodo().evaluate((el) => el === document.activeElement))
        .toBe(true);
    });

    test("should allow me to add todo items", async () => {
      await createTodos([ITEM_0, ITEM_1]);
      await texts(todoItems()).toEqual([ITEM_0, ITEM_1]);
      await expect.poll(storedTodos).toMatchObject([{ title: ITEM_0 }, { title: ITEM_1 }]);
    });

    test("should clear text input field when an item is added", async () => {
      await createTodos([ITEM_0]);
      await expect.poll(() => newTodo().inputValue()).toBe("");
    });

    test("should append new items to the bottom of the list", async () => {
      await createTodos();
      await texts(page.locator(".todo-count")).toEqual(["3 items left"]);
      await texts(todoItems()).toEqual(TODO_ITEMS);
    });

    test("should trim text input", async () => {
      await newTodo().fill(`   ${ITEM_0}  `);
      await newTodo().press("Enter");
      await texts(todoItems()).toEqual([ITEM_0]);
      await expect.poll(storedTodos).toMatchObject([{ title: ITEM_0 }]);
    });

    test("should not add empty todos", async () => {
      await newTodo().fill("    ");
      await newTodo().press("Enter");
      await count(todoItems()).toBe(0);
      expect(await storedTodos()).toEqual([]);
    });

    test("should show #main and #footer when items added", async () => {
      await createTodos([ITEM_0]);
      await visible(page.locator(".main")).toBe(true);
      await visible(page.locator(".footer")).toBe(true);
    });
  });

  describe("Mark all as completed", () => {
    beforeEach(() => createTodos());

    test("should allow me to mark all items as completed", async () => {
      await toggleAll().check();
      await classes(todoItems()).toEqual(["completed", "completed", "completed"]);
      await expect
        .poll(async () => (await storedTodos()).every((t) => t.completed))
        .toBe(true);
    });

    test("should allow me to clear the complete state of all items", async () => {
      await toggleAll().check();
      await toggleAll().uncheck();
      await classes(todoItems()).toEqual(["", "", ""]);
      await expect
        .poll(async () => (await storedTodos()).some((t) => t.completed))
        .toBe(false);
    });

    test("complete all checkbox should update state when items are completed / cleared", async () => {
      await toggleAll().check();
      await expect.poll(() => toggleAll().isChecked()).toBe(true);

      const first = todoItems().nth(0).locator(".toggle");
      await first.uncheck();
      await expect.poll(() => toggleAll().isChecked()).toBe(false);

      await first.check();
      await expect.poll(() => toggleAll().isChecked()).toBe(true);
    });
  });

  describe("Item", () => {
    test("should allow me to mark items as complete", async () => {
      await createTodos([ITEM_0, ITEM_1]);

      await todoItems().nth(0).locator(".toggle").check();
      await classes(todoItems()).toEqual(["completed", ""]);

      await todoItems().nth(1).locator(".toggle").check();
      await classes(todoItems()).toEqual(["completed", "completed"]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.completed))
        .toEqual([true, true]);
    });

    test("should allow me to un-mark items as complete", async () => {
      await createTodos([ITEM_0, ITEM_1]);
      const first = todoItems().nth(0).locator(".toggle");

      await first.check();
      await classes(todoItems()).toEqual(["completed", ""]);

      await first.uncheck();
      await classes(todoItems()).toEqual(["", ""]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.completed))
        .toEqual([false, false]);
    });

    test("should allow me to edit an item", async () => {
      await createTodos();
      const second = todoItems().nth(1);
      await second.dblclick();
      await expect.poll(() => second.locator(".edit").inputValue()).toBe(ITEM_1);
      await second.locator(".edit").fill("buy some sausages");
      await second.locator(".edit").press("Enter");

      await texts(todoItems()).toEqual([ITEM_0, "buy some sausages", ITEM_2]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.title))
        .toEqual([ITEM_0, "buy some sausages", ITEM_2]);
    });

    test("should remove an item via the destroy button", async () => {
      await createTodos();
      const second = todoItems().nth(1);
      await second.hover();
      await second.locator(".destroy").click();

      await texts(todoItems()).toEqual([ITEM_0, ITEM_2]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.title))
        .toEqual([ITEM_0, ITEM_2]);
    });
  });

  describe("Editing", () => {
    beforeEach(() => createTodos());

    test("should hide other controls when editing", async () => {
      const second = todoItems().nth(1);
      await second.dblclick();
      await classes(second).toEqual(["editing"]);
      await visible(second.locator(".toggle")).toBe(false);
      await visible(second.locator("label")).toBe(false);
      await expect
        .poll(() => second.locator(".edit").evaluate((el) => el === document.activeElement))
        .toBe(true);
    });

    test("should save edits on blur", async () => {
      const second = todoItems().nth(1);
      await second.dblclick();
      await second.locator(".edit").fill("buy some sausages");
      await second.locator(".edit").blur();

      await texts(todoItems()).toEqual([ITEM_0, "buy some sausages", ITEM_2]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.title))
        .toEqual([ITEM_0, "buy some sausages", ITEM_2]);
    });

    test("should trim entered text", async () => {
      const second = todoItems().nth(1);
      await second.dblclick();
      await second.locator(".edit").fill("    buy some sausages    ");
      await second.locator(".edit").press("Enter");

      await texts(todoItems()).toEqual([ITEM_0, "buy some sausages", ITEM_2]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.title))
        .toEqual([ITEM_0, "buy some sausages", ITEM_2]);
    });

    test("should remove the item if an empty text string was entered", async () => {
      const second = todoItems().nth(1);
      await second.dblclick();
      await second.locator(".edit").fill("   ");
      await second.locator(".edit").press("Enter");

      await texts(todoItems()).toEqual([ITEM_0, ITEM_2]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.title))
        .toEqual([ITEM_0, ITEM_2]);
    });

    test("should cancel edits on escape", async () => {
      const second = todoItems().nth(1);
      await second.dblclick();
      await second.locator(".edit").fill("buy some sausages");
      await second.locator(".edit").press("Escape");

      await classes(second).toEqual([""]);
      await texts(todoItems()).toEqual(TODO_ITEMS);
      expect((await storedTodos()).map((t) => t.title)).toEqual(TODO_ITEMS);
    });
  });

  describe("Counter", () => {
    test("should display the current number of todo items", async () => {
      const counter = page.locator(".todo-count");
      await createTodos([ITEM_0]);
      await texts(counter).toEqual(["1 item left"]);
      await texts(counter.locator("strong")).toEqual(["1"]);

      await createTodos([ITEM_1]);
      await texts(counter).toEqual(["2 items left"]);

      await toggleAll().check();
      await texts(counter).toEqual(["0 items left"]);
    });
  });

  describe("Clear completed button", () => {
    beforeEach(() => createTodos());

    test("should display the correct text", async () => {
      await todoItems().nth(0).locator(".toggle").check();
      await texts(clearCompleted()).toEqual(["Clear completed"]);
    });

    test("should remove completed items when clicked", async () => {
      await todoItems().nth(1).locator(".toggle").check();
      await clearCompleted().click();

      await texts(todoItems()).toEqual([ITEM_0, ITEM_2]);
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.title))
        .toEqual([ITEM_0, ITEM_2]);
    });

    test("should be hidden when there are no items that are completed", async () => {
      await count(clearCompleted()).toBe(0);
      await todoItems().nth(0).locator(".toggle").check();
      await count(clearCompleted()).toBe(1);
      await clearCompleted().click();
      await count(clearCompleted()).toBe(0);
    });
  });

  describe("Persistence", () => {
    test("should persist its data on the server", async () => {
      await createTodos([ITEM_0, ITEM_1]);
      await todoItems().nth(0).locator(".toggle").check();
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.completed))
        .toEqual([true, false]);

      await page.reload();
      await texts(todoItems()).toEqual([ITEM_0, ITEM_1]);
      await classes(todoItems()).toEqual(["completed", ""]);
    });
  });

  describe("Routing", () => {
    const link = (name: string) => page.getByRole("link", { name, exact: true });

    beforeEach(async () => {
      await createTodos();
      await todoItems().nth(1).locator(".toggle").check();
      await expect
        .poll(async () => (await storedTodos()).map((t) => t.completed))
        .toEqual([false, true, false]);
    });

    test("should allow me to display active items", async () => {
      await link("Active").click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/active");
      await texts(todoItems()).toEqual([ITEM_0, ITEM_2]);
    });

    test("should respect the back button", async () => {
      await link("All").click();
      await count(todoItems()).toBe(3);
      await link("Active").click();
      await count(todoItems()).toBe(2);
      await link("Completed").click();
      await count(todoItems()).toBe(1);
      await page.goBack();
      await count(todoItems()).toBe(2);
      await page.goBack();
      await count(todoItems()).toBe(3);
    });

    test("should allow me to display completed items", async () => {
      await link("Completed").click();
      await texts(todoItems()).toEqual([ITEM_1]);
    });

    test("should allow me to display all items", async () => {
      await link("Active").click();
      await link("Completed").click();
      await link("All").click();
      await count(todoItems()).toBe(3);
    });

    test("should load the filter from the URL", async () => {
      await visit("completed");
      await texts(todoItems()).toEqual([ITEM_1]);
      await classes(link("Completed")).toEqual(["selected"]);
    });

    test("should render 404 for an unknown filter", async () => {
      await page.goto(filterPage.href(["unknown"]));
      await texts(page.locator(".todoapp h1")).toEqual(["404"]);
      await count(page.locator(".todo-list")).toBe(0);
    });

    test("should highlight the currently applied filter", async () => {
      await classes(link("All")).toEqual(["selected"]);
      await link("Active").click();
      await classes(link("Active")).toEqual(["selected"]);
      await link("Completed").click();
      await classes(link("Completed")).toEqual(["selected"]);
    });
  });
});
