import { sendMessage, editMessageText, answerCallbackQuery } from "../lib/telegram.js";
import {
  cancelKeyboard,
  deploymentsListKeyboard,
  deploymentDetailKeyboard,
  backToDeploymentKeyboard,
  confirmDeleteDeploymentKeyboard,
  mainMenuKeyboard,
} from "../ui/keyboards.js";
import { T } from "../ui/text.js";
import {
  getAccount,
  addDeployment,
  getDeployment,
  updateDeployment,
  removeDeployment,
  deploymentsForAccount,
  setSession,
  clearSession,
} from "../lib/kv.js";
import { deployNewPanel, redeployPanel, destroyPanel, callPanelApi } from "../lib/provision.js";
import { shortId } from "../lib/ids.js";

export async function startDeploy(env, chatId, tgId, messageId, accountId) {
  const account = await getAccount(env, tgId, accountId);
  if (!account) {
    await editMessageText(env, chatId, messageId, T.notFound, { keyboard: mainMenuKeyboard() });
    return;
  }
  await setSession(env, tgId, "awaiting_deploy_label", { accountId });
  await editMessageText(env, chatId, messageId, T.askDeployLabel, { keyboard: cancelKeyboard() });
}

// Called from the text-message router when session.state === "awaiting_deploy_label".
export async function handleLabelMessage(env, chatId, tgId, text, session) {
  const accountId = session?.data?.accountId;
  const account = accountId ? await getAccount(env, tgId, accountId) : null;
  await clearSession(env, tgId);
  if (!account) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKeyboard() });
    return;
  }
  const label = text === "/skip" ? "" : text.trim().slice(0, 60);
  await runDeploy(env, chatId, tgId, account, label);
}

async function runDeploy(env, chatId, tgId, account, label) {
  const progressMsg = await sendMessage(env, chatId, T.deploying);
  const progressMessageId = progressMsg?.result?.message_id;
  try {
    const result = await deployNewPanel(account, label);
    const deployment = {
      id: shortId(),
      accountId: account.id,
      label,
      status: "active",
      createdAt: Date.now(),
      ...result,
    };
    await addDeployment(env, tgId, deployment);
    const text = T.deploySuccess(deployment);
    if (progressMessageId) {
      await editMessageText(env, chatId, progressMessageId, text, {
        keyboard: deploymentDetailKeyboard(deployment),
      });
    } else {
      await sendMessage(env, chatId, text, { keyboard: deploymentDetailKeyboard(deployment) });
    }
  } catch (e) {
    console.error("deploy failed", e);
    const text = T.deployFailed(e.message || String(e));
    if (progressMessageId) {
      await editMessageText(env, chatId, progressMessageId, text, { keyboard: mainMenuKeyboard() });
    } else {
      await sendMessage(env, chatId, text, { keyboard: mainMenuKeyboard() });
    }
  }
}

export async function listDeploymentsScreen(env, chatId, tgId, messageId, accountId) {
  const deployments = await deploymentsForAccount(env, tgId, accountId);
  const text = deployments.length ? T.deploymentsListHeader : T.deploymentsListEmpty;
  await editMessageText(env, chatId, messageId, text, {
    keyboard: deploymentsListKeyboard(deployments, accountId),
  });
}

export async function showDeploymentDetail(env, chatId, tgId, messageId, depId) {
  const dep = await getDeployment(env, tgId, depId);
  if (!dep) {
    await editMessageText(env, chatId, messageId, T.notFound, { keyboard: mainMenuKeyboard() });
    return;
  }
  await editMessageText(env, chatId, messageId, T.deploymentDetail(dep), {
    keyboard: deploymentDetailKeyboard(dep),
  });
}

async function requireDeployment(env, chatId, tgId, messageId, depId) {
  const dep = await getDeployment(env, tgId, depId);
  if (!dep) {
    await editMessageText(env, chatId, messageId, T.notFound, { keyboard: mainMenuKeyboard() });
    return null;
  }
  return dep;
}

export async function showStats(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  await editMessageText(env, chatId, messageId, T.fetchingStats, { keyboard: backToDeploymentKeyboard(depId) });
  try {
    const stats = await callPanelApi(dep, "/api/stats");
    await editMessageText(env, chatId, messageId, T.statsResult(dep, stats), {
      keyboard: backToDeploymentKeyboard(depId),
    });
  } catch (e) {
    await editMessageText(env, chatId, messageId, T.actionFailed(e.message || String(e)), {
      keyboard: backToDeploymentKeyboard(depId),
    });
  }
}

