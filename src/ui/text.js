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
    "راه‌اندازی و مدیریت پنل VLESS/Trojan روی Cloudflare\n" +
    "بدون تنظیمات پیچیده، مستقیم از تلگرام.\n\n" +
    "💡 <b>قانون ظرفیت:</b> هر حساب Cloudflare = یک ورکر فعال\n" +
    "برای ورکرهای بیشتر، حساب‌های بیشتری اضافه کنید.",

  mainMenuPrompt: "برای شروع، ساده‌ترین مسیر این است: اول حساب را اضافه کنید، بعد ورکر را بسازید.",

  mainMenuSummary: (accountCount, workerCount) =>
    `📊 <b>خلاصه وضعیت</b>\n` +
    `├ حساب‌های Cloudflare: <b>${accountCount}</b>\n` +
    `├ ورکرهای فعال/ثبت‌شده: <b>${workerCount}</b>\n` +
    `└ ظرفیت قابل استفاده: <b>${Math.max(accountCount - workerCount, 0)}</b> ورکر جدید`,

  help:
    "❓ <b>راهنمای استفاده</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "<b>مسیر پیشنهادی:</b>\n" +
    "۱. «➕ افزودن حساب Cloudflare» را بزنید\n" +
    "۲. API Token را طبق راهنمای مرحله‌ای بسازید و ارسال کنید\n" +
    "۳. وارد حساب شوید و «🚀 ساخت ورکر این حساب» را بزنید\n" +
    "۴. لینک اشتراک، پنل مدیریت و رمزها را دریافت کنید\n\n" +
    "<b>قانون مهم:</b>\n" +
    "• هر حساب Cloudflare فقط یک ورکر قابل اجرا دارد\n" +
    "• برای ساخت ورکر بیشتر، حساب Cloudflare جدید اضافه کنید\n\n" +
    "<b>بعد از دیپلوی می‌توانید:</b>\n" +
    "• وضعیت و مصرف را ببینید\n" +
    "• اطلاعات دسترسی را دوباره دریافت کنید\n" +
    "• گزارش‌ها را بررسی کنید\n" +
    "• ورکر را بروزرسانی، توقف، فعال یا حذف کنید\n\n" +
    "<b>دستورات:</b>\n" +
    "<code>/start</code> — منوی اصلی\n" +
    "<code>/help</code> — این راهنما\n" +
    "<code>/cancel</code> — لغو عملیات",

  askToken:
    "🔑 <b>افزودن حساب Cloudflare</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "برای اینکه ربات بتواند یک ورکر روی حساب شما بسازد، API Token لازم است.\n\n" +
    "<b>مراحل ساخت توکن:</b>\n" +
    "۱. وارد <a href=\"https://dash.cloudflare.com/profile/api-tokens\">صفحه API Tokens</a> شوید\n" +
    "۲. <code>Create Token</code> → <code>Create Custom Token</code>\n" +
    "۳. دسترسی‌های زیر را اضافه کنید:\n" +
    "   • <code>Workers Scripts: Edit</code>\n" +
    "   • <code>D1: Edit</code>\n" +
    "   • <code>Account Settings: Read</code>\n" +
    "۴. در Account Resources فقط حساب موردنظر را انتخاب کنید\n" +
    "۵. توکن ساخته‌شده را همینجا ارسال کنید\n\n" +
    "💡 هر حساب اضافه‌شده یعنی ظرفیت ساخت <b>یک ورکر</b>.\n" +
    "🔒 توکن فقط برای ساخت و مدیریت ورکر همان حساب استفاده می‌شود.",

  tokenInvalid:
    "❌ <b>توکن نامعتبر</b>\n\n" +
    "توکن قابل تایید نبود یا دسترسی‌های لازم را ندارد. بررسی کنید:\n" +
    "• <code>Workers Scripts: Edit</code>\n" +
    "• <code>D1: Edit</code>\n" +
    "• <code>Account Settings: Read</code>\n\n" +
    "اگر توکن را تازه ساختید، آن را کامل کپی کنید و دوباره بفرستید. برای خروج <code>/cancel</code> را بزنید.",

  tokenNoAccounts:
    "⚠️ <b>حسابی یافت نشد</b>\n\n" +
    "توکن به هیچ حساب Cloudflare دسترسی ندارد.\n" +
    "در بخش Account Resources، حساب موردنظر را انتخاب کنید و توکن جدید بسازید.",

  pickCfAccount:
    "☁️ <b>انتخاب حساب</b>\n\n" +
    "این توکن به چند حساب دسترسی دارد. حسابی را انتخاب کنید که می‌خواهید برای آن یک ورکر بسازید.",

  oneWorkerPerAccount:
    "⚠️ <b>ظرفیت این حساب پر است</b>\n\n" +
    "هر حساب Cloudflare فقط می‌تواند <b>یک ورکر</b> در این ربات داشته باشد.\n\n" +
    "برای ساخت ورکر جدید، یک حساب Cloudflare دیگر اضافه کنید یا ورکر فعلی همین حساب را حذف کنید.",

  accountAdded: (name) =>
    `✅ <b>حساب اضافه شد</b>\n\n` +
    `«${name}» با موفقیت ثبت شد.\n\n` +
    `ظرفیت این حساب: <b>یک ورکر</b>\n` +
    `برای ادامه وارد «☁️ حساب‌ها و ورکرها» شوید و ورکر را بسازید.`,

  accountsListEmpty:
    "📭 <b>هنوز حسابی اضافه نشده</b>\n\n" +
    "برای ساخت اولین ورکر، ابتدا یک حساب Cloudflare اضافه کنید.\n" +
    "هر حسابی که اضافه می‌کنید ظرفیت ساخت یک ورکر را فراهم می‌کند:",

  accountsListHeader: (accountCount, workerCount) =>
    "☁️ <b>حساب‌های Cloudflare</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `حساب‌ها: <b>${accountCount}</b> | ورکرها: <b>${workerCount}</b> | ظرفیت آزاد: <b>${Math.max(accountCount - workerCount, 0)}</b>\n\n` +
    "برای مدیریت یا ساخت ورکر، یک حساب را انتخاب کنید:",

  accountDetail: (acc, depCount) =>
    `☁️ <b>${acc.cfAccountName}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 شناسه: <code>${acc.cfAccountId}</code>\n` +
    `⚙️ ورکر این حساب: <b>${depCount ? "ساخته شده" : "آماده ساخت"}</b>\n` +
    `📦 ظرفیت: <b>${depCount}/1</b>\n` +
    `📅 تاریخ اضافه: ${formatDate(acc.addedAt)}\n\n` +
    (depCount
      ? "برای مدیریت ورکر، «📋 ورکر این حساب» را بزنید."
      : "برای ساخت ورکر، «🚀 ساخت ورکر این حساب» را بزنید."),

  confirmRemoveAccount: (acc, depCount) =>
    depCount > 0
      ? `⚠️ <b>حذف حساب</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `حساب «<b>${acc.cfAccountName}</b>» حذف شود؟\n\n` +
        `🔴 ورکر متصل به این حساب هم حذف خواهد شد. این کار قابل بازگشت نیست.`
      : `⚠️ <b>حذف حساب</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `حساب «<b>${acc.cfAccountName}</b>» حذف شود؟\n\n` +
        `فقط توکن از ربات پاک می‌شود.`,

  accountRemoved: "🗑 <b>حساب حذف شد</b>\n\nتمام ورکرهای متصل هم حذف شدند.",

  askDeployLabel:
    "📝 <b>نام‌گذاری ورکر</b>\n\n" +
    "یک نام ساده برای تشخیص این ورکر بنویسید.\n" +
    "مثال: <code>خانه</code> یا <code>Office</code>\n\n" +
    "اگر نام خاصی نمی‌خواهید، <code>/skip</code> را بفرستید.",

  deploying:
    "⏳ <b>در حال دیپلوی...</b>\n\n" +
    "ربات در حال ساخت پایگاه‌داده، آپلود ورکر و آماده‌سازی پنل است.\n" +
    "معمولاً ۱۰ تا ۳۰ ثانیه طول می‌کشد. لطفاً همینجا بمانید.",

  deployFailed: (msg) =>
    `❌ <b>دیپلوی ناموفق</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `خطا: <code>${msg}</code>\n\n` +
    `اگر خطا مربوط به دسترسی بود، API Token را بررسی کنید. در غیر این صورت چند دقیقه بعد دوباره تلاش کنید.`,

  deploySuccess: (dep) =>
    "✅ <b>دیپلوی موفق!</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `📛 <b>${dep.label || dep.scriptName}</b>\n\n` +
    `🔗 <b>لینک اشتراک</b>\n<code>${dep.subscriptionUrl}</code>\n\n` +
    `🖥 <b>پنل مدیریت</b>\n<code>${dep.dashboardUrl}</code>\n\n` +
    `🔑 <b>رمز ورود</b>\n<code>${dep.masterKey}</code>\n\n` +
    `🗝 <b>کلید API</b>\n<code>${dep.apiKey}</code>\n\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "💡 روی هر مقدار کدشده بزنید تا راحت کپی شود. این اطلاعات را در جای امن نگه دارید.",

  deploymentsListEmpty:
    "📭 <b>هنوز ورکری دیپلوی نشده</b>\n\n" +
    "این حساب هنوز ظرفیت آزاد دارد. می‌توانید همین حالا ورکر آن را بسازید:",

  deploymentsListHeader: (accountName) =>
    `📋 <b>ورکر حساب ${accountName}</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
    "برای مدیریت، ورکر را انتخاب کنید:",

  deploymentDetail: (dep) => {
    const statusIcon = dep.status === "paused" ? "⏸" : "🟢";
    const statusText = dep.status === "paused" ? "متوقف" : "فعال";
    return (
      `⚙️ <b>${dep.label || dep.scriptName}</b>\n` +
      "━━━━━━━━━━━━━━━━━━━━━\n" +
      `📛 <code>${dep.scriptName}</code>\n` +
      `${statusIcon} وضعیت: <b>${statusText}</b>\n` +
      `📅 ساخت: ${formatDate(dep.createdAt)}\n` +
      "━━━━━━━━━━━━━━━━━━━━━\n" +
      "از دکمه‌های زیر برای مشاهده لینک‌ها، مصرف، بروزرسانی یا کنترل ورکر استفاده کنید."
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
    "اتصالات جدید متوقف شدند.\n" +
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
    `«<b>${dep.label || dep.scriptName}</b>» و پایگاه‌داده‌اش حذف شود؟\n\n` +
    "🔴 <b>غیرقابل بازگشت!</b> بعد از حذف، ظرفیت این حساب دوباره آزاد می‌شود.",

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
  unknownCallback: "⚠️ این گزینه دیگر معتبر نیست. لطفاً از منوی اصلی دوباره انتخاب کنید.",
  genericError: "⚠️ ورودی قابل تشخیص نبود. از دکمه‌های منو استفاده کنید یا /start را بفرستید.",
  notFound: "موردی پیدا نشد. شاید قبلاً حذف شده یا منوی فعلی قدیمی است.",

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
