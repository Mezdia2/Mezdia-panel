import { setWebhook } from "./lib/telegram.js";
import { routeMessage, routeCallbackQuery } from "./handlers/router.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // One-time (or repeatable) setup endpoint: registers this Worker's own
    // URL as the Telegram webhook. Protected by ADMIN_SETUP_KEY so random
    // visitors can't hijack the bot's webhook.
    if (url.pathname === "/install") {
      const q = (url.searchParams.get("key") || "").trim();
      const a = (env.ADMIN_SETUP_KEY || "").trim();
      if (!a || q !== a) {
        return new Response("Unauthorized", { status: 401 });
      }
      const webhookUrl = `${url.origin}/telegram/webhook`;
      const result = await setWebhook(env, webhookUrl, (env.TELEGRAM_WEBHOOK_SECRET || "").trim());
      return new Response(JSON.stringify({ webhookUrl, result }, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/telegram/webhook") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      const secretHeader = (request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "").trim();
      if (env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== (env.TELEGRAM_WEBHOOK_SECRET || "").trim()) {
        return new Response("Unauthorized", { status: 401 });
      }

      let update;
      try {
        update = await request.json();
      } catch (e) {
        return new Response("Bad Request", { status: 400 });
      }

      // Do the actual work in the background and answer Telegram immediately —
      // Telegram only needs a fast 200 OK; it doesn't wait for our reply.
      ctx.waitUntil(handleUpdate(env, update, ctx));
      return new Response("OK");
    }

    return new Response("Mezdia deployment bot is running.", { status: 200 });
  },
};

async function handleUpdate(env, update, ctx) {
  try {
    if (update.callback_query) {
      await routeCallbackQuery(env, update.callback_query, ctx);
    } else if (update.message) {
      await routeMessage(env, update.message, ctx);
    }
  } catch (e) {
    console.error("Unhandled update error", e);
  }
}
