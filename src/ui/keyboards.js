import { replyKb, replyBtn, removeKb, kb, btn, urlBtn } from "../lib/telegram.js";

// ---- Reply Keyboards ----

export const mainMenuKb = () =>
  replyKb([
    [replyBtn("➕ افزودن حساب Cloudflare")],
    [replyBtn("☁️ حساب‌ها و ورکرها")],
    [replyBtn("❓ راهنما")],
  ]);

export const cancelKb = () =>
  replyKb([
    [replyBtn("✖️ لغو")],
  ]);

export const accountsListKb = (accounts) =>
  replyKb([
    ...accounts.map((a) => [replyBtn(`☁️ ${a.cfAccountName}`)]),
    [replyBtn("➕ افزودن حساب جدید (یک ورکر بیشتر)")],
    [replyBtn("🔙 بازگشت به منوی اصلی")],
  ]);

export const accountDetailKb = (hasWorker) =>
  replyKb([
    ...(hasWorker ? [] : [[replyBtn("🚀 ساخت ورکر این حساب")]]),
    [replyBtn("📋 ورکر این حساب")],
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
    ...(deployments.length === 0 ? [[replyBtn("🚀 ساخت ورکر این حساب")]] : []),
    [replyBtn("🔙 بازگشت به حساب")],
  ]);

export const deploymentDetailKb = (dep) =>
  kb([
    [btn("🔐 لینک‌ها و رمزها", `creds:${dep.id}`)],
    [btn("📊 وضعیت و مصرف", `stats:${dep.id}`), btn("📜 گزارش‌ها", `logs:${dep.id}`)],
    [btn(dep.status === "paused" ? "▶️ فعال‌سازی" : "⏸ توقف", dep.status === "paused" ? `resume:${dep.id}` : `pause:${dep.id}`)],
    [btn("🔁 بازنشانی ترافیک", `reset:${dep.id}`)],
    [btn("🔄 بروزرسانی ورکر", `update:${dep.id}`)],
    [btn("🗑 حذف ورکر", `del:${dep.id}`)],
    [btn("🔙 بازگشت به حساب", `back_dep:${dep.accountId}`)],
  ]);

export const confirmDeleteDeploymentKb = (depId) =>
  kb([
    [btn("✅ بله، حذف کن", `delete_confirmed:${depId}`), btn("✖️ انصراف", `cancel_delete:${depId}`)],
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
