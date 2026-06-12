// BANQUE DE DONNÉES DE L'APPLICATION
const QUIZZES_DATABASE = {
    "present_simple": {
        title: "Le Présent Simple (Grammaire)",
        schema: [
            { id: 'q1', label: "Question 1", text: "She ______ tennis every Tuesday.", options: ["play", "plays", "playing"], correct: "plays" },
            { id: 'q2', label: "Question 2", text: "They ______ broccoli.", options: ["doesn't like", "don't like", "not like"], correct: "don't like" },
            { id: 'q3', label: "Question 3", text: "______ you ______ in London?", options: ["Do / live", "Does / live", "Do / lives"], correct: "Do / live" },
            { id: 'q4', label: "Question 4", text: "He ______ TV in the evening.", options: ["watchs", "watches", "watch"], correct: "watches" },
            { id: 'q5', label: "Question 5", text: "\"The sun ______ in the east.\"", options: ["rise", "rises", "rising"], correct: "rises" },
            { id: 'q6', label: "Question 6", text: "Negative form of: \"He flies to Paris.\"?", options: ["He doesn't fly to Paris.", "He don't fly to Paris.", "He doesn't flies to Paris."], correct: "He doesn't fly to Paris." },
            { id: 'q7', label: "Question 7", text: "My brother ______ German at school.", options: ["studys", "studies", "study"], correct: "studies" },
            { id: 'q8', label: "Question 8", text: "______ she ______ a dog?", options: ["Do / have", "Does / has", "Does / have"], correct: "Does / have" }
        ]
    },
    "comprehension_lecture": {
        title: "Reading : The New Assistant (Lecture)",
        readingText: "Tom is the new office assistant. He starts his work at 8:00 AM every morning. He answers phone calls, prepares coffee, and organizes files on the computer. His boss, Mr. Green, is very happy because Tom is fast and organized. At 12:30 PM, Tom eats a sandwich in the park.",
        schema: [
            { id: 'l1', label: "Question 1", text: "What is Tom's job?", options: ["Teacher", "Office assistant", "Manager"], correct: "Office assistant" },
            { id: 'l2', label: "Question 2", text: "What time does he start his work?", options: ["7:30 AM", "8:00 AM", "9:00 AM"], correct: "8:00 AM" },
            { id: 'l3', label: "Question 3", text: "Who is Tom's boss?", options: ["Mr. Green", "Mr. Kestelyn", "Mr. Smith"], correct: "Mr. Green" },
            { id: 'l4', label: "Question 4", text: "Why is the boss happy?", options: ["Tom is late", "Tom is fast and organized", "Tom prepares sandwiches"], correct: "Tom is fast and organized" },
            { id: 'l5', label: "Question 5", text: "Where does Tom have his lunch?", options: ["In the cafeteria", "In the office", "In the park"], correct: "In the park" },
            { id: 'l6', label: "Question 6", text: "What does Tom drink or make?", options: ["Tea", "Coffee", "Juice"], correct: "Coffee" },
            { id: 'l7', label: "Question 7", text: "What does Tom organize?", options: ["Books", "Files on the computer", "Meetings"], correct: "Files on the computer" },
            { id: 'l8', label: "Question 8", text: "What does he eat at 12:30 PM?", options: ["A pizza", "A sandwich", "A salad"], correct: "A sandwich" }
        ]
    },
    "comprehension_audition": {
        title: "Listening : Missing the Train (Audition)",
        audioUrl: "https://www.w3schools.com/html/horse.mp3", // Remplacer par votre .mp3 d'anglais
        schema: [
            { id: 'a1', label: "Question 1", text: "What is the main topic of the conversation?", options: ["A lost passport", "Missing a train", "Buying a car"], correct: "Missing a train" },
            { id: 'a2', label: "Question 2", text: "Where are the speakers going?", options: ["Brussels", "London", "Paris"], correct: "London" },
            { id: 'a3', label: "Question 3", text: "What time was the train supposed to leave?", options: ["14:15", "14:45", "15:00"], correct: "14:45" },
            { id: 'a4', label: "Question 4", text: "Why did they miss it?", options: ["Traffic jam", "Over-sleeping", "Wrong station"], correct: "Traffic jam" },
            { id: 'a5', label: "Question 5", text: "How much is the new ticket?", options: ["£20", "£35", "£50"], correct: "£35" },
            { id: 'a6', label: "Question 6", text: "When is the next available train?", options: ["In 30 minutes", "In one hour", "Tomorrow"], correct: "In one hour" },
            { id: 'a7', label: "Question 7", text: "How do they feel?", options: ["Angry", "Stressed", "Happy"], correct: "Stressed" },
            { id: 'a8', label: "Question 8", text: "What do they decide to do while waiting?", options: ["Go shopping", "Drink a coffee", "Read a book"], correct: "Drink a coffee" }
        ]
    }
};

