import { sendMessage } from "../lib/telegram.js";
import { ensureUser, getSession, clearSession, setSession, getAccounts, getAccount, getDeployment, deploymentsForAccount, getUserVersion, setUserVersion, registerUser, getAllUserIds } from "../lib/kv.js";
import { T } from "../ui/text.js";
import { mainMenuKb, cancelKb, removeMenuKb, accountsListKb, accountDetailKb, confirmRemoveAccountKb, deploymentsListKb, deploymentDetailKb, confirmDeleteDeploymentKb, updateNotificationKb, updateSelectKb } from "../ui/keyboards.js";
import { showMainMenu, showHelp, handleCancel } from "./start.js";
import {
  startAddAccount,
  handleTokenMessage,
  handleAccountPickReply,
  listAccountsScreen,
  showAccountDetail,
  confirmRemoveAccountScreen,
  removeAccountConfirmed,
} from "./accounts.js";
import {
  startDeploy,
  handleLabelMessage,
  listDeploymentsScreen,
  showDeploymentDetail,
  showStats,
  showCreds,
  showLogs,
  pauseDeployment,
  resumeDeployment,
  resetTraffic,
  updateWorker,
  confirmDeleteDeploymentScreen,
  deleteDeploymentConfirmed,
  batchUpdateDeployments,
} from "./deployments.js";
import { PANEL_VERSION } from "../config.js";
import { parseChangelog } from "../ui/text.js";

// ---- Button text → action mapping ----

const BUTTON_ACTIONS = {
  "➕ افزودن حساب کلادفلر": "addAccount",
  "☁️ حساب‌های من": "listAccounts",
  "❓ راهنما": "help",
  "🔙 بازگشت به منوی اصلی": "mainMenu",
  "✖️ لغو": "cancel",
  "🚀 دیپلوی ورکر جدید": "deploy",
  "📋 ورکرهای این حساب": "listDeployments",
  "🗑 حذف این حساب": "confirmRemoveAccount",
  "🔙 بازگشت به لیست حساب‌ها": "listAccounts",
  "📊 وضعیت و مصرف": "stats",
  "🔐 اطلاعات دسترسی": "creds",
  "📜 گزارش‌ها": "logs",
  "⏸ توقف": "pause",
  "▶️ فعال‌سازی": "resume",
  "🔁 بازنشانی ترافیک": "resetTraffic",
  "🔄 بروزرسانی ورکر": "updateWorker",
  "🗑 حذف ورکر": "confirmDelete",
  "🔙 بازگشت به حساب": "accountDetail",
  "🔙 بازگشت": "back",
  "✅ بله، حذف کن": "deleteConfirmed",
  "✖️ انصراف": "cancelAction",
  "🔄 بروزرسانی همه": "updateAll",
  "🔄 انتخاب حساب‌ها": "updateSelect",
  "🔄 بروزرسانی انتخاب شده": "updateSelected",
  "✖️ رد کردن": "skipUpdate",
  "➕ افزودن حساب جدید": "addAccount",
};

// ---- Version check for auto-update notifications ----

// Simple KV-backed mutex so concurrent webhook invocations don't each trigger
// a full broadcast (which would otherwise spam users with duplicate messages).
async function acquireLock(env, key, ttlSeconds) {
  const existing = await env.BOT_DB.get(key);
  if (existing) return false;
  await env.BOT_DB.put(key, String(Date.now()), { expirationTtl: ttlSeconds });
  return true;
}
async function releaseLock(env, key) {
  try { await env.BOT_DB.delete(key); } catch (e) { /* ignore */ }
}

