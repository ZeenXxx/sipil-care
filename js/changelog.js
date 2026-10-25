const list = document.getElementById('changelogList');
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
  if (summaryTitle) summaryTitle.textContent = latest?.summary || 'Pembaruan terbaru SIPIL CARE';
  if (dateLabel) {
    dateLabel.dateTime = latest?.date || '';
    dateLabel.textContent = latest?.dateLabel || 'Tanggal belum tersedia';
  }
  if (summaryText) {
    summaryText.textContent = 'Berikut ringkasan perubahan yang termasuk dalam pembaruan website terbaru.';
  }
  if (!list) return;

  const latestItems = Array.isArray(latest?.items) ? latest.items : [];
  list.innerHTML = latestItems.map(item => `
    <li class="changelog-entry">
      <span class="changelog-entry-mark ${escapeText(item.type || 'improved')}" aria-hidden="true"></span>
      <div>
        <span class="changelog-type ${escapeText(item.type || 'improved')}">${escapeText(typeLabels[item.type] || 'Ditingkatkan')}</span>
        <strong>${escapeText(item.title)}</strong>
        <p>${escapeText(item.description)}</p>
      </div>
    </li>
  `).join('') || '<li class="changelog-entry"><div><strong>Belum ada rincian update</strong><p>Rincian perubahan akan tampil ketika rilis website berikutnya dibuat.</p></div></li>';
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
