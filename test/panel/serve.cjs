const http = require("http");
const fs = require("fs");
const path = require("path");

const WORKER_PATH = path.join(__dirname, "../../src/panel/worker.js");

// Extract getDashboardUI from worker.js
const src = fs.readFileSync(WORKER_PATH, "utf-8");
const lines = src.split("\n");
const dashboardFn = lines.slice(1871, 2382).join("\n");

// Set up globals
const BRAND_NAME = "Mezdia Panel";
const CURRENT_VERSION = "3.2.5";

// Compile the function
const fnBody = dashboardFn.replace(/^function\s+getDashboardUI\s*\(/, "return function getDashboardUI(");
const factory = new Function("BRAND_NAME", "CURRENT_VERSION", fnBody);
const getDashboardUI = factory(BRAND_NAME, CURRENT_VERSION);

const PORT = 3000;

// Mock data for API responses
const mockConfig = {
  name: "Mezdia Panel",
  apiRoute: "sync",
  masterKey: "test123",
  deviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  mode: "alpha",
  socketPorts: "443,8443",
  agent: "chrome",
  maintenanceHost: "https://www.ubuntu.com",
  cleanIps: "",
  backupRelay: "",
  customRelay: "",
  slaveNodes: "",
  customDns: "",
  metricNode: "",
  namePrefix: "",
  nameStrategy: "",
  subUserAgent: "",
  customPanelUrl: "",
  enableOpt1: false,
  enableOpt2: false,
  isPaused: false,
};

const mockAccount = {
  name: "حساب اصلی",
  status: "active",
  notes: "توضیحات تستی",
  cleanIp: "",
  proxyIp: "",
  userMode: "",
  userPorts: "",
  maxConfigs: 0,
  usage: {
    uploadBytes: 536870912,
    downloadBytes: 1073741824,
    totalGB: "1.50",
    dailyUploadBytes: 52428800,
    dailyDownloadBytes: 104857600,
    dailyGB: "0.15",
    totalRequests: 1250,
    dailyRequests: 45,
  },
  subscriptionUrl: "https://example.com/sync",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const reqPath = url.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Dashboard HTML
  if (reqPath === "/" || reqPath === "/dash") {
    const hasDB = url.searchParams.get("db") !== "false";
    const html = getDashboardUI(hasDB);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  // Subscription info page
  if (reqPath === "/sub") {
    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>اشتراک ${BRAND_NAME}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet"><style>body{margin:0;background:#0b1120;color:#f1f5f9;font-family:'Vazirmatn',system-ui,sans-serif;padding:32px;line-height:1.8}.card{max-width:640px;margin:40px auto;background:rgba(15,23,42,0.6);border:1px solid rgba(148,163,184,0.08);border-radius:16px;padding:26px}h1{font-size:18px;margin:0 0 16px;display:flex;align-items:center;gap:10px}.mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#3b82f6);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff}code{background:rgba(15,23,42,0.6);border:1px solid rgba(148,163,184,0.08);border-radius:6px;padding:4px 8px;word-break:break-all;direction:ltr;display:inline-block;font-size:12px;font-family:'JetBrains Mono',monospace}.row{margin:12px 0;color:#94a3b8;font-size:13px}.row strong{color:#f1f5f9}</style></head><body><div class="card"><h1><span class="mark">M</span> ${BRAND_NAME}</h1><p class="row">نام حساب: <strong>حساب تست</strong></p><p class="row">وضعیت: <strong>فعال</strong></p><p class="row">ترافیک مصرفی: <strong>1.50 گیگابایت</strong></p><p class="row">لینک اشتراک:</p><p><code>https://example.com/sync</code></p></div></body></html>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  // API: Auth (login)
  if (reqPath === "/sync/api/auth" && req.method === "POST") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ config: mockConfig, account: mockAccount, deviceId: mockConfig.deviceId, version: CURRENT_VERSION }));
  }

  // API: Config
  if (reqPath === "/sync/api/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(mockConfig));
  }

  // API: Account
  if (reqPath === "/sync/api/account") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(mockAccount));
  }

  // API: Stats
  if (reqPath === "/sync/api/stats") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ activeConnections: 3, totalConnections: 128 }));
  }

  // API: Logs
  if (reqPath === "/sync/api/logs") {
    const logs = [
      { time: "14:32:01", type: "connect", detail: "Client connected from 192.168.1.10" },
      { time: "14:31:45", type: "auth", detail: "Config synced successfully" },
      { time: "14:30:12", type: "connect", detail: "Client connected from 10.0.0.5" },
      { time: "14:28:33", type: "error", detail: "Connection timeout to relay" },
      { time: "14:25:00", type: "connect", detail: "Client connected from 172.16.0.1" },
    ];
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(logs));
  }

  // API: Settings sync
  if (reqPath === "/sync/api/sync" && req.method === "POST") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`\n  Panel is running at:\n`);
  console.log(`    Dashboard:  http://localhost:${PORT}/`);
  console.log(`    No DB:      http://localhost:${PORT}/?db=false`);
  console.log(`    Subscription: http://localhost:${PORT}/sub`);
  console.log(`\n  Press Ctrl+C to stop.\n`);
});
