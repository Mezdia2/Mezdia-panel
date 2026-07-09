import { sendMessage } from "../lib/telegram.js";
import { mainMenuKb, removeMenuKb } from "../ui/keyboards.js";
import { T } from "../ui/text.js";
import { clearSession, setSession, getAccounts, deploymentsForAccount } from "../lib/kv.js";

export async function showMainMenu(env, chatId, tgId, greet = false) {
  if (tgId) await setSession(env, tgId, "kb_main", {});

  let text;
  if (greet) {
    text = `${T.welcome}\n\n${T.mainMenuPrompt}`;
  } else {
    // Show summary when returning to main menu
    try {
      const accounts = await getAccounts(env, tgId);
      let totalWorkers = 0;
      for (const acc of accounts) {
        const deps = await deploymentsForAccount(env, tgId, acc.id);
        totalWorkers += deps.length;
      }
      text = `${T.mainMenuSummary(accounts.length, totalWorkers)}\n\n${T.mainMenuPrompt}`;
    } catch (e) {
      text = T.mainMenuPrompt;
    }
  }

  return sendMessage(env, chatId, text, { keyboard: mainMenuKb() });
}

export async function showHelp(env, chatId, tgId) {
  if (tgId) await setSession(env, tgId, "kb_main", {});
  return sendMessage(env, chatId, T.help, { keyboard: mainMenuKb() });
}

export async function handleCancel(env, chatId, tgId) {
  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.cancelled, { keyboard: mainMenuKb() });
}
