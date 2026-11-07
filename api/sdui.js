// Vercel Serverless Function: leitet Anfragen (JSON und Datei-Uploads) an die Sdui-API weiter.
// Aufruf: /api/sdui?u=<url-kodierte https://api.sdui.app/v1/...-Adresse>
module.exports = async (req, res) => {
  try {
    const target = new URL(req.query.u || "");
    if (target.protocol !== "https:" || target.hostname !== "api.sdui.app") {
      return res.status(400).json({ message: "Ungültiges Ziel" });
    }
    const headers = { Accept: "application/json" };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;

    let body;
    if (!["GET", "HEAD"].includes(req.method)) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = Buffer.concat(chunks);
      if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    }

    const upstream = await fetch(target, { method: req.method, headers, body: body && body.length ? body : undefined });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ message: "Proxy-Fehler: " + e.message });
  }
};
// Rohen Body durchreichen (nötig für multipart/Uploads)
module.exports.config = { api: { bodyParser: false } };
