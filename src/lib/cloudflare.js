// Thin wrapper around the parts of the Cloudflare REST API the bot needs:
// verifying a user-supplied API token, creating a D1 database, uploading a
// Worker module, and managing the account's workers.dev subdomain.
//
// Every call here uses the *user's own* Cloudflare API token (never a token
// belonging to the bot operator), so all actions happen inside the account
// the user explicitly authorized.

import { CF_API_BASE } from "../config.js";

class CloudflareApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function cfFetch(token, path, opts = {}) {
  const res = await fetch(`${CF_API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok || (data && data.success === false)) {
    const message =
      (data && data.errors && data.errors[0] && data.errors[0].message) ||
      `Cloudflare API request failed (${res.status})`;
    throw new CloudflareApiError(message, res.status, data && data.errors);
  }
  return data;
}

// Verifies the token is usable and returns the accounts it can see.
// Also doubles as the permission check: if the token lacks "Account
// Settings: Read" this call itself will fail with a clear error.
export async function listAccounts(token) {
  const data = await cfFetch(token, "/accounts?per_page=50");
  return (data.result || []).map((a) => ({ id: a.id, name: a.name }));
}

export async function getAccountSubdomain(token, accountId) {
  try {
    const data = await cfFetch(token, `/accounts/${accountId}/workers/subdomain`);
    return data.result && data.result.subdomain ? data.result.subdomain : null;
  } catch (e) {
    return null;
  }
}

export async function createAccountSubdomain(token, accountId, subdomain) {
  const data = await cfFetch(token, `/accounts/${accountId}/workers/subdomain`, {
    method: "PUT",
    json: { subdomain },
  });
  return data.result && data.result.subdomain;
}

export async function createD1Database(token, accountId, name) {
  const data = await cfFetch(token, `/accounts/${accountId}/d1/database`, {
    method: "POST",
    json: { name },
  });
  return data.result.uuid;
}

export async function deleteD1Database(token, accountId, databaseId) {
  try {
    await cfFetch(token, `/accounts/${accountId}/d1/database/${databaseId}`, {
      method: "DELETE",
    });
  } catch (e) {
    // Already gone or inaccessible — treat as success for cleanup purposes.
  }
}

// Uploads (creates or fully replaces) a Worker module script.
// `bindings` follows the Cloudflare multipart metadata binding format, e.g.
//   [{ type: "d1", name: "IOT_DB", id: databaseUuid },
//    { type: "secret_text", name: "MEZDIA_API_KEY", text: apiKey }]
export async function uploadWorkerScript(token, accountId, scriptName, source, bindings, compatibilityDate) {
  const metadata = {
    main_module: "worker.js",
    compatibility_date: compatibilityDate,
    bindings,
  };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append(
    "worker.js",
    new Blob([source], { type: "application/javascript+module" }),
    "worker.js"
  );
  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${scriptName}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || (data && data.success === false)) {
    const message =
      (data && data.errors && data.errors[0] && data.errors[0].message) ||
      `Worker upload failed (${res.status})`;
    throw new CloudflareApiError(message, res.status, data && data.errors);
  }
  return data.result;
}

export async function enableWorkersDevRoute(token, accountId, scriptName) {
  await cfFetch(token, `/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`, {
    method: "POST",
    json: { enabled: true, previews_enabled: false },
  });
}

export async function deleteWorkerScript(token, accountId, scriptName) {
  try {
    await cfFetch(token, `/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: "DELETE",
    });
  } catch (e) {
    // Already gone — treat as success for cleanup purposes.
  }
}

export { CloudflareApiError };
