// Vercel Serverless Function: leitet Anfragen an die Sdui-API weiter (löst das CORS-Problem).
// Aufruf: /api/sdui?u=<url-kodierte https://api.sdui.app/v1/...-Adresse>
module.exports = async (req, res) => {
  try {
    const target = new URL(req.query.u || "");
    // Nur die Sdui-API erlauben, damit der Proxy nicht missbraucht werden kann
    if (target.protocol !== "https:" || target.hostname !== "api.sdui.app") {
      return res.status(400).json({ message: "Ungültiges Ziel" });
    }

    const headers = { Accept: "application/json" };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;

    const hasBody = !["GET", "HEAD"].includes(req.method);
    if (hasBody) headers["Content-Type"] = "application/json";

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ message: "Proxy-Fehler: " + e.message });
  }
};
