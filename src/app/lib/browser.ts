import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll } from "vitest";

/**
 * The KosmoJS harness owns the server, not the browser -
 * launch one per test file and close it when the file is done.
 * */
export const useBrowser = () => {
  let browser: Browser | undefined;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser?.close();
  });

  return {
    newPage: () => {
      if (!browser) throw new Error("browser not launched yet");
      return browser.newPage();
    },
  };
};
