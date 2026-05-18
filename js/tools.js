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
const mergeBtn = document.getElementById('mergeBtn');
const clearMergeBtn = document.getElementById('clearMergeBtn');
let selectedMergeFiles = [];
const renderMergeList = () => {
  mergeList.innerHTML = selectedMergeFiles.length ? selectedMergeFiles.map((file, index) => `
    <div class="file-item merge-file-item">
      <span>${index + 1}. ${file.name}</span>
      <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
      <div class="file-order-controls" aria-label="Atur urutan ${file.name}">
        <button type="button" data-merge-move="up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>Naik</button>
        <button type="button" data-merge-move="down" data-index="${index}" ${index === selectedMergeFiles.length - 1 ? 'disabled' : ''}>Turun</button>
      </div>
    </div>
  `).join('') : '<p>Belum ada PDF dipilih.</p>';
};
mergeList.addEventListener('click', event => {
  const button = event.target.closest('[data-merge-move]');
  if (!button) return;
  const index = Number(button.dataset.index);
  const direction = button.dataset.mergeMove;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= selectedMergeFiles.length) return;
  [selectedMergeFiles[index], selectedMergeFiles[targetIndex]] = [selectedMergeFiles[targetIndex], selectedMergeFiles[index]];
  renderMergeList();
});
mergeFiles.addEventListener('change', () => {
  const pickedFiles = Array.from(mergeFiles.files || []);
  selectedMergeFiles = selectedMergeFiles.concat(pickedFiles);
  mergeFiles.value = '';
  renderMergeList();
});
clearMergeBtn?.addEventListener('click', () => {
  selectedMergeFiles = [];
  mergeFiles.value = '';
  renderMergeList();
  showToast('Urutan PDF direset. Pilih ulang file sesuai urutan yang diinginkan.');
});
mergeBtn.addEventListener('click', async () => {
  const files = selectedMergeFiles;
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
    showToast('PDF berhasil digabung sesuai urutan daftar.');
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

const jpgPdfFiles = document.getElementById('jpgPdfFiles');
const jpgPdfList = document.getElementById('jpgPdfList');
const renderJpgPdfList = () => {
  const files = Array.from(jpgPdfFiles?.files || []);
  jpgPdfList.innerHTML = files.length ? files.map((file, index) => '<div class="file-item"><span>' + (index + 1) + '. ' + file.name + '</span><small>' + (file.size / 1024 / 1024).toFixed(2) + ' MB</small></div>').join('') : '<p>Belum ada gambar dipilih.</p>';
};

const readImageData = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => resolve({ dataUrl: reader.result, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

jpgPdfFiles?.addEventListener('change', renderJpgPdfList);

document.getElementById('jpgPdfBtn')?.addEventListener('click', async () => {
  const files = Array.from(jpgPdfFiles?.files || []);
  if (!files.length) return showToast('Pilih minimal satu gambar JPG/JPEG.');
  if (!window.jspdf?.jsPDF) return showToast('Library PDF belum siap. Coba ulang beberapa detik lagi.');
  const invalid = files.find(file => !/^image\/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name));
  if (invalid) return showToast('Gunakan file JPG atau JPEG saja.');

  try {
    const { jsPDF } = window.jspdf;
    const orientationSetting = document.getElementById('jpgPdfOrientation').value;
    let doc = null;
    for (const [index, file] of files.entries()) {
      const image = await readImageData(file);
      const orientation = orientationSetting === 'auto' ? (image.width >= image.height ? 'landscape' : 'portrait') : orientationSetting;
      if (!doc) doc = new jsPDF({ unit: 'mm', format: 'a4', orientation });
      else doc.addPage('a4', orientation);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;
      doc.addImage(image.dataUrl, 'JPEG', x, y, width, height, undefined, 'FAST');
      if (index === 0) doc.setProperties({ title: slug(file.name), subject: 'JPG to PDF SIPIL CARE' });
    }
    doc.save(slug(files[0].name) + (files.length > 1 ? '-and-' + (files.length - 1) + '-more' : '') + '.pdf');
    showToast(files.length + ' gambar berhasil diexport ke PDF.');
  } catch (error) {
    console.error(error);
    showToast('Gagal membuat PDF dari gambar. Pastikan file JPG tidak rusak.');
  }
});

const wordMode = document.getElementById('wordMode');
const wordPageStart = document.getElementById('wordPageStart');
const wordPageEnd = document.getElementById('wordPageEnd');
const wordLayoutMode = document.getElementById('wordLayoutMode');
const wordNote = document.getElementById('wordNote');

const updateWordPageInputs = () => {
  if (!wordMode || !wordPageStart || !wordPageEnd) return;
  const mode = wordMode.value;
  wordPageStart.disabled = mode === 'all';
  wordPageEnd.disabled = mode !== 'range';
  wordPageStart.closest('div').style.display = mode === 'all' ? 'none' : '';
  wordPageEnd.closest('div').style.display = mode === 'range' ? '' : 'none';
};

const getWordPages = totalPages => {
  const mode = wordMode.value;
  if (mode === 'all') return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Number(wordPageStart.value || 1);
  const end = mode === 'range' ? Number(wordPageEnd.value || start) : start;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) throw new Error('INVALID_RANGE');
  if (start > end) throw new Error('REVERSED_RANGE');
  if (end > totalPages) throw new Error('OUT_OF_RANGE');
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const getMedian = values => {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return 10;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
};

const getItemFontSize = item => {
  const [, b, c, d] = item.transform || [0, 0, 0, 10];
  return Math.max(6, Math.abs(d) || Math.hypot(b, c) || 10);
};

const normalizePdfText = value => String(value || '').replace(/\s+/g, ' ').trim();

const inferWordFont = (item, styles = {}) => {
  const style = styles[item.fontName] || {};
  const source = `${item.fontName || ''} ${style.fontFamily || ''}`.toLowerCase();
  const cleanName = source.replace(/^[a-z0-9]{6}\+/, '');
  let font = 'Times New Roman';
  if (/times|tnr|serif|roman/.test(cleanName)) font = 'Times New Roman';
  if (/arial|helvetica|sans/.test(cleanName)) font = 'Arial';
  if (/calibri/.test(cleanName)) font = 'Calibri';
  if (/cambria/.test(cleanName)) font = 'Cambria';
  if (/courier|mono|consolas/.test(cleanName)) font = 'Courier New';
  return {
    font,
    bold: /bold|black|heavy|semibold|demi/.test(cleanName),
    italics: /italic|oblique/.test(cleanName)
  };
};

const getRowAlignment = (row, pageWidth) => {
  const rowCenter = row.x + row.width / 2;
  if (Math.abs(rowCenter - pageWidth / 2) <= Math.max(12, pageWidth * .035) && row.width <= pageWidth * .82) return 'center';
  if (row.x > pageWidth * .56) return 'right';
  return 'left';
};

const toTwip = value => Math.max(0, Math.round(value * 20));
const toHalfPoint = value => Math.max(12, Math.min(72, Math.round(value * 2)));

const buildLayoutText = items => {
  let cursor = 0;
  return items.map((item, index) => {
    const fontSize = Math.max(item.fontSize, 8);
    const gap = Math.max(0, item.x - cursor);
    const spaces = index === 0 ? 0 : Math.max(1, Math.min(18, Math.round(gap / (fontSize * .38))));
    cursor = Math.max(cursor, item.x + item.width);
    return `${' '.repeat(spaces)}${item.text}`;
  }).join('').replace(/\s+$/g, '');
};

const extractPdfPageRows = async page => {
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const styles = content.styles || {};
  const items = content.items
    .map(item => {
      const text = normalizePdfText(item.str);
      const fontSize = getItemFontSize(item);
      const fontStyle = inferWordFont(item, styles);
      return {
        text,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        width: Math.max(item.width || text.length * fontSize * .45, fontSize * .25),
        fontSize,
        font: fontStyle.font,
        bold: fontStyle.bold,
        italics: fontStyle.italics
      };
    })
    .filter(item => item.text)
    .sort((a, b) => Math.abs(a.y - b.y) > 3 ? a.y - b.y : a.x - b.x);
  const rows = [];
  items.forEach(item => {
    const row = rows.find(entry => Math.abs(entry.y - item.y) <= Math.max(2.5, Math.min(entry.fontSize, item.fontSize) * .42));
    if (row) {
      row.items.push(item);
      row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
      row.fontSize = Math.max(row.fontSize, item.fontSize);
    } else {
      rows.push({ y: item.y, fontSize: item.fontSize, items: [item] });
    }
  });
  const normalizedRows = rows
    .map(row => {
      const sorted = row.items.sort((a, b) => a.x - b.x);
      const gaps = sorted.slice(1).map((item, index) => item.x - (sorted[index].x + sorted[index].width));
      return {
        x: Math.min(...sorted.map(item => item.x)),
        width: Math.max(...sorted.map(item => item.x + item.width)) - Math.min(...sorted.map(item => item.x)),
        y: row.y,
        fontSize: row.fontSize,
        text: sorted.map(item => item.text).join(' ').replace(/\s+([,.;:!?])/g, '$1'),
        layoutText: buildLayoutText(sorted),
        items: sorted,
        largeGaps: gaps.filter(gap => gap > row.fontSize * 1.4).length
      };
    })
    .sort((a, b) => a.y - b.y);
  return {
    rows: normalizedRows,
    width: viewport.width,
    height: viewport.height,
    left: Math.min(...normalizedRows.map(row => row.x), 36),
    right: Math.max(...normalizedRows.map(row => row.x + row.width), viewport.width - 36)
  };
};

const rowsToFlowBlocks = rows => {
  const medianFont = getMedian(rows.map(row => row.fontSize));
  const left = Math.min(...rows.map(row => row.x), 36);
  const blocks = [];
  let current = null;
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    const gap = previous ? row.y - previous.y : 999;
    const isHeading = row.fontSize > medianFont * 1.22 && row.text.length < 120;
    const isTableLike = row.largeGaps >= 2;
    const isIndented = row.x - left > 34;
    const startsNew = !current || isHeading || isTableLike || gap > medianFont * 1.75 || isIndented;
    if (startsNew) {
      current = { text: row.text, fontSize: row.fontSize, heading: isHeading, tableLike: isTableLike };
      blocks.push(current);
    } else {
      current.text += ` ${row.text}`;
    }
  });
  return blocks;
};

const pushLayoutRows = ({ children, pageData, pageNumber, isFirstPage, docx }) => {
  const { Paragraph, TextRun, AlignmentType } = docx;
  pageData.rows.forEach((row, index) => {
    const previous = pageData.rows[index - 1];
    const gapBefore = previous ? Math.max(0, row.y - previous.y - previous.fontSize) : 0;
    const alignment = getRowAlignment(row, pageData.width);
    let cursor = row.x;
    const runs = row.items.map((item, itemIndex) => {
      const gap = itemIndex === 0 ? 0 : Math.max(0, item.x - cursor);
      cursor = Math.max(cursor, item.x + item.width);
      const leading = itemIndex === 0 ? '' : ' '.repeat(Math.max(1, Math.min(12, Math.round(gap / Math.max(4, item.fontSize * .36)))));
      return new TextRun({
        text: leading + item.text,
        font: item.font,
        size: toHalfPoint(item.fontSize),
        bold: item.bold,
        italics: item.italics
      });
    });
    const leftIndent = alignment === 'left' ? Math.max(0, toTwip(row.x)) : 0;
    const paragraphOptions = {
      children: runs,
      alignment: alignment === 'center' ? (AlignmentType?.CENTER || 'center') : alignment === 'right' ? (AlignmentType?.RIGHT || 'right') : undefined,
      indent: { left: leftIndent },
      spacing: {
        before: index === 0 ? toTwip(Math.max(0, row.y - row.fontSize)) : Math.min(900, toTwip(gapBefore)),
        after: 0,
        line: Math.max(180, Math.round(row.fontSize * 24))
      }
    };
    children.push(new Paragraph({
      ...paragraphOptions
    }));
  });
};

const pushFlowRows = ({ children, pageData, pageNumber, isFirstPage, docx }) => {
  const { Paragraph, TextRun } = docx;
  rowsToFlowBlocks(pageData.rows).forEach(block => {
    children.push(new Paragraph({
      children: [new TextRun({ text: block.text, bold: block.heading, font: 'Times New Roman' })],
      spacing: { after: block.heading ? 120 : 90, line: 276 }
    }));
  });
};

const canvasToArrayBuffer = canvas => new Promise((resolve, reject) => {
  canvas.toBlob(blob => {
    if (!blob) return reject(new Error('CANVAS_EXPORT_FAILED'));
    blob.arrayBuffer().then(resolve).catch(reject);
  }, 'image/png', 1);
});

const renderPdfPageImage = async page => {
  const baseViewport = page.getViewport({ scale: 1 });
  const renderScale = Math.min(2.6, Math.max(1.8, 1800 / Math.max(baseViewport.width, baseViewport.height)));
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const imageBuffer = await canvasToArrayBuffer(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return {
    imageBuffer,
    widthPt: baseViewport.width,
    heightPt: baseViewport.height
  };
};

const buildVisualWordDoc = async ({ pdf, pages, fileName, docx }) => {
  const { Document, Paragraph, ImageRun } = docx;
  const sections = [];
  for (const [index, pageNumber] of pages.entries()) {
    wordNote.innerHTML = `<h3>Memproses PDF</h3><p>Merender halaman ${index + 1} dari ${pages.length} agar tampilan Word sama seperti PDF...</p>`;
    const page = await pdf.getPage(pageNumber);
    const pageImage = await renderPdfPageImage(page);
    const pageWidthTwip = Math.round(pageImage.widthPt * 20);
    const pageHeightTwip = Math.round(pageImage.heightPt * 20);
    const displayWidthPx = Math.round(pageImage.widthPt * 96 / 72);
    const displayHeightPx = Math.round(pageImage.heightPt * 96 / 72);
    sections.push({
      properties: {
        page: {
          size: { width: pageWidthTwip, height: pageHeightTwip },
          margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0, gutter: 0 }
        }
      },
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: new Uint8Array(pageImage.imageBuffer),
              transformation: { width: displayWidthPx, height: displayHeightPx }
            })
          ],
          spacing: { before: 0, after: 0, line: 240 },
          indent: { left: 0, right: 0 }
        })
      ]
    });
  }
  return new Document({
    creator: 'SIPIL CARE',
    title: fileName.replace(/\.pdf$/i, ''),
    description: 'PDF to Word visual SIPIL CARE',
    sections
  });
};