async function checkAndBroadcastUpdate(env) {
  try {
    const lastBroadcast = await env.BOT_DB.get("last_broadcast_version");
    if (lastBroadcast === PANEL_VERSION) return;

    // Only one invocation should perform the broadcast at a time.
    const locked = await acquireLock(env, "update_broadcast_lock", 300);
    if (!locked) return;

    try {
      const changelog = parseChangelog(PANEL_VERSION);
      const userIds = await getAllUserIds(env);

      for (const tgId of userIds) {
        const userVer = await getUserVersion(env, tgId);
        if (userVer && userVer.version === PANEL_VERSION) continue;

        const deployments = await deploymentsForAccount(env, tgId, null);
        if (deployments.length === 0) continue;

        try {
          // NOTE: we deliberately do NOT set a session here. The notification
          // arrives as a standalone message; the user's active conversation
          // (if any) stays intact. The update actions are resolved later from
          // the button text via the normal BUTTON_ACTIONS mapping.
          await sendMessage(env, tgId, T.updateNotification(PANEL_VERSION, changelog), {
            keyboard: updateNotificationKb(),
          });
          await setUserVersion(env, tgId, PANEL_VERSION);
        } catch (e) {
          console.error("Failed to notify user about update", tgId, e);
        }
      }

      await env.BOT_DB.put("last_broadcast_version", PANEL_VERSION);
    } finally {
      await releaseLock(env, "update_broadcast_lock");
    }
  } catch (e) {
    console.error("Version check failed", e);
  }
}

// ---- Main message router ----

export async function routeMessage(env, message, ctx) {
  const chatId = message.chat.id;
  const tgId = message.from.id;
  const text = (message.text || "").trim();

  await ensureUser(env, tgId, { firstName: message.from.first_name, username: message.from.username });

  // Register user for update notifications
  try {
    await registerUser(env, tgId);
  } catch (e) { /* non-critical */ }

  // Check for version updates (non-blocking)
  if (ctx) ctx.waitUntil(checkAndBroadcastUpdate(env));

  // Handle commands
  if (text === "/start") {
    await clearSession(env, tgId);
    await showMainMenu(env, chatId, tgId, true);
    return;
  }
  if (text === "/help") {
    await showHelp(env, chatId, tgId);
    return;
  }
  if (text === "/cancel") {
    await handleCancel(env, chatId, tgId);
    return;
  }

  // Handle conversation states (awaiting input)
  const session = await getSession(env, tgId);

  // Awaiting free-text input — but allow the cancel button / command to abort.
  if (session?.state === "awaiting_cf_token") {
    if (text === "✖️ لغو" || text === "/cancel") { await handleCancel(env, chatId, tgId); return; }
    await handleTokenMessage(env, chatId, tgId, text);
    return;
  }
  if (session?.state === "awaiting_deploy_label") {
    if (text === "✖️ لغو" || text === "/cancel") { await handleCancel(env, chatId, tgId); return; }
    await handleLabelMessage(env, chatId, tgId, text, session);
    return;
  }
  if (session?.state === "awaiting_cf_account_pick") {
    if (text === "✖️ لغو" || text === "/cancel") { await handleCancel(env, chatId, tgId); return; }
    await handleAccountPickReply(env, chatId, tgId, text, session);
    return;
  }

  // Handle reply keyboard button presses
  if (session?.state?.startsWith("kb_")) {
    const action = BUTTON_ACTIONS[text];
    if (action) {
      await handleButtonAction(env, chatId, tgId, action, session);
      return;
    }

    // Handle dynamic buttons (account names, deployment names)
    const dynamicHandled = await handleDynamicButton(env, chatId, tgId, text, session);
    if (dynamicHandled) return;
  }

  // No session or unrecognized input
  if (!session) {
    await sendMessage(env, chatId, "برای شروع /start را بفرستید.", { keyboard: mainMenuKb() });
  } else {
    await clearSession(env, tgId);
    await sendMessage(env, chatId, T.genericError, { keyboard: mainMenuKb() });
  }
}

// ---- Button action handler ----

