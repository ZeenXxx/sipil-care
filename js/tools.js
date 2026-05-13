const tabs = document.querySelectorAll('[data-tool-tab]');
const panels = document.querySelectorAll('.tool-panel');
const toast = document.getElementById('toast');

const showToast = message => {
  if (!toast) return alert(message);
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
};

const slug = value => String(value || 'sipil-care-file').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sipil-care-file';
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
const setActiveTool = id => {
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.toolTab === id));
  panels.forEach(panel => panel.classList.toggle('active', panel.id === 'tool-' + id));
};
tabs.forEach(tab => tab.addEventListener('click', () => { const id = tab.dataset.toolTab; setActiveTool(id); history.replaceState(null, '', '#' + id); }));
const initial = location.hash.replace('#', '');
if (initial && document.getElementById('tool-' + initial)) setActiveTool(initial);

const sup2 = String.fromCharCode(178);
const sup3 = String.fromCharCode(179);
const conversions = {
  length: { label: 'Panjang', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, ft: 0.3048 } },
  area: { label: 'Luas', units: { ['mm' + sup2]: 0.000001, ['cm' + sup2]: 0.0001, ['m' + sup2]: 1, ha: 10000, ['km' + sup2]: 1000000 } },
  volume: { label: 'Volume', units: { liter: 0.001, ['m' + sup3]: 1, ['cm' + sup3]: 0.000001, ['yd' + sup3]: 0.764554858 } },
  force: { label: 'Gaya', units: { N: 1, kN: 1000, kgf: 9.80665, tonf: 9806.65 } },
  pressure: { label: 'Tekanan / Tegangan', units: { Pa: 1, kPa: 1000, MPa: 1000000, ['N/mm' + sup2]: 1000000, ['kg/cm' + sup2]: 98066.5 } },
  rebar: { label: 'Berat besi tulangan', units: { 'D8 kg/m': 0.395, 'D10 kg/m': 0.617, 'D12 kg/m': 0.888, 'D13 kg/m': 1.042, 'D16 kg/m': 1.58, 'D19 kg/m': 2.23, 'D22 kg/m': 2.98, 'D25 kg/m': 3.85 } }
};
const conversionType = document.getElementById('conversionType');
const fromUnit = document.getElementById('fromUnit');
const toUnit = document.getElementById('toUnit');
const conversionValue = document.getElementById('conversionValue');
const conversionResult = document.getElementById('conversionResult');
const populateOptions = select => { select.innerHTML = Object.entries(conversions).map(([key, item]) => '<option value="' + key + '">' + item.label + '</option>').join(''); };
const populateUnits = () => { const selected = conversions[conversionType.value]; const options = Object.keys(selected.units).map(unit => '<option>' + unit + '</option>').join(''); fromUnit.innerHTML = options; toUnit.innerHTML = options; if (toUnit.options[1]) toUnit.value = toUnit.options[1].value; };
const formatNumber = number => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(number);
const convert = () => {
  const selected = conversions[conversionType.value];
  const value = Number(conversionValue.value);
  if (!Number.isFinite(value)) return showToast('Masukkan nilai angka yang valid.');
  const result = (value * selected.units[fromUnit.value]) / selected.units[toUnit.value];
  conversionResult.innerHTML = '<span>Hasil</span><strong>' + formatNumber(result) + ' ' + toUnit.value + '</strong><p>' + formatNumber(value) + ' ' + fromUnit.value + ' = ' + formatNumber(result) + ' ' + toUnit.value + '</p>';
};
populateOptions(conversionType); populateUnits(); convert();
conversionType.addEventListener('change', () => { populateUnits(); convert(); });
document.getElementById('convertBtn').addEventListener('click', convert);
[fromUnit, toUnit, conversionValue].forEach(input => input.addEventListener('input', convert));

document.getElementById('exportForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!window.jspdf?.jsPDF) return showToast('Library PDF belum siap. Coba ulang beberapa detik lagi.');
  const title = document.getElementById('pdfTitle').value.trim();
  const author = document.getElementById('pdfAuthor').value.trim();
  const content = document.getElementById('pdfContent').value.trim();
  if (!title || !content) return showToast('Judul dan isi dokumen wajib diisi.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const maxWidth = 174;
  let y = 22;
  doc.setTextColor(15, 77, 58); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(title, margin, y); y += 10;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(99, 115, 109); doc.text('SIPIL CARE' + (author ? ' - ' + author : '') + ' - ' + new Date().toLocaleDateString('id-ID'), margin, y); y += 14;
  doc.setTextColor(23, 35, 31); doc.setFontSize(11);
  doc.splitTextToSize(content, maxWidth).forEach(line => { if (y > 276) { doc.addPage(); y = 22; } doc.text(line, margin, y); y += 7; });
  doc.setFontSize(9); doc.setTextColor(99, 115, 109); doc.text('Generated by SIPIL CARE Tools', margin, 288);
  doc.save(slug(title) + '.pdf');
  showToast('PDF berhasil dibuat.');
});

