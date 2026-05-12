import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const card = i => `<article class="card resource-card"><div class="icon">${i.thumbnail}</div><div class="meta"><span class="badge">${i.category}</span><span class="badge">${i.type}</span></div><h3>${i.title}</h3><p>${i.description}</p><div class="actions"><a class="btn btn-primary" href="${i.file}">View</a><a class="btn btn-ghost" href="${i.file}" download>Download</a></div></article>`;

async function loadFeaturedResources() {
  try {
    const resourcesRef = query(collection(db, 'resources'), orderBy('date', 'desc'));
    const snapshot = await getDocs(resourcesRef);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const t = document.getElementById('featuredResources');
    if (t) t.innerHTML = data.slice(0, 3).map(card).join('');
  } catch (err) {
    console.error('Firestore fetch failed:', err);
    fetch('data/resources.json')
      .then(r => r.json())
      .then(d => {
        const t = document.getElementById('featuredResources');
        if (t) t.innerHTML = d.slice(0, 3).map(card).join('');
      });
  }
}

loadFeaturedResources();