// TU CLAVE DE GROQ (Hardcodeada para uso personal)
const GROQ_API_KEY = "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";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "transcribe") {
    processTranscription(request.audioData, sendResponse);
    return true; // Mantiene el canal abierto para la respuesta asíncrona
  }
});

async function processTranscription(audioData, sendResponse) {
  try {
    const res = await fetch(audioData);
    const blob = await res.blob();
    
    const formData = new FormData();
    // Forzamos el nombre del archivo a webm para que Groq lo procese bien
    formData.append("file", blob, "audio.webm"); 
    formData.append("model", "whisper-large-v3-turbo"); // Usamos el modelo Turbo que es más rápido
    formData.append("language", "es"); 
    formData.append("temperature", "0");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: formData
    });

    const data = await response.json();
    
    if (data.text) {
      sendResponse({ text: data.text });
    } else {
      console.error("Groq Error:", data);
      sendResponse({ error: JSON.stringify(data) });
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    sendResponse({ error: error.message });
  }
}