# Mezdia Deploy Bot

A Telegram bot running on Cloudflare Workers that allows users to fully automatically deploy and manage an instance of the Mezdia panel (VLESS/Trojan proxy on Workers + D1 database + Persian settings panel) on their own Cloudflare account by submitting their own API Token.

Each user can add multiple Cloudflare accounts and have several separate workers per account. All bot data (users, stored accounts, deployments, conversation state) is stored in a single Workers KV namespace.

## Project Structure

```
mezdia-bot/
├── wrangler.toml           Bot's own deployment config
├── package.json
├── src/
│   ├── index.js             Worker entry point (Telegram webhook)
│   ├── config.js            Shared constants
│   ├── lib/
│   │   ├── telegram.js      Telegram Bot API communication
│   │   ├── kv.js            Database layer (Workers KV)
│   │   ├── cloudflare.js    Cloudflare REST API communication
│   │   ├── provision.js     Deploy/update/delete panel logic
│   │   └── ids.js           Random ID and password generation
│   ├── ui/
│   │   ├── text.js          All bot text strings (Persian)
│   │   └── keyboards.js     Inline keyboards
│   ├── handlers/
│   │   ├── router.js        Message and callback routing
│   │   ├── start.js
│   │   ├── accounts.js      Cloudflare account management
│   │   └── deployments.js   Deployed worker management
│   └── panel/
│       └── worker-template.txt   Full source of the worker deployed each time
```

## Prerequisites

- A Cloudflare account (for the bot itself — separate from users' accounts)
- Node.js 18+
- A Telegram bot created via [@BotFather](https://t.me/BotFather) and its token

## Installation & Deployment

```bash
cd mezdia-bot
npm install

# Login to your Cloudflare account
npx wrangler login

# Create KV namespace for the bot database
npx wrangler kv namespace create BOT_DB
# Put the returned id in wrangler.toml in place of REPLACE_WITH_YOUR_KV_NAMESPACE_ID

# Set secrets
npx wrangler secret put TELEGRAM_BOT_TOKEN
# Enter the token you got from BotFather

npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
# Generate and enter a random string (e.g. with: openssl rand -hex 24)

npx wrangler secret put ADMIN_SETUP_KEY
# Another random string to protect the /install route

# Deploy the bot itself
npx wrangler deploy
```

After deployment, get the bot worker URL (something like `https://mezdia-deploy-bot.<your-subdomain>.workers.dev`) and register the Telegram webhook using one of the following methods:

### Method 1 — Via the bot itself (easier)

Just open this URL in your browser:

```
https://mezdia-deploy-bot.<your-subdomain>.workers.dev/install?key=<ADMIN_SETUP_KEY>
```

### Method 2 — Manually with curl

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mezdia-deploy-bot.<your-subdomain>.workers.dev/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

That's it! Now send `/start` to the bot on Telegram.

## What permissions do users need to grant the bot?

Each user must create a **Custom API Token** (not Global API Key) from inside their Cloudflare account with these Account-level permissions:

| Permission | Level |
|---|---|
| Workers Scripts | Edit |
| D1 | Edit |
| Account Settings | Read |

Full instructions are displayed in Persian inside the bot (by pressing the "Add Cloudflare Account" button).

Each user's token is stored only in the bot's KV namespace, linked to their own Telegram ID, and no other user has access to it.

## The worker deployed each time

The file `src/panel/worker-template.txt` is the full source of the Mezdia panel — the exact same thing that the Cloudflare API uploads onto the user's account when deploying a new worker. Compared to the original version:

- The sales/limitation layer (traffic cap, expiry date, auto-deactivation, auto-deletion after subscription end) has been completely removed — every worker stays active unless the user stops it from within the bot.
- The settings panel (`/.../dash`) has been completely redesigned: Persian, right-to-left, with a more modern look (Vazirmatn font, subscription link QR code, copy buttons, etc.).
- Dead/unnecessary code (in-memory diagnostic counters, unused fields) has been removed.

If you later make changes to this file, just run `wrangler deploy` again for the **bot** — the next time a user clicks "Update Worker" from an existing deployment's menu, the new version will be uploaded to their account without losing their database or settings.

## Deployment architecture (technical summary)

When "Deploy New Worker" is triggered, the bot performs these steps on the user's Cloudflare account (using the token they provided):

1. Creates a dedicated D1 database
2. Ensures the `workers.dev` subdomain is active on that account (creates one if missing)
3. Uploads the worker source with a D1 database binding named `IOT_DB` and a random API key named `MEZDIA_API_KEY`
4. Enables the `workers.dev` route for that script
5. Makes a request to the newly deployed worker's own API to randomize the panel password and secure path (instead of defaults)
6. Gets the final subscription link and sends all info to the user on Telegram

All subsequent management operations (stop/activate, reset traffic, view stats) no longer need to call the Cloudflare API — the bot communicates directly with the deployed worker's internal API (using `MEZDIA_API_KEY`). Only "Update Worker" and "Delete Worker" call the Cloudflare API again.
