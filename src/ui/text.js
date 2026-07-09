import changelogText from "../../CHANGELOG.md";

export function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Parse changelog for a specific version
export function parseChangelog(targetVersion) {
  const lines = changelogText.split("\n");
  let currentVersion = null;
  let entry = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentVersion === targetVersion && entry.length) break;
      currentVersion = line.slice(3).trim();
      entry = [];
    } else if (currentVersion === targetVersion && line.trim() && !line.startsWith("#")) {
      entry.push(line.trim());
    }
  }

  return entry.length ? entry.join("\n") : "تغییرات جدید اعمال شده است.";
}

export const T = {
  welcome:
    "🔷 <b>Mezdia Deploy</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "دیپلوی خودکار پنل VLESS/Trojan روی کلادفلر\n" +
    "با حساب‌های کلادفلرتون مدیریت کنید.",

  mainMenuPrompt: "یکی از گزینه‌های زیر را انتخاب کنید:",

  mainMenuSummary: (accountCount, workerCount) =>
    `📊 <b>خلاصه وضعیت</b>\n` +
    `├ حساب‌ها: ${accountCount}\n` +
    `└ ورکرها: ${workerCount}`,

  help:
    "❓ <b>راهنمای استفاده</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "<b>شروع سریع:</b>\n" +
    "۱. حساب کلادفلر خود را با API Token اضافه کنید\n" +
    "۲. ورکر جدید دیپلوی کنید (خودکار!)\n" +
    "۳. لینک اشتراک و اطلاعات پنل را دریافت کنید\n\n" +
    "<b>مدیریت ورکر:</b>\n" +
    "• فعال/متوقف کردن\n" +
    "• مشاهده آمار و گزارش‌ها\n" +
    "• بازنشانی ترافیک\n" +
    "• بروزرسانی و حذف\n\n" +
    "<b>دستورات:</b>\n" +
    "<code>/start</code> — منوی اصلی\n" +
    "<code>/help</code> — این راهنما\n" +
    "<code>/cancel</code> — لغو عملیات",

  askToken:
    "🔑 <b>ساخت API Token</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "مرحله ۱: وارد <a href=\"https://dash.cloudflare.com/profile/api-tokens\">صفحه API Tokens</a> شوید\n" +
    "مرحله ۲: <code>Create Token</code> → <code>Create Custom Token</code>\n" +
    "مرحله ۳: دسترسی‌های زیر را اضافه کنید:\n" +
    "   • <code>Workers Scripts: Edit</code>\n" +
    "   • <code>D1: Edit</code>\n" +
    "   • <code>Account Settings: Read</code>\n" +
    "مرحله ۴: حساب موردنظر را انتخاب کنید\n" +
    "مرحله ۵: توکن را کپی و ارسال کنید\n\n" +
    "🔒 توکن فقط در این ربات ذخیره می‌شود.",

  tokenInvalid:
    "❌ <b>توکن نامعتبر</b>\n\n" +
    "دسترسی‌های لازم وجود ندارد. مطمئن شوید:\n" +
    "• <code>Workers Scripts: Edit</code>\n" +
    "• <code>D1: Edit</code>\n" +
    "• <code>Account Settings: Read</code>\n\n" +
    "دوباره تلاش کنید یا <code>/cancel</code> بزنید.",

  tokenNoAccounts:
    "⚠️ <b>حسابی یافت نشد</b>\n\n" +
    "Account Resources توکن را بررسی کنید.\n" +
    "دوباره تلاش کنید یا <code>/cancel</code> بزنید.",

  pickCfAccount: "این توکن به چند حساب دسترسی دارد. کدام را اضافه کنم؟",

  oneWorkerPerAccount:
    "⚠️ <b>محدودیت یک ورکر</b>\n\n" +
    "هر حساب کلادفلر فقط یک ورکر دارد.\n" +
    "برای ورکر بیشتر، حساب جدید اضافه کنید.",

  accountAdded: (name) =>
    `✅ <b>حساب اضافه شد</b>\n\n` +
    `«${name}» با موفقیت ثبت شد.`,

  accountsListEmpty:
    "📭 <b>هنوز حسابی اضافه نشده</b>\n\n" +
    "برای شروع، اولین حساب کلادفلر خود را اضافه کنید:",

  accountsListHeader: "☁️ <b>حساب‌های کلادفلر</b>\n━━━━━━━━━━━━━━━━━━━━━\n\nیکی را انتخاب کنید:",

  accountDetail: (acc, depCount) =>
    `☁️ <b>${acc.cfAccountName}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 شناسه: <code>${acc.cfAccountId}</code>\n` +
    `⚙️ ورکرها: ${depCount}\n` +
    `📅 تاریخ اضافه: ${formatDate(acc.addedAt)}`,

  confirmRemoveAccount: (acc, depCount) =>
    depCount > 0
      ? `⚠️ <b>حذف حساب</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `حساب «<b>${acc.cfAccountName}</b>» حذف شود?\n\n` +
        `🔴 <b>${depCount} ورکر</b> متصل هم حذف خواهند شد!`
      : `⚠️ <b>حذف حساب</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `حساب «<b>${acc.cfAccountName}</b>» حذف شود?\n\n` +
        `فقط توکن از ربات پاک می‌شود.`,

  accountRemoved: "🗑 <b>حساب حذف شد</b>\n\nتمام ورکرهای متصل هم حذف شدند.",

  askDeployLabel:
    "📝 <b>نام ورکر</b>\n\n" +
    "یک نام دلخواه بنویسید (یا <code>/skip</code> برای نام پیش‌فرض):",

  deploying:
    "⏳ <b>در حال دیپلوی...</b>\n\n" +
    "ساخت پایگاه‌داده و آپلود ورکر روی کلادفلر\n" +
    "این کار ۱۰ تا ۳۰ ثانیه طول می‌کشد.",

  deployFailed: (msg) =>
    `❌ <b>دیپلوی ناموفق</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `خطا: <code>${msg}</code>\n\n` +
    `دوباره تلاش کنید یا <code>/cancel</code> بزنید.`,

  deploySuccess: (dep) =>
    "✅ <b>دیپلوی موفق!</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `📛 <b>${dep.label || dep.scriptName}</b>\n\n` +
    `🔗 <b>لینک اشتراک</b>\n<code>${dep.subscriptionUrl}</code>\n\n` +
    `🖥 <b>پنل مدیریت</b>\n<code>${dep.dashboardUrl}</code>\n\n` +
    `🔑 <b>رمز ورود</b>\n<code>${dep.masterKey}</code>\n\n` +
    `🗝 <b>کلید API</b>\n<code>${dep.apiKey}</code>\n\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "💡 اطلاعات را در جای امنی ذخیره کنید.",

  deploymentsListEmpty:
    "📭 <b>هنوز ورکری دیپلوی نشده</b>\n\n" +
    "اولین ورکر خود را بسازید:",

  deploymentsListHeader: (accountName) =>
    `📋 <b>ورکرهای ${accountName}</b>\n━━━━━━━━━━━━━━━━━━━━━`,

  deploymentDetail: (dep) => {
    const statusIcon = dep.status === "paused" ? "⏸" : "🟢";
    const statusText = dep.status === "paused" ? "متوقف" : "فعال";
    return (
      `⚙️ <b>${dep.label || dep.scriptName}</b>\n` +
      "━━━━━━━━━━━━━━━━━━━━━\n" +
      `📛 <code>${dep.scriptName}</code>\n` +
      `${statusIcon} وضعیت: <b>${statusText}</b>\n` +
      `📅 ساخت: ${formatDate(dep.createdAt)}\n` +
      "━━━━━━━━━━━━━━━━━━━━━"
    );
  },

  fetchingStats: "⏳ دریافت آمار...",

  statsResult: (dep, s) => {
    const usage = s.stats?.traffic || {};
    const acc = s.stats?.account || {};
    const statusIcon = acc.status === "paused" ? "⏸" : "🟢";
    const statusText = acc.status === "paused" ? "متوقف" : "فعال";
    const uptime = Math.floor((s.stats?.system?.uptimeSeconds ?? 0) / 60);
    const hours = Math.floor(uptime / 60);
    const mins = uptime % 60;
    const uptimeStr = hours > 0 ? `${hours}ساعت ${mins}دقیقه` : `${mins} دقیقه`;
    return (
      `📊 <b>وضعیت ${dep.label || dep.scriptName}</b>\n` +
      "━━━━━━━━━━━━━━━━━━━━━\n\n" +
      `${statusIcon} وضعیت: <b>${statusText}</b>\n\n` +
      `📈 <b>ترافیک</b>\n` +
      `├ کل: <b>${usage.totalGB ?? 0}</b> GB\n` +
      `└ امروز: <b>${usage.dailyGB ?? 0}</b> GB\n\n` +
      `🔗 اتصالات: <b>${s.stats?.system?.activeConnections ?? 0}</b>\n` +
      `⏱ آپ‌تایم: <b>${uptimeStr}</b>`
    );
  },

  fetchingLogs: "⏳ دریافت گزارش‌ها...",
  logsResult: (dep, logs) => {
    if (!logs || !logs.length) {
      return (
        `📜 <b>گزارش‌های ${dep.label || dep.scriptName}</b>\n` +
        "━━━━━━━━━━━━━━━━━━━━━\n\n" +
        "هنوز گزارشی ثبت نشده.\n" +
        "پس از اتصال کاربران نمایش داده می‌شود."
      );
    }
    const lines = logs
      .slice(0, 15)
      .map((l) => `• ${formatDate(new Date(l.ts).getTime())} — ${l.type}: ${l.detail}`)
      .join("\n");
    return (
      `📜 <b>گزارش‌های ${dep.label || dep.scriptName}</b>\n` +
      "━━━━━━━━━━━━━━━━━━━━━\n\n" +
      lines
    );
  },

  actionFailed: (msg) =>
    `❌ <b>خطا</b>\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `<code>${msg}</code>\n\n` +
    `دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.`,

  paused:
    "⏸ <b>ورکر متوقف شد</b>\n\n" +
    "اتصالات قطع شدند.\n" +
    "برای فعال‌سازی، «▶️ فعال‌سازی» را بزنید.",

  resumed:
    "▶️ <b>ورکر فعال شد</b>\n\n" +
    "اتصالات از سر گرفته شدند.",

  trafficReset:
    "🔁 <b>ترافیک بازنشانی شد</b>\n\n" +
    "شمارنده‌ها صفر شدند.",

  updated:
    "🔄 <b>ورکر بروزرسانی شد</b>\n\n" +
    "آخرین نسخه بارگذاری شد.\n" +
    "تنظیمات و پایگاه‌داده دست‌نخورده.",

  confirmDeleteDeployment: (dep) =>
    `⚠️ <b>حذف ورکر</b>\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `«<b>${dep.label || dep.scriptName}</b>» و پایگاه‌داده‌اش حذف شود?\n\n` +
    "🔴 <b>غیرقابل بازگشت!</b>",

  deploymentDeleted:
    "🗑 <b>ورکر حذف شد</b>\n\n" +
    "ورکر و پایگاه‌داده برای همیشه حذف شدند.",

  showCreds: (dep) =>
    `🔐 <b>اطلاعات ${dep.label || dep.scriptName}</b>\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `🔗 <b>لینک اشتراک</b>\n<code>${dep.subscriptionUrl}</code>\n\n` +
    `🖥 <b>پنل مدیریت</b>\n<code>${dep.dashboardUrl}</code>\n\n` +
    `🔑 <b>رمز ورود</b>\n<code>${dep.masterKey}</code>\n\n` +
    `🗝 <b>کلید API</b>\n<code>${dep.apiKey}</code>\n\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "💡 برای کپی، روی کد ضربه بزنید",

  cancelled: "عملیات لغو شد.",
  unknownCallback: "⚠️ این گزینه دیگر معتبر نیست.",
  genericError: "⚠️ خطایی رخ داد. دوباره تلاش کنید.",
  notFound: "یافت نشد — شاید قبلاً حذف شده.",

  // ---- Update notification texts ----

  updateNotification: (version, changelog) =>
    `🔄 <b>نسخه جدید (${version})</b>\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `📝 <b>تغییرات:</b>\n${changelog}\n\n` +
    "ورکرهای خود را بروزرسانی کنید:",

  updateSelectPrompt: "حساب‌های موردنظر را انتخاب کنید:",
  updateStarted: (count) => `⏳ بروزرسانی ${count} ورکر...`,
  updateComplete: (success, failed) =>
    `✅ <b>بروزرسانی تمام شد</b>\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `• موفق: ${success}\n` +
    (failed > 0 ? `• ناموفق: ${failed}\n` : "") +
    `\nآخرین نسخه فعال شد.`,
};
