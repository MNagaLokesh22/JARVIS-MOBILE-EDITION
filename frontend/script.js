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
