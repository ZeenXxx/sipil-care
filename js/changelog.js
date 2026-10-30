const newItemsList = document.getElementById('changelogNewItems');
const improvedItemsList = document.getElementById('changelogImprovedItems');
const summaryTitle = document.getElementById('changelogSummaryTitle');
const summaryText = document.getElementById('changelogSummaryText');
const dateLabel = document.getElementById('changelogDate');

const fallbackEntries = [
  {
    date: '',
    dateLabel: 'Belum tersedia',
    summary: 'Belum ada pembaruan terbaru',
    items: [
      {
        type: 'improved',
        title: 'Pembaruan sedang disiapkan',
        description: 'Informasi rilis terbaru akan muncul di sini setelah website diperbarui.'
      }
    ]
  }
];

const typeLabels = {
  added: 'Fitur baru',
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
  const latestItems = Array.isArray(latest?.items) ? latest.items : [];
  const newFeatures = latestItems.filter(item => item.type === 'added');
  const improvements = latestItems.filter(item => item.type === 'improved' || item.type === 'fixed');

  if (summaryTitle) summaryTitle.textContent = latest?.summary || 'Pembaruan terbaru SIPIL CARE';
  if (dateLabel) {
    dateLabel.dateTime = latest?.date || '';
    dateLabel.textContent = latest?.dateLabel || 'Tanggal belum tersedia';
  }
  if (summaryText) {
    summaryText.textContent = `Pembaruan ini memuat ${newFeatures.length} fitur baru dan ${improvements.length} fitur yang ditingkatkan atau diperbaiki.`;
  }

  const renderList = (target, items, emptyMessage) => {
    if (!target) return;
    target.innerHTML = items.map(item => `
    <li class="changelog-entry">
      <span class="changelog-entry-mark ${escapeText(item.type || 'improved')}" aria-hidden="true"></span>
      <div>
        <span class="changelog-type ${escapeText(item.type || 'improved')}">${escapeText(typeLabels[item.type] || 'Ditingkatkan')}</span>
        <strong>${escapeText(item.title)}</strong>
        <p>${escapeText(item.description)}</p>
      </div>
    </li>
    `).join('') || `<li class="changelog-entry changelog-empty"><div><p>${escapeText(emptyMessage)}</p></div></li>`;
  };

  renderList(newItemsList, newFeatures, 'Tidak ada fitur baru pada update ini.');
  renderList(improvedItemsList, improvements, 'Tidak ada fitur yang ditingkatkan atau diperbaiki pada update ini.');
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
