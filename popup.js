document.getElementById('saveBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  if (apiKey) {
    chrome.storage.local.set({ groqApiKey: apiKey }, () => {
      document.getElementById('status').textContent = 'Guardado. Recarga la página de Gemini.';
    });
  }
});