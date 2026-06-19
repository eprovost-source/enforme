/* /api/auth — inscription / connexion email + mot de passe.
   Mots de passe hachés (scrypt + sel), jeton de session signé (HMAC).
   Stockage : Upstash Redis (KV). */
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

// Secret de signature : réutilise un secret serveur déjà présent (pas de nouvelle variable d'env)
const AUTH_SECRET = process.env.AUTH_SECRET || KV.token || process.env.VAPID_PRIVATE_KEY || "enforme-fallback";
const DAY = 86400000;

function hashPw(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return salt + ":" + hash;
}
function verifyPw(pw, stored) {
  const i = stored.indexOf(":"); if (i < 0) return false;
  const salt = stored.slice(0, i), hash = stored.slice(i + 1);
  const h = crypto.scryptSync(pw, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex"), b = Buffer.from(h, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function signToken(email) {
  const body = Buffer.from(JSON.stringify({ email, exp: Date.now() + 30 * DAY })).toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return body + "." + sig;
}
function normEmail(e) { return String(e || "").trim().toLowerCase(); }

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Méthode non autorisée" }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const action = body.action;
    const email = normEmail(body.email);
    const pw = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: "Courriel invalide" }); return; }

    const key = "enforme:u:" + email;
    if (action === "signup") {
      if (pw.length < 8) { res.status(400).json({ error: "Mot de passe : au moins 8 caractères" }); return; }
      const existing = await kv(["GET", key]);
      if (existing) { res.status(409).json({ error: "Un compte existe déjà pour ce courriel. Connecte-toi." }); return; }
      await kv(["SET", key, JSON.stringify({ email, pw: hashPw(pw), created: new Date().toISOString().slice(0, 10) })]);
      res.status(200).json({ token: signToken(email), email });
      return;
    }
    if (action === "login") {
      const raw = await kv(["GET", key]);
      if (!raw) { res.status(401).json({ error: "Courriel ou mot de passe invalide" }); return; }
      const u = JSON.parse(raw);
      if (!verifyPw(pw, u.pw)) { res.status(401).json({ error: "Courriel ou mot de passe invalide" }); return; }
      res.status(200).json({ token: signToken(email), email });
      return;
    }
    res.status(400).json({ error: "Action inconnue" });
  } catch (e) {
    res.status(500).json({ error: "Échec auth : " + ((e && e.message) || String(e)) });
  }
};
