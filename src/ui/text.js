export function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const T = {
  welcome:
    "👋 به ربات مدیریت پنل Mezdia خوش آمدید!\n\n" +
    "با این ربات می‌توانید حساب‌های کلادفلر خودتان را اضافه کنید و ربات به‌صورت کاملاً خودکار برایتان یک پنل VLESS/Trojan روی همان حساب دیپلوی می‌کند؛ همراه با پایگاه‌داده اختصاصی، لینک اشتراک، و پنل تنظیمات گرافیکی.\n\n" +
    "می‌توانید چند حساب کلادفلر اضافه کنید و در هرکدام چند ورکر جدا داشته باشید — همه از همینجا قابل مدیریت‌اند.",

  mainMenuPrompt: "از منوی زیر یکی را انتخاب کنید:",

  help:
    "❓ <b>راهنما</b>\n\n" +
    "۱. از «افزودن حساب کلادفلر» یک API Token با دسترسی‌های لازم بسازید و برای ربات ارسال کنید.\n" +
    "۲. از داخل همان حساب، گزینه «دیپلوی ورکر جدید» را بزنید — ربات به‌صورت خودکار پایگاه‌داده و ورکر را می‌سازد و به هم متصل می‌کند.\n" +
    "۳. لینک اشتراک، آدرس پنل و رمز عبور را دریافت می‌کنید.\n" +
    "۴. از همین ربات می‌توانید ورکر را متوقف/فعال کنید، ترافیک را بازنشانی کنید، یا آن را کاملاً حذف کنید.\n\n" +
    "دستورها:\n" +
    "/start — منوی اصلی\n" +
    "/help — همین راهنما\n" +
    "/cancel — لغو عملیات جاری",

  askToken:
    "🔑 یک <b>API Token</b> اختصاصی کلادفلر بسازید و همینجا برای من ارسال کنید.\n\n" +
    "برای ساخت توکن:\n" +
    "1️⃣ وارد صفحه API Tokens کلادفلر شوید (دکمه پایین)\n" +
    "2️⃣ روی «Create Token» بزنید و «Create Custom Token» را انتخاب کنید\n" +
    "3️⃣ این دسترسی‌ها را اضافه کنید (همه در سطح Account):\n" +
    "   • <code>Workers Scripts — Edit</code>\n" +
    "   • <code>D1 — Edit</code>\n" +
    "   • <code>Account Settings — Read</code>\n" +
    "4️⃣ در بخش Account Resources، حساب موردنظر (یا All accounts) را انتخاب کنید\n" +
    "5️⃣ توکن ساخته‌شده را کپی و همینجا ارسال کنید\n\n" +
    "⚠️ این توکن فقط داخل همین ربات و برای مدیریت ورکرهای شما ذخیره می‌شود.",

  tokenInvalid:
    "❌ این توکن معتبر نبود یا دسترسی لازم را ندارد.\n" +
    "لطفاً از داشتن دسترسی‌های <code>Workers Scripts Edit</code>، <code>D1 Edit</code> و <code>Account Settings Read</code> مطمئن شوید و دوباره ارسال کنید، یا /cancel را بزنید.",

  tokenNoAccounts:
    "⚠️ با این توکن هیچ حساب کلادفلری پیدا نشد. Account Resources توکن را بررسی کنید و دوباره تلاش کنید، یا /cancel را بزنید.",

  pickCfAccount: "این توکن به چند حساب کلادفلر دسترسی دارد. کدام‌یک را اضافه کنم؟",

  accountAdded: (name) => `✅ حساب «${name}» با موفقیت اضافه شد.`,

  accountsListEmpty:
    "هنوز هیچ حساب کلادفلری اضافه نکرده‌اید.\n\nبرای شروع، یک حساب اضافه کنید:",

  accountsListHeader: "☁️ <b>حساب‌های کلادفلر شما</b>\n\nیکی را برای مدیریت انتخاب کنید:",

  accountDetail: (acc, depCount) =>
    `☁️ <b>${acc.cfAccountName}</b>\n` +
    `شناسه حساب: <code>${acc.cfAccountId}</code>\n` +
    `تعداد ورکر فعال: ${depCount}`,

  confirmRemoveAccount: (acc, depCount) =>
    depCount > 0
      ? `⚠️ حذف حساب «${acc.cfAccountName}» باعث حذف ${depCount} ورکر متصل به آن (همراه پایگاه‌داده‌شان) نیز خواهد شد.\n\nآیا مطمئن هستید؟`
      : `⚠️ حساب «${acc.cfAccountName}» حذف شود؟ (فقط توکن از ربات پاک می‌شود، منابعی روی کلادفلر وجود ندارد که حذف شود.)`,

  accountRemoved: "🗑 حساب و ورکرهای متصل به آن حذف شدند.",

  askDeployLabel:
    "یک نام دلخواه برای این ورکر بنویسید (فقط برای نمایش در ربات و پنل).\n" +
    "برای رد شدن و استفاده از نام پیش‌فرض، /skip را بفرستید.",

  deploying: "⏳ در حال ساخت پایگاه‌داده و دیپلوی ورکر روی کلادفلر… این کار معمولاً ۱۰ تا ۳۰ ثانیه طول می‌کشد.",

  deployFailed: (msg) =>
    `❌ دیپلوی ناموفق بود.\n\nخطا: <code>${msg}</code>\n\nدوباره تلاش کنید یا از /cancel استفاده کنید.`,

  deploySuccess: (dep) =>
    "✅ <b>ورکر با موفقیت دیپلوی شد!</b>\n\n" +
    `📛 نام: ${dep.label || dep.scriptName}\n\n` +
    `🔗 <b>لینک اشتراک (Subscription)</b>\n<code>${dep.subscriptionUrl}</code>\n\n` +
    `🖥 <b>آدرس پنل مدیریت</b>\n<code>${dep.dashboardUrl}</code>\n\n` +
    `🔑 <b>رمز ورود پنل</b>\n<code>${dep.masterKey}</code>\n\n` +
    `🗝 <b>کلید API</b>\n<code>${dep.apiKey}</code>\n\n` +
    `📛 <b>شناسه دستگاه</b>\n<code>${dep.deviceId}</code>\n\n` +
    "⚠️ این اطلاعات را در جای امنی نگه دارید. رمز پنل و کلید API را هر زمان بخواهید می‌توانید از منوی این ورکر دوباره ببینید یا تغییر دهید.",

  deploymentsListEmpty: "هنوز هیچ ورکری روی این حساب دیپلوی نکرده‌اید.",
  deploymentsListHeader: "📋 ورکرهای این حساب:",

  deploymentDetail: (dep) =>
    `⚙️ <b>${dep.label || dep.scriptName}</b>\n` +
    `اسکریپت: <code>${dep.scriptName}</code>\n` +
    `ساخته‌شده: ${formatDate(dep.createdAt)}`,

  fetchingStats: "⏳ در حال دریافت آمار…",

  statsResult: (dep, s) => {
    const usage = s.stats?.traffic || {};
    const acc = s.stats?.account || {};
    const status = acc.status === "paused" ? "متوقف ⏸" : "فعال ✅";
    return (
      `📊 <b>وضعیت ${dep.label || dep.scriptName}</b>\n\n` +
      `وضعیت: ${status}\n` +
      `ترافیک کل: ${usage.totalGB ?? 0} گیگابایت\n` +
      `ترافیک امروز: ${usage.dailyGB ?? 0} گیگابایت\n` +
      `اتصالات فعال: ${s.stats?.system?.activeConnections ?? 0}\n` +
      `آپ‌تایم: ${Math.floor((s.stats?.system?.uptimeSeconds ?? 0) / 60)} دقیقه`
    );
  },

  fetchingLogs: "⏳ در حال دریافت گزارش‌ها…",
  logsResult: (dep, logs) => {
    if (!logs || !logs.length) {
      return `📜 <b>گزارش‌های ${dep.label || dep.scriptName}</b>\n\nهنوز گزارشی ثبت نشده است.`;
    }
    const lines = logs
      .slice(0, 15)
      .map((l) => `• ${formatDate(new Date(l.ts).getTime())} — ${l.type}: ${l.detail}`)
      .join("\n");
    return `📜 <b>گزارش‌های ${dep.label || dep.scriptName}</b>\n\n${lines}`;
  },

  actionFailed: (msg) => `❌ عملیات ناموفق بود: <code>${msg}</code>`,
  paused: "⏸ ورکر متوقف شد. کاربران دیگر نمی‌توانند از تانل استفاده کنند.",
  resumed: "▶️ ورکر دوباره فعال شد.",
  trafficReset: "🔁 شمارنده‌های ترافیک بازنشانی شدند.",
  updated: "🔄 آخرین نسخهٔ ورکر روی کلادفلر بارگذاری شد (تنظیمات و پایگاه‌داده دست‌نخورده باقی ماندند).",

  confirmDeleteDeployment: (dep) =>
    `⚠️ ورکر «${dep.label || dep.scriptName}» و پایگاه‌داده‌اش برای همیشه حذف خواهند شد. این کار غیرقابل بازگشت است.\n\nآیا مطمئن هستید؟`,

  deploymentDeleted: "🗑 ورکر و پایگاه‌داده‌اش حذف شدند.",

  showCreds: (dep) =>
    `🔐 <b>اطلاعات دسترسی ${dep.label || dep.scriptName}</b>\n\n` +
    `🔗 لینک اشتراک:\n<code>${dep.subscriptionUrl}</code>\n\n` +
    `🖥 آدرس پنل:\n<code>${dep.dashboardUrl}</code>\n\n` +
    `🔑 رمز پنل:\n<code>${dep.masterKey}</code>\n\n` +
    `🗝 کلید API:\n<code>${dep.apiKey}</code>`,

  cancelled: "عملیات لغو شد.",
  unknownCallback: "این گزینه دیگر معتبر نیست.",
  genericError: "⚠️ خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  notFound: "یافت نشد — شاید قبلاً حذف شده باشد.",
};