const SETTINGS = {
    studentPass: "PROF2026",
    teacherPass: "MASTERPROF",
    durationNormal: 20 * 60,
    durationTiersTemps: 27 * 60,
    evalMode: "entrainement" // Par défaut "entrainement" ou "examen"
};

let currentStudent = {};
let activeQuizKey = "present_simple";
let shuffledQuestions = [];
let timer = null;
let timeLeft = SETTINGS.durationNormal;
let isTeacherAuth = false;
let sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];
let studentOutputPayload = null;

// GESTIONNAIRE DE LECTURE AUDIO SÉCURISÉ (MAX 3 ECOUTES)
let audioListensLeft = 3;
let isAudioPlayingTracking = false;

const bc = new BroadcastChannel('arldelattre_channel');
bc.onmessage = (ev) => {
    if (!ev.data) return;
    if (ev.data.type === 'SUBMISSION') updateDatabase(ev.data.payload);
    if (ev.data.type === 'CHEAT_WARNING' && isTeacherAuth) logTricheAlert(ev.data.payload);
};

window.addEventListener('DOMContentLoaded', () => {
    const studentSelect = document.getElementById('student-quiz-select');
    const teacherFilter = document.getElementById('teacher-quiz-filter');
    let html = "";
    Object.keys(QUIZZES_DATABASE).forEach(k => { html += `<option value="${k}">${QUIZZES_DATABASE[k].title}</option>`; });
    if(studentSelect) studentSelect.innerHTML = html;
    if(teacherFilter) teacherFilter.innerHTML = html;
    if(document.getElementById('teacher-mode-toggle')) document.getElementById('teacher-mode-toggle').value = SETTINGS.evalMode;
});

window.switchView = function(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if (id === 'teacher-dashboard-view' && isTeacherAuth) {
        document.getElementById('teacher-auth-block').classList.add('hidden');
        document.getElementById('teacher-dashboard-content').classList.remove('hidden');
        renderTable();
    }
}

// CHANGEMENT DE MODE GLOBAL DEPUIS L'INTERFACE PROF
window.changeEvalMode = function(mode) {
    SETTINGS.evalMode = mode;
    alert(`Configuration modifiée : Mode ${mode.toUpperCase()} actif.`);
}

// ANTI-TRICHE : DETECTION CHANGEMENT D'ONGLET
window.addEventListener('blur', () => {
    if (currentStudent.nom && timeLeft > 0 && timeLeft < SETTINGS.durationNormal) {
        bc.postMessage({ type: 'CHEAT_WARNING', payload: { ...currentStudent, time: new Date().toLocaleTimeString('fr-FR') } });
    }
});

function logTricheAlert(student) {
    const box = document.getElementById('triche-alert-box');
    const logs = document.getElementById('triche-logs');
    if(box) box.classList.remove('hidden');
    if(logs) {
        const p = document.createElement('p');
        p.innerText = `⚠️ [${student.time}] L'élève ${student.prenom} ${student.nom.toUpperCase()} (${student.classe}) a changé d'onglet !`;
        logs.appendChild(p);
    }
    sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];
    const idx = sessionData.findIndex(s => s.nom.toLowerCase() === student.nom.toLowerCase() && s.prenom.toLowerCase() === student.prenom.toLowerCase() && s.quizKey === activeQuizKey);
    if(idx !== -1) {
        sessionData[idx].tricheDetectee = true;
        localStorage.setItem('arldelattre_eval_db', JSON.stringify(sessionData));
        renderTable();
    }
}

