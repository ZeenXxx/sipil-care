const crypto = require('crypto');

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

const publicAdminProfile = user => ({
  username: user.username,
  name: user.name,
  role: user.role,
  roleLabel: user.roleLabel,
  allowedPages: user.allowedPages,
  permissions: user.permissions
});

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

  console.info('Admin login success', {
    username: user.username,
    role: user.role,
    at: new Date().toISOString()
  });

  res.status(200).json({ ok: true, profile: publicAdminProfile(user) });
};
