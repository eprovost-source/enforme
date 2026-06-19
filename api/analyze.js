/* ============================================================
   /api/analyze — Fonction serverless Vercel
   Reçoit une photo de repas, renvoie une estimation calories/protéines
   via Claude (vision). La clé API reste côté serveur (jamais dans l'app).
   ============================================================ */
const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-opus-4-8";

// Clé nettoyée (enlève espaces/retours de ligne/guillemets ajoutés au collage)
function apiKey() {
  return (process.env.ANTHROPIC_API_KEY || "").replace(/\s+/g, "").replace(/^["']+|["']+$/g, "");
}
// Création paresseuse : surtout PAS au chargement du module.
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: apiKey() });
  return _client;
}

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom de l'aliment, en français" },
          quantity: { type: "string", description: "Portion estimée, ex. '150 g' ou '1 tasse'" },
          kcal: { type: "integer", description: "Calories estimées pour cette portion" },
          protein: { type: "integer", description: "Protéines en grammes pour cette portion" }
        },
        required: ["name", "quantity", "kcal", "protein"],
        additionalProperties: false
      }
    },
    totalKcal: { type: "integer", description: "Somme des calories de tous les items" },
    totalProtein: { type: "integer", description: "Somme des protéines (g) de tous les items" },
    confidence: { type: "string", enum: ["faible", "moyenne", "élevée"] },
    note: { type: "string", description: "Courte remarque (max 1 phrase), ex. hypothèses de portion" }
  },
  required: ["items", "totalKcal", "totalProtein", "confidence", "note"],
  additionalProperties: false
};

const SYSTEM = `Tu es un nutritionniste qui estime l'apport nutritionnel d'un repas à partir d'une photo OU d'une description écrite.
Règles :
- Identifie chaque aliment et estime sa portion (repères visuels sur photo; quantités décrites ou portions usuelles pour du texte).
- Donne pour chaque aliment : nom (français), portion, calories (kcal) et protéines (g).
- Calcule totalKcal et totalProtein comme la somme des items.
- Les estimations sont approximatives (±15-20 %). Indique ton niveau de confiance.
- Si rien d'identifiable (photo sans nourriture, ou description sans aliment), renvoie items=[], totals=0, confidence="faible" et explique-le dans note.
- Reste concis. Réponds uniquement avec les données demandées.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const key = apiKey();
  if (!key) {
    res.status(500).json({ error: "Clé API non configurée. Ajoute ANTHROPIC_API_KEY dans les réglages Vercel." });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { image, mediaType, text, note } = body;
    if (!image && !(text && String(text).trim())) {
      res.status(400).json({ error: "Aucune image ni description reçue" }); return;
    }

    const content = [];
    let userText;
    if (image) {
      content.push({ type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } });
      userText = "Estime les calories et protéines de ce repas."
        + (note ? ` Précision de l'utilisateur : ${String(note).slice(0, 300)}` : "");
    } else {
      userText = "Voici la description de ce que j'ai mangé : « " + String(text).trim().slice(0, 600)
        + " ». Estime les calories et protéines.";
    }
    content.push({ type: "text", text: userText });

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } }
    });

    if (response.stop_reason === "refusal") {
      res.status(422).json({ error: "L'analyse a été refusée pour cette image." });
      return;
    }
    const textBlock = response.content.find(b => b.type === "text");
    if (!textBlock) { res.status(502).json({ error: "Réponse vide du modèle" }); return; }

    const data = JSON.parse(textBlock.text);
    res.status(200).json(data);
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    const status = (e && e.status) || 500;
    if (status === 401 || /x-api-key|authentication/i.test(msg)) {
      const k = apiKey();
      res.status(401).json({ error: `Clé Anthropic invalide. Vérifie ANTHROPIC_API_KEY dans Vercel (longueur reçue: ${k.length} car., début: "${k.slice(0, 7)}…"). Une clé valide commence par "sk-ant-" et fait ~100+ caractères — recopie-la en entier, sans espace.` });
      return;
    }
    res.status(500).json({ error: "Échec de l'analyse : " + msg });
  }
};
