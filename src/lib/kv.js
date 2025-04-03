// All persistent bot state lives in Workers KV (binding: BOT_DB).
// Keys:
//   user:{tgId}          -> { tgId, firstSeenAt, lang }
//   accounts:{tgId}      -> [ { id, cfAccountId, cfAccountName, token, addedAt } ]
//   deployments:{tgId}   -> [ { id, accountId, cfAccountId, label, scriptName,
//                               d1DatabaseId, workerUrl, apiRoute, masterKey,
//                               apiKey, deviceId, subscriptionUrl, dashboardUrl,
//                               createdAt, updatedAt } ]
//   session:{tgId}       -> { state, data, updatedAt }   (short TTL)

import { SESSION_TTL_SECONDS } from "../config.js";

async function getJson(env, key, fallback) {
  const raw = await env.BOT_DB.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

async function putJson(env, key, value) {
  await env.BOT_DB.put(key, JSON.stringify(value));
}

export async function ensureUser(env, tgId, meta = {}) {
  const key = `user:${tgId}`;
  const existing = await getJson(env, key, null);
  if (existing) return existing;
  const user = {
    tgId,
    firstSeenAt: Date.now(),
    lang: "fa",
    firstName: meta.firstName || "",
    username: meta.username || "",
  };
  await putJson(env, key, user);
  return user;
}

export async function getAccounts(env, tgId) {
  return getJson(env, `accounts:${tgId}`, []);
}

export async function saveAccounts(env, tgId, accounts) {
  await putJson(env, `accounts:${tgId}`, accounts);
}

export async function addAccount(env, tgId, account) {
  const accounts = await getAccounts(env, tgId);
  accounts.push(account);
  await saveAccounts(env, tgId, accounts);
  return account;
}

export async function getAccount(env, tgId, accountId) {
  const accounts = await getAccounts(env, tgId);
  return accounts.find((a) => a.id === accountId) || null;
}

export async function removeAccount(env, tgId, accountId) {
  const accounts = await getAccounts(env, tgId);
  const next = accounts.filter((a) => a.id !== accountId);
  await saveAccounts(env, tgId, next);
}

export async function getDeployments(env, tgId) {
  return getJson(env, `deployments:${tgId}`, []);
}

export async function saveDeployments(env, tgId, deployments) {
  await putJson(env, `deployments:${tgId}`, deployments);
}

export async function addDeployment(env, tgId, deployment) {
  const deployments = await getDeployments(env, tgId);
  deployments.push(deployment);
  await saveDeployments(env, tgId, deployments);
  return deployment;
}

export async function getDeployment(env, tgId, deploymentId) {
  const deployments = await getDeployments(env, tgId);
  return deployments.find((d) => d.id === deploymentId) || null;
}

export async function updateDeployment(env, tgId, deploymentId, patch) {
  const deployments = await getDeployments(env, tgId);
  const idx = deployments.findIndex((d) => d.id === deploymentId);
  if (idx === -1) return null;
  deployments[idx] = { ...deployments[idx], ...patch, updatedAt: Date.now() };
  await saveDeployments(env, tgId, deployments);
  return deployments[idx];
}

export async function removeDeployment(env, tgId, deploymentId) {
  const deployments = await getDeployments(env, tgId);
  const next = deployments.filter((d) => d.id !== deploymentId);
  await saveDeployments(env, tgId, next);
}

export async function deploymentsForAccount(env, tgId, accountId) {
  const deployments = await getDeployments(env, tgId);
  return deployments.filter((d) => d.accountId === accountId);
}

// ---- Session (conversation state) ----

export async function getSession(env, tgId) {
  return getJson(env, `session:${tgId}`, null);
}

export async function setSession(env, tgId, state, data = {}) {
  const value = { state, data, updatedAt: Date.now() };
  await env.BOT_DB.put(`session:${tgId}`, JSON.stringify(value), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return value;
}

export async function clearSession(env, tgId) {
  await env.BOT_DB.delete(`session:${tgId}`);
}
