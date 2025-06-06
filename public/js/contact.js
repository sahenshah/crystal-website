document.querySelector('.contact-form').onsubmit = async function(e) {
  e.preventDefault();
  const sendBtn = this.querySelector('button[type="submit"]');
  sendBtn.disabled = true;
  sendBtn.classList.add('sending');
  sendBtn.textContent = 'Sending...';

  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, message })
  });

  if (res.ok) {
    showPopup('Message sent! Thank you for contacting us.');
    this.reset();
  } else {
    showPopup('Failed to send message. Please try again later.');
  }
  sendBtn.disabled = false;
  sendBtn.classList.remove('sending');
  sendBtn.textContent = 'Send';
};

function showPopup(message) {
  // Remove existing popup if present
  const oldPopup = document.getElementById('contact-popup');
  if (oldPopup) oldPopup.remove();

  const popup = document.createElement('div');
  popup.id = 'contact-popup';
  popup.textContent = message;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add('show');
  }, 10);

  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 300);
  }, 3000);
}