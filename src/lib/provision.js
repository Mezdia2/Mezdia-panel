import {
  createD1Database,
  deleteD1Database,
  uploadWorkerScript,
  enableWorkersDevRoute,
  deleteWorkerScript,
  getAccountSubdomain,
  createAccountSubdomain,
} from "./cloudflare.js";
import { randomHex, randomPassword, randomSlug, workerScriptName } from "./ids.js";
import {
  PANEL_COMPAT_DATE,
  PANEL_D1_BINDING,
  PANEL_API_KEY_BINDING,
  DEPLOY_INIT_RETRIES,
  DEPLOY_INIT_RETRY_DELAY_MS,
  SCRIPT_NAME_PREFIX,
} from "../config.js";
import panelSource from "../panel/worker-template.txt";
import { protectPanelSource } from "./panel-protection.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deploymentPanelSource() {
  return protectPanelSource(panelSource);
}

// Calls an endpoint on an already-deployed panel worker, authenticating with
// the worker's own MEZDIA_API_KEY (the same scheme the panel's dashboard and
// documented curl examples use). Retries a few times right after a fresh
// deploy since global propagation can lag a couple of seconds.
export async function callPanelApi(deployment, path, { method = "GET", body, retry = false } = {}) {
  const url = `${deployment.workerUrl}/${deployment.apiRoute}${path}`;
  const attempts = retry ? DEPLOY_INIT_RETRIES : 1;
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${deployment.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        return await res.json().catch(() => ({}));
      }
      lastError = new Error(`Panel API ${path} failed with ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    if (i < attempts - 1) await sleep(DEPLOY_INIT_RETRY_DELAY_MS);
  }
  throw lastError || new Error("Panel API request failed");
}

// Full provisioning flow for a brand-new panel deployment inside `account`
// (an entry from kv.getAccounts: { cfAccountId, token, ... }).
export async function deployNewPanel(account, label) {
  const scriptName = workerScriptName(SCRIPT_NAME_PREFIX);
  const apiKey = randomHex(24);

  // 1. D1 database for the panel's own settings/usage storage.
  const databaseId = await createD1Database(account.token, account.cfAccountId, `${scriptName}-db`);

  // 2. Make sure the account has a workers.dev subdomain registered.
  let subdomain = await getAccountSubdomain(account.token, account.cfAccountId);
  if (!subdomain) {
    subdomain = randomSlug(10);
    // If this exact random slug happens to collide account-wide (extremely
    // unlikely), Cloudflare will reject it — the caller can retry the whole
    // deploy in that rare case.
    await createAccountSubdomainSafe(account.token, account.cfAccountId, subdomain);
  }

  // 3. Upload the panel worker module with its D1 + secret bindings.
  await uploadWorkerScript(
    account.token,
    account.cfAccountId,
    scriptName,
    deploymentPanelSource(),
    [
      { type: "d1", name: PANEL_D1_BINDING, id: databaseId },
      { type: "secret_text", name: PANEL_API_KEY_BINDING, text: apiKey },
    ],
    PANEL_COMPAT_DATE
  );

  // 4. Turn on the workers.dev route so the script is reachable.
  await enableWorkersDevRoute(account.token, account.cfAccountId, scriptName);

  const workerUrl = `https://${scriptName}.${subdomain}.workers.dev`;

  // 5. Randomize the panel's dashboard path + password (defaults are
  //    "sync"/"admin" until we change them) via the panel's own config API,
  //    authenticated purely with the MEZDIA_API_KEY we just embedded.
  const apiRoute = randomSlug(12);
  const masterKey = randomPassword(14);
  const bootstrapDeployment = { workerUrl, apiRoute: "sync", apiKey };
  await callPanelApi(bootstrapDeployment, "/api/config", {
    method: "POST",
    retry: true,
    body: { config: { apiRoute, masterKey, name: label || "Mezdia" } },
  });

  // 6. Confirm the new route is live and fetch the generated device id / subscription URL.
  const finalDeployment = { workerUrl, apiRoute, apiKey };
  const accountInfo = await callPanelApi(finalDeployment, "/api/account", { retry: true });

  return {
    scriptName,
    databaseId,
    subdomain,
    workerUrl,
    apiRoute,
    masterKey,
    apiKey,
    deviceId: accountInfo.account?.id || "",
    subscriptionUrl: accountInfo.account?.subscriptionUrl || `${workerUrl}/${apiRoute}`,
    dashboardUrl: `${workerUrl}/${apiRoute}/dash`,
  };
}

async function createAccountSubdomainSafe(token, accountId, subdomain) {
  try {
    await createAccountSubdomain(token, accountId, subdomain);
  } catch (e) {
    // One retry with a fresh random slug on collision.
    await createAccountSubdomain(token, accountId, randomSlug(10));
  }
}

// Re-uploads the latest embedded panel source to an existing deployment,
// keeping the same D1 database and API key (so apiRoute/masterKey already
// stored in D1 keep working) — used for the "update worker" action.
export async function redeployPanel(account, deployment) {
  await uploadWorkerScript(
    account.token,
    account.cfAccountId,
    deployment.scriptName,
    deploymentPanelSource(),
    [
      { type: "d1", name: PANEL_D1_BINDING, id: deployment.databaseId },
      { type: "secret_text", name: PANEL_API_KEY_BINDING, text: deployment.apiKey },
    ],
    PANEL_COMPAT_DATE
  );
  await enableWorkersDevRoute(account.token, account.cfAccountId, deployment.scriptName);
}

// Fully removes a deployment's cloud resources (worker + D1). Bot-side KV
// record removal is handled by the caller.
export async function destroyPanel(account, deployment) {
  await deleteWorkerScript(account.token, account.cfAccountId, deployment.scriptName);
  await deleteD1Database(account.token, account.cfAccountId, deployment.databaseId);
}
