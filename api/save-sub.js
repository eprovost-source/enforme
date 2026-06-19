/* /api/save-sub — enregistre/retire un abonnement push + sa config de rappels.
   Stockage : Upstash Redis (KV) via l'API REST. */
// Résout l'URL/token KV même si l'intégration a ajouté un préfixe (ex. STORAGE_KV_REST_API_URL)
function resolveKV() {
  const e = process.env;
  const find = re => { for (const k of Object.keys(e)) if (re.test(k) && e[k]) return e[k]; return undefined; };
  const url = e.KV_REST_API_URL || e.UPSTASH_REDIS_REST_URL || find(/(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/);
  const token = e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN || find(/(KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN)$/);
  return { url, token };
}
const KV = resolveKV();
const KV_URL = KV.url, KV_TOKEN = KV.token;
const KEY = "enforme:subs";

async function kv(cmd) {
  if (!KV_URL || !KV_TOKEN) throw new Error("Stockage (KV) non configuré — ajoute une base Upstash/KV dans Vercel.");
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Méthode non autorisée" }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    let list = [];
    try { list = JSON.parse((await kv(["GET", KEY])) || "[]"); } catch (_) { list = []; }
    if (!Array.isArray(list)) list = [];

    if (body.action === "remove") {
      list = list.filter(x => x.subscription && x.subscription.endpoint !== body.endpoint);
    } else {
      if (!body.subscription || !body.subscription.endpoint) { res.status(400).json({ error: "Abonnement invalide" }); return; }
      const rec = {
        subscription: body.subscription,
        tz: body.tz || "America/Toronto",
        events: Array.isArray(body.events) ? body.events : []
      };
      list = list.filter(x => x.subscription.endpoint !== rec.subscription.endpoint);
      list.push(rec);
    }
    await kv(["SET", KEY, JSON.stringify(list)]);
    res.status(200).json({ ok: true, count: list.length });
  } catch (e) {
    res.status(500).json({ error: "Échec serveur push : " + ((e && e.message) || String(e)) });
  }
};
