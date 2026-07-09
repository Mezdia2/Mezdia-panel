import { sendMessage, editMessageText, answerCallbackQuery } from "../lib/telegram.js";
import {
  mainMenuKb,
  cancelKb,
  deploymentsListKb,
  deploymentDetailKb,
  confirmDeleteDeploymentKb,
  removeMenuKb,
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
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  const existing = await deploymentsForAccount(env, tgId, accountId);
  if (existing.length > 0) {
    await sendMessage(env, chatId, T.oneWorkerPerAccount, { keyboard: mainMenuKb() });
    return;
  }
  await setSession(env, tgId, "awaiting_deploy_label", { accountId });
  await sendMessage(env, chatId, T.askDeployLabel, { keyboard: cancelKb() });
}

// Called from the text-message router when session.state === "awaiting_deploy_label".
export async function handleLabelMessage(env, chatId, tgId, text, session) {
  const accountId = session?.data?.accountId;
  const account = accountId ? await getAccount(env, tgId, accountId) : null;
  await clearSession(env, tgId);
  if (!account) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  const label = text === "/skip" ? "" : text.trim().slice(0, 60);
  await runDeploy(env, chatId, tgId, account, label);
}

async function runDeploy(env, chatId, tgId, account, label) {
  const progressMsg = await sendMessage(env, chatId, T.deploying, { keyboard: removeMenuKb() });
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
    await setSession(env, tgId, "kb_deployment_detail", { depId: deployment.id, accountId: account.id });
    await sendMessage(env, chatId, text, { keyboard: deploymentDetailKb(deployment) });
  } catch (e) {
    console.error("deploy failed", e);
    const text = T.deployFailed(e.message || String(e));
    await sendMessage(env, chatId, text, { keyboard: mainMenuKb() });
  }
}

export async function listDeploymentsScreen(env, chatId, tgId, messageId, accountId) {
  const deployments = await deploymentsForAccount(env, tgId, accountId);
  const text = deployments.length ? T.deploymentsListHeader : T.deploymentsListEmpty;
  await setSession(env, tgId, "kb_deployments_list", { accountId });
  await sendMessage(env, chatId, text, { keyboard: deploymentsListKb(deployments) });
}

export async function showDeploymentDetail(env, chatId, tgId, messageId, depId) {
  const dep = await getDeployment(env, tgId, depId);
  if (!dep) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
  const text = T.deploymentDetail(dep);
  const kb = deploymentDetailKb(dep);
  if (messageId) {
    await editMessageText(env, chatId, messageId, text, { keyboard: kb });
  } else {
    await sendMessage(env, chatId, text, { keyboard: kb });
  }
}

async function requireDeployment(env, chatId, tgId, depId) {
  const dep = await getDeployment(env, tgId, depId);
  if (!dep) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return null;
  }
  return dep;
}

export async function showStats(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  if (messageId) {
    await editMessageText(env, chatId, messageId, T.fetchingStats, {});
  } else {
    await sendMessage(env, chatId, T.fetchingStats, { keyboard: removeMenuKb() });
  }
  try {
    const stats = await callPanelApi(dep, "/api/stats");
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.statsResult(dep, stats);
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  } catch (e) {
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.actionFailed(e.message || String(e));
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  }
}

export async function showCreds(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
  const text = T.showCreds(dep);
  const kb = deploymentDetailKb(dep);
  if (messageId) {
    await editMessageText(env, chatId, messageId, text, { keyboard: kb });
  } else {
    await sendMessage(env, chatId, text, { keyboard: kb });
  }
}

export async function showLogs(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  if (messageId) {
    await editMessageText(env, chatId, messageId, T.fetchingLogs, {});
  } else {
    await sendMessage(env, chatId, T.fetchingLogs, { keyboard: removeMenuKb() });
  }
  try {
    const res = await callPanelApi(dep, "/api/logs", { method: "POST", body: {} });
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.logsResult(dep, res.logs);
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  } catch (e) {
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.actionFailed(e.message || String(e));
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  }
}

