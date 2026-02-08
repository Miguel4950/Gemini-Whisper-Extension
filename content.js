let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Iconos SVG para que se vea nativo (Micrófono y Stop)
const MIC_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;
const STOP_ICON = `<svg viewBox="0 0 24 24" fill="#ff4444" width="24px" height="24px"><path d="M6 6h12v12H6z"/></svg>`;
const LOADING_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`;

const replaceMicButton = () => {
  // 1. Buscamos el micrófono nativo de Google por su etiqueta aria
  // Gemini suele usar "Usar micrófono" o "Use microphone"
  const nativeMic = document.querySelector('div[aria-label*="icrófono"], button[aria-label*="icrófono"], div[aria-label*="icrophone"]');

  // Si no existe el nativo (o ya pusimos el nuestro y borramos el nativo), paramos para no duplicar
  if (!nativeMic || document.getElementById('whisper-mic-btn')) {
    // Si el nativo existe pero NO hemos puesto el nuestro, lo ocultamos
    if (nativeMic && !document.getElementById('whisper-mic-btn')) {
      nativeMic.style.display = 'none';
    } else {
      return; 
    }
  }

  // Ocultamos el nativo
  nativeMic.style.display = 'none';

  // 2. Creamos nuestro botón
  const btn = document.createElement('div'); // Usamos div para imitar el contenedor de Google
  btn.id = 'whisper-mic-btn';
  btn.innerHTML = MIC_ICON;
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-label', 'Whisper Dictation');
  
  // 3. Copiamos estilos para que parezca nativo
  btn.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px; 
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    color: #c4c7c5; /* El gris exacto de Gemini */
    transition: background 0.2s;
    margin: 0 4px;
  `;

  // Efectos Hover
  btn.addEventListener('mouseenter', () => btn.style.backgroundColor = 'rgba(255,255,255,0.1)');
  btn.addEventListener('mouseleave', () => btn.style.backgroundColor = 'transparent');

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleRecording();
  });

  // 4. Lo insertamos EXACTAMENTE donde estaba el nativo
  // parentNode.insertBefore inserta el nuevo nodo antes del nodo de referencia (el nativo)
  if (nativeMic.parentNode) {
    nativeMic.parentNode.insertBefore(btn, nativeMic);
  }
};

const toggleRecording = async () => {
  const btn = document.getElementById('whisper-mic-btn');

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await sendToGroq(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;
      btn.innerHTML = STOP_ICON;
      btn.style.color = '#ff4444'; // Rojo al grabar
    } catch (err) {
      alert('Error: ' + err.message);
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    btn.innerHTML = LOADING_ICON; // Icono de carga
    btn.style.color = '#c4c7c5';
  }
};

const sendToGroq = async (blob) => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = () => {
    const base64data = reader.result;
    chrome.runtime.sendMessage({ action: "transcribe", audioData: base64data }, (response) => {
      const btn = document.getElementById('whisper-mic-btn');
      if (btn) btn.innerHTML = MIC_ICON;
      
      if (response && response.text) {
        insertTextToGemini(response.text);
      } else {
        console.error("Error API:", response);
        // Opcional: alertar si no hay API Key
        if (response && response.error === "No API Key found") {
           alert("¡Falta la API Key! Haz clic en el icono de la extensión y pégala.");
        }
      }
    });
  };
};

const insertTextToGemini = (text) => {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (inputArea) {
    inputArea.focus();
    document.execCommand('insertText', false, text + " ");
  }
};

// Observer más agresivo para mantener el reemplazo
const observer = new MutationObserver(() => {
  // Verificamos constantemente si el nativo reapareció o si nuestro botón desapareció
  replaceMicButton();
});

// Iniciamos
observer.observe(document.body, { childList: true, subtree: true });
replaceMicButton();