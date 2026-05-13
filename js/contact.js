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
const toastEl = document.getElementById('toast');

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
      <strong>${item.sender === 'admin' ? 'HMS / PENDPROF' : escapeText(item.senderName || 'Mahasiswa')}</strong>
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
