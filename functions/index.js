const crypto = require('crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const ADMIN_USERS = {
  developer: {
    username: 'developer',
    passwordHash: 'ee41ac44a8b7a0b29a49ec758a6cb252ba5f0855e76165c13a42cecbef8a13a4',
    name: 'Developer SIPIL CARE',
    role: 'developer',
    roleLabel: 'Developer',
    allowedPages: ['dashboard.html', 'resources.html', 'announcements.html', 'messages.html'],
    permissions: ['dashboard', 'resources', 'announcements', 'messages', 'audit']
  },
  pendprof: {
    username: 'pendprof',
    passwordHash: 'd1ed6959bc776e804c4904f048ceb7fb8d37dc63dc345fe247f9b496776470fa',
    name: 'PENDPROF HMS',
    role: 'pendprof_hms',
    roleLabel: 'PENDPROF HMS',
    allowedPages: ['resources.html', 'messages.html'],
    permissions: ['resources', 'messages']
  },
  externalhms: {
    username: 'externalhms',
    passwordHash: '8d0c0390b1974cddc2c7e9d49ebd7f9efaf47ae9cdc344cedbec91e772b54a08',
    name: 'External HMS',
    role: 'external_hms',
    roleLabel: 'External HMS',
    allowedPages: ['announcements.html', 'messages.html'],
    permissions: ['announcements', 'messages']
  },
  adminsipil: {
    username: 'adminsipil',
    passwordHash: 'ee41ac44a8b7a0b29a49ec758a6cb252ba5f0855e76165c13a42cecbef8a13a4',
    name: 'Developer SIPIL CARE',
    role: 'developer',
    roleLabel: 'Developer',
    allowedPages: ['dashboard.html', 'resources.html', 'announcements.html', 'messages.html'],
    permissions: ['dashboard', 'resources', 'announcements', 'messages', 'audit']
  }
};

const hashPassword = value => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const hashesMatch = (actual, expected) => {
  const actualBuffer = Buffer.from(String(actual || ''), 'hex');
  const expectedBuffer = Buffer.from(String(expected || ''), 'hex');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_SESSION_COLLECTION = 'admin_sessions';
const DELETABLE_LOG_COLLECTIONS = {
  access: 'resource_access_logs',
  audit: 'admin_audit_logs'
};

const publicAdminProfile = user => ({
  username: user.username,
  name: user.name,
  role: user.role,
  roleLabel: user.roleLabel,
  allowedPages: user.allowedPages,
  permissions: user.permissions
});

exports.adminLogin = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST');
    res.status(405).json({ ok: false, message: 'Method not allowed.' });
    return;
  }

  const { username = '', password = '' } = req.body || {};
  const normalizedUsername = String(username).trim().toLowerCase();
  const user = ADMIN_USERS[normalizedUsername];

  if (!user || !hashesMatch(hashPassword(password), user.passwordHash)) {
    res.status(401).json({ ok: false, message: 'Username atau password salah.' });
    return;
  }

  const now = Date.now();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashPassword(token);
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  await admin.firestore().collection(ADMIN_SESSION_COLLECTION).doc(tokenHash).set({
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    userAgent: req.get('user-agent') || '',
    ip: req.ip || ''
  });

  await admin.firestore().collection('admin_login_logs').add({
    username: user.username,
    role: user.role,
    userAgent: req.get('user-agent') || '',
    ip: req.ip || '',
    createdAt: new Date(now).toISOString()
  });

  res.json({ ok: true, profile: publicAdminProfile(user), token, expiresAt });
});

const readAdminSession = async req => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const tokenHash = hashPassword(token);
  const snapshot = await admin.firestore().collection(ADMIN_SESSION_COLLECTION).doc(tokenHash).get();
  if (!snapshot.exists) return null;

  const session = snapshot.data();
  if (!session?.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
    await snapshot.ref.delete().catch(() => {});
    return null;
  }
  return session;
};

exports.deleteAdminLog = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST');
    res.status(405).json({ ok: false, message: 'Method not allowed.' });
    return;
  }

  const session = await readAdminSession(req);
  if (!session?.permissions?.includes('audit')) {
    res.status(403).json({ ok: false, message: 'Sesi admin tidak valid atau tidak punya akses audit.' });
    return;
  }

  const { logType = '', docId = '' } = req.body || {};
  const collectionName = DELETABLE_LOG_COLLECTIONS[logType];
  const safeDocId = String(docId || '').trim();

  if (!collectionName || !safeDocId || safeDocId.includes('/')) {
    res.status(400).json({ ok: false, message: 'Target log tidak valid.' });
    return;
  }

  await admin.firestore().collection(collectionName).doc(safeDocId).delete();
  res.json({ ok: true });
});

exports.notifyAdminOnLiveChat = onDocumentCreated('live_chat_messages/{messageId}', async event => {
  const message = event.data?.data();
  if (!message || message.sender !== 'student') return;

  const tokensSnapshot = await admin.firestore()
    .collection('admin_push_tokens')
    .where('enabled', '==', true)
    .get();

  const tokens = tokensSnapshot.docs
    .map(doc => doc.data().token)
    .filter(Boolean);

  if (!tokens.length) return;

  const sender = message.senderName || 'Mahasiswa';
  const nim = message.nim ? ` (${message.nim})` : '';
  const body = `${sender}${nim}: ${message.message || 'Mengirim pesan baru.'}`;

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'Live chat baru - SIPIL CARE',
      body
    },
    data: {
      threadId: String(message.threadId || ''),
      url: '/panel-hms-sipil-2026.html#live-chat-admin'
    },
    webpush: {
      fcmOptions: {
        link: 'https://sipil-care.vercel.app/panel-hms-sipil-2026.html#live-chat-admin'
      }
    }
  });
});
