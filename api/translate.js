export default async function handler(req, res) {
  try {
    const text = req.method === 'POST' ? req.body?.text : req.query?.text;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' });
    if (text.length > 7000) return res.status(413).json({ error: 'text too long' });
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=' + encodeURIComponent(text);
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error('translation upstream failed');
    const data = await r.json();
    const translated = (data?.[0] || []).map(x => x?.[0] || '').join('');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ translated });
  } catch (e) {
    return res.status(500).json({ error: 'translation unavailable' });
  }
}
