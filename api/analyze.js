/* ============================================================
   /api/analyze — Fonction serverless Vercel
   Reçoit une photo de repas, renvoie une estimation calories/protéines
   via Claude (vision). La clé API reste côté serveur (jamais dans l'app).
   ============================================================ */
const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-opus-4-8";

// Création paresseuse : surtout PAS au chargement du module — le SDK lève une
// erreur s'il ne trouve pas la clé, ce qui ferait planter la fonction (500)
// avant notre vérification. On construit le client seulement dans le handler.
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic();
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

const SYSTEM = `Tu es un nutritionniste qui estime l'apport nutritionnel d'un repas à partir d'une photo.
Règles :
- Identifie chaque aliment visible et estime sa portion d'après les repères visuels (assiette, ustensiles).
- Donne pour chaque aliment : nom (français), portion, calories (kcal) et protéines (g).
- Calcule totalKcal et totalProtein comme la somme des items.
- Les estimations à partir d'une photo sont approximatives (±15-20 %). Indique ton niveau de confiance.
- Si la photo ne contient pas de nourriture identifiable, renvoie items=[], totals=0, confidence="faible" et explique-le dans note.
- Reste concis. Réponds uniquement avec les données demandées.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "Clé API non configurée. Ajoute ANTHROPIC_API_KEY dans les réglages Vercel." });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { image, mediaType, note } = body;
    if (!image) { res.status(400).json({ error: "Aucune image reçue" }); return; }

    const userText = "Estime les calories et protéines de ce repas."
      + (note ? ` Précision de l'utilisateur : ${String(note).slice(0, 300)}` : "");

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
          { type: "text", text: userText }
        ]
      }],
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
    res.status(500).json({ error: "Échec de l'analyse : " + msg });
  }
};
