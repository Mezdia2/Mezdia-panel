import { sendMessage, editMessageText, answerCallbackQuery } from "../lib/telegram.js";
import {
  askTokenKeyboard,
  pickCfAccountKeyboard,
  accountsListKeyboard,
  accountDetailKeyboard,
  confirmRemoveAccountKeyboard,
  mainMenuKeyboard,
} from "../ui/keyboards.js";
import { T } from "../ui/text.js";
import {
  addAccount,
  getAccounts,
  getAccount,
  removeAccount,
  deploymentsForAccount,
  removeDeployment,
  setSession,
  clearSession,
} from "../lib/kv.js";
import { listAccounts as listCfAccounts, CloudflareApiError } from "../lib/cloudflare.js";
import { destroyPanel } from "../lib/provision.js";
import { shortId } from "../lib/ids.js";

export async function startAddAccount(env, chatId, tgId, messageId) {
  await setSession(env, tgId, "awaiting_cf_token", {});
  await editMessageText(env, chatId, messageId, T.askToken, { keyboard: askTokenKeyboard() });
}

// Called from the text-message router when session.state === "awaiting_cf_token".
export async function handleTokenMessage(env, chatId, tgId, token) {
  token = token.trim();
  let candidates;
  try {
    candidates = await listCfAccounts(token);
  } catch (e) {
    await sendMessage(env, chatId, T.tokenInvalid, { keyboard: askTokenKeyboard() });
    return;
  }

  if (!candidates.length) {
    await sendMessage(env, chatId, T.tokenNoAccounts, { keyboard: askTokenKeyboard() });
    return;
  }

  if (candidates.length === 1) {
    await finalizeAccount(env, chatId, tgId, token, candidates[0]);
    return;
  }

  await setSession(env, tgId, "awaiting_cf_account_choice", { token, candidates });
  await sendMessage(env, chatId, T.pickCfAccount, { keyboard: pickCfAccountKeyboard(candidates) });
}

// Called from the callback router for "acct:pick:{cfAccountId}".
export async function handleAccountPick(env, chatId, tgId, messageId, cfAccountId, session) {
  const candidate = (session?.data?.candidates || []).find((c) => c.id === cfAccountId);
  const token = session?.data?.token;
  if (!candidate || !token) {
    await editMessageText(env, chatId, messageId, T.genericError, { keyboard: mainMenuKeyboard() });
    return;
  }
  await finalizeAccount(env, chatId, tgId, token, candidate, messageId);
}

async function finalizeAccount(env, chatId, tgId, token, cfAccount, messageId = null) {
  await clearSession(env, tgId);
  const account = {
    id: shortId(),
    cfAccountId: cfAccount.id,
    cfAccountName: cfAccount.name,
    token,
    addedAt: Date.now(),
  };
  await addAccount(env, tgId, account);
  const text = T.accountAdded(cfAccount.name);
  if (messageId) {
    await editMessageText(env, chatId, messageId, text, { keyboard: accountDetailKeyboard(account.id) });
  } else {
    await sendMessage(env, chatId, text, { keyboard: accountDetailKeyboard(account.id) });
  }
}

export async function listAccountsScreen(env, chatId, tgId, messageId) {
  const accounts = await getAccounts(env, tgId);
  if (!accounts.length) {
    await editMessageText(env, chatId, messageId, T.accountsListEmpty, {
      keyboard: accountsListKeyboard(accounts),
    });
    return;
  }
  await editMessageText(env, chatId, messageId, T.accountsListHeader, {
    keyboard: accountsListKeyboard(accounts),
  });
}

export async function showAccountDetail(env, chatId, tgId, messageId, accountId) {
  const account = await getAccount(env, tgId, accountId);
  if (!account) {
    await editMessageText(env, chatId, messageId, T.notFound, { keyboard: mainMenuKeyboard() });
    return;
  }
  const deployments = await deploymentsForAccount(env, tgId, accountId);
  await editMessageText(env, chatId, messageId, T.accountDetail(account, deployments.length), {
    keyboard: accountDetailKeyboard(accountId),
  });
}

export async function confirmRemoveAccountScreen(env, chatId, tgId, messageId, accountId) {
  const account = await getAccount(env, tgId, accountId);
  if (!account) {
    await editMessageText(env, chatId, messageId, T.notFound, { keyboard: mainMenuKeyboard() });
    return;
  }
  const deployments = await deploymentsForAccount(env, tgId, accountId);
  await editMessageText(env, chatId, messageId, T.confirmRemoveAccount(account, deployments.length), {
    keyboard: confirmRemoveAccountKeyboard(accountId),
  });
}

export async function removeAccountConfirmed(env, chatId, tgId, messageId, accountId, callbackQueryId) {
  const account = await getAccount(env, tgId, accountId);
  if (!account) {
    await editMessageText(env, chatId, messageId, T.notFound, { keyboard: mainMenuKeyboard() });
    return;
  }
  const deployments = await deploymentsForAccount(env, tgId, accountId);
  for (const dep of deployments) {
    try {
      await destroyPanel(account, dep);
    } catch (e) {
      // Continue cleanup even if one resource is already gone.
    }
    await removeDeployment(env, tgId, dep.id);
  }
  await removeAccount(env, tgId, accountId);
  if (callbackQueryId) await answerCallbackQuery(env, callbackQueryId);
  await editMessageText(env, chatId, messageId, T.accountRemoved, { keyboard: mainMenuKeyboard() });
}

export { CloudflareApiError };