export async function showCreds(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  await editMessageText(env, chatId, messageId, T.showCreds(dep), { keyboard: backToDeploymentKeyboard(depId) });
}

export async function showLogs(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  await editMessageText(env, chatId, messageId, T.fetchingLogs, { keyboard: backToDeploymentKeyboard(depId) });
  try {
    const res = await callPanelApi(dep, "/api/logs", { method: "POST", body: {} });
    await editMessageText(env, chatId, messageId, T.logsResult(dep, res.logs), {
      keyboard: backToDeploymentKeyboard(depId),
    });
  } catch (e) {
    await editMessageText(env, chatId, messageId, T.actionFailed(e.message || String(e)), {
      keyboard: backToDeploymentKeyboard(depId),
    });
  }
}

export async function pauseDeployment(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  try {
    await callPanelApi(dep, "/api/account", { method: "PATCH", body: { account: { status: "paused" } } });
    const updated = await updateDeployment(env, tgId, depId, { status: "paused" });
    await editMessageText(env, chatId, messageId, T.paused, { keyboard: deploymentDetailKeyboard(updated) });
  } catch (e) {
    await editMessageText(env, chatId, messageId, T.actionFailed(e.message || String(e)), {
      keyboard: deploymentDetailKeyboard(dep),
    });
  }
}

export async function resumeDeployment(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  try {
    await callPanelApi(dep, "/api/account", { method: "PATCH", body: { account: { status: "active" } } });
    const updated = await updateDeployment(env, tgId, depId, { status: "active" });
    await editMessageText(env, chatId, messageId, T.resumed, { keyboard: deploymentDetailKeyboard(updated) });
  } catch (e) {
    await editMessageText(env, chatId, messageId, T.actionFailed(e.message || String(e)), {
      keyboard: deploymentDetailKeyboard(dep),
    });
  }
}

export async function resetTraffic(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  try {
    await callPanelApi(dep, "/api/sync", { method: "POST", body: { resetTraffic: true } });
    await editMessageText(env, chatId, messageId, T.trafficReset, { keyboard: deploymentDetailKeyboard(dep) });
  } catch (e) {
    await editMessageText(env, chatId, messageId, T.actionFailed(e.message || String(e)), {
      keyboard: deploymentDetailKeyboard(dep),
    });
  }
}

export async function updateWorker(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  const account = await getAccount(env, tgId, dep.accountId);
  if (!account) {
    await editMessageText(env, chatId, messageId, T.notFound, { keyboard: mainMenuKeyboard() });
    return;
  }
  try {
    await redeployPanel(account, dep);
    await editMessageText(env, chatId, messageId, T.updated, { keyboard: deploymentDetailKeyboard(dep) });
  } catch (e) {
    await editMessageText(env, chatId, messageId, T.actionFailed(e.message || String(e)), {
      keyboard: deploymentDetailKeyboard(dep),
    });
  }
}

export async function confirmDeleteDeploymentScreen(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  await editMessageText(env, chatId, messageId, T.confirmDeleteDeployment(dep), {
    keyboard: confirmDeleteDeploymentKeyboard(dep),
  });
}

export async function deleteDeploymentConfirmed(env, chatId, tgId, messageId, depId, callbackQueryId) {
  const dep = await requireDeployment(env, chatId, tgId, messageId, depId);
  if (!dep) return;
  const account = await getAccount(env, tgId, dep.accountId);
  try {
    if (account) await destroyPanel(account, dep);
  } catch (e) {
    // Best-effort cleanup — still remove the local record either way.
  }
  await removeDeployment(env, tgId, depId);
  if (callbackQueryId) await answerCallbackQuery(env, callbackQueryId);
  await editMessageText(env, chatId, messageId, T.deploymentDeleted, {
    keyboard: dep.accountId ? deploymentDetailBackKeyboard(dep.accountId) : mainMenuKeyboard(),
  });
}

function deploymentDetailBackKeyboard(accountId) {
  return { inline_keyboard: [[{ text: "🔙 بازگشت به حساب", callback_data: `acct:view:${accountId}` }]] };
}