// DÉMARRAGE EXAMEN
window.startAssessment = function() {
    const pwd = document.getElementById('student-pwd').value;
    const ln = document.getElementById('student-lastname').value.trim();
    const fn = document.getElementById('student-firstname').value.trim();
    const cl = document.getElementById('student-class').value.trim();
    const isTiersTemps = document.getElementById('student-tierstemps').checked;
    activeQuizKey = document.getElementById('student-quiz-select').value;

    if (pwd === SETTINGS.studentPass && ln && fn && cl) {
        document.getElementById('login-error').classList.add('hidden');
        currentStudent = { nom: ln, prenom: fn, classe: cl, tricheDetectee: false, tiersTemps: isTiersTemps };
        
        document.getElementById('header-topic-badge').innerText = `📝 ${QUIZZES_DATABASE[activeQuizKey].title}`;
        document.getElementById('display-student-identity').innerText = `${fn} ${ln.toUpperCase()} ${isTiersTemps ? '⏱️(TT)':''}`;
        document.getElementById('display-student-class').innerText = `Classe : ${cl}`;
        
        timeLeft = isTiersTemps ? SETTINGS.durationTiersTemps : SETTINGS.durationNormal;
        
        buildQuizDOM();
        switchView('student-quiz-view');
        startTimer();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

// MIXAGE ALÉATOIRE CONTRE LA TRICHE (SHUFFLING)
function shuffleArray(arr) {
    let copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildQuizDOM() {
    const mediaContainer = document.getElementById('quiz-media-support');
    const form = document.getElementById('quiz-form');
    const quizData = QUIZZES_DATABASE[activeQuizKey];
    
    mediaContainer.innerHTML = "";
    form.innerHTML = "";

    if (quizData.readingText) {
        mediaContainer.innerHTML = `<div class="bg-amber-50 border border-amber-200 p-5 rounded-xl font-serif text-slate-800 leading-relaxed shadow-sm"><strong>📖 Texte support de lecture :</strong><p class="mt-2 select-none">${quizData.readingText}</p></div>`;
    }
    
    // INTEGRATION DU LECTEUR AUDIO SECURISÉ (VERROU A 3 ECOUTES MAX)
    if (quizData.audioUrl) {
        audioListensLeft = 3;
        isAudioPlayingTracking = false;
        mediaContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-100 p-5 rounded-xl shadow-sm flex flex-col items-center gap-3">
            <span class="font-bold text-sm text-blue-900 w-full text-left">🎧 Contrôle Audio (Maximum 3 écoutes complètes — Avance rapide bloquée) :</span>
            <audio id="hidden-audio-player" src="${quizData.audioUrl}"></audio>
            <button type="button" id="audio-custom-btn" onclick="controlAudioSecure()" class="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition cursor-pointer shadow">
                ▶️ Lancer l'écoute (3 restantes)
            </button>
        </div>`;
        
        setTimeout(() => {
            const player = document.getElementById('hidden-audio-player');
            if(player) {
                player.addEventListener('play', () => {
                    if(!isAudioPlayingTracking) {
                        isAudioPlayingTracking = true;
                        audioListensLeft--;
                    }
                });
                player.addEventListener('ended', () => {
                    isAudioPlayingTracking = false;
                    const btn = document.getElementById('audio-custom-btn');
                    if(audioListensLeft > 0) {
                        btn.innerText = `▶️ Relancer l'écoute (${audioListensLeft} restantes)`;
                        btn.className = "bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition cursor-pointer shadow";
                    } else {
                        btn.innerText = "❌ Nombre maximal d'écoutes atteint";
                        btn.disabled = true;
                        btn.className = "bg-slate-300 text-slate-500 font-bold px-6 py-2.5 rounded-xl text-sm cursor-not-allowed shadow-none";
                    }
                });
            }
        }, 100);
    }

    // Mélange complet anti-copie (Questions + Réponses)
    shuffledQuestions = shuffleArray(quizData.schema).map(q => {
        return { ...q, options: shuffleArray(q.options) };
    });

    let html = "";
    shuffledQuestions.forEach((q, index) => {
        html += `
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm avoid-break">
            <p class="font-bold text-slate-800 mb-3"><span class="text-blue-600">${index + 1}.</span> ${q.text}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 font-medium">`;
        q.options.forEach(opt => {
            html += `
                <label class="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer transition">
                    <input type="radio" name="${q.id}" value="${opt}" onchange="updateProgressBar()" class="w-4 h-4 text-blue-600"> ${opt}
                </label>`;
        });
        html += `</div></div>`;
    });
    form.innerHTML = html;
    updateProgressBar();
}

