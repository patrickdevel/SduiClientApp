// Vercel Serverless Function: leitet Anfragen (JSON, Datei-Uploads und -Downloads) an die Sdui-API weiter.
// Aufruf: /api/sdui?u=<url-kodierte https://api.sdui.app/v1/...-Adresse>
module.exports = async (req, res) => {
  try {
    const target = new URL(req.query.u || "");
    const host = target.hostname.toLowerCase();
    const isApi = host === "api.sdui.app";
    // Datei-Hosts (z. B. PDFs/Bilder auf CDN oder Speicher) dürfen ebenfalls geladen werden – aber nur per https, keine IP-Adressen
    const fileHost = /(^|\.)sdui\.(app|de)$/.test(host) || /\.amazonaws\.com$/.test(host) || /\.cloudfront\.net$/.test(host) || /(^|\.)io\.cloud\.ovh\.net$/.test(host);
    if (target.protocol !== "https:" || /^[\d.]+$/.test(host) || host.includes(":") || (!isApi && !fileHost)) {
      return res.status(400).json({ message: "Ungültiges Ziel: " + host });
    }
    // Accept des Browsers durchreichen: Bilder/Dateien kommen sonst als JSON statt als Datei zurück
    const headers = { Accept: req.headers.accept || "application/json", "User-Agent": req.headers["user-agent"] || "Mozilla/5.0" };
    if (isApi && req.headers.authorization) headers.Authorization = req.headers.authorization;

    let body;
    if (!["GET", "HEAD"].includes(req.method)) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = Buffer.concat(chunks);
      if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    }

    const upstream = await fetch(target, { method: req.method, headers, body: body && body.length ? body : undefined });
    // Binär lesen (text() würde Bilder/PDFs zerstören)
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(buf);
  } catch (e) {
    res.status(502).json({ message: "Proxy-Fehler: " + e.message });
  }
};
// Rohen Body durchreichen (nötig für multipart/Uploads)
module.exports.config = { api: { bodyParser: false } };
