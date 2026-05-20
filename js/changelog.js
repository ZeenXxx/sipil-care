const list = document.getElementById('changelogList');
const summaryTitle = document.getElementById('changelogSummaryTitle');
const summaryText = document.getElementById('changelogSummaryText');

const fallbackEntries = [
  {
    date: '2026-05-20',
    dateLabel: '20 Mei 2026',
    summary: 'Changelog SIPIL CARE',
    items: [
      {
        type: 'added',
        title: 'Changelog Otomatis',
        description: 'Riwayat update ditampilkan dari data changelog agar mahasiswa bisa melihat perbaikan dan fitur baru dengan lebih jelas.'
      }
    ]
  }
];

const typeLabels = {
  added: 'Ditambahkan',
  improved: 'Ditingkatkan',
  fixed: 'Diperbaiki'
};

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
})[char]);

const renderEntries = entries => {
  const data = Array.isArray(entries) && entries.length ? entries : fallbackEntries;
  const latest = data[0];
  if (summaryTitle) summaryTitle.textContent = latest?.dateLabel ? `Update ${latest.dateLabel}` : 'Update Terbaru';
  if (summaryText) {
    summaryText.textContent = latest?.summary
      ? `Fokus update terbaru: ${latest.summary}.`
      : 'Riwayat update SIPIL CARE akan tampil otomatis ketika ada perubahan website.';
  }
  if (!list) return;

  list.innerHTML = data.map(entry => (entry.items || []).map(item => `
    <article class="changelog-item">
      <time datetime="${escapeText(entry.date)}">${escapeText(entry.dateLabel || entry.date)}</time>
      <div>
        <span class="changelog-type ${escapeText(item.type || 'improved')}">${escapeText(typeLabels[item.type] || 'Ditingkatkan')}</span>
        <h3>${escapeText(item.title)}</h3>
        <p>${escapeText(item.description)}</p>
      </div>
    </article>
  `).join('')).join('') || '<p class="global-search-empty">Belum ada changelog.</p>';
};

fetch('../data/changelog.json', { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error('Changelog belum tersedia.');
    return response.json();
  })
  .then(renderEntries)
  .catch(error => {
    console.warn('Load changelog failed:', error);
    renderEntries(fallbackEntries);
  });
