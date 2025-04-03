import { sendMessage, editMessageText } from "../lib/telegram.js";
import { mainMenuKeyboard, backToMainKeyboard } from "../ui/keyboards.js";
import { T } from "../ui/text.js";
import { clearSession } from "../lib/kv.js";

export async function showMainMenu(env, chatId, messageId, greet = false) {
  const text = greet ? `${T.welcome}\n\n${T.mainMenuPrompt}` : T.mainMenuPrompt;
  if (messageId) {
    return editMessageText(env, chatId, messageId, text, { keyboard: mainMenuKeyboard() });
  }
  return sendMessage(env, chatId, text, { keyboard: mainMenuKeyboard() });
}

export async function showHelp(env, chatId, messageId) {
  if (messageId) {
    return editMessageText(env, chatId, messageId, T.help, { keyboard: backToMainKeyboard() });
  }
  return sendMessage(env, chatId, T.help, { keyboard: backToMainKeyboard() });
}

export async function handleCancel(env, chatId, tgId) {
  await clearSession(env, tgId);
  await sendMessage(env, chatId, T.cancelled, { keyboard: mainMenuKeyboard() });
}
