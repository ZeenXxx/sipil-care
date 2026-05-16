import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const contactForm = document.getElementById('contactForm');
const chatForm = document.getElementById('liveChatForm');
const chatInput = document.getElementById('chatMessage');
const chatFeed = document.getElementById('chatFeed');
const chatIdentity = document.getElementById('chatIdentity');
const adminChatStatus = document.getElementById('adminChatStatus');
const toastEl = document.getElementById('toast');
const ADMIN_ONLINE_WINDOW = 2 * 60 * 1000;

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const toast = message => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
};

const getSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
};

const getThreadId = () => {
  const session = getSession();
  if (session.nim) return `nim-${session.nim}`;
  let guest = localStorage.getItem('sipilcare_guest_chat');
  if (!guest) {
    guest = `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('sipilcare_guest_chat', guest);
  }
  return guest;
};

const session = getSession();
const threadId = getThreadId();

const parseDateValue = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const formatRelativeTime = value => {
  const date = parseDateValue(value);
  if (!date) return 'Belum ada admin aktif';
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return 'baru saja aktif';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} menit lalu`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} jam lalu`;
  return `${Math.floor(diff / 86400000)} hari lalu`;
};

const renderAdminStatus = admins => {
  if (!adminChatStatus) return;
  const sortedAdmins = admins
    .filter(item => item.last_seen_at)
    .sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at)));
  const onlineAdmins = sortedAdmins.filter(item => {
    const lastSeen = parseDateValue(item.last_seen_at);
    return lastSeen && Date.now() - lastSeen.getTime() <= ADMIN_ONLINE_WINDOW;
  });
  const latest = onlineAdmins[0] || sortedAdmins[0];
  const online = Boolean(onlineAdmins.length);

  adminChatStatus.classList.toggle('online', online);
  adminChatStatus.classList.toggle('offline', !online);
  adminChatStatus.querySelector('strong').textContent = online
    ? `${onlineAdmins.length} admin online`
    : 'Admin offline';
  adminChatStatus.querySelector('small').textContent = latest
    ? `Terakhir aktif ${formatRelativeTime(latest.last_seen_at)}`
    : 'Belum ada aktivitas admin tercatat';
};

if (chatIdentity) {
  chatIdentity.textContent = session.nim
    ? `Live chat sebagai ${session.name || 'Mahasiswa'} (${session.nim})`
    : 'Live chat sebagai mahasiswa/guest';
}

contactForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = contactForm.querySelector('button[type="submit"]');
  const formData = new FormData(contactForm);
  const data = Object.fromEntries(formData.entries());

  if (submit) submit.disabled = true;

  try {
    await addDoc(collection(db, 'contact_messages'), {
      name: data.name.trim(),
      nim: data.nim.trim(),
      email: data.email.trim(),
      category: data.category,
      subject: data.subject.trim(),
      message: data.message.trim(),
      reply: '',
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    toast('Pesan terkirim ke panel HMS. Terima kasih sudah menyampaikan.');
    contactForm.reset();
  } catch (error) {
    console.error('Contact submit failed:', error);
    toast('Pesan gagal dikirim. Coba ulang beberapa saat lagi.');
  } finally {
    if (submit) submit.disabled = false;
  }
});

chatForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const submit = chatForm.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;

  try {
    await addDoc(collection(db, 'live_chat_messages'), {
      threadId,
      sender: 'student',
      senderName: session.name || 'Mahasiswa',
      nim: session.nim || '',
      message: text,
      createdAt: new Date().toISOString()
    });
    chatInput.value = '';
  } catch (error) {
    console.error('Live chat send failed:', error);
    toast('Chat gagal terkirim. Coba ulang kembali.');
  } finally {
    if (submit) submit.disabled = false;
  }
});

function renderChat(messages) {
  if (!chatFeed) return;
  if (!messages.length) {
    chatFeed.innerHTML = '<div class="chat-empty">Belum ada percakapan. Kirim pesan untuk memulai live chat.</div>';
    return;
  }

  chatFeed.innerHTML = messages.map(item => `
    <div class="chat-bubble ${item.sender === 'admin' ? 'admin' : 'student'}">
      <strong>${item.sender === 'admin' ? 'HMS UNJANI / PENDPROF HMS' : escapeText(item.senderName || 'Mahasiswa')}</strong>
      <p>${escapeText(item.message)}</p>
      <small>${new Date(item.createdAt).toLocaleString('id-ID')}</small>
    </div>
  `).join('');
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

const liveQuery = query(collection(db, 'live_chat_messages'), orderBy('createdAt', 'asc'));
onSnapshot(liveQuery, snapshot => {
  const messages = snapshot.docs
    .map(documentSnapshot => ({ id: documentSnapshot.id, ...documentSnapshot.data() }))
    .filter(item => item.threadId === threadId);
  renderChat(messages);
}, error => {
  console.error('Live chat load failed:', error);
  if (chatFeed) chatFeed.innerHTML = '<div class="chat-empty">Live chat belum bisa dimuat.</div>';
});

const adminStatusQuery = query(collection(db, 'admin_activity'), orderBy('last_seen_at', 'desc'));
onSnapshot(adminStatusQuery, snapshot => {
  renderAdminStatus(snapshot.docs.map(documentSnapshot => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data()
  })));
}, error => {
  console.error('Admin status load failed:', error);
  if (adminChatStatus) {
    adminChatStatus.classList.remove('online');
    adminChatStatus.classList.add('offline');
    adminChatStatus.querySelector('strong').textContent = 'Status admin belum tersedia';
    adminChatStatus.querySelector('small').textContent = 'Coba refresh halaman beberapa saat lagi';
  }
});