export async function pauseDeployment(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  try {
    await callPanelApi(dep, "/api/account", { method: "PATCH", body: { account: { status: "paused" } } });
    const updated = await updateDeployment(env, tgId, depId, { status: "paused" });
    await setSession(env, tgId, "kb_deployment_detail", { depId: updated.id, accountId: updated.accountId });
    const text = T.paused;
    const kb = deploymentDetailKb(updated);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  } catch (e) {
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.actionFailed(e.message || String(e));
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  }
}

export async function resumeDeployment(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  try {
    await callPanelApi(dep, "/api/account", { method: "PATCH", body: { account: { status: "active" } } });
    const updated = await updateDeployment(env, tgId, depId, { status: "active" });
    await setSession(env, tgId, "kb_deployment_detail", { depId: updated.id, accountId: updated.accountId });
    const text = T.resumed;
    const kb = deploymentDetailKb(updated);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  } catch (e) {
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.actionFailed(e.message || String(e));
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  }
}

export async function resetTraffic(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  try {
    await callPanelApi(dep, "/api/sync", { method: "POST", body: { resetTraffic: true } });
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.trafficReset;
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  } catch (e) {
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.actionFailed(e.message || String(e));
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  }
}

export async function updateWorker(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  const account = await getAccount(env, tgId, dep.accountId);
  if (!account) {
    await sendMessage(env, chatId, T.notFound, { keyboard: mainMenuKb() });
    return;
  }
  try {
    if (messageId) {
      await editMessageText(env, chatId, messageId, "⏳ در حال بروزرسانی ورکر…", {});
    } else {
      await sendMessage(env, chatId, "⏳ در حال بروزرسانی ورکر…", { keyboard: removeMenuKb() });
    }
    await redeployPanel(account, dep);
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.updated;
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  } catch (e) {
    await setSession(env, tgId, "kb_deployment_detail", { depId: dep.id, accountId: dep.accountId });
    const text = T.actionFailed(e.message || String(e));
    const kb = deploymentDetailKb(dep);
    if (messageId) {
      await editMessageText(env, chatId, messageId, text, { keyboard: kb });
    } else {
      await sendMessage(env, chatId, text, { keyboard: kb });
    }
  }
}

export async function confirmDeleteDeploymentScreen(env, chatId, tgId, messageId, depId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  await setSession(env, tgId, "kb_confirm_delete", { depId: dep.id, accountId: dep.accountId });
  const text = T.confirmDeleteDeployment(dep);
  const kb = confirmDeleteDeploymentKb(dep.id);
  if (messageId) {
    await editMessageText(env, chatId, messageId, text, { keyboard: kb });
  } else {
    await sendMessage(env, chatId, text, { keyboard: kb });
  }
}

export async function deleteDeploymentConfirmed(env, chatId, tgId, messageId, depId, callbackQueryId) {
  const dep = await requireDeployment(env, chatId, tgId, depId);
  if (!dep) return;
  const account = await getAccount(env, tgId, dep.accountId);
  try {
    if (account) await destroyPanel(account, dep);
  } catch (e) {
    // Best-effort cleanup — still remove the local record either way.
  }
  await removeDeployment(env, tgId, depId);
  if (callbackQueryId) await answerCallbackQuery(env, callbackQueryId);
  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.deploymentDeleted, { keyboard: mainMenuKb() });
}

// ---- Batch update for auto-update system ----

export async function batchUpdateDeployments(env, tgId, depIds) {
  let success = 0;
  let failed = 0;

  for (const depId of depIds) {
    const dep = await getDeployment(env, tgId, depId);
    if (!dep) {
      failed++;
      continue;
    }
    const account = await getAccount(env, tgId, dep.accountId);
    if (!account) {
      failed++;
      continue;
    }
    try {
      await redeployPanel(account, dep);
      success++;
    } catch (e) {
      console.error("batch update failed for", depId, e);
      failed++;
    }
  }

  return { success, failed };
}
