import { app } from './firebase-config.js';
import {
	getFirestore,
	collection,
	query,
	orderBy,
	onSnapshot,
	getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);

let videos = [];
const videoGrid = document.getElementById('videoGrid');
const videoSearch = document.getElementById('videoSearch');
const videoCategory = document.getElementById('videoCategory');
const featuredVideo = document.getElementById('featuredVideo');

const channelLabel = v => v.channel || v.duration || 'Channel';
const card = v => `<article class="card video-card"><div class="thumb">${v.thumbnail}</div><div class="video-body"><div class="meta"><span class="badge">${v.category}</span><span class="badge">Channel: ${channelLabel(v)}</span></div><h3>${v.title}</h3><p>${v.description}</p><br><a class="btn btn-primary" href="${v.youtube}" target="_blank" rel="noopener">Watch</a></div></article>`;

function render() {
	const q = (videoSearch?.value || '').toLowerCase();
	const cat = videoCategory?.value || 'All';
	const d = videos.filter(v => (cat === 'All' || v.category === cat) && [v.title, v.description, v.category].join(' ').toLowerCase().includes(q));
	if (videoGrid) videoGrid.innerHTML = d.map(card).join('') || '<div class="card empty">Video tidak ditemukan.</div>';
}

function updateUI() {
	if (!videos || videos.length === 0) return;
	if (videoCategory) videoCategory.innerHTML = '<option value="All">Semua kategori</option>' + [...new Set(videos.map(v => v.category || 'Uncategorized'))].map(c => `<option>${c}</option>`).join('');
	const top = videos[0];
	if (featuredVideo && top) featuredVideo.innerHTML = `<div class="thumb">${top.thumbnail}</div><div><span class="eyebrow">Featured video</span><h2 class="title">${top.title}</h2><div class="meta"><span class="badge">Channel: ${channelLabel(top)}</span></div><p class="lead">${top.description}</p><br><a class="btn btn-primary" href="${top.youtube}" target="_blank" rel="noopener">Watch Video</a></div>`;
	render();
}

async function loadLocalFallback() {
	try {
		const resp = await fetch('../data/videos.json');
		const d = await resp.json();
		videos = JSON.parse(localStorage.getItem('sipilcare_videos') || 'null') || d;
		localStorage.setItem('sipilcare_videos', JSON.stringify(videos));
		updateUI();
	} catch (err) {
		console.error('Failed to load local videos.json', err);
	}
}

// Try Firestore first, then fallback to local JSON
try {
	const videosQuery = query(collection(db, 'videos'), orderBy('title'));
	onSnapshot(videosQuery, snapshot => {
		videos = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
		// ensure deterministic ordering: by title already
		updateUI();
	}, err => {
		console.error('Firestore videos error:', err);
		loadLocalFallback();
	});
} catch (e) {
	console.error('Error initializing Firestore videos listener', e);
	loadLocalFallback();
}

videoSearch?.addEventListener('input', render);
videoCategory?.addEventListener('change', render);
