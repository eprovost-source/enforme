/* /api/state — lit (GET) / sauvegarde (POST) les données de l'utilisateur connecté.
   Authentifié par le jeton signé (en-tête Authorization: Bearer ...). */
const crypto = require("crypto");

function resolveKV() {
  const e = process.env;
  const find = re => { for (const k of Object.keys(e)) if (re.test(k) && e[k]) return e[k]; return undefined; };
  const url = e.KV_REST_API_URL || e.UPSTASH_REDIS_REST_URL || find(/(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/);
  const token = e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN || find(/(KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN)$/);
  return { url, token };
}
const KV = resolveKV();
async function kv(cmd) {
  if (!KV.url || !KV.token) throw new Error("Stockage (KV) non configuré");
  const r = await fetch(KV.url, { method: "POST", headers: { Authorization: "Bearer " + KV.token, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const AUTH_SECRET = process.env.AUTH_SECRET || KV.token || process.env.VAPID_PRIVATE_KEY || "enforme-fallback";

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const bodyB64 = token.slice(0, dot), sig = token.slice(dot + 1);
  const expSig = crypto.createHmac("sha256", AUTH_SECRET).update(bodyB64).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p; try { p = JSON.parse(Buffer.from(bodyB64, "base64url").toString()); } catch (_) { return null; }
  if (!p.email || (p.exp && Date.now() > p.exp)) return null;
  return p;
}

module.exports = async (req, res) => {
  const payload = verifyToken(req);
  if (!payload) { res.status(401).json({ error: "Session invalide ou expirée" }); return; }
  const key = "enforme:d:" + payload.email;
  try {
    if (req.method === "GET") {
      const raw = await kv(["GET", key]);
      res.status(200).json({ data: raw ? JSON.parse(raw) : null });
      return;
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      if (!body || typeof body.data !== "object") { res.status(400).json({ error: "Données invalides" }); return; }
      await kv(["SET", key, JSON.stringify(body.data)]);
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "Méthode non autorisée" });
  } catch (e) {
    res.status(500).json({ error: "Échec serveur : " + ((e && e.message) || String(e)) });
  }
};
