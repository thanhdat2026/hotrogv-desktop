// Vercel Serverless Function: Trả về config 9Router cho GV
// Đọc từ process.env — admin thay đổi qua dashboard → auto redeploy → có hiệu lực
// NOTE: Key 9Router được gửi cho client vì client gọi 9Router trực tiếp từ browser

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const routerUrl = process.env.ROUTER_URL || '';
  const routerKey = process.env.ROUTER_KEY || '';
  const routerModel = process.env.ROUTER_MODEL || 'ag/gemini-3.8-flash-high';
  const routerModels = process.env.ROUTER_MODELS || routerModel;

  return res.status(200).json({
    url: routerUrl,
    key: routerKey,
    model: routerModel,
    models: routerModels.split(',').map(m => m.trim()).filter(Boolean),
    available: !!(routerUrl && routerKey),
  });
}
