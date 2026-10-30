(() => {
  const dropZone = document.getElementById('mergeDropZone');
  const fileInput = document.getElementById('mergeFiles');
  const dropStatus = document.getElementById('mergeDropStatus');
  if (!dropZone || !fileInput || !dropStatus) return;

  let dragDepth = 0;
  const isPdf = file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  dropZone.addEventListener('dragenter', event => {
    event.preventDefault();
    dragDepth += 1;
    dropZone.classList.add('is-dragging');
  });

  dropZone.addEventListener('dragover', event => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });

  dropZone.addEventListener('dragleave', event => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropZone.classList.remove('is-dragging');
  });

  dropZone.addEventListener('drop', event => {
    event.preventDefault();
    dragDepth = 0;
    dropZone.classList.remove('is-dragging');

    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    const pdfFiles = droppedFiles.filter(isPdf);
    const rejectedCount = droppedFiles.length - pdfFiles.length;
    if (!pdfFiles.length) {
      dropStatus.textContent = 'Tidak ada PDF yang dijatuhkan. Gunakan file berformat PDF.';
      return;
    }

    try {
      const transfer = new DataTransfer();
      pdfFiles.forEach(file => transfer.items.add(file));
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      dropStatus.textContent = `${pdfFiles.length} PDF ditambahkan ke daftar${rejectedCount ? `; ${rejectedCount} file non-PDF dilewati` : ''}. Seret atau pilih file lain dari folder berbeda untuk menambahkannya.`;
    } catch (error) {
      console.error('Could not add dropped PDFs:', error);
      dropStatus.textContent = 'Browser tidak dapat membaca file yang dijatuhkan. Gunakan pemilih file di bawah.';
    }
  });
})();
