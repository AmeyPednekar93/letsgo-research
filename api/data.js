export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('Missing Upstash env vars. URL:', !!url, 'TOKEN:', !!token);
    return res.status(500).json({ error: 'Database not configured', missingUrl: !url, missingToken: !token });
  }

  const { action, key, value } = req.body;

  if (!action || !key) {
    return res.status(400).json({ error: 'Missing action or key' });
  }

  async function kvSet(k, v) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', k, JSON.stringify(v)]),
    });
    const json = await r.json();
    if (json.error) throw new Error(json.error);
    return json.result;
  }

  async function kvGet(k) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', k]),
    });
    const json = await r.json();
    if (json.error) throw new Error(json.error);
    if (json.result === null) return null;
    try { return JSON.parse(json.result); } catch { return json.result; }
  }

  try {
    if (action === 'set') {
      await kvSet(key, value);
      return res.status(200).json({ ok: true });
    }
    if (action === 'get') {
      const data = await kvGet(key);
      return res.status(200).json({ data });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('KV error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
