import { app } from './firebase-config.js';
import {
	getFirestore,
	collection,
	onSnapshot,
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
const videoDescriptionModal = document.getElementById('videoDescriptionModal');
const videoDescriptionTitle = document.getElementById('videoDescriptionTitle');
const videoDescriptionText = document.getElementById('videoDescriptionText');
let lastDescriptionTrigger = null;

const channelLabel = v => String(v.channel || '').trim() || 'HMS UNJANI';
const durationLabel = v => String(v.duration || '').trim();
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
const escapeAttribute = value => String(value || '').replace(/[&<>"']/g, char => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
}[char]));
const escapeHtml = escapeAttribute;
const normalizeYoutubeInput = value => {
	const raw = String(value || '').trim();
	if (!raw || raw === '#') return '';
	if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return `https://www.youtube.com/watch?v=${raw}`;
	if (/^(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(raw)) return `https://${raw}`;
	return raw;
};
const parseYoutubeId = value => {
	try {
		const normalized = normalizeYoutubeInput(value);
		if (!normalized) return '';
		const url = new URL(normalized);
		if (url.hostname.includes('youtu.be')) return url.pathname.replace(/^\/+/, '').split('/')[0] || '';
		if (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) {
			if (url.pathname === '/watch') return url.searchParams.get('v') || '';
			const match = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/);
			return match?.[1] || '';
		}
		return '';
	} catch {
		return '';
	}
};
const youtubeWatchUrl = value => {
	try {
		const normalized = normalizeYoutubeInput(value);
		if (!normalized) return '';
		const url = new URL(normalized);
		const playlistId = url.searchParams.get('list') || '';
		const isYoutubeHost = url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com') || url.hostname.includes('youtu.be');
		if (isYoutubeHost && playlistId && /^[a-zA-Z0-9_-]+$/.test(playlistId)) {
			const videoId = url.pathname === '/playlist' || url.pathname === '/embed/videoseries' ? '' : parseYoutubeId(normalized);
			return videoId
				? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&list=${encodeURIComponent(playlistId)}`
				: `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
		}
		const id = parseYoutubeId(normalized);
		return id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : '';
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
	id: item.id || item.slug || slugify(item.title || `video-${index + 1}`),
	channel: String(item.channel || '').trim(),
	duration: String(item.duration || '').trim() === String(item.channel || '').trim()
		? ''
		: String(item.duration || '').trim(),
	youtube: youtubeWatchUrl(item.youtube)
})).sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'id'));
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
const videoLink = (video, label) => {
	const url = video.youtube || youtubeWatchUrl(video.youtube);
	if (!url) return `<button class="btn btn-primary" type="button" disabled title="Link YouTube belum tersedia">${label}</button>`;
	return `<a class="btn btn-primary" href="${escapeAttribute(url)}" target="_blank" rel="external noopener noreferrer" data-video-id="${escapeAttribute(video.id)}">${label}</a>`;
};
const videoMeta = v => `<div class="meta"><span class="badge">${escapeHtml(v.category || 'Uncategorized')}</span><span class="badge">Channel: ${escapeHtml(channelLabel(v))}</span>${durationLabel(v) ? `<span class="badge">Durasi: ${escapeHtml(durationLabel(v))}</span>` : ''}</div>`;
const card = v => {
	const description = String(v.description || '').trim();
	const readMore = description.length > 150
		? `<button class="video-read-more" type="button" data-read-video-description="${escapeAttribute(v.id)}">Baca selengkapnya</button>`
		: '<span class="video-read-more-placeholder" aria-hidden="true"></span>';
	return `<article class="card video-card"><div class="thumb">${escapeHtml(v.thumbnail || 'VI')}</div><div class="video-body">${videoMeta(v)}<h3>${escapeHtml(v.title || 'Video')}</h3><p class="video-description">${escapeHtml(description)}</p>${readMore}<div class="actions">${videoLink(v, 'Watch')}<button class="btn btn-ghost" type="button" data-bookmark-video="${escapeAttribute(v.id)}">${isBookmarked(v) ? 'Tersimpan' : 'Simpan'}</button></div></div></article>`;
};

