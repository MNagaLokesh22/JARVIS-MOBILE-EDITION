// 1. API KEY
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}
const MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];

// 2. MEMORY
let MEMORY = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
function saveMemory() {
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
}
const chat = document.getElementById('chat'), input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn'), clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn'), imgInput = document.getElementById('img-input');

MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));

// 3. GEMINI BRAIN
async function callGemini(p) {
  const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
  contents.push({ role: 'user', parts: [{ text: p }] });
  let lastErr;
  for (const m of MODELS) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: contents })
      });
      const data = await res.json();
      if (data.error) {
        lastErr = new Error(data.error.message);
        if (/high demand temporary|quota rate unavailable|deprecated/i.test(data.error.message)) continue;
        throw lastErr;
      }
      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function askGemini(p) {
  add('J.A.R.V.I.S: Thinking...', 'ai');
  try {
    const reply = await callGemini(p);
    MEMORY.push({ role: 'user', text: p });
    MEMORY.push({ role: 'model', text: reply });
    saveMemory();
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// 4. VISION (EYES)
camBtn.onclick = () => imgInput.click();
imgInput.onchange = () => {
  const file = imgInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    const q = input.value.trim() || 'What do you see? Describe briefly in Telugu or English.';
    add('YOU: [IMAGE] ' + q, 'user');
    input.value = '';
    askVision(base64, file.type, q);
  };
  reader.readAsDataURL(file);
};

async function askVision(base64, mime, q) {
  add('J.A.R.V.I.S: Analyzing image...', 'ai');
  let lastErr;
  for (const m of MODELS) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: q },
              { inline_data: { mime_type: mime, data: base64 } }
            ]
          }]
        })
      });
      const data = await res.json();
      if (data.error) {
        lastErr = new Error(data.error.message);
        if (/high demand temporary|quota|rate|unavailable|deprecated/i.test(data.error.message)) continue;
        throw lastErr;
      }
      const reply = data.candidates[0].content.parts[0].text;
      chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
      speak(reply);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + lastErr.message;
}

// 5. SPEECH & UTILS
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = new SR();
rec.lang = 'en-US';
rec.onresult = (e) => {
  const t = e.results[0][0].transcript;
  add('YOU: ' + t, 'user');
  askGemini(t);
};
micBtn.onclick = () => { rec.start(); micBtn.innerText = 'LISTENING...'; };
rec.onend = () => { micBtn.innerText = '🎙️'; };

let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
}
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(t) {
  const u = new SpeechSynthesisUtterance(t);
  u.rate = 1.05;
  u.pitch = 0.85;
  const v = voices.find(v => v.lang.startsWith('en'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

document.getElementById('send').onclick = () => {
  const t = input.value.trim();
  if (!t) return;
  add('YOU: ' + t, 'user');
  input.value = '';
  askGemini(t);
};

clearBtn.onclick = () => {
  MEMORY = [];
  saveMemory();
  chat.innerHTML = '';
  add('SYSTEM: Memory cleared.', 'ai');
};

function add(t, w) {
  const d = document.createElement('div');
  d.className = 'msg ' + w;
  d.innerText = t;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}
//  3. TOOLS (THE HANDS) 15 TOOLS =====
async function handleTools(text) {
    const t = text.toLowerCase();

    // 1. Time
    if (/\btime\b/.test(t) || t.includes('సమయం') || t.includes('time')) {
        return 'The time is ' + new Date().toLocaleTimeString() + ', Boss.';
    }

    // 2. Weather
    if (t.includes('weather') || t.includes('వాతావరణం')) {
        return await new Promise(res => {
            navigator.geolocation.getCurrentPosition(async p => {
                try {
                    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&current_weather=true`);
                    const d = await r.json();
                    res(`It is ${d.current_weather.temperature} degrees Celsius now, Boss.`);
                } catch (e) {
                    res('Weather service error, Boss.');
                }
            }, () => res('I need location permission for weather, Boss.'));
        });
    }

    // 3. Timer
    const m = t.match(/(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i);
    if ((t.includes('timer') || t.includes('టైమర్')) && m) {
        const amount = parseInt(m[1]); 
        const unit = m[2].toLowerCase();
        const factor = /^(hours?|hrs?|h)/.test(unit) ? 3600000 : /^(seconds?|secs?|s)/.test(unit) ? 1000 : 60000;
        const duration = amount * factor;
        
        setTimeout(() => { 
            if (typeof speak === 'function') {
                speak(`Timer done! ${amount} ${unit} completed.`); 
            }
        }, duration);
        
        return `Timer set for ${amount} ${unit}.`;
    }

    // 4. Translate
    if (t.includes('translate')) {
        const q = text.replace(/translate/i, '').replace(/this/i, '').trim() || 'hello';
        try {
            const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) + '&langpair=en|te');
            const d = await r.json(); 
            return 'In Telugu: ' + d.responseData.translatedText;
        } catch (e) { 
            return 'Translate error, Boss.'; 
        }
    }

    // 5. YouTube Play
    if (t.includes('play') || t.includes('యూట్యూబ్') || t.includes('youtube')) {
        // Clean up command words to extract just the search keywords
        const q = t.replace(/play/g, '').replace(/youtube/g, '').replace(/search/g, '').replace(/యూట్యూబ్/g, '').trim();
        if (q) {
            window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(q));
            return 'Searching YouTube for ' + q + ', Boss.';
        } else {
            window.open('https://www.youtube.com');
            return 'Opening YouTube, Boss.';
        }
    }

    return null; // Tool match లేకపోతే Gemini Brain కి వెళ్తుంది
}
