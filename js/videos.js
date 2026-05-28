import { app } from './firebase-config.js';
import {
	getFirestore,
	collection,
	query,
	orderBy,
	where,
	onSnapshot,
	getDocs,
	addDoc,
	serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const BOOKMARK_KEY = 'sipilcare_student_bookmarks';

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
const showToast = message => {
	const toast = document.getElementById('toast');
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), 3000);
};
const readBookmarks = () => {
	try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]'); } catch { return []; }
};
const writeBookmarks = items => localStorage.setItem(BOOKMARK_KEY, JSON.stringify(items.slice(0, 100)));
const bookmarkId = item => `video:${item.id || slugify(item.title)}`;
const isBookmarked = item => readBookmarks().some(saved => saved.id === bookmarkId(item));
const toggleBookmark = item => {
	const id = bookmarkId(item);
	const saved = readBookmarks();
	const exists = saved.some(row => row.id === id);
	const next = exists
		? saved.filter(row => row.id !== id)
		: [{ id, type: 'Video', title: item.title, category: item.category, url: item.youtube, savedAt: new Date().toISOString() }, ...saved];
	writeBookmarks(next);
	showToast(exists ? 'Video dihapus dari simpanan.' : 'Video disimpan.');
	render();
};
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
const card = v => `<article class="card video-card"><div class="thumb">${v.thumbnail}</div><div class="video-body"><div class="meta"><span class="badge">${v.category}</span><span class="badge">Channel: ${channelLabel(v)}</span></div><h3>${v.title}</h3><p>${v.description}</p><br><div class="actions"><a class="btn btn-primary" href="${v.youtube}" target="_blank" rel="noopener" data-video-id="${v.id}">Watch</a><button class="btn btn-ghost" type="button" data-bookmark-video="${v.id}">${isBookmarked(v) ? 'Tersimpan' : 'Simpan'}</button></div></div></article>`;

function render() {
	const q = (videoSearch?.value || '').toLowerCase();
	const cat = videoCategory?.value || 'All';
	const d = videos.filter(v => (v.status || 'published') === 'published' && (cat === 'All' || v.category === cat) && [v.title, v.description, v.category].join(' ').toLowerCase().includes(q));
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
	const videosQuery = query(collection(db, 'videos'), where('status', '==', 'published'), orderBy('title'));
	onSnapshot(videosQuery, snapshot => {
		if (snapshot.empty) {
			getDocs(query(collection(db, 'videos'), orderBy('title')))
				.then(fallbackSnapshot => {
					videos = normalizeVideos(fallbackSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(item => (item.status || 'published') === 'published'));
					updateUI();
				})
				.catch(error => console.warn('Video legacy fallback failed:', error));
			return;
		}
		videos = normalizeVideos(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(item => (item.status || 'published') === 'published'));
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
	const bookmarkButton = event.target.closest('[data-bookmark-video]');
	if (bookmarkButton) {
		const videoItem = videos.find(item => item.id === bookmarkButton.dataset.bookmarkVideo);
		if (videoItem) toggleBookmark(videoItem);
		return;
	}
	const link = event.target.closest('[data-video-id]');
	if (!link) return;
	const video = videos.find(item => item.id === link.dataset.videoId);
	logVideoAccess(video).catch(error => console.warn('Video access log failed:', error));
});
