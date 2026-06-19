/* /api/cron — déclenché fréquemment (GitHub Actions / cron-job.org / Vercel).
   Pour chaque abonné, envoie en push les rappels « dûs maintenant » (fenêtre),
   en évitant les doublons (marqueur par jour/abonné/rappel dans le KV). */
const webpush = require("web-push");

const VAPID_PUBLIC = "BKINw1ltiFH2akUeaneCzPzMGrMJXUPkGp9hFvqO7xsts3AYhj4ixra-hSGhmBMhzGdVnWTiRG0KAcDdHckMRMA";
const KEY = "enforme:subs";
const SENT = "enforme:sent";
const WINDOW_MIN = 35; // tolère un déclencheur espacé jusqu'à ~30 min

function resolveKV() {
  const e = process.env;
  const find = re => { for (const k of Object.keys(e)) if (re.test(k) && e[k]) return e[k]; return undefined; };
  const url = e.KV_REST_API_URL || e.UPSTASH_REDIS_REST_URL || find(/(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/);
  const token = e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN || find(/(KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN)$/);
  return { url, token };
}
const KV = resolveKV();
async function kv(cmd) {
  if (!KV.url || !KV.token) throw new Error("KV non configuré");
  const r = await fetch(KV.url, { method: "POST", headers: { Authorization: "Bearer " + KV.token, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const DAYMAP = { Sunday: "dimanche", Monday: "lundi", Tuesday: "mardi", Wednesday: "mercredi", Thursday: "jeudi", Friday: "vendredi", Saturday: "samedi" };
function nowParts(tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "long" });
  const p = fmt.formatToParts(new Date()).reduce((o, x) => { o[x.type] = x.value; return o; }, {});
  let hh = parseInt(p.hour, 10); if (hh === 24) hh = 0;
  return { date: `${p.year}-${p.month}-${p.day}`, day: DAYMAP[p.weekday], minutes: hh * 60 + parseInt(p.minute, 10) };
}

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.authorization || "") !== "Bearer " + secret) { res.status(401).json({ error: "unauthorized" }); return; }

  const PRIV = (process.env.VAPID_PRIVATE_KEY || "").replace(/\s+/g, "").replace(/^["']+|["']+$/g, "");
  if (PRIV.length !== 43) { res.status(500).json({ error: `VAPID_PRIVATE_KEY a ${PRIV.length} caractères au lieu de 43.` }); return; }
  try { webpush.setVapidDetails("mailto:eprovost@equipelupien.com", VAPID_PUBLIC, PRIV); }
  catch (e) { res.status(500).json({ error: "Clé VAPID invalide : " + ((e && e.message) || e) }); return; }

  let list, sentMap;
  try {
    list = JSON.parse((await kv(["GET", KEY])) || "[]");
    sentMap = JSON.parse((await kv(["GET", SENT])) || "{}");
  } catch (e) { res.status(500).json({ error: "KV indisponible : " + ((e && e.message) || e) }); return; }
  if (!Array.isArray(list)) list = [];
  if (!sentMap || typeof sentMap !== "object") sentMap = {};

  // Élague les marqueurs des jours qui ne sont plus « aujourd'hui »
  const todayDates = new Set(list.map(r => nowParts(r.tz).date));
  const sent = {};
  for (const k of Object.keys(sentMap)) if (todayDates.has(k.split("|")[0])) sent[k] = true;

  let sends = 0;
  const deadEndpoints = new Set();
  for (const rec of list) {
    if (!rec.subscription || !Array.isArray(rec.events)) continue;
    const np = nowParts(rec.tz);
    for (const ev of rec.events) {
      if (!ev || !ev.time || !Array.isArray(ev.days) || ev.days.indexOf(np.day) < 0) continue;
      const [eh, em] = ev.time.split(":").map(Number);
      const diff = np.minutes - (eh * 60 + em);
      if (diff < 0 || diff >= WINDOW_MIN) continue;
      const mark = `${np.date}|${rec.subscription.endpoint}|${ev.id}`;
      if (sent[mark]) continue;
      try {
        await webpush.sendNotification(rec.subscription, JSON.stringify({ title: ev.title, body: ev.body, tag: ev.id }));
        sent[mark] = true; sends++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) deadEndpoints.add(rec.subscription.endpoint);
      }
    }
  }

  try {
    await kv(["SET", SENT, JSON.stringify(sent)]);
    if (deadEndpoints.size) {
      const pruned = list.filter(r => !r.subscription || !deadEndpoints.has(r.subscription.endpoint));
      await kv(["SET", KEY, JSON.stringify(pruned)]);
    }
  } catch (_) {}

  res.status(200).json({ ok: true, subscribers: list.length, sent: sends });
};
