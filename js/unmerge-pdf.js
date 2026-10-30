(() => {
  const fileInput = document.getElementById('unmergePdfFile');
  const dropZone = document.getElementById('unmergeDropZone');
  const pageNumbersInput = document.getElementById('unmergePageNumbers');
  const splitButton = document.getElementById('unmergePdfBtn');
  const progress = document.getElementById('unmergePdfProgress');
  const status = document.getElementById('unmergePdfStatus');
  const pageModeInputs = Array.from(document.querySelectorAll('input[name="unmergePageMode"]'));
  const outputModeInputs = Array.from(document.querySelectorAll('input[name="unmergeOutputMode"]'));

  if (!fileInput || !pageNumbersInput || !splitButton || !progress || !status) return;

  let loadedFile = null;
  let loadedDocument = null;
  let totalPages = 0;

  const setStatus = message => { status.textContent = message; };
  const safeBaseName = filename => filename
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'dokumen';
  const selectedMode = inputs => inputs.find(input => input.checked)?.value;

  if (dropZone) {
    const isPdf = file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    ['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }));
    ['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => {
      event.preventDefault();
      dropZone.classList.remove('is-dragging');
    }));
    dropZone.addEventListener('drop', event => {
      if (fileInput.disabled) return;
      const droppedFiles = Array.from(event.dataTransfer?.files || []);
      const pdfFiles = droppedFiles.filter(isPdf);
      if (pdfFiles.length !== 1 || droppedFiles.length !== 1) {
        setStatus(pdfFiles.length > 1
          ? 'Unmerge memproses satu PDF setiap kali. Jatuhkan satu file saja.'
          : 'Jatuhkan satu file PDF yang valid.');
        return;
      }
      try {
        const transfer = new DataTransfer();
        transfer.items.add(pdfFiles[0]);
        fileInput.files = transfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (error) {
        console.error('Could not read dropped PDF:', error);
        setStatus('Browser tidak dapat membaca file yang dijatuhkan. Gunakan pemilih file di atas.');
      }
    });
  }

  const updatePageMode = () => {
    const customPages = selectedMode(pageModeInputs) === 'custom';
    pageNumbersInput.disabled = !customPages;
    pageNumbersInput.required = customPages;
  };
  pageModeInputs.forEach(input => input.addEventListener('change', updatePageMode));
  updatePageMode();

  const parsePageSelection = () => {
    if (selectedMode(pageModeInputs) === 'all') {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const value = pageNumbersInput.value.trim();
    if (!value) throw new Error('Masukkan nomor halaman yang ingin diambil.');

    const selectedPages = [];
    const seenPages = new Set();
    for (const part of value.split(',')) {
      const token = part.trim();
      const match = token.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if (!match) throw new Error('Format halaman tidak valid. Gunakan contoh 1, 3-5.');

      const start = Number(match[1]);
      const end = Number(match[2] || match[1]);
      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        throw new Error(`Nomor halaman harus berada antara 1 dan ${totalPages}.`);
      }
      if (start > end) throw new Error('Rentang halaman harus berurutan, misalnya 2-4.');

      for (let page = start; page <= end; page += 1) {
        if (seenPages.has(page)) throw new Error(`Halaman ${page} tercantum lebih dari sekali.`);
        seenPages.add(page);
        selectedPages.push(page);
      }
    }
    return selectedPages;
  };

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    loadedFile = null;
    loadedDocument = null;
    totalPages = 0;
    splitButton.disabled = true;
    progress.hidden = true;
    progress.value = 0;

    if (!file) {
      setStatus('Pilih PDF untuk melihat jumlah halamannya.');
      return;
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus('File yang dipilih harus berformat PDF.');
      return;
    }
    if (!window.PDFLib?.PDFDocument) {
      setStatus('Library PDF belum siap. Muat ulang halaman lalu coba lagi.');
      return;
    }

    setStatus('Membaca jumlah halaman PDF...');
    try {
      const document = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
      if (fileInput.files?.[0] !== file) return;
      loadedFile = file;
      loadedDocument = document;
      totalPages = document.getPageCount();
      if (!totalPages) throw new Error('PDF ini tidak memiliki halaman.');
      splitButton.disabled = false;
      setStatus(`PDF memiliki ${totalPages} halaman. Pilih halaman yang ingin diambil.`);
    } catch (error) {
      if (fileInput.files?.[0] !== file) return;
      loadedFile = null;
      loadedDocument = null;
      totalPages = 0;
      setStatus(error.message || 'PDF tidak dapat dibaca. Pastikan file tidak rusak atau terkunci.');
    }
  });

  splitButton.addEventListener('click', async () => {
    if (!loadedDocument || loadedFile !== fileInput.files?.[0]) {
      setStatus('Pilih PDF yang valid terlebih dahulu.');
      return;
    }

    let selectedPages;
    try {
      selectedPages = parsePageSelection();
    } catch (error) {
      setStatus(error.message);
      pageNumbersInput.focus();
      return;
    }
    if (!selectedPages.length) {
      setStatus('Pilih setidaknya satu halaman.');
      return;
    }

    const outputMode = selectedMode(outputModeInputs) || 'single';
    if (outputMode === 'separate' && !window.JSZip) {
      setStatus('Library ZIP belum siap. Muat ulang halaman lalu coba lagi.');
      return;
    }

    const source = loadedDocument;
    const baseName = safeBaseName(loadedFile.name);
    const digits = String(totalPages).length;
    splitButton.disabled = true;
    fileInput.disabled = true;
    progress.hidden = false;
    progress.value = 0;

    try {
      if (outputMode === 'single') {
        const resultPdf = await window.PDFLib.PDFDocument.create();
        for (const [index, pageNumber] of selectedPages.entries()) {
          setStatus(`Mengambil halaman ${pageNumber} (${index + 1} dari ${selectedPages.length})...`);
          const [page] = await resultPdf.copyPages(source, [pageNumber - 1]);
          resultPdf.addPage(page);
          progress.value = Math.round(((index + 1) / selectedPages.length) * 90);
        }

        setStatus('Menyimpan PDF hasil...');
        const result = await resultPdf.save();
        downloadFile(new Blob([result], { type: 'application/pdf' }), `${baseName}-halaman-terpilih.pdf`);
        progress.value = 100;
        setStatus(`${selectedPages.length} halaman berhasil digabung menjadi satu PDF.`);
      } else {
        const zip = new window.JSZip();
        for (const [index, pageNumber] of selectedPages.entries()) {
          setStatus(`Memisahkan halaman ${pageNumber} (${index + 1} dari ${selectedPages.length})...`);
          const pagePdf = await window.PDFLib.PDFDocument.create();
          const [page] = await pagePdf.copyPages(source, [pageNumber - 1]);
          pagePdf.addPage(page);
          const paddedPage = String(pageNumber).padStart(digits, '0');
          zip.file(`${baseName}-halaman-${paddedPage}.pdf`, await pagePdf.save());
          progress.value = Math.round(((index + 1) / selectedPages.length) * 85);
        }

        setStatus('Menyusun ZIP...');
        const archive = await zip.generateAsync({ type: 'blob' }, metadata => {
          progress.value = 85 + Math.round(metadata.percent * 0.15);
        });
        downloadFile(archive, `${baseName}-halaman-terpisah.zip`);
        progress.value = 100;
        setStatus(`${selectedPages.length} file PDF berhasil disiapkan dalam ZIP.`);
      }
    } catch (error) {
      console.error('Unmerge PDF failed:', error);
      setStatus(error.message || 'PDF gagal diproses. Pastikan file tidak rusak atau terkunci.');
      progress.value = 0;
    } finally {
      splitButton.disabled = false;
      fileInput.disabled = false;
    }
  });

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