const buildEditableWordDoc = async ({ pdf, pages, fileName, mode, docx }) => {
  const { Document } = docx;
  const sections = [];
  let extractedLines = 0;
  for (const [index, pageNumber] of pages.entries()) {
    wordNote.innerHTML = `<h3>Memproses PDF</h3><p>Merekonstruksi halaman ${index + 1} dari ${pages.length} menjadi teks Word editable...</p>`;
    const page = await pdf.getPage(pageNumber);
    const pageData = await extractPdfPageRows(page);
    extractedLines += pageData.rows.length;
    const children = [];
    if (pageData.rows.length) {
      const payload = { children, pageData, pageNumber, isFirstPage: index === 0, docx };
      if (mode === 'flow') pushFlowRows(payload);
      else pushLayoutRows(payload);
    } else {
      children.push(new docx.Paragraph({ text: '' }));
    }
    sections.push({
      properties: {
        page: {
          size: { width: toTwip(pageData.width), height: toTwip(pageData.height) },
          margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0, gutter: 0 }
        }
      },
      children
    });
  }
  return {
    doc: new Document({
      creator: 'SIPIL CARE',
      title: fileName.replace(/\.pdf$/i, ''),
      description: 'PDF to Word editable SIPIL CARE',
      sections
    }),
    extractedLines
  };
};

