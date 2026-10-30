(() => {
  const fileInput = document.getElementById('unmergePdfFile');
  const splitButton = document.getElementById('unmergePdfBtn');
  const progress = document.getElementById('unmergePdfProgress');
  const status = document.getElementById('unmergePdfStatus');

  if (!fileInput || !splitButton || !progress || !status) return;

  const setStatus = message => { status.textContent = message; };
  const safeBaseName = filename => filename
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'dokumen';

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    progress.hidden = true;
    progress.value = 0;
    setStatus(file ? `File dipilih: ${file.name}` : 'Belum ada PDF dipilih.');
  });

  splitButton.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      setStatus('Pilih satu file PDF terlebih dahulu.');
      return;
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus('File yang dipilih harus berformat PDF.');
      return;
    }
    if (!window.PDFLib?.PDFDocument || !window.JSZip) {
      setStatus('Library PDF belum siap. Muat ulang halaman lalu coba lagi.');
      return;
    }

    splitButton.disabled = true;
    progress.hidden = false;
    progress.value = 0;
    setStatus('Membaca PDF...');

    try {
      const source = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
      const totalPages = source.getPageCount();
      if (!totalPages) throw new Error('PDF ini tidak memiliki halaman.');

      const zip = new window.JSZip();
      const baseName = safeBaseName(file.name);
      const digits = String(totalPages).length;

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        setStatus(`Memisahkan halaman ${pageIndex + 1} dari ${totalPages}...`);
        const pagePdf = await window.PDFLib.PDFDocument.create();
        const [page] = await pagePdf.copyPages(source, [pageIndex]);
        pagePdf.addPage(page);
        const pageNumber = String(pageIndex + 1).padStart(digits, '0');
        zip.file(`${baseName}-halaman-${pageNumber}.pdf`, await pagePdf.save());
        progress.value = Math.round(((pageIndex + 1) / totalPages) * 85);
      }

      setStatus('Menyusun file ZIP...');
      const archive = await zip.generateAsync({ type: 'blob' }, metadata => {
        progress.value = 85 + Math.round(metadata.percent * 0.15);
      });
      const url = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}-unmerge.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      progress.value = 100;
      setStatus(`${totalPages} halaman berhasil dipisahkan. ZIP sedang diunduh.`);
    } catch (error) {
      console.error('Unmerge PDF failed:', error);
      setStatus(error.message || 'PDF gagal dipisahkan. Pastikan file tidak rusak atau terkunci.');
      progress.value = 0;
    } finally {
      splitButton.disabled = false;
    }
  });
})();
