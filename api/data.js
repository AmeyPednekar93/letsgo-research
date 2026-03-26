import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Save data
    const { action, key, value } = req.body;

    if (!action || !key) {
      return res.status(400).json({ error: 'Missing action or key' });
    }

    try {
      if (action === 'set') {
        await kv.set(key, value);
        return res.status(200).json({ ok: true });
      }

      if (action === 'get') {
        const data = await kv.get(key);
        return res.status(200).json({ data });
      }

      if (action === 'list') {
        // Get participants list
        const data = await kv.get(key);
        return res.status(200).json({ data });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (err) {
      console.error('KV error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
