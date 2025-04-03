// Minimal Telegram Bot API client — just fetch() against the HTTP API.
// No external dependency; keeps the Worker bundle small.

function apiUrl(env, method) {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function call(env, method, payload) {
  const res = await fetch(apiUrl(env, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ ok: false, description: "invalid json response" }));
  if (!data.ok) {
    console.error("Telegram API error", method, data.description || data);
  }
  return data;
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Wraps a value in <code> for monospace/copyable rendering, HTML-escaped.
export function code(str) {
  return `<code>${escapeHtml(str)}</code>`;
}

export async function sendMessage(env, chatId, text, opts = {}) {
  return call(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: opts.keyboard,
  });
}

export async function editMessageText(env, chatId, messageId, text, opts = {}) {
  const res = await call(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: opts.keyboard,
  });
  if (!res.ok) {
    // Message might be too old / identical / deleted — fall back to a fresh message.
    return sendMessage(env, chatId, text, opts);
  }
  return res;
}

export async function answerCallbackQuery(env, callbackQueryId, opts = {}) {
  return call(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: opts.text,
    show_alert: !!opts.showAlert,
  });
}

export async function setWebhook(env, url, secretToken) {
  return call(env, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(env) {
  return call(env, "deleteWebhook", { drop_pending_updates: true });
}

// ---- Inline keyboard builders ----

export function kb(rows) {
  return { inline_keyboard: rows };
}

export function btn(text, callback_data) {
  return { text, callback_data };
}

export function urlBtn(text, url) {
  return { text, url };
}
