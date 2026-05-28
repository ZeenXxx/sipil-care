const crypto = require('crypto');

const TOKEN_COLLECTIONS = {
  students: 'student_push_tokens',
  admins: 'admin_push_tokens'
};

let cachedToken = null;

const json = (res, status, payload) => {
  res.status(status).json(payload);
};

const base64url = input => Buffer.from(input)
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

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
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
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

const valueOf = value => {
  if (!value) return '';
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(valueOf);
  return '';
};

const firestoreDocumentFields = document => {
  const fields = document?.fields || {};
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, valueOf(value)]));
};

const firestoreRunQuery = async ({ projectId, token, collectionId }) => {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'enabled' },
            op: 'EQUAL',
            value: { booleanValue: true }
          }
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gagal membaca token push.');
  return data.map(item => firestoreDocumentFields(item.document)).filter(item => item.token);
};

const filterRecipients = (recipients, audience = {}, notificationType = 'update') => {
  const nims = new Set((audience.nims || []).map(item => String(item)));
  const angkatan = audience.angkatan ? String(audience.angkatan) : '';
  return recipients.filter(item => {
    if (nims.size && !nims.has(String(item.nim || ''))) return false;
    if (!nims.size && angkatan && String(item.angkatan || '') !== angkatan) return false;
    if (Array.isArray(item.categories) && item.categories.length) {
      const aliases = {
        resource: 'resources',
        video: 'videos',
        practicum: 'practicum_studio'
      };
      const normalizedType = aliases[notificationType] || notificationType;
      if (!item.categories.includes(normalizedType)) return false;
    }
    return true;
  });
};

const sendMessage = async ({ projectId, token, recipient, notification }) => {
  const url = notification.url || '/index.html';
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token: recipient.token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          url,
          tag: notification.tag || 'sipilcare-update',
          type: notification.type || 'update'
        },
        webpush: {
          fcmOptions: {
            link: `https://sipil-care.vercel.app${url.startsWith('/') ? url : `/${url}`}`
          }
        }
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
};

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const allowedOrigin = /^https:\/\/sipil-care\.vercel\.app$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin)
    ? origin
    : 'https://sipil-care.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Push-Secret');
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

  const secret = process.env.PUSH_API_SECRET;
  if (secret && req.headers['x-push-secret'] !== secret) {
    json(res, 403, { ok: false, message: 'Push secret tidak valid.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const audienceType = body.audienceType === 'admins' ? 'admins' : 'students';
    const title = String(body.title || 'Update SIPIL CARE').slice(0, 90);
    const message = String(body.body || 'Ada update baru di SIPIL CARE.').slice(0, 180);
    const serviceAccount = readServiceAccount();
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      json(res, 501, { ok: false, code: 'firebase_service_account_missing', message: 'Firebase service account belum diatur di Vercel Environment Variables.' });
      return;
    }

    const token = await accessToken(serviceAccount);
    const allRecipients = await firestoreRunQuery({
      projectId: serviceAccount.project_id,
      token,
      collectionId: TOKEN_COLLECTIONS[audienceType]
    });
    const recipients = filterRecipients(allRecipients, body.audience || {}, body.type || 'update');
    if (!recipients.length) {
      json(res, 200, { ok: true, sent: 0, failed: 0, message: 'Tidak ada perangkat tujuan yang sudah mengaktifkan notifikasi.' });
      return;
    }

    const results = await Promise.all(recipients.slice(0, 500).map(recipient => sendMessage({
      projectId: serviceAccount.project_id,
      token,
      recipient,
      notification: {
        title,
        body: message,
        url: body.url || '/index.html',
        tag: body.tag,
        type: body.type
      }
    })));
    json(res, 200, {
      ok: true,
      sent: results.filter(item => item.ok).length,
      failed: results.filter(item => !item.ok).length
    });
  } catch (error) {
    console.error('Push notify failed:', error);
    json(res, 500, { ok: false, message: error.message || 'Gagal mengirim notifikasi.' });
  }
};
