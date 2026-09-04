/* Customer review submission form. */
(function initReviewForm() {
  const form = document.getElementById('review-form');
  if (!form) return;

  const nameInput = document.getElementById('review-name');
  const orderInput = document.getElementById('review-order');
  const messageInput = document.getElementById('review-message');
  const ratingGroup = document.getElementById('review-rating');
  const confirmation = document.getElementById('review-confirmation');

  function setFieldError(fieldId, message) {
    const errorNode = form.querySelector(`[data-error-for="${fieldId}"]`);
    if (errorNode) errorNode.textContent = message || '';
    const field = document.getElementById(fieldId) || ratingGroup;
    field?.classList.toggle('is-invalid', Boolean(message));
  }

  function validate() {
    let isValid = true;

    const name = nameInput.value.trim();
    if (name.length < 2) {
      setFieldError('review-name', 'Please enter your name.');
      isValid = false;
    } else {
      setFieldError('review-name', '');
    }

    const selectedRating = form.querySelector('input[name="reviewRating"]:checked');
    if (!selectedRating) {
      setFieldError('review-rating', 'Please choose a star rating.');
      isValid = false;
    } else {
      setFieldError('review-rating', '');
    }

    const message = messageInput.value.trim();
    if (message.length < 10) {
      setFieldError('review-message', 'Please share a few more details (at least 10 characters).');
      isValid = false;
    } else {
      setFieldError('review-message', '');
    }

    return isValid;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validate()) return;

    const selectedRating = form.querySelector('input[name="reviewRating"]:checked');
    const order = orderInput.value.trim() || 'Not provided';
    const whatsappMessage = [
      'New Customer Review - Treats By Rich',
      '',
      `Name: ${nameInput.value.trim()}`,
      `Order: ${order}`,
      `Rating: ${selectedRating.value}/5 stars`,
      '',
      'Review:',
      messageInput.value.trim()
    ].join('\n');

    window.open(`https://wa.me/233538517831?text=${encodeURIComponent(whatsappMessage)}`, '_blank', 'noopener,noreferrer');

    form.reset();
    form.querySelectorAll('.field-error').forEach((node) => (node.textContent = ''));
    form.querySelectorAll('.is-invalid').forEach((node) => node.classList.remove('is-invalid'));

    if (confirmation) {
      confirmation.hidden = false;
      confirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  [nameInput, orderInput, messageInput].forEach((field) => {
    field.addEventListener('input', () => {
      if (confirmation && !confirmation.hidden) confirmation.hidden = true;
    });
  });
})();
