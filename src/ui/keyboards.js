import { kb, btn, urlBtn } from "../lib/telegram.js";

export const mainMenuKeyboard = () =>
  kb([
    [btn("➕ افزودن حساب کلادفلر", "acct:add")],
    [btn("☁️ حساب‌های من", "menu:accounts")],
    [btn("❓ راهنما", "menu:help")],
  ]);

export const backToMainKeyboard = () => kb([[btn("🔙 بازگشت به منوی اصلی", "menu:main")]]);

export const cancelKeyboard = () => kb([[btn("✖️ لغو", "menu:main")]]);

export const askTokenKeyboard = () =>
  kb([
    [urlBtn("🔗 صفحه API Tokens کلادفلر", "https://dash.cloudflare.com/profile/api-tokens")],
    [btn("✖️ لغو", "menu:main")],
  ]);

export const pickCfAccountKeyboard = (candidates) =>
  kb([
    ...candidates.map((c) => [btn(`☁️ ${c.name}`, `acct:pick:${c.id}`)]),
    [btn("✖️ لغو", "menu:main")],
  ]);

export const accountsListKeyboard = (accounts) =>
  kb([
    ...accounts.map((a) => [btn(`☁️ ${a.cfAccountName}`, `acct:view:${a.id}`)]),
    [btn("➕ افزودن حساب جدید", "acct:add")],
    [btn("🔙 بازگشت", "menu:main")],
  ]);

export const accountDetailKeyboard = (accountId) =>
  kb([
    [btn("🚀 دیپلوی ورکر جدید", `acct:deploy:${accountId}`)],
    [btn("📋 ورکرهای این حساب", `acct:deployments:${accountId}`)],
    [btn("🗑 حذف این حساب", `acct:remove:${accountId}`)],
    [btn("🔙 بازگشت به لیست حساب‌ها", "menu:accounts")],
  ]);

export const confirmRemoveAccountKeyboard = (accountId) =>
  kb([
    [btn("✅ بله، حذف کن", `acct:remove_confirm:${accountId}`)],
    [btn("✖️ انصراف", `acct:view:${accountId}`)],
  ]);

export const deploymentsListKeyboard = (deployments, accountId) =>
  kb([
    ...deployments.map((d) => [btn(`⚙️ ${d.label || d.scriptName}`, `dep:view:${d.id}`)]),
    [btn("🚀 دیپلوی ورکر جدید", `acct:deploy:${accountId}`)],
    [btn("🔙 بازگشت به حساب", `acct:view:${accountId}`)],
  ]);

export const deploymentDetailKeyboard = (dep) =>
  kb([
    [btn("📊 وضعیت و مصرف", `dep:stats:${dep.id}`), btn("🔐 اطلاعات دسترسی", `dep:creds:${dep.id}`)],
    [btn("📜 گزارش‌ها", `dep:logs:${dep.id}`)],
    dep.status === "paused"
      ? [btn("▶️ فعال‌سازی", `dep:resume:${dep.id}`)]
      : [btn("⏸ توقف", `dep:pause:${dep.id}`)],
    [btn("🔁 بازنشانی ترافیک", `dep:reset:${dep.id}`)],
    [btn("🔄 بروزرسانی ورکر", `dep:update:${dep.id}`)],
    [btn("🗑 حذف ورکر", `dep:delete:${dep.id}`)],
    [btn("🔙 بازگشت به حساب", `acct:view:${dep.accountId}`)],
  ]);

export const backToDeploymentKeyboard = (depId) =>
  kb([[btn("🔙 بازگشت", `dep:view:${depId}`)]]);

export const confirmDeleteDeploymentKeyboard = (dep) =>
  kb([
    [btn("✅ بله، حذف کن", `dep:delete_confirm:${dep.id}`)],
    [btn("✖️ انصراف", `dep:view:${dep.id}`)],
  ]);
