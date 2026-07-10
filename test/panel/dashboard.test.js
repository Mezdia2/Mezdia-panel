import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import vm from "vm";

const WORKER_PATH = resolve(__dirname, "../../src/panel/worker.js");

let getDashboardUI;
let serveSubscriptionInfoPage;

beforeAll(() => {
  const src = readFileSync(WORKER_PATH, "utf-8");
  const lines = src.split("\n");

  // Extract getDashboardUI (lines 1872-2466)
  const dashboardFn = lines.slice(1871, 2466).join("\n");

  // Extract serveSubscriptionInfoPage (lines 2489-2495)
  const subPageFn = lines.slice(2488, 2495).join("\n");

  // Build mock context with all globals the functions need
  const mockContext = {
    BRAND_NAME: "Mezdia Panel",
    CURRENT_VERSION: "3.2.5",
    accountUsageSnapshot: () => ({
      upload: 0,
      download: 0,
      total: 0,
      dailyUpload: 0,
      dailyDownload: 0,
      dailyTotal: 0,
      reqs: 0,
      dailyReqs: 0,
      gb: 0,
    }),
    Response: globalThis.Response,
    console: globalThis.console,
    Math: globalThis.Math,
    Array: globalThis.Array,
    encodeURIComponent: globalThis.encodeURIComponent,
  };

  // Create a vm context and compile the functions inside it
  const ctx = vm.createContext(mockContext);
  vm.runInContext(dashboardFn, ctx);
  vm.runInContext(subPageFn, ctx);

  getDashboardUI = vm.runInContext("getDashboardUI", ctx);
  serveSubscriptionInfoPage = vm.runInContext("serveSubscriptionInfoPage", ctx);
});

describe("getDashboardUI", () => {
  it("returns a valid HTML document", () => {
    const html = getDashboardUI(true);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("sets Persian RTL direction", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('lang="fa"');
    expect(html).toContain('dir="rtl"');
  });

  it("includes dark theme by default", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('data-theme="dark"');
  });

  it("includes the brand name in the title", () => {
    const html = getDashboardUI(true);
    expect(html).toContain("<title>Mezdia Panel</title>");
  });

  it("loads DM Sans, Vazirmatn and JetBrains Mono fonts", () => {
    const html = getDashboardUI(true);
    expect(html).toContain("DM+Sans");
    expect(html).toContain("Vazirmatn");
    expect(html).toContain("JetBrains+Mono");
  });

  it("contains the Horizon UI Chakra color palette", () => {
    const html = getDashboardUI(true);
    // New Horizon UI Chakra colors
    expect(html).toContain("#422AFB");
    expect(html).toContain("#0b1437");
    expect(html).toContain("#111c44");
    // No more old blue/pink colors
    expect(html).not.toContain("#8b5cf6");
    expect(html).not.toContain("#ec4899");
  });

  it("does not contain decorative blobs", () => {
    const html = getDashboardUI(true);
    expect(html).not.toContain("body::before");
    expect(html).not.toContain("body::after");
    expect(html).not.toContain("filter: blur(100px)");
  });

  it("includes all 5 navigation tabs", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('data-tab="overview"');
    expect(html).toContain('data-tab="account"');
    expect(html).toContain('data-tab="settings"');
    expect(html).toContain('data-tab="api"');
    expect(html).toContain('data-tab="logs"');
  });

  it("contains login form", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="login"');
    expect(html).toContain('id="password"');
    expect(html).toContain("ورود به پنل");
  });

  it("shows DB warning when hasDB is false", () => {
    const html = getDashboardUI(false);
    expect(html).toContain("پایگاه‌داده (IOT_DB) متصل نیست");
  });

  it("hides DB warning when hasDB is true", () => {
    const html = getDashboardUI(true);
    expect(html).not.toContain("IOT_DB");
  });

  it("includes the version pill", () => {
    const html = getDashboardUI(true);
    expect(html).toContain("v3.2.5");
  });

  it("has the subscription section with QR code", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="qr-img"');
    expect(html).toContain('id="sub-url"');
    expect(html).toContain("لینک اشتراک");
  });

  it("has chart canvases", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="chart-total"');
    expect(html).toContain('id="chart-daily"');
    expect(html).toContain('id="chart-session"');
  });

  it("has traffic meter elements", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="meter-upload-total"');
    expect(html).toContain('id="meter-download-total"');
    expect(html).toContain('id="meter-upload-daily"');
    expect(html).toContain('id="meter-download-daily"');
  });

  it("has account settings section", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="account-name"');
    expect(html).toContain('id="account-status"');
    expect(html).toContain('id="account-notes"');
  });

  it("has system settings section", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="cfg-name"');
    expect(html).toContain('id="cfg-apiRoute"');
    expect(html).toContain('id="cfg-masterKey"');
    expect(html).toContain('id="cfg-deviceId"');
  });

  it("has API documentation section", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="api-examples"');
    expect(html).toContain("MEZDIA_API_KEY");
  });

  it("has logs section with table", () => {
    const html = getDashboardUI(true);
    expect(html).toContain('id="log-body"');
    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
  });

  it("includes theme toggle functionality", () => {
    const html = getDashboardUI(true);
    expect(html).toContain("toggleTheme");
    expect(html).toContain('id="theme-icon-dark"');
    expect(html).toContain('id="theme-icon-light"');
  });

  it("has responsive styles", () => {
    const html = getDashboardUI(true);
    expect(html).toContain("@media");
    expect(html).toContain("max-width:1024px");
  });

  it("includes the nav footer label", () => {
    const html = getDashboardUI(true);
    expect(html).toContain("MEZDIA");
    expect(html).toContain("PANEL");
  });

  it("has login card with shadow styling", () => {
    const html = getDashboardUI(true);
    expect(html).toContain(".login-card");
    expect(html).toContain("box-shadow");
  });
});