function openDescription(video, trigger) {
	if (!videoDescriptionModal || !videoDescriptionTitle || !videoDescriptionText || !video) return;
	lastDescriptionTrigger = trigger;
	videoDescriptionTitle.textContent = video.title || 'Deskripsi video';
	videoDescriptionText.textContent = String(video.description || '').trim();
	videoDescriptionModal.hidden = false;
	document.body.classList.add('video-description-open');
	videoDescriptionModal.querySelector('[data-close-video-description]')?.focus();
}

function closeDescription() {
	if (!videoDescriptionModal || videoDescriptionModal.hidden) return;
	videoDescriptionModal.hidden = true;
	document.body.classList.remove('video-description-open');
	lastDescriptionTrigger?.focus();
}

function render() {
	const q = (videoSearch?.value || '').toLowerCase();
	const cat = videoCategory?.value || 'All';
	const d = videos.filter(v => (v.status || 'published') === 'published' && (cat === 'All' || v.category === cat) && [v.title, v.description, v.category].join(' ').toLowerCase().includes(q));
	if (videoGrid) videoGrid.innerHTML = d.map(card).join('') || '<div class="card empty video-empty-state"><strong>Video tidak ditemukan.</strong><p>Coba kata kunci atau kategori lain. Video yang tersedia dapat dibuka dari sini.</p></div>';
}

function updateUI() {
	if (!videos || videos.length === 0) {
		if (featuredVideo) featuredVideo.innerHTML = '<div class="empty video-empty-state"><strong>Belum ada video pilihan.</strong><p>Video unggahan pengelola akan tampil di area ini.</p></div>';
		if (videoGrid) videoGrid.innerHTML = '<div class="card empty video-empty-state"><strong>Video pembelajaran belum tersedia.</strong><p>Konten video akan ditampilkan di sini setelah diterbitkan. Coba kembali nanti atau lihat materi di halaman Resource.</p><a class="btn btn-secondary" href="resources.html">Buka Resource</a></div>';
		if (videoCategory) videoCategory.innerHTML = '<option value="All">Semua kategori</option>';
		return;
	}
	if (videoCategory) videoCategory.innerHTML = '<option value="All">Semua kategori</option>' + [...new Set(videos.map(v => v.category || 'Uncategorized'))].map(c => `<option>${c}</option>`).join('');
	const top = videos[0];
	if (featuredVideo && top) featuredVideo.innerHTML = `<div class="thumb">${top.thumbnail}</div><div><span class="eyebrow">Featured video</span><h2 class="title">${top.title}</h2>${videoMeta(top)}<p class="lead">${top.description}</p><br>${videoLink(top, 'Watch Video')}</div>`;
	render();
}

try {
	onSnapshot(collection(db, 'videos'), snapshot => {
		videos = normalizeVideos(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(item => (item.status || 'published') === 'published'));
		updateUI();
	}, err => {
		console.error('Firestore videos error:', err);
		videos = [];
		updateUI();
		showToast('Gagal memuat video dari server. Coba refresh halaman.');
	});
} catch (e) {
	console.error('Error initializing Firestore videos listener', e);
	videos = [];
	updateUI();
}

videoSearch?.addEventListener('input', render);
videoCategory?.addEventListener('change', render);
document.addEventListener('click', event => {
	const closeButton = event.target.closest('[data-close-video-description]');
	if (closeButton) {
		closeDescription();
		return;
	}
	const readMoreButton = event.target.closest('[data-read-video-description]');
	if (readMoreButton) {
		const videoItem = videos.find(item => item.id === readMoreButton.dataset.readVideoDescription);
		if (videoItem) openDescription(videoItem, readMoreButton);
		return;
	}
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
document.addEventListener('keydown', event => {
	if (event.key === 'Escape') closeDescription();
});
