/* /api/cron — déclenché chaque jour par Vercel Cron.
   Le jour configuré, envoie la notification push (Ozempic, pesée). */
const webpush = require("web-push");

const VAPID_PUBLIC = "BKINw1ltiFH2akUeaneCzPzMGrMJXUPkGp9hFvqO7xsts3AYhj4ixra-hSGhmBMhzGdVnWTiRG0KAcDdHckMRMA";
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
  if (!KV_URL || !KV_TOKEN) throw new Error("KV non configuré");
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const DAYMAP = { Sunday: "dimanche", Monday: "lundi", Tuesday: "mardi", Wednesday: "mercredi", Thursday: "jeudi", Friday: "vendredi", Saturday: "samedi" };
function weekdayIn(tz) {
  try {
    const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz || "America/Toronto", weekday: "long" }).format(new Date());
    return DAYMAP[wd];
  } catch (e) {
    return DAYMAP[new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())];
  }
}

module.exports = async (req, res) => {
  // Protection optionnelle : si CRON_SECRET est défini, Vercel l'envoie en en-tête
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.authorization || "") !== "Bearer " + secret) {
    res.status(401).json({ error: "unauthorized" }); return;
  }
  const PRIV = process.env.VAPID_PRIVATE_KEY;
  if (!PRIV) { res.status(500).json({ error: "VAPID_PRIVATE_KEY manquante dans Vercel" }); return; }
  webpush.setVapidDetails("mailto:eprovost@equipelupien.com", VAPID_PUBLIC, PRIV);

  let list = [];
  try { list = JSON.parse((await kv(["GET", KEY])) || "[]"); } catch (e) {
    res.status(500).json({ error: "KV indisponible : " + ((e && e.message) || e) }); return;
  }
  if (!Array.isArray(list)) list = [];

  let sent = 0;
  const survivors = [];
  for (const rec of list) {
    const today = weekdayIn(rec.tz);
    const msgs = [];
    if (rec.ozempic && rec.ozempic.day === today) {
      msgs.push({ title: "💉 Ozempic — aujourd'hui", body: "C'est le jour de ton injection" + (rec.ozempic.time ? ` (prévu ${rec.ozempic.time})` : "") + ".", tag: "ozempic" });
    }
    if (rec.weighIn && rec.weighIn.day === today) {
      msgs.push({ title: "⚖️ Pesée du jour", body: "Pèse-toi à jeun et note-le dans l'app.", tag: "pesee" });
    }
    let alive = true;
    for (const m of msgs) {
      try { await webpush.sendNotification(rec.subscription, JSON.stringify(m)); sent++; }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) alive = false; }
    }
    if (alive) survivors.push(rec);
  }
  if (survivors.length !== list.length) { try { await kv(["SET", KEY, JSON.stringify(survivors)]); } catch (_) {} }
  res.status(200).json({ ok: true, subscribers: list.length, sent });
};
