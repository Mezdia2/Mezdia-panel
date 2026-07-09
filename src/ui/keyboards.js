import { replyKb, replyBtn, removeKb, kb, urlBtn } from "../lib/telegram.js";

// ---- Reply Keyboards ----

export const mainMenuKb = () =>
  replyKb([
    [replyBtn("➕ افزودن حساب کلادفلر")],
    [replyBtn("☁️ حساب‌های من")],
    [replyBtn("❓ راهنما")],
  ]);

export const cancelKb = () =>
  replyKb([
    [replyBtn("✖️ لغو")],
  ]);

export const accountsListKb = (accounts) =>
  replyKb([
    ...accounts.map((a) => [replyBtn(`☁️ ${a.cfAccountName}`)]),
    [replyBtn("➕ افزودن حساب جدید")],
    [replyBtn("🔙 بازگشت به منوی اصلی")],
  ]);

export const accountDetailKb = (hasWorker) =>
  replyKb([
    ...(hasWorker ? [] : [[replyBtn("🚀 دیپلوی ورکر جدید")]]),
    [replyBtn("📋 ورکرهای این حساب")],
    [replyBtn("🗑 حذف این حساب")],
    [replyBtn("🔙 بازگشت به لیست حساب‌ها")],
  ]);

export const confirmRemoveAccountKb = () =>
  replyKb([
    [replyBtn("✅ بله، حذف کن")],
    [replyBtn("✖️ انصراف")],
  ]);

export const deploymentsListKb = (deployments) =>
  replyKb([
    ...deployments.map((d) => [replyBtn(`⚙️ ${d.label || d.scriptName}`)]),
    ...(deployments.length === 0 ? [[replyBtn("🚀 دیپلوی ورکر جدید")]] : []),
    [replyBtn("🔙 بازگشت به حساب")],
  ]);

export const deploymentDetailKb = (dep) =>
  replyKb([
    [replyBtn("📊 وضعیت و مصرف"), replyBtn("🔐 اطلاعات دسترسی")],
    [replyBtn("📜 گزارش‌ها")],
    [replyBtn(dep.status === "paused" ? "▶️ فعال‌سازی" : "⏸ توقف")],
    [replyBtn("🔁 بازنشانی ترافیک")],
    [replyBtn("🔄 بروزرسانی ورکر")],
    [replyBtn("🗑 حذف ورکر")],
    [replyBtn("🔙 بازگشت به حساب")],
  ]);

export const confirmDeleteDeploymentKb = () =>
  replyKb([
    [replyBtn("✅ بله، حذف کن")],
    [replyBtn("✖️ انصراف")],
  ]);

export const removeMenuKb = () => removeKb();

// ---- Update Notification Keyboards ----

export const updateNotificationKb = () =>
  replyKb([
    [replyBtn("🔄 بروزرسانی همه")],
    [replyBtn("🔄 انتخاب حساب‌ها")],
    [replyBtn("✖️ رد کردن")],
  ]);

export const updateSelectKb = (accounts, selectedIds) =>
  replyKb([
    ...accounts.map((a) => [replyBtn(`${selectedIds.has(a.id) ? "✅" : "✖️"} ${a.cfAccountName}`)]),
    [replyBtn("🔄 بروزرسانی انتخاب شده")],
    [replyBtn("🔄 بروزرسانی همه")],
    [replyBtn("✖️ رد کردن")],
  ]);

// ---- Inline Keyboard for URL (used sparingly) ----

export const askTokenInlineKb = () =>
  kb([
    [urlBtn("🔗 صفحه API Tokens کلادفلر", "https://dash.cloudflare.com/profile/api-tokens")],
  ]);