async function handleButtonAction(env, chatId, tgId, action, session) {
  const data = session.data || {};

  switch (action) {
    case "addAccount":
      await startAddAccount(env, chatId, tgId, null);
      break;

    case "listAccounts":
      await listAccountsScreen(env, chatId, tgId, null);
      break;

    case "help":
      await showHelp(env, chatId, tgId);
      break;

    case "mainMenu":
      await showMainMenu(env, chatId, tgId);
      break;

    case "cancel":
      await handleCancel(env, chatId, tgId);
      break;

    case "deploy":
      if (data.accountId) {
        await startDeploy(env, chatId, tgId, null, data.accountId);
      }
      break;

    case "listDeployments":
      if (data.accountId) {
        await listDeploymentsScreen(env, chatId, tgId, null, data.accountId);
      }
      break;

    case "confirmRemoveAccount":
      if (data.accountId) {
        await confirmRemoveAccountScreen(env, chatId, tgId, null, data.accountId);
      }
      break;

    case "stats":
      if (data.depId) {
        await showStats(env, chatId, tgId, null, data.depId);
      }
      break;

    case "creds":
      if (data.depId) {
        await showCreds(env, chatId, tgId, null, data.depId);
      }
      break;

    case "logs":
      if (data.depId) {
        await showLogs(env, chatId, tgId, null, data.depId);
      }
      break;

    case "pause":
      if (data.depId) {
        await pauseDeployment(env, chatId, tgId, null, data.depId);
      }
      break;

    case "resume":
      if (data.depId) {
        await resumeDeployment(env, chatId, tgId, null, data.depId);
      }
      break;

    case "resetTraffic":
      if (data.depId) {
        await resetTraffic(env, chatId, tgId, null, data.depId);
      }
      break;

    case "updateWorker":
      if (data.depId) {
        await updateWorker(env, chatId, tgId, null, data.depId);
      }
      break;

    case "confirmDelete":
      if (data.depId) {
        await confirmDeleteDeploymentScreen(env, chatId, tgId, null, data.depId);
      }
      break;

    case "deleteConfirmed":
      if (data.depId) {
        await deleteDeploymentConfirmed(env, chatId, tgId, null, data.depId, null);
      } else if (data.accountId) {
        await removeAccountConfirmed(env, chatId, tgId, null, data.accountId, null);
      }
      break;

    case "cancelAction":
      if (data.accountId) {
        await showAccountDetail(env, chatId, tgId, null, data.accountId);
      } else {
        await showMainMenu(env, chatId, tgId);
      }
      break;

    case "accountDetail":
      if (data.accountId) {
        await showAccountDetail(env, chatId, tgId, null, data.accountId);
      }
      break;

    case "back":
      if (data.depId) {
        await showDeploymentDetail(env, chatId, tgId, null, data.depId);
      } else if (data.accountId) {
        await showAccountDetail(env, chatId, tgId, null, data.accountId);
      } else {
        await showMainMenu(env, chatId, tgId);
      }
      break;

    case "updateAll":
      await handleUpdateAll(env, chatId, tgId, session);
      break;

    case "updateSelect":
      await handleUpdateSelect(env, chatId, tgId, session);
      break;

    case "updateSelected":
      await handleUpdateSelected(env, chatId, tgId, session);
      break;

    case "skipUpdate":
      await handleSkipUpdate(env, chatId, tgId);
      break;

    default:
      await sendMessage(env, chatId, T.unknownCallback, { keyboard: mainMenuKb() });
  }
}

// ---- Dynamic button handler (account/deployment names) ----

async function handleDynamicButton(env, chatId, tgId, text, session) {
  const data = session.data || {};

  if (session.state === "kb_accounts_list") {
    const accounts = await getAccounts(env, tgId);
    const cleanText = text.replace(/^[☁️✅✖️]\s*/, "").trim();
    const match = accounts.find((a) => a.cfAccountName === cleanText || text.includes(a.cfAccountName));
    if (match) {
      await showAccountDetail(env, chatId, tgId, null, match.id);
      return true;
    }
  }

  if (session.state === "kb_deployments_list" && data.accountId) {
    const deps = await deploymentsForAccount(env, tgId, data.accountId);
    const cleanText = text.replace(/^[⚙️]\s*/, "").trim();
    const match = deps.find((d) => (d.label || d.scriptName) === cleanText || text.includes(d.label || d.scriptName));
    if (match) {
      await showDeploymentDetail(env, chatId, tgId, null, match.id);
      return true;
    }
  }

  if (session.state === "kb_update_select") {
    const accounts = await getAccounts(env, tgId);
    const cleanText = text.replace(/^[✅✖️]\s*/, "").trim();
    const match = accounts.find((a) => a.cfAccountName === cleanText || text.includes(a.cfAccountName));
    if (match) {
      await handleToggleAccount(env, chatId, tgId, match.id, session);
      return true;
    }
  }

  return false;
}

