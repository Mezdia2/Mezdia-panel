// Shared constants for the Mezdia deployment bot.

export const CF_API_BASE = "https://api.cloudflare.com/client/v4";

// Compatibility date used for every panel worker this bot deploys/redeploys.
// Kept fixed so redeploys don't silently change Workers runtime behaviour.
export const PANEL_COMPAT_DATE = "2024-09-23";

// Binding names used inside the deployed panel worker (must match worker-template.txt).
export const PANEL_D1_BINDING = "IOT_DB";
export const PANEL_API_KEY_BINDING = "MEZDIA_API_KEY";

// Session conversation state TTL (seconds). Abandoned flows expire on their own.
export const SESSION_TTL_SECONDS = 15 * 60;

// How long to keep retrying right after a fresh deploy while Cloudflare's
// edge propagates the new script (cold first request can 522/523 briefly).
export const DEPLOY_INIT_RETRIES = 6;
export const DEPLOY_INIT_RETRY_DELAY_MS = 2000;

export const SCRIPT_NAME_PREFIX = "mz-";

// Current panel version — bump this when deploying a new panel worker template.
// Used for auto-update notifications to users.
export const PANEL_VERSION = "3.3.2";
