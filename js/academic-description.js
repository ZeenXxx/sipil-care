const descriptionModal = document.getElementById('academicDescriptionModal');
const descriptionTitle = document.getElementById('academicDescriptionTitle');
const descriptionContent = document.getElementById('academicDescriptionContent');
let descriptionTrigger = null;

function closeAcademicDescription() {
  if (!descriptionModal || descriptionModal.hidden) return;
  descriptionModal.hidden = true;
  document.body.classList.remove('academic-description-open');
  descriptionTrigger?.focus();
}

document.addEventListener('click', event => {
  const closeButton = event.target.closest('[data-close-academic-description]');
  if (closeButton) {
    closeAcademicDescription();
    return;
  }

  const trigger = event.target.closest('[data-academic-read-more]');
  if (!trigger || !descriptionModal || !descriptionTitle || !descriptionContent) return;
  const card = trigger.closest('.academic-description-card');
  if (!card) return;

  descriptionTrigger = trigger;
  descriptionTitle.textContent = card.querySelector('.academic-description-title')?.textContent?.trim() || 'Deskripsi';
  descriptionContent.textContent = card.querySelector('.academic-description-full')?.textContent?.trim() || '';
  descriptionModal.hidden = false;
  document.body.classList.add('academic-description-open');
  descriptionModal.querySelector('[data-close-academic-description]')?.focus();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeAcademicDescription();
});
