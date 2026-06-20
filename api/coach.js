/* /api/coach — génère un bilan/coaching hebdomadaire personnalisé via Claude.
   Authentifié par le jeton (Bearer). Reçoit les stats de la semaine, renvoie un texte. */
const Anthropic = require("@anthropic-ai/sdk");
const crypto = require("crypto");

function resolveKV() {
  const e = process.env;
  const find = re => { for (const k of Object.keys(e)) if (re.test(k) && e[k]) return e[k]; return undefined; };
  const token = e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN || find(/(KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN)$/);
  return { token };
}
const AUTH_SECRET = process.env.AUTH_SECRET || resolveKV().token || process.env.VAPID_PRIVATE_KEY || "enforme-fallback";
function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const dot = token.indexOf("."); if (dot < 0) return null;
  const bodyB64 = token.slice(0, dot), sig = token.slice(dot + 1);
  const expSig = crypto.createHmac("sha256", AUTH_SECRET).update(bodyB64).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p; try { p = JSON.parse(Buffer.from(bodyB64, "base64url").toString()); } catch (_) { return null; }
  if (!p.email || (p.exp && Date.now() > p.exp)) return null;
  return p;
}
function apiKey() { return (process.env.ANTHROPIC_API_KEY || "").replace(/\s+/g, "").replace(/^["']+|["']+$/g, ""); }
let _client = null;
function getClient() { if (!_client) _client = new Anthropic({ apiKey: apiKey() }); return _client; }

const SYSTEM = `Tu es le coach personnel d'Éric : à la fois nutritionniste et entraîneur. Objectif : perte de poids (205 → 180 lbs), sous Ozempic, entraînement maison.
À partir des données de sa semaine, écris un bilan court et motivant, en français québécois, ton chaleureux et direct (tutoie-le).
Format : 1 phrase d'ouverture sur sa semaine, puis 2 à 4 points concrets (ce qui va bien + 1-2 ajustements précis et faisables), puis 1 phrase d'encouragement. Maximum ~160 mots.
Sois concret (chiffres de ses données), pas de jargon médical, pas de mise en garde générique. S'il manque des données, encourage-le à les noter sans le sermonner.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Méthode non autorisée" }); return; }
  if (!verifyToken(req)) { res.status(401).json({ error: "Session invalide" }); return; }
  if (!apiKey()) { res.status(500).json({ error: "Clé API non configurée." }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const stats = body.stats || {};
    const response = await getClient().messages.create({
      model: "claude-opus-4-8",
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: "user", content: "Données de ma semaine (JSON) :\n" + JSON.stringify(stats) + "\n\nFais-moi mon bilan de coach." }]
    });
    if (response.stop_reason === "refusal") { res.status(422).json({ error: "Génération refusée." }); return; }
    const textBlock = response.content.find(b => b.type === "text");
    res.status(200).json({ text: textBlock ? textBlock.text : "" });
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    const status = (e && e.status) || 500;
    if (status === 401 || /x-api-key|authentication/i.test(msg)) {
      res.status(401).json({ error: "Clé Anthropic invalide (vérifie ANTHROPIC_API_KEY dans Vercel)." }); return;
    }
    res.status(500).json({ error: "Échec du coach : " + msg });
  }
};