wordMode?.addEventListener('change', updateWordPageInputs);
updateWordPageInputs();

document.getElementById('wordBtn')?.addEventListener('click', async () => {
  const file = document.getElementById('wordPdfFile')?.files?.[0];
  if (!file) return showToast('Pilih file PDF terlebih dahulu.');
  if (!window.pdfjsLib) return showToast('Library PDF belum siap. Coba ulang beberapa detik lagi.');
  if (!window.docx?.Document || !window.docx?.Packer) return showToast('Library Word belum siap. Coba ulang beberapa detik lagi.');

  try {
    wordNote.innerHTML = '<h3>Memproses PDF</h3><p>Menyiapkan dokumen Word...</p>';
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = getWordPages(pdf.numPages);
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } = window.docx;
    const docx = { Paragraph, TextRun, HeadingLevel, ImageRun, Document, AlignmentType };
    if (wordLayoutMode?.value === 'visual') {
      if (!ImageRun) return showToast('Library Word belum mendukung gambar. Coba refresh halaman.');
      const visualDoc = await buildVisualWordDoc({ pdf, pages, fileName: file.name, docx });
      const blob = await Packer.toBlob(visualDoc);
      downloadBlob(blob, slug(file.name.replace(/\.pdf$/i, '')) + '.docx');
      wordNote.innerHTML = `<h3>Konversi selesai</h3><p>${pages.length} halaman dirender ke Word dengan tampilan visual mengikuti PDF, termasuk font dan gambar.</p><p class="small-text">Hasil mode ini sangat mirip PDF, tetapi isi halaman menjadi gambar sehingga teks tidak diedit per huruf.</p>`;
      return showToast('PDF berhasil dikonversi ke Word.');
    }

    const { doc, extractedLines } = await buildEditableWordDoc({
      pdf,
      pages,
      fileName: file.name,
      mode: wordLayoutMode?.value === 'flow' ? 'flow' : 'editable',
      docx
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, slug(file.name.replace(/\.pdf$/i, '')) + '.docx');
    wordNote.innerHTML = `<h3>Konversi selesai</h3><p>${pages.length} halaman diproses dan ${extractedLines} baris teks menjadi Word editable dengan mode ${wordLayoutMode?.value === 'flow' ? 'paragraf' : 'mirip Word asli'}.</p><p class="small-text">Jika gambar tidak ikut pada mode editable, gunakan mode visual. PDF tidak selalu menyimpan gambar sebagai objek Word yang bisa dikembalikan.</p>`;
    showToast('PDF berhasil dikonversi ke Word.');
  } catch (error) {
    console.error(error);
    wordNote.innerHTML = '<h3>Catatan konversi</h3><p>Mode editable merekonstruksi teks menjadi Word yang bisa diedit dengan font, ukuran, alignment, dan jarak baris dari PDF. Header dan footer teks ikut terbawa sebagai teks biasa.</p><p class="small-text">PDF tidak menyimpan struktur Word asli secara utuh. Untuk gambar yang harus 100% sama, gunakan mode visual sebagai cadangan.</p>';
    if (error.message === 'OUT_OF_RANGE') return showToast('Halaman akhir melebihi jumlah halaman PDF.');
    if (error.message === 'REVERSED_RANGE') return showToast('Halaman awal tidak boleh lebih besar dari halaman akhir.');
    if (error.message === 'INVALID_RANGE') return showToast('Masukkan nomor halaman yang valid.');
    if (error.message === 'CANVAS_EXPORT_FAILED') return showToast('Gagal merender halaman PDF menjadi gambar.');
    showToast('Gagal mengubah PDF ke Word. Pastikan PDF tidak rusak atau terkunci.');
  }
});
