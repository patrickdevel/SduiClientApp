// Vercel Serverless Function: übersetzt Texte mit Google Translate.
// Mit Umgebungsvariable GOOGLE_TRANSLATE_KEY (Cloud Translation API) wird die offizielle Schnittstelle genutzt,
// ohne Key der öffentliche Google-Endpunkt (inoffiziell, ohne Garantie).
// Aufruf: POST /api/translate  { "q": ["Text", ...], "target": "en" }
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ message: "Nur POST erlaubt" });
  try {
    const { q, target } = req.body || {};
    if (!Array.isArray(q) || !/^[a-zA-Z-]{2,8}$/.test(target || "")) return res.status(400).json({ message: "Ungültige Anfrage" });
    if (q.length > 300 || q.join("").length > 30000) return res.status(413).json({ message: "Text zu lang" });

    const todo = q.map((s, i) => [String(s), i]).filter(([s]) => s.trim());
    const texts = todo.map(([s]) => s);
    let out = [];
    if (texts.length) {
      const key = process.env.GOOGLE_TRANSLATE_KEY;
      if (key) {
        const r = await fetch("https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(key), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: texts, target, format: "text" }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error?.message || "Google-Fehler " + r.status);
        out = j.data.translations.map((t) => t.translatedText);
      } else {
        out = await Promise.all(texts.map(async (t) => {
          const u = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&tl=" + encodeURIComponent(target) + "&q=" + encodeURIComponent(t);
          const r = await fetch(u);
          if (!r.ok) throw new Error("Google-Fehler " + r.status);
          const j = await r.json();
          return j[0].map((x) => x[0]).join("");
        }));
      }
    }
    const result = q.map((s) => String(s));
    todo.forEach(([, i], k) => (result[i] = out[k]));
    res.status(200).json({ translations: result });
  } catch (e) {
    res.status(502).json({ message: "Übersetzung fehlgeschlagen: " + e.message });
  }
};