window.controlAudioSecure = function() {
    const player = document.getElementById('hidden-audio-player');
    const btn = document.getElementById('audio-custom-btn');
    if(!player) return;

    if(player.paused) {
        player.play();
        btn.innerText = "⏸️ Mettre en Pause l'écoute";
        btn.className = "bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition cursor-pointer shadow";
    } else {
        player.pause();
        btn.innerText = `▶️ Reprendre (${audioListensLeft} restantes)`;
        btn.className = "bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition cursor-pointer shadow";
    }
}

window.updateProgressBar = function() {
    const total = shuffledQuestions.length;
    const answered = new Set();
    document.querySelectorAll('#quiz-form input[type="radio"]:checked').forEach(i => answered.add(i.name));
    const pct = total > 0 ? Math.round((answered.size / total) * 100) : 0;
    document.getElementById('progress-bar').style.width = `${pct}%`;
    document.getElementById('progress-text').innerText = `${answered.size} / ${total} complété(s)`;
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        let s = (timeLeft % 60).toString().padStart(2, '0');
        const box = document.getElementById('timer-box');
        box.innerText = `${m}:${s}`;
        
        if (timeLeft <= 120) box.className = "text-2xl font-mono font-black bg-red-500 text-white px-4 py-2 rounded-xl animate-pulse";
        else if (timeLeft <= (currentStudent.tiersTemps ? SETTINGS.durationTiersTemps : SETTINGS.durationNormal) / 2) box.className = "text-2xl font-mono font-black bg-amber-500 text-white px-4 py-2 rounded-xl";
        else box.className = "text-2xl font-mono font-black bg-emerald-500 text-white px-4 py-2 rounded-xl";

        if (timeLeft <= 0) { clearInterval(timer); submitResult(false); }
    }, 1000);
}

// GENERATEUR D'APPRECIATIONS AUTOMATIQUES
function getAutomaticComment(score) {
    if (score === 8) return "Excellent ! Maîtrise parfaite des objectifs.";
    if (score >= 6) return "Très bon travail. L'ensemble est bien assimilé.";
    if (score >= 4) return "Résultats moyens. Des révisions sont nécessaires.";
    return "Objectifs non atteints. Des lacunes importantes subsistent.";
}

// CORRECTION ET DOUBLE CONFIRMATION
window.submitResult = function(manual) {
    if (manual && !confirm("❓ Souhaitez-vous verrouiller et envoyer votre copie définitive à Mr Kestelyn ?")) return;
    
    clearInterval(timer);
    let score = 0;
    let log = [];
    const baseQuiz = QUIZZES_DATABASE[activeQuizKey];

    baseQuiz.schema.forEach(q => {
        const input = document.querySelector(`input[name="${q.id}"]:checked`);
        let ans = input ? input.value : "Non sélectionné";
        let ok = (ans === q.correct);
        if (ok) score++;
        log.push({ id: q.id, label: q.label, student: ans, correct: q.correct, ok: ok });
    });

    studentOutputPayload = {
        ...currentStudent,
        quizKey: activeQuizKey,
        quizTitle: baseQuiz.title,
        score: score,
        details: log,
        appreciation: getAutomaticComment(score),
        time: new Date().toLocaleTimeString('fr-FR')
    };

    bc.postMessage({ type: 'SUBMISSION', payload: studentOutputPayload });
    updateDatabase(studentOutputPayload);
    
    // GESTION DU MODE EXAMEN VS ENTRAÎNEMENT POUR L'ÉLÈVE
    const card = document.getElementById('individual-pdf-copy');
    const neutralMsg = document.getElementById('exam-mode-neutral-message');
    const pdfBtn = document.getElementById('student-pdf-btn');

    if (SETTINGS.evalMode === "examen") {
        card.classList.add('hidden');
        pdfBtn.classList.add('hidden');
        neutralMsg.classList.remove('hidden');
    } else {
        neutralMsg.classList.add('hidden');
        card.classList.remove('hidden');
        pdfBtn.classList.remove('hidden');
        
        // Remplissage de la correction
        document.getElementById('pdf-student-info').innerText = `${studentOutputPayload.prenom} ${studentOutputPayload.nom.toUpperCase()} - ${studentOutputPayload.classe}`;
        document.getElementById('pdf-bilan-title').innerText = `ARL Delattre — Bilan : ${studentOutputPayload.quizTitle}`;
        document.getElementById('pdf-score-box').innerText = `${score} / 8`;
        
        let html = "";
        log.forEach(d => {
            html += `
            <div class="p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 avoid-break ${d.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}">
                <div><span class="font-bold text-xs uppercase block text-slate-400 mb-0.5">${d.label}</span><span class="text-sm font-medium">Saisi : <b>${d.student}</b></span></div>
                ${!d.ok ? `<div class="text-xs sm:text-right font-semibold text-rose-600">Correction : <span class="underline">${d.correct}</span></div>` : '<div class="text-xs font-bold text-emerald-600">Correct</div>'}
            </div>`;
        });
        document.getElementById('pdf-correction-details').innerHTML = html;
    }
    
    switchView('student-result-view');
}

