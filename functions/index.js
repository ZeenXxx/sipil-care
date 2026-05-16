const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

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
