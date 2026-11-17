import browser from 'webextension-polyfill';
import { ExtractRequestMessage, ExtractResponseMessage, CVMakerPayload } from '../core/messages';

const scanBtn = document.getElementById('scan-btn') as HTMLButtonElement | null;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement | null;

const titleInput = document.getElementById('job-title') as HTMLInputElement | null;
const companyInput = document.getElementById('job-company') as HTMLInputElement | null;
const salaryInput = document.getElementById('job-salary') as HTMLInputElement | null;
const urlInput = document.getElementById('job-url') as HTMLInputElement | null;
const mandateInput = document.getElementById('job-mandate') as HTMLTextAreaElement | null;

scanBtn?.addEventListener('click', async () => {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) return;

    const response = (await browser.tabs.sendMessage(tab.id, {
      action: 'EXTRACT_AND_HIGHLIGHT'
    } as ExtractRequestMessage)) as ExtractResponseMessage | undefined;

    if (response) {
      if (titleInput) titleInput.value = response.title || '';
      if (companyInput) companyInput.value = response.company || '';
      if (salaryInput) salaryInput.value = response.salary || '';
      if (urlInput) urlInput.value = response.url || tab.url || '';
      if (mandateInput) mandateInput.value = response.mandate || '';

      if (sendBtn) sendBtn.style.display = 'block';
    }
  } catch (error) {
    console.error('Error during scan :', error);
  }
});

// Envoi de la fiche au serveur local CVMaker Engine (sur le port 9123)
sendBtn?.addEventListener('click', async () => {
  const payload: CVMakerPayload = {
    title: titleInput?.value || '',
    company: companyInput?.value || '',
    salary: salaryInput?.value || '',
    url: urlInput?.value || '',
    mandate: mandateInput?.value || '',
    extractedAt: new Date().toISOString()
  };

  try {
    const res = await fetch('http://127.0.0.1:9123/api/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Offer sent successfully to CVMaker !');
    } else {
      alert('Error while sending to the local server.');
    }
  } catch (error) {
    alert('Unable to contact CVMaker Engine (please make sure the desktop application is running).');
    console.error('Error while sending to the local server:', error);
  }
});