function updateDatabase(res) {
    sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];
    const idx = sessionData.findIndex(s => s.nom.toLowerCase() === res.nom.toLowerCase() && s.prenom.toLowerCase() === res.prenom.toLowerCase() && s.quizKey === res.quizKey);
    if (idx !== -1) {
        if(sessionData[idx].tricheDetectee) res.tricheDetectee = true;
        sessionData[idx] = res;
    } else {
        sessionData.push(res);
    }
    localStorage.setItem('arldelattre_eval_db', JSON.stringify(sessionData));
    if (isTeacherAuth) renderTable();
}

window.downloadIndividualPDF = function() {
    const el = document.getElementById('individual-pdf-copy');
    window.html2pdf().set({ margin: [10, 10], filename: `Copie_${activeQuizKey}_${currentStudent.nom.toUpperCase()}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 1.5, useCORS: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }}).from(el).save();
}

window.downloadStudentJSON = function() {
    if (!studentOutputPayload) return;
    const blob = new Blob([JSON.stringify(studentOutputPayload, null, 2)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Note_${studentOutputPayload.classe}_${studentOutputPayload.nom.toUpperCase()}.json`;
    a.click();
}

// PANNEAU ENSEIGNANT & CONSOLIDATION
window.unlockDashboard = function() {
    if (document.getElementById('teacher-pass').value === SETTINGS.teacherPass) {
        isTeacherAuth = true;
        document.getElementById('teacher-auth-block').classList.add('hidden');
        document.getElementById('teacher-dashboard-content').classList.remove('hidden');
        renderTable();
    } else {
        document.getElementById('teacher-auth-error').classList.remove('hidden');
    }
}

window.importStudentJSONs = function(event) {
    const files = event.target.files;
    if (!files.length) return;
    let loadedCount = 0;
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.nom && parsed.quizKey) { updateDatabase(parsed); loadedCount++; }
                if (loadedCount === files.length) { alert(`🔌 Moteur Consolidateur : ${loadedCount} copies fusionnées avec succès.`); renderTable(); }
            } catch (err) { console.error("Erreur d'importation"); }
        };
        reader.readAsText(files[i]);
    }
}