describe("serveSubscriptionInfoPage", () => {
  const mockAccount = {
    name: "Test Account",
    isPaused: false,
  };

  const mockSysConfig = {
    isPaused: false,
    apiRoute: "sync",
  };

  it("returns an HTML Response", () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("contains Persian RTL markup", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain('lang="fa"');
    expect(html).toContain('dir="rtl"');
  });

  it("shows the brand name", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain("Mezdia Panel");
  });

  it("shows account name", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain("Test Account");
  });

  it("defaults account name to پیش‌فرض when empty", async () => {
    const res = serveSubscriptionInfoPage(
      { name: "", isPaused: false },
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain("پیش‌فرض");
  });

  it("shows فعال status when not paused", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain("فعال");
  });

  it("shows متوقف status when account is paused", async () => {
    const res = serveSubscriptionInfoPage(
      { name: "Paused", isPaused: true },
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain("متوقف");
  });

  it("shows متوقف status when sysConfig is paused", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      { ...mockSysConfig, isPaused: true }
    );
    const html = await res.text();
    expect(html).toContain("متوقف");
  });

  it("includes the subscription URL", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain("https://worker.test.dev/sync");
  });

  it("uses the correct apiRoute in URL", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      { ...mockSysConfig, apiRoute: "custom-route" }
    );
    const html = await res.text();
    expect(html).toContain("https://worker.test.dev/custom-route");
  });

  it("displays traffic usage in GB", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    expect(html).toContain("گیگابایت");
  });

  it("sets Cache-Control to no-store", () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("uses the new Horizon UI Chakra design colors", async () => {
    const res = serveSubscriptionInfoPage(
      mockAccount,
      "worker.test.dev",
      null,
      {},
      "device-1",
      mockSysConfig
    );
    const html = await res.text();
    // New Horizon UI Chakra colors
    expect(html).toContain("#0b1437");
    expect(html).toContain("#422AFB");
    expect(html).toContain("#7551FF");
    expect(html).toContain("#111c44");
  });
});