// ---- Update handlers ----

async function handleUpdateAll(env, chatId, tgId, session) {
  const allDeps = await deploymentsForAccount(env, tgId, null);
  if (allDeps.length === 0) {
    await sendMessage(env, chatId, "ورکری برای بروزرسانی وجود ندارد.", { keyboard: mainMenuKb() });
    return;
  }

  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.updateStarted(allDeps.length), { keyboard: removeMenuKb() });

  const depIds = allDeps.map((d) => d.id);
  const result = await batchUpdateDeployments(env, tgId, depIds);
  await setUserVersion(env, tgId, PANEL_VERSION);
  await sendMessage(env, chatId, T.updateComplete(result.success, result.failed), { keyboard: mainMenuKb() });
}

async function handleUpdateSelect(env, chatId, tgId, session) {
  const accounts = await getAccounts(env, tgId);
  if (accounts.length === 0) {
    await sendMessage(env, chatId, "حسابی برای بروزرسانی وجود ندارد.", { keyboard: mainMenuKb() });
    return;
  }

  const selectedIds = new Set(session.data?.selectedIds || []);
  await setSession(env, tgId, "kb_update_select", {
    version: session.data?.version || PANEL_VERSION,
    selectedIds: [...selectedIds],
  });

  await sendMessage(env, chatId, T.updateSelectPrompt, {
    keyboard: updateSelectKb(accounts, selectedIds),
  });
}

async function handleToggleAccount(env, chatId, tgId, accountId, session) {
  const selectedIds = new Set(session.data?.selectedIds || []);
  if (selectedIds.has(accountId)) {
    selectedIds.delete(accountId);
  } else {
    selectedIds.add(accountId);
  }

  await setSession(env, tgId, "kb_update_select", {
    version: session.data?.version || PANEL_VERSION,
    selectedIds: [...selectedIds],
  });

  const accounts = await getAccounts(env, tgId);
  await sendMessage(env, chatId, T.updateSelectPrompt, {
    keyboard: updateSelectKb(accounts, selectedIds),
  });
}

async function handleUpdateSelected(env, chatId, tgId, session) {
  const selectedIds = session.data?.selectedIds || [];
  if (selectedIds.length === 0) {
    await sendMessage(env, chatId, "هیچ حسابی انتخاب نشده است.", { keyboard: mainMenuKb() });
    return;
  }

  // Get all deployments for selected accounts
  const allDeps = [];
  for (const accId of selectedIds) {
    const deps = await deploymentsForAccount(env, tgId, accId);
    allDeps.push(...deps);
  }

  if (allDeps.length === 0) {
    await sendMessage(env, chatId, "ورکری برای بروزرسانی وجود ندارد.", { keyboard: mainMenuKb() });
    return;
  }

  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.updateStarted(allDeps.length), { keyboard: removeMenuKb() });

  const depIds = allDeps.map((d) => d.id);
  const result = await batchUpdateDeployments(env, tgId, depIds);
  await setUserVersion(env, tgId, PANEL_VERSION);
  await sendMessage(env, chatId, T.updateComplete(result.success, result.failed), { keyboard: mainMenuKb() });
}

async function handleSkipUpdate(env, chatId, tgId) {
  await clearSession(env, tgId);
  await sendMessage(env, chatId, "بروزرسانی رد شد.", { keyboard: mainMenuKb() });
}
