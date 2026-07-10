import { sendMessage, answerCallbackQuery } from "../lib/telegram.js";
import {
  mainMenuKb,
  accountsListKb,
  accountDetailKb,
  confirmRemoveAccountKb,
  cancelKb,
} from "../ui/keyboards.js";
import { T } from "../ui/text.js";
import {
  getAccounts,
  addAccount,
  getAccount,
  deploymentsForAccount,
  removeAccount,
  setSession,
  clearSession,
} from "../lib/kv.js";
import { listAccounts as listCfAccounts, CloudflareApiError } from "../lib/cloudflare.js";
import { shortId } from "../lib/ids.js";

export async function startAddAccount(env, chatId, tgId, messageId) {
  await setSession(env, tgId, "awaiting_cf_token", {});
  // Send the URL inline separately, then the cancel keyboard
  await sendMessage(env, chatId, "🔗 برای ساخت API Token، از دکمه زیر استفاده کنید:", {
    keyboard: {
      inline_keyboard: [[{ text: "🔗 صفحه API Tokens کلادفلر", url: "https://dash.cloudflare.com/profile/api-tokens" }]],
    },
  });
  await sendMessage(env, chatId, T.askToken, { keyboard: cancelKb() });
}

export async function handleTokenMessage(env, chatId, tgId, token) {
  const accounts = await getAccounts(env, tgId);

  let candidates;
  try {
    candidates = await listCfAccounts(token);
  } catch (e) {
    await clearSession(env, tgId);
    await sendMessage(env, chatId, T.tokenInvalid, { keyboard: mainMenuKb() });
    return;
  }

  if (!candidates.length) {
    await clearSession(env, tgId);
    await sendMessage(env, chatId, T.tokenNoAccounts, { keyboard: mainMenuKb() });
    return;
  }

  if (candidates.length === 1) {
    const existing = accounts.find((a) => a.cfAccountId === candidates[0].id);
    if (existing) {
      await clearSession(env, tgId);
      await sendMessage(env, chatId, `این حساب قبلاً با نام «${existing.cfAccountName}» اضافه شده است. هر حساب فقط ظرفیت یک ورکر دارد.`, {
        keyboard: mainMenuKb(),
      });
      return;
    }
    await finalizeAccount(env, chatId, tgId, token, candidates[0]);
    return;
  }

  // Multiple candidates — ask user to pick
  await setSession(env, tgId, "awaiting_cf_account_pick", { token, candidates });
  const pickText = T.pickCfAccount;
  // Build a keyboard with account names
  const rows = candidates.map((c) => [{ text: `☁️ ${c.name}` }]);
  rows.push([{ text: "✖️ لغو" }]);
  await sendMessage(env, chatId, pickText, {
    keyboard: { keyboard: rows, resize_keyboard: true },
  });
}

export async function handleAccountPick(env, chatId, tgId, messageId, cfAccountId, session) {
  const token = session?.data?.token;
  const candidates = session?.data?.candidates || [];
  const pick = candidates.find((c) => c.id === cfAccountId);
  await clearSession(env, tgId);
  if (!pick || !token) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  await finalizeAccount(env, chatId, tgId, token, pick);
}

// Reply-keyboard variant: the user taps an account name (not an inline callback),
// so we match by name against the candidates stored in the session.
export async function handleAccountPickReply(env, chatId, tgId, text, session) {
  const token = session?.data?.token;
  const candidates = session?.data?.candidates || [];
  await clearSession(env, tgId);
  if (!token || !candidates.length) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  const clean = text.replace(/^[☁️✅✖️]\s*/, "").trim();
  const pick = candidates.find((c) => c.name === clean || text.includes(c.name));
  if (!pick) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  await finalizeAccount(env, chatId, tgId, token, pick);
}

async function finalizeAccount(env, chatId, tgId, token, cfAccount) {
  const accounts = await getAccounts(env, tgId);
  const account = {
    id: shortId(),
    cfAccountId: cfAccount.id,
    cfAccountName: cfAccount.name,
    token,
    addedAt: Date.now(),
  };
  accounts.push(account);
  await addAccount(env, tgId, account);
  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.accountAdded(cfAccount.name), { keyboard: mainMenuKb() });
}

export async function listAccountsScreen(env, chatId, tgId, messageId) {
  const accounts = await getAccounts(env, tgId);
  let workerCount = 0;
  for (const account of accounts) {
    const deps = await deploymentsForAccount(env, tgId, account.id);
    workerCount += deps.length;
  }
  const text = accounts.length ? T.accountsListHeader(accounts.length, workerCount) : T.accountsListEmpty;
  await setSession(env, tgId, "kb_accounts_list", {});
  await sendMessage(env, chatId, text, { keyboard: accountsListKb(accounts) });
}

export async function showAccountDetail(env, chatId, tgId, messageId, accountId) {
  const account = await getAccount(env, tgId, accountId);
  if (!account) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  // Count deployments for this account
  const deps = await deploymentsForAccount(env, tgId, accountId);
  const text = T.accountDetail(account, deps.length);
  const hasWorker = deps.length > 0;
  await setSession(env, tgId, "kb_account_detail", { accountId, hasWorker });
  await sendMessage(env, chatId, text, { keyboard: accountDetailKb(hasWorker) });
}

export async function confirmRemoveAccountScreen(env, chatId, tgId, messageId, accountId) {
  const account = await getAccount(env, tgId, accountId);
  if (!account) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  const deps = await deploymentsForAccount(env, tgId, accountId);
  await setSession(env, tgId, "kb_confirm_remove_account", { accountId });
  await sendMessage(env, chatId, T.confirmRemoveAccount(account, deps.length), {
    keyboard: confirmRemoveAccountKb(),
  });
}

export async function removeAccountConfirmed(env, chatId, tgId, messageId, accountId, callbackQueryId) {
  const account = await getAccount(env, tgId, accountId);
  if (!account) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  // Remove all deployments for this account
  const { removeDeployment } = await import("../lib/kv.js");
  const { destroyPanel } = await import("../lib/provision.js");
  const deps = await deploymentsForAccount(env, tgId, accountId);
  for (const dep of deps) {
    try {
      await destroyPanel(account, dep);
    } catch (e) {
      // Best-effort cleanup
    }
    await removeDeployment(env, tgId, dep.id);
  }
  await removeAccount(env, tgId, accountId);
  if (callbackQueryId) await answerCallbackQuery(env, callbackQueryId);
  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.accountRemoved, { keyboard: mainMenuKb() });
}