function renderTable() {
    const body = document.getElementById('teacher-table-body');
    if (!body) return;
    sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];
    const filterKey = document.getElementById('teacher-quiz-filter').value;
    const filtered = sessionData.filter(s => s.quizKey === filterKey);
    body.innerHTML = "";
    document.getElementById('stat-count').innerText = filtered.length;

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 italic">Aucune note reçue. Veuillez importer les fichiers .json récoltés.</td></tr>`;
        document.getElementById('stat-average').innerText = "0 / 8";
        document.getElementById('exercise-stats-grid').innerHTML = "";
        return;
    }

    let sum = 0, successMap = {};
    QUIZZES_DATABASE[filterKey].schema.forEach(q => successMap[q.id] = 0);

    filtered.forEach(s => {
        sum += s.score;
        let warning = s.tricheDetectee ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded border border-amber-300 animate-pulse">⚠️ Changement d'onglet</span>` : `<span class="text-emerald-600 text-xs">✓ Conforme</span>`;
        let color = s.score >= 6 ? "bg-emerald-100 text-emerald-800" : (s.score >= 4 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800");
        let txtAppreciation = s.appreciation || getAutomaticComment(s.score);
        s.details.forEach(d => { if(d.ok) successMap[d.id]++; });

        body.innerHTML += `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition avoid-break">
            <td class="p-4 font-bold text-slate-900">${s.nom.toUpperCase()} ${s.prenom} ${s.tiersTemps ? '⏱️ (TT)':''}</td>
            <td class="p-4 text-blue-600 font-bold uppercase text-xs">${s.classe}</td>
            <td class="p-4 text-center"><span class="px-3 py-1 rounded-full font-black border text-xs ${color}">${s.score} / 8</span></td>
            <td class="p-4 text-xs italic text-slate-500 max-w-xs truncate" title="${txtAppreciation}">${txtAppreciation}</td>
            <td class="p-4 font-semibold text-xs">${warning}</td>
            <td class="p-4 text-right text-slate-400 text-xs font-mono">${s.time}</td>
        </tr>`;
    });

    document.getElementById('stat-average').innerText = `${(sum / filtered.length).toFixed(1)} / 8`;

    let statsHtml = "";
    QUIZZES_DATABASE[filterKey].schema.forEach(q => {
        let ok = successMap[q.id] || 0;
        let pct = Math.round((ok / filtered.length) * 100);
        statsHtml += `<div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center"><span class="text-[11px] uppercase font-bold text-slate-400 block">${q.label}</span><span class="text-lg font-black text-slate-800 block mt-0.5">${pct}%</span><span class="text-[10px] text-slate-500 block">(${ok}/${filtered.length} élèves)</span></div>`;
    });
    document.getElementById('exercise-stats-grid').innerHTML = statsHtml;
}

window.exportToCSV = function() {
    const filterKey = document.getElementById('teacher-quiz-filter').value;
    const filtered = sessionData.filter(s => s.quizKey === filterKey);
    if (!filtered.length) return alert("Aucune donnée.");
    let csv = "Nom;Prenom;Classe;Score;TiersTemps;Appreciation;Alerte Focus;Heure\n";
    filtered.forEach(s => { csv += `"${s.nom.toUpperCase()}";"${s.prenom}";"${s.classe}";"${s.score}";"${s.tiersTemps?'OUI':'NON'}";"${s.appreciation || getAutomaticComment(s.score)}";"${s.tricheDetectee?'OUI':'NON'}";"${s.time}"\n`; });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Notes_${filterKey}.csv`; a.click();
}

window.exportToPDF = function() {
    const filterKey = document.getElementById('teacher-quiz-filter').value;
    const filtered = sessionData.filter(s => s.quizKey === filterKey);
    if (!filtered.length) return alert("Aucune donnée.");
    
    const el = document.getElementById('global-class-report');
    const header = document.getElementById('pdf-teacher-header');
    document.getElementById('pdf-teacher-active-quiz').innerText = `Bilan : ${QUIZZES_DATABASE[filterKey].title} (${SETTINGS.evalMode.toUpperCase()})`;
    
    header.classList.remove('hidden');
    window.html2pdf().set({ margin: [10, 10], filename: `Rapport_Classe_${filterKey}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 1.5, useCORS: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }}).from(el).save().then(() => { header.classList.add('hidden'); }).catch(() => { header.classList.add('hidden'); });
}

window.clearSession = function() {
    if (confirm("⚠️ Vider définitivement la liste des résultats ?")) {
        localStorage.removeItem('arldelattre_eval_db');
        sessionData = [];
        renderTable();
    }
}

window.resetToLogin = function() {
    currentStudent = {};
    studentOutputPayload = null;
    document.getElementById('quiz-wrapper').classList.remove('dys-mode');
    document.getElementById('student-pwd').value = "";
    document.getElementById('student-lastname').value = "";
    document.getElementById('student-firstname').value = "";
    document.getElementById('student-class').value = "";
    document.getElementById('student-tierstemps').checked = false;
    switchView('student-login-view');
}