const mergeFiles = document.getElementById('mergeFiles');
const mergeList = document.getElementById('mergeList');
const renderMergeList = () => {
  const files = Array.from(mergeFiles.files || []);
  mergeList.innerHTML = files.length ? files.map((file, index) => '<div class="file-item"><span>' + (index + 1) + '. ' + file.name + '</span><small>' + (file.size / 1024 / 1024).toFixed(2) + ' MB</small></div>').join('') : '<p>Belum ada PDF dipilih.</p>';
};
mergeFiles.addEventListener('change', renderMergeList);
document.getElementById('mergeBtn').addEventListener('click', async () => {
  const files = Array.from(mergeFiles.files || []);
  if (files.length < 2) return showToast('Pilih minimal dua file PDF untuk digabung.');
  if (!window.PDFLib?.PDFDocument) return showToast('Library PDF merger belum siap. Coba ulang beberapa detik lagi.');
  try {
    const mergedPdf = await window.PDFLib.PDFDocument.create();
    for (const file of files) {
      const pdf = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    downloadBlob(new Blob([await mergedPdf.save()], { type: 'application/pdf' }), 'sipil-care-merged.pdf');
    showToast('PDF berhasil digabung.');
  } catch (error) { console.error(error); showToast('Gagal menggabungkan PDF. Pastikan file tidak rusak atau terkunci.'); }
});

const imagePreview = document.getElementById('imagePreview');
const imageMode = document.getElementById('imageMode');
const imagePageStart = document.getElementById('imagePageStart');
const imagePageEnd = document.getElementById('imagePageEnd');
if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const updateImagePageInputs = () => {
  const mode = imageMode.value;
  imagePageStart.disabled = mode === 'all';
  imagePageEnd.disabled = mode !== 'range';
  imagePageStart.closest('div').style.display = mode === 'all' ? 'none' : '';
  imagePageEnd.closest('div').style.display = mode === 'range' ? '' : 'none';
};

const getImagePages = totalPages => {
  const mode = imageMode.value;
  if (mode === 'all') return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Number(imagePageStart.value || 1);
  const end = mode === 'range' ? Number(imagePageEnd.value || start) : start;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) throw new Error('INVALID_RANGE');
  if (start > end) throw new Error('REVERSED_RANGE');
  if (end > totalPages) throw new Error('OUT_OF_RANGE');
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

imageMode.addEventListener('change', updateImagePageInputs);
updateImagePageInputs();

document.getElementById('imageBtn').addEventListener('click', async () => {
  const file = document.getElementById('imagePdfFile').files?.[0];
  const scale = Number(document.getElementById('imageScale').value || 1.75);
  if (!file) return showToast('Pilih file PDF terlebih dahulu.');
  if (!window.pdfjsLib) return showToast('Library PDF to image belum siap. Coba ulang beberapa detik lagi.');
  try {
    imagePreview.innerHTML = '<p>Memuat PDF...</p>';
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = getImagePages(pdf.numPages);
    imagePreview.innerHTML = '<p>Memproses ' + pages.length + ' halaman PDF...</p>';
    const rendered = [];
    for (const pageNumber of pages) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const url = canvas.toDataURL('image/png');
      rendered.push('<article class="pdf-image-item"><img src="' + url + '" alt="Preview halaman PDF ' + pageNumber + '"><div><strong>Halaman ' + pageNumber + '</strong><a class="download-link" href="' + url + '" download="' + slug(file.name) + '-page-' + pageNumber + '.png">Download PNG</a></div></article>');
    }
    imagePreview.innerHTML = '<div class="pdf-image-results">' + rendered.join('') + '</div>';
    showToast(pages.length + ' halaman PDF berhasil dikonversi.');
  } catch (error) {
    console.error(error);
    imagePreview.innerHTML = '<p>Preview gambar akan muncul di sini.</p>';
    if (error.message === 'OUT_OF_RANGE') return showToast('Halaman akhir melebihi jumlah halaman PDF.');
    if (error.message === 'REVERSED_RANGE') return showToast('Halaman awal tidak boleh lebih besar dari halaman akhir.');
    if (error.message === 'INVALID_RANGE') return showToast('Masukkan nomor halaman yang valid.');
    showToast('Gagal mengubah PDF ke gambar.');
  }
});
