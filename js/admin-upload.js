import { app } from './firebase-config.js';

import {
  getStorage,
  ref,
  uploadBytes,
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

form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const title = document.getElementById('title').value;
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value;
  const file = document.getElementById('file').files[0];

  if (!file) {
    alert('Pilih file terlebih dahulu');
    return;
  }

  try {

    const fileRef = ref(
      storage,
      `resources/${Date.now()}-${file.name}`
    );

    await uploadBytes(fileRef, file);

    const url = await getDownloadURL(fileRef);

    await addDoc(collection(db, 'resources'), {

      title,
      category,
      description,
      file: url,
      type: 'PDF',
      author: 'HMS Sipil',
      date: new Date().toISOString().split('T')[0],
      thumbnail: '📘'

    });

    alert('Upload berhasil');

    form.reset();

  } catch (err) {

    console.error(err);
    alert('Upload gagal');

  }

});