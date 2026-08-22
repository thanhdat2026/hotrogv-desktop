// Vercel Serverless: Admin Login
// POST /api/admin-login  →  { password } → { token, success }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { password } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD chưa được cấu hình trên server' });
    }
    
    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Sai mật khẩu' });
    }
    
    // Token hết hạn sau 24h
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    const payload = JSON.stringify({ exp: expiry, role: 'admin' });
    const token = Buffer.from(payload).toString('base64');
    
    return res.status(200).json({ 
      success: true, 
      token,
      message: 'Đăng nhập thành công'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi server: ' + error.message });
  }
}
