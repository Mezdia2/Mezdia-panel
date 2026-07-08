import { sendMessage } from "../lib/telegram.js";
import { mainMenuKb, removeMenuKb } from "../ui/keyboards.js";
import { T } from "../ui/text.js";
import { clearSession, setSession } from "../lib/kv.js";

export async function showMainMenu(env, chatId, tgId, greet = false) {
  const text = greet ? `${T.welcome}\n\n${T.mainMenuPrompt}` : T.mainMenuPrompt;
  if (tgId) await setSession(env, tgId, "kb_main", {});
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
