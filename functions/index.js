const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const SITE_URL = 'https://sipil-care.vercel.app';
const STUDENT_TOKEN_COLLECTION = 'student_push_tokens';
const ADMIN_TOKEN_COLLECTION = 'admin_push_tokens';
const ROSTER_COLLECTION = 'practicum_rosters';

const chunk = (items, size = 500) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const cleanInvalidTokens = async (items, responses) => {
  const invalidCodes = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered'
  ]);
  const deletes = responses
    .map((response, index) => ({ response, item: items[index] }))
    .filter(({ response }) => response.error && invalidCodes.has(response.error.code))
    .map(({ item }) => admin.firestore().collection(item.collection).doc(item.id).delete());
  await Promise.allSettled(deletes);
};

const sendMulticast = async ({ recipients, title, body, url, tag }) => {
  const validRecipients = recipients.filter(item => item.token);
  if (!validRecipients.length) return;

  for (const batch of chunk(validRecipients)) {
    const result = await admin.messaging().sendEachForMulticast({
      tokens: batch.map(item => item.token),
      notification: { title, body },
      data: {
        url,
        tag: tag || 'sipilcare-update'
      },
      webpush: {
        fcmOptions: {
          link: `${SITE_URL}${url}`
        }
      }
    });
    await cleanInvalidTokens(batch, result.responses);
  }
};

const getAdminPushTokens = async () => {
  const snapshot = await admin.firestore()
    .collection(ADMIN_TOKEN_COLLECTION)
    .where('enabled', '==', true)
    .get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    collection: ADMIN_TOKEN_COLLECTION,
    token: doc.data().token
  }));
};

const getStudentPushTokens = async ({ angkatan, nims } = {}) => {
  const snapshot = await admin.firestore()
    .collection(STUDENT_TOKEN_COLLECTION)
    .where('enabled', '==', true)
    .get();
  const nimSet = Array.isArray(nims) && nims.length ? new Set(nims.map(String)) : null;
  const cohort = angkatan ? String(angkatan) : '';
  return snapshot.docs
    .map(doc => ({ id: doc.id, collection: STUDENT_TOKEN_COLLECTION, ...doc.data() }))
    .filter(item => item.token)
    .filter(item => !cohort || String(item.angkatan || '') === cohort || nimSet?.has(String(item.nim || '')))
    .map(item => ({
      id: item.id,
      collection: STUDENT_TOKEN_COLLECTION,
      token: item.token
    }));
};

const rosterNimsFor = async item => {
  const category = item.category || '';
  const targetAngkatan = item.targetAngkatan || item.targetCohort || '';
  const academicYear = item.academicYear || '';
  const classKey = item.classKey || '';
  if (!category) return [];

  let query = admin.firestore().collection(ROSTER_COLLECTION).where('category', '==', category);
  if (targetAngkatan) query = query.where('targetAngkatan', '==', String(targetAngkatan));
  if (academicYear) query = query.where('academicYear', '==', academicYear);
  if (classKey) query = query.where('classKey', '==', classKey);
  const snapshot = await query.get();
  return snapshot.docs
    .map(doc => doc.data())
    .filter(row => row.isActive !== false)
    .map(row => String(row.nim || ''))
    .filter(Boolean);
};

exports.notifyAdminOnLiveChat = onDocumentCreated('live_chat_messages/{messageId}', async event => {
  const message = event.data?.data();
  if (!message || message.sender !== 'student') return;

  const sender = message.senderName || 'Mahasiswa';
  const nim = message.nim ? ` (${message.nim})` : '';
  const body = `${sender}${nim}: ${message.message || 'Mengirim pesan baru.'}`;

  await sendMulticast({
    recipients: await getAdminPushTokens(),
    title: 'Live chat baru - SIPIL CARE',
    body,
    url: '/panel-hms-sipil-2026.html#live-chat-admin',
    tag: String(message.threadId || 'sipilcare-live-chat')
  });
});

exports.notifyStudentsOnResourceCreated = onDocumentCreated('resources/{resourceId}', async event => {
  const item = event.data?.data();
  if (!item) return;
  const isSoftware = String(item.category || '').toLowerCase() === 'software';
  await sendMulticast({
    recipients: await getStudentPushTokens(),
    title: isSoftware ? 'Software baru tersedia' : 'Resource baru tersedia',
    body: `${item.title || 'Materi baru'} sudah bisa diakses di SIPIL CARE.`,
    url: isSoftware ? '/pages/software.html' : '/pages/resources.html',
    tag: `resource-${event.params.resourceId}`
  });
});

exports.notifyStudentsOnPracticumModuleCreated = onDocumentCreated('practicum_studio_modules/{moduleId}', async event => {
  const item = event.data?.data();
  if (!item) return;
  const rosterNims = await rosterNimsFor(item);
  await sendMulticast({
    recipients: await getStudentPushTokens({
      angkatan: item.targetAngkatan || item.targetCohort,
      nims: rosterNims
    }),
    title: 'Modul praktikum/studio baru',
    body: `${item.title || item.course || 'Modul baru'} sudah tersedia untuk ${item.course || item.category || 'praktikum/studio'}.`,
    url: '/pages/praktikum-studio.html',
    tag: `practicum-module-${event.params.moduleId}`
  });
});

exports.notifyStudentsOnAttendanceSessionCreated = onDocumentCreated('practicum_attendance_sessions/{sessionId}', async event => {
  const item = event.data?.data();
  if (!item) return;
  const rosterNims = await rosterNimsFor(item);
  await sendMulticast({
    recipients: await getStudentPushTokens({
      angkatan: item.targetAngkatan || item.targetCohort,
      nims: rosterNims
    }),
    title: 'Sesi absen praktikum dibuka',
    body: `${item.moduleNumber || 'Sesi'} - ${item.moduleTitle || item.course || 'Praktikum'} kelas ${item.className || '-'} sudah dibuat.`,
    url: '/pages/praktikum-studio.html',
    tag: `attendance-session-${event.params.sessionId}`
  });
});

exports.notifyStudentsOnVideoCreated = onDocumentCreated('videos/{videoId}', async event => {
  const item = event.data?.data();
  if (!item) return;
  await sendMulticast({
    recipients: await getStudentPushTokens(),
    title: 'Video baru tersedia',
    body: `${item.title || 'Video baru'} sudah bisa ditonton di SIPIL CARE.`,
    url: '/pages/videos.html',
    tag: `video-${event.params.videoId}`
  });
});

exports.notifyStudentsOnAnnouncementCreated = onDocumentCreated('announcements/{announcementId}', async event => {
  const item = event.data?.data();
  if (!item) return;
  await sendMulticast({
    recipients: await getStudentPushTokens(),
    title: item.type || 'Pemberitahuan HMS',
    body: item.title || 'Ada pemberitahuan baru di SIPIL CARE.',
    url: '/index.html',
    tag: `announcement-${event.params.announcementId}`
  });
});
