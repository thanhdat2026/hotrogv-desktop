// Vercel Serverless: Admin Config Management
// GET  /api/admin-config → đọc config từ process.env
// POST /api/admin-config → admin: cập nhật env vars + auto redeploy

const VERCEL_API = 'https://api.vercel.com';

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.exp && payload.exp > Date.now() && payload.role === 'admin';
  } catch {
    return false;
  }
}

// Lấy env var ID
async function getEnvVarId(envKey, projectId, teamId, token) {
  const url = teamId
    ? `${VERCEL_API}/v9/projects/${projectId}/env?teamId=${teamId}`
    : `${VERCEL_API}/v9/projects/${projectId}/env`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const envVar = (data.envs || []).find(e => e.key === envKey);
  return envVar ? envVar.id : null;
}

// Tạo hoặc cập nhật env var
async function upsertEnvVar(envKey, envValue, projectId, teamId, token) {
  const envId = await getEnvVarId(envKey, projectId, teamId, token);
  
  if (envId) {
    const url = teamId
      ? `${VERCEL_API}/v9/projects/${projectId}/env/${envId}?teamId=${teamId}`
      : `${VERCEL_API}/v9/projects/${projectId}/env/${envId}`;
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: envValue })
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      console.error(`[upsertEnvVar] PATCH ${envKey} failed: ${resp.status} ${errBody}`);
    }
    return resp.ok;
  } else {
    const url = teamId
      ? `${VERCEL_API}/v10/projects/${projectId}/env?teamId=${teamId}`
      : `${VERCEL_API}/v10/projects/${projectId}/env`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: envKey, value: envValue, type: 'sensitive', target: ['production']
      })
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      console.error(`[upsertEnvVar] POST ${envKey} failed: ${resp.status} ${errBody}`);
    }
    return resp.ok;
  }
}

// Lấy deployment gần nhất để redeploy
async function getLatestDeploymentId(projectId, teamId, token) {
  const url = teamId
    ? `${VERCEL_API}/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=1&target=production`
    : `${VERCEL_API}/v6/deployments?projectId=${projectId}&limit=1&target=production`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return (data.deployments && data.deployments[0]) ? data.deployments[0].uid : null;
}

// Trigger redeploy
async function triggerRedeploy(deploymentId, projectId, teamId, token) {
  const url = teamId
    ? `${VERCEL_API}/v13/deployments?teamId=${teamId}`
    : `${VERCEL_API}/v13/deployments`;
  
  const body = {
    name: projectId,
    deploymentId: deploymentId,
    target: 'production',
    meta: { redeployedBy: 'admin-panel', timestamp: new Date().toISOString() }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  return { ok: resp.ok, status: resp.status };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ========== GET: Đọc config hiện tại ==========
  if (req.method === 'GET') {
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

  // ========== POST: Cập nhật config + auto redeploy ==========
  if (req.method === 'POST') {
    if (!verifyToken(req.headers.authorization)) {
      return res.status(401).json({ error: 'Unauthorized — phiên đăng nhập hết hạn' });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken || !projectId) {
      return res.status(500).json({ error: 'VERCEL_TOKEN hoặc VERCEL_PROJECT_ID chưa cấu hình' });
    }

    const { url, key, model, models, password } = req.body || {};
    const results = {};
    let hasError = false;

    try {
      if (url !== undefined) {
        const ok = await upsertEnvVar('ROUTER_URL', url, projectId, teamId, vercelToken);
        results.ROUTER_URL = ok ? '✅' : '❌';
        if (!ok) hasError = true;
      }
      if (key !== undefined) {
        const ok = await upsertEnvVar('ROUTER_KEY', key, projectId, teamId, vercelToken);
        results.ROUTER_KEY = ok ? '✅' : '❌';
        if (!ok) hasError = true;
      }
      if (model !== undefined) {
        const ok = await upsertEnvVar('ROUTER_MODEL', model, projectId, teamId, vercelToken);
        results.ROUTER_MODEL = ok ? '✅' : '❌';
        if (!ok) hasError = true;
      }
      if (models !== undefined) {
        const modelsStr = Array.isArray(models) ? models.join(',') : models;
        const ok = await upsertEnvVar('ROUTER_MODELS', modelsStr, projectId, teamId, vercelToken);
        results.ROUTER_MODELS = ok ? '✅' : '❌';
        if (!ok) hasError = true;
      }
      if (password !== undefined && password.trim()) {
        const ok = await upsertEnvVar('ADMIN_PASSWORD', password.trim(), projectId, teamId, vercelToken);
        results.ADMIN_PASSWORD = ok ? '✅' : '❌';
        if (!ok) hasError = true;
      }

      // ===== AUTO REDEPLOY =====
      let redeployMsg = '';
      if (!hasError) {
        try {
          const latestId = await getLatestDeploymentId(projectId, teamId, vercelToken);
          if (latestId) {
            const rd = await triggerRedeploy(latestId, projectId, teamId, vercelToken);
            redeployMsg = rd.ok 
              ? ' Đang tự động redeploy (khoảng 30 giây)...'
              : ' Không thể tự động redeploy. Vui lòng redeploy thủ công.';
          }
        } catch (rdErr) {
          redeployMsg = ' Không thể tự động redeploy: ' + rdErr.message;
        }
      }

      return res.status(hasError ? 207 : 200).json({
        success: !hasError,
        results,
        message: hasError
          ? 'Một số cấu hình cập nhật thất bại'
          : '✅ Đã lưu cấu hình thành công!' + redeployMsg
      });
    } catch (error) {
      return res.status(500).json({ error: 'Lỗi khi cập nhật: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
