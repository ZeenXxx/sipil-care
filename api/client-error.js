const crypto = require('crypto');

const json = (res, status, payload) => {
  res.status(status).json(payload);
};

const base64url = input => Buffer.from(input)
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

let cachedToken = null;

const readServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const parsed = JSON.parse(raw);
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: String(parsed.private_key || '').replace(/\\n/g, '\n')
    };
  }
  return {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  };
};

const accessToken = async serviceAccount => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.value;

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(serviceAccount.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Gagal membuat token Firebase.');
  cachedToken = { value: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return cachedToken.value;
};

const safeString = (value, max = 240) => String(value || '').slice(0, max);

const createFirestoreDoc = async ({ projectId, token, payload }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/client_error_logs`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        type: { stringValue: safeString(payload.type, 80) },
        message: { stringValue: safeString(payload.message, 500) },
        source: { stringValue: safeString(payload.source, 300) },
        stack: { stringValue: safeString(payload.stack, 900) },
        page: { stringValue: safeString(payload.page, 260) },
        userAgent: { stringValue: safeString(payload.userAgent, 300) },
        createdAt: { stringValue: new Date().toISOString() }
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'Gagal menyimpan error log.');
};

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const allowedOrigin = /^https:\/\/sipil-care\.vercel\.app$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin)
    ? origin
    : 'https://sipil-care.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { ok: false, message: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const serviceAccount = readServiceAccount();
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      json(res, 200, { ok: false, skipped: true, message: 'Firebase service account belum diatur.' });
      return;
    }

    const token = await accessToken(serviceAccount);
    await createFirestoreDoc({
      projectId: serviceAccount.project_id,
      token,
      payload: body
    });
    json(res, 200, { ok: true });
  } catch (error) {
    console.error('Client error logging failed:', error);
    json(res, 500, { ok: false, message: error.message || 'Gagal menyimpan error log.' });
  }
};
