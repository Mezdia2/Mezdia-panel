export default {
  async fetch(request, env, ctx) {
    return new Response("Simple debug works, BOT_DB: " + typeof env.BOT_DB);
  },
}
