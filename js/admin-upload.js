import { app } from './firebase-config.js';

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const storage = getStorage(app);
const db = getFirestore(app);

const form = document.getElementById('uploadForm');
const statusEl = document.getElementById('uploadStatus');
const submitButton = form.querySelector('button[type="submit"]');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#c0392b' : '#2c3e50';
}

form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const title = document.getElementById('title').value;
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value;
  const file = document.getElementById('file').files[0];

  if (!file) {
    setStatus('Pilih file terlebih dahulu.', true);
    return;
  }

  submitButton.disabled = true;
  setStatus('Memulai upload...');

  try {

    const timestamp = Date.now();
    const fileRef = ref(
      storage,
      `resources/${timestamp}-${file.name}`
    );

    const uploadTask = uploadBytesResumable(fileRef, file);

    await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setStatus(`Uploading: ${progress}%`);
        },
        (error) => reject(error),
        () => resolve()
      );
    });

    const url = await getDownloadURL(fileRef);
    const fileType = file.name.split('.').pop().toUpperCase();

    await addDoc(collection(db, 'resources'), {

      title,
      category,
      description,
      file: url,
      type: fileType,
      author: 'HMS Sipil',
      date: new Date().toISOString().split('T')[0],
      thumbnail: '📘'

    });

    setStatus('Upload berhasil. Resource telah tersimpan.');

    form.reset();

  } catch (err) {

    console.error(err);
    setStatus('Upload gagal. Cek console untuk detail.', true);

  } finally {
    submitButton.disabled = false;
  }

});