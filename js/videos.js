import { app } from './firebase-config.js';
import {
	getFirestore,
	collection,
	query,
	orderBy,
	onSnapshot,
	getDocs,
	addDoc,
	serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

let videos = [];
const videoGrid = document.getElementById('videoGrid');
const videoSearch = document.getElementById('videoSearch');
const videoCategory = document.getElementById('videoCategory');
const featuredVideo = document.getElementById('featuredVideo');

const channelLabel = v => v.channel || v.duration || 'Channel';
const readStudentSession = () => {
	try {
		const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const session = JSON.parse(raw);
		if (!session?.nim || !session?.lastSeenAt) return null;
		if (Date.now() - session.lastSeenAt > SESSION_TTL) return null;
		return session;
	} catch {
		return null;
	}
};
const getHost = url => {
	try {
		return new URL(url).host;
	} catch {
		return '';
	}
};
const slugify = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'video';
const normalizeVideos = items => items.map((item, index) => ({
	...item,
	id: item.id || item.slug || slugify(item.title || `video-${index + 1}`)
}));
const logVideoAccess = async video => {
	const session = readStudentSession();
	if (!session || !video) return;
	await addDoc(collection(db, 'resource_access_logs'), {
		action: 'view',
		actionLabel: 'View video',
		nim: session.nim,
		name: session.name || '',
		resourceId: video.id || '',
		resourceTitle: video.title || '',
		category: video.category || '',
		type: 'YouTube',
		contentType: 'video',
		source: 'videos',
		fileHost: getHost(video.youtube),
		page: location.pathname,
		userAgent: navigator.userAgent.slice(0, 240),
		createdAt: new Date().toISOString(),
		accessedAt: serverTimestamp()
	});
};
const card = v => `<article class="card video-card"><div class="thumb">${v.thumbnail}</div><div class="video-body"><div class="meta"><span class="badge">${v.category}</span><span class="badge">Channel: ${channelLabel(v)}</span></div><h3>${v.title}</h3><p>${v.description}</p><br><a class="btn btn-primary" href="${v.youtube}" target="_blank" rel="noopener" data-video-id="${v.id}">Watch</a></div></article>`;

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
	if (featuredVideo && top) featuredVideo.innerHTML = `<div class="thumb">${top.thumbnail}</div><div><span class="eyebrow">Featured video</span><h2 class="title">${top.title}</h2><div class="meta"><span class="badge">Channel: ${channelLabel(top)}</span></div><p class="lead">${top.description}</p><br><a class="btn btn-primary" href="${top.youtube}" target="_blank" rel="noopener" data-video-id="${top.id}">Watch Video</a></div>`;
	render();
}

async function loadLocalFallback() {
	try {
		const resp = await fetch('../data/videos.json');
		const d = await resp.json();
		videos = normalizeVideos(JSON.parse(localStorage.getItem('sipilcare_videos') || 'null') || d);
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
		videos = normalizeVideos(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
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
document.addEventListener('click', event => {
	const link = event.target.closest('[data-video-id]');
	if (!link) return;
	const video = videos.find(item => item.id === link.dataset.videoId);
	logVideoAccess(video).catch(error => console.warn('Video access log failed:', error));
});
