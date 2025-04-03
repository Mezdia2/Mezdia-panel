import { answerCallbackQuery, sendMessage } from "../lib/telegram.js";
import { ensureUser, getSession, clearSession } from "../lib/kv.js";
import { T } from "../ui/text.js";
import { mainMenuKeyboard } from "../ui/keyboards.js";
import { showMainMenu, showHelp, handleCancel } from "./start.js";
import {
  startAddAccount,
  handleTokenMessage,
  handleAccountPick,
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
} from "./deployments.js";

export async function routeMessage(env, message) {
  const chatId = message.chat.id;
  const tgId = message.from.id;
  const text = (message.text || "").trim();

  await ensureUser(env, tgId, { firstName: message.from.first_name, username: message.from.username });

  if (text === "/start") {
    await clearSession(env, tgId);
    await showMainMenu(env, chatId, null, true);
    return;
  }
  if (text === "/help") {
    await showHelp(env, chatId, null);
    return;
  }
  if (text === "/cancel") {
    await handleCancel(env, chatId, tgId);
    return;
  }

  const session = await getSession(env, tgId);
  if (!session) {
    await sendMessage(env, chatId, "برای شروع /start را بفرستید.", { keyboard: mainMenuKeyboard() });
    return;
  }

  if (session.state === "awaiting_cf_token") {
    await handleTokenMessage(env, chatId, tgId, text);
    return;
  }
  if (session.state === "awaiting_deploy_label") {
    await handleLabelMessage(env, chatId, tgId, text, session);
    return;
  }

  // Unknown/stale session state — reset gracefully.
  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.genericError, { keyboard: mainMenuKeyboard() });
}

export async function routeCallback(env, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const tgId = callbackQuery.from.id;
  const data = callbackQuery.data || "";

  await ensureUser(env, tgId, { firstName: callbackQuery.from.first_name, username: callbackQuery.from.username });
  await answerCallbackQuery(env, callbackQuery.id);

  const [ns, action, id] = data.split(":");

  try {
    if (ns === "menu") {
      if (action === "main") return void (await showMainMenu(env, chatId, messageId));
      if (action === "accounts") return void (await listAccountsScreen(env, chatId, tgId, messageId));
      if (action === "help") return void (await showHelp(env, chatId, messageId));
    }

    if (ns === "acct") {
      if (action === "add") return void (await startAddAccount(env, chatId, tgId, messageId));
      if (action === "pick") {
        const session = await getSession(env, tgId);
        return void (await handleAccountPick(env, chatId, tgId, messageId, id, session));
      }
      if (action === "view") return void (await showAccountDetail(env, chatId, tgId, messageId, id));
      if (action === "deploy") return void (await startDeploy(env, chatId, tgId, messageId, id));
      if (action === "deployments") return void (await listDeploymentsScreen(env, chatId, tgId, messageId, id));
      if (action === "remove") return void (await confirmRemoveAccountScreen(env, chatId, tgId, messageId, id));
      if (action === "remove_confirm")
        return void (await removeAccountConfirmed(env, chatId, tgId, messageId, id, callbackQuery.id));
    }

    if (ns === "dep") {
      if (action === "view") return void (await showDeploymentDetail(env, chatId, tgId, messageId, id));
      if (action === "stats") return void (await showStats(env, chatId, tgId, messageId, id));
      if (action === "creds") return void (await showCreds(env, chatId, tgId, messageId, id));
      if (action === "logs") return void (await showLogs(env, chatId, tgId, messageId, id));
      if (action === "pause") return void (await pauseDeployment(env, chatId, tgId, messageId, id));
      if (action === "resume") return void (await resumeDeployment(env, chatId, tgId, messageId, id));
      if (action === "reset") return void (await resetTraffic(env, chatId, tgId, messageId, id));
      if (action === "update") return void (await updateWorker(env, chatId, tgId, messageId, id));
      if (action === "delete") return void (await confirmDeleteDeploymentScreen(env, chatId, tgId, messageId, id));
      if (action === "delete_confirm")
        return void (await deleteDeploymentConfirmed(env, chatId, tgId, messageId, id, callbackQuery.id));
    }
  } catch (e) {
    console.error("callback handling error", ns, action, id, e);
    await sendMessage(env, chatId, T.genericError, { keyboard: mainMenuKeyboard() });
    return;
  }

  await sendMessage(env, chatId, T.unknownCallback, { keyboard: mainMenuKeyboard() });
}
