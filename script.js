// BANQUE DE DONNÉES DE L'APPLICATION (MULTI-BILANS)
const QUIZZES_DATABASE = {
    "present_simple": {
        title: "Le Présent Simple",
        schema: [
            { id: 'q1', label: "Exercice 1 (She... tennis)", text: "1. She ______ tennis every Tuesday.", options: ["play", "plays", "playing"], correct: "plays" },
            { id: 'q2', label: "Exercice 2 (They... broccoli)", text: "2. They ______ broccoli.", options: ["doesn't like", "don't like", "not like"], correct: "don't like" },
            { id: 'q3', label: "Exercice 3 (Interrogatif live)", text: "3. ______ you ______ in London?", options: ["Do / live", "Does / live", "Do / lives"], correct: "Do / live" },
            { id: 'q4', label: "Exercice 4 (He... TV)", text: "4. He ______ TV in the evening.", options: ["watchs", "watches", "watch"], correct: "watches" },
            { id: 'q5', label: "Exercice 5 (The sun...)", text: "5. Choose the correct form: \"The sun ______ in the east.\"", options: ["rise", "rises", "rising"], correct: "rises" },
            { id: 'q6', label: "Exercice 6 (Négatif)", text: "6. What is the negative form of: \"He flies to Paris.\"?", options: ["He doesn't fly to Paris.", "He don't fly to Paris.", "He doesn't flies to Paris."], correct: "He doesn't fly to Paris." },
            { id: 'q7', label: "Exercice 7 (My brother...)", text: "7. My brother ______ German at school.", options: ["studys", "studies", "study"], correct: "studies" },
            { id: 'q8', label: "Exercice 8 (Interrogatif have)", text: "8. ______ she ______ a dog?", options: ["Do / have", "Does / has", "Does / have"], correct: "Does / have" }
        ]
    },
    "vocabulaire_u1": {
        title: "Vocabulaire — Unité 1",
        schema: [
            { id: 'q1', label: "Exercice 1 (Cat)", text: "1. Quel est le mot anglais pour : un Chat ?", options: ["a dog", "a cat", "a bird"], correct: "a cat" },
            { id: 'q2', label: "Exercice 2 (Book)", text: "2. Quel est le mot français pour : a book ?", options: ["un cahier", "un stylo", "un livre"], correct: "un livre" },
            { id: 'q3', label: "Exercice 3 (Apple)", text: "3. Complétez : An ______ a day keeps the doctor away.", options: ["banana", "orange", "apple"], correct: "apple" },
            { id: 'q4', label: "Exercice 4 (Stylo)", text: "4. Traduire : un stylo", options: ["a pencil", "a pen", "a ruler"], correct: "a pen" },
            { id: 'q5', label: "Exercice 5 (Couleur)", text: "5. Quelle couleur obtient-on en mélangeant \"blue and yellow\" ?", options: ["purple", "green", "orange"], correct: "green" },
            { id: 'q6', label: "Exercice 6 (Chiffre)", text: "6. Épelez correctement le chiffre : 12", options: ["twelve", "twelv", "twelf"], correct: "twelve" },
            { id: 'q7', label: "Exercice 7 (Jour)", text: "7. Quel jour vient juste après \"Thursday\" ?", options: ["Wednesday", "Friday", "Saturday"], correct: "Friday" },
            { id: 'q8', label: "Exercice 8 (Contraire)", text: "8. Quel est l'antonyme de \"Hot\" ?", options: ["warm", "cold", "dry"], correct: "cold" }
        ]
    }
};

const SETTINGS = {
    studentPass: "PROF2026",
    teacherPass: "MASTERPROF",
    duration: 20 * 60
};

let currentStudent = {};
let activeQuizKey = "present_simple";
let timer = null;
let timeLeft = SETTINGS.duration;
let isTeacherAuth = false;
let sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];

const bc = new BroadcastChannel('arldelattre_channel');

bc.onmessage = (ev) => {
    if (!ev.data) return;
    if (ev.data.type === 'SUBMISSION') {
        updateDatabase(ev.data.payload);
    } else if (ev.data.type === 'CHEAT_WARNING' && isTeacherAuth) {
        logTricheAlert(ev.data.payload);
    }
};

// INITIALISATION DROPDOWNS MULTI-BILANS
window.addEventListener('DOMContentLoaded', () => {
    const studentSelect = document.getElementById('student-quiz-select');
    const teacherFilter = document.getElementById('teacher-quiz-filter');
    
    let optionsHtml = "";
    Object.keys(QUIZZES_DATABASE).forEach(key => {
        optionsHtml += `<option value="${key}">${QUIZZES_DATABASE[key].title}</option>`;
    });
    
    if(studentSelect) studentSelect.innerHTML = optionsHtml;
    if(teacherFilter) teacherFilter.innerHTML = optionsHtml;
});

// ROUTAGE DES ÉCRANS
window.switchView = function(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    if (id === 'teacher-dashboard-view' && isTeacherAuth) {
        document.getElementById('teacher-auth-block').classList.add('hidden');
        document.getElementById('teacher-dashboard-content').classList.remove('hidden');
        renderTable();
    }
}

// ALERTE ANTI-FERMETURE ET FOCUS TRICHE
window.addEventListener('beforeunload', (e) => {
    if (timeLeft > 0 && timeLeft < SETTINGS.duration && currentStudent.nom) {
        e.preventDefault();
        e.returnValue = '';
    }
});

window.addEventListener('blur', () => {
    if (currentStudent.nom && timeLeft > 0 && timeLeft < SETTINGS.duration) {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        bc.postMessage({ type: 'CHEAT_WARNING', payload: { ...currentStudent, time: timestamp } });
    }
});

function logTricheAlert(student) {
    const box = document.getElementById('triche-alert-box');
    const logs = document.getElementById('triche-logs');
    box.classList.remove('hidden');
    
    const p = document.createElement('p');
    p.innerText = `⚠️ [${student.time}] Élève ${student.prenom} ${student.nom.toUpperCase()} (${student.classe}) a quitté l'onglet d'évaluation !`;
    logs.appendChild(p);

    // Marquer l'élève dans la session courante
    const idx = sessionData.findIndex(s => s.nom === student.nom && s.prenom === student.prenom);
    if(idx !== -1) {
        sessionData[idx].tricheDetectee = true;
        renderTable();
    }
}

// DEBUT DE L'EPREUVE ET RENDU DYNAMIQUE
window.startAssessment = function() {
    const pwd = document.getElementById('student-pwd').value;
    const ln = document.getElementById('student-lastname').value.trim();
    const fn = document.getElementById('student-firstname').value.trim();
    const cl = document.getElementById('student-class').value.trim();
    activeQuizKey = document.getElementById('student-quiz-select').value;

    if (pwd === SETTINGS.studentPass && ln && fn && cl) {
        document.getElementById('login-error').classList.add('hidden');
        currentStudent = { nom: ln, prenom: fn, classe: cl, tricheDetectee: false };
        
        document.getElementById('header-topic-badge').innerText = `📝 ${QUIZZES_DATABASE[activeQuizKey].title}`;
        document.getElementById('display-student-identity').innerText = `${fn} ${ln.toUpperCase()}`;
        document.getElementById('display-student-class').innerText = `Classe : ${cl}`;
        
        generateQuizForm();
        switchView('student-quiz-view');
        startTimer();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

function generateQuizForm() {
    const form = document.getElementById('quiz-form');
    let html = "";
    
    QUIZZES_DATABASE[activeQuizKey].schema.forEach(q => {
        html += `
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm avoid-break">
            <p class="font-bold text-slate-800 mb-3">${q.text}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 font-medium">`;
        q.options.forEach(opt => {
            html += `
                <label class="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="radio" name="${q.id}" value="${opt}" onchange="updateProgressBar()" class="w-4 h-4 text-blue-600"> ${opt}
                </label>`;
        });
        html += `</div></div>`;
    });
    form.innerHTML = html;
    updateProgressBar();
}

// INDICATEUR DE PROGRESSION VISUELLE
window.updateProgressBar = function() {
    const total = QUIZZES_DATABASE[activeQuizKey].schema.length;
    const answered = new Set();
    document.querySelectorAll('#quiz-form input[type="radio"]:checked').forEach(i => answered.add(i.name));
    
    const pct = Math.round((answered.size / total) * 100);
    document.getElementById('progress-bar').style.width = `${pct}%`;
    document.getElementById('progress-text').innerText = `${answered.size} / ${total} complété(s)`;
}

// MANAGEMENT DU COMPTE A REBOURS THERMIQUE
function startTimer() {
    timeLeft = SETTINGS.duration;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        let s = (timeLeft % 60).toString().padStart(2, '0');
        
        const timerBox = document.getElementById('timer-box');
        timerBox.innerText = `${m}:${s}`;
        
        // Changement de couleur thermique
        let ratio = timeLeft / SETTINGS.duration;
        if (timeLeft <= 120) { // Moins de 2 minutes : Rouge clignotant
            timerBox.className = "text-2xl font-mono font-black bg-red-500 text-white px-4 py-2 rounded-xl animate-pulse";
        } else if (ratio <= 0.5) { // Moins de 50% du temps : Orange
            timerBox.className = "text-2xl font-mono font-black bg-amber-500 text-white px-4 py-2 rounded-xl";
        } else {
            timerBox.className = "text-2xl font-mono font-black bg-emerald-500 text-white px-4 py-2 rounded-xl";
        }

        if (timeLeft <= 0) { 
            clearInterval(timer); 
            submitResult(false); 
        }
    }, 1000);
}

// VALIDATION ET DOUBLE CONFIRMATION DE RENDU
window.submitResult = function(manual) {
    if (manual) {
        const confirmRendu = confirm("❓ Souhaitez-vous valider et verrouiller définitivement votre copie ?");
        if (!confirmRendu) return;
    }
    
    clearInterval(timer);
    let score = 0;
    let corrections = [];
    
    QUIZZES_DATABASE[activeQuizKey].schema.forEach(q => {
        const checkedNode = document.querySelector(`input[name="${q.id}"]:checked`);
        let studentAns = checkedNode ? checkedNode.value : "Non sélectionné";
        let isOk = (studentAns === q.correct);
        
        if (isOk) score++;
        corrections.push({ id: q.id, label: q.label, student: studentAns, correct: q.correct, ok: isOk });
    });

    const resultPayload = {
        ...currentStudent,
        quizKey: activeQuizKey,
        quizTitle: QUIZZES_DATABASE[activeQuizKey].title,
        score: score,
        details: corrections,
        time: new Date().toLocaleTimeString('fr-FR')
    };

    bc.postMessage({ type: 'SUBMISSION', payload: resultPayload });
    updateDatabase(resultPayload);
    showStudentEndScreen(resultPayload);
}

function updateDatabase(res) {
    sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];
    const idx = sessionData.findIndex(s => s.nom.toLowerCase() === res.nom.toLowerCase() && s.prenom.toLowerCase() === res.prenom.toLowerCase() && s.quizKey === res.quizKey);
    
    if (idx !== -1) {
        // Préserver le flag triche si déjà levé localement
        if(sessionData[idx].tricheDetectee) res.tricheDetectee = true;
        sessionData[idx] = res; 
    } else {
        sessionData.push(res);
    }
    
    localStorage.setItem('arldelattre_eval_db', JSON.stringify(sessionData));
    if (isTeacherAuth) renderTable();
}

function showStudentEndScreen(res) {
    document.getElementById('pdf-student-info').innerText = `${res.prenom} ${res.nom.toUpperCase()} - ${res.classe}`;
    document.getElementById('pdf-bilan-title').innerText = `ARL Delattre — Bilan : ${res.quizTitle}`;
    document.getElementById('pdf-score-box').innerText = `${res.score} / 8`;
    
    let html = "";
    res.details.forEach(d => {
        html += `
        <div class="p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 avoid-break ${d.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}">
            <div>
                <span class="font-bold text-xs uppercase block text-slate-400 mb-0.5">${d.label}</span>
                <span class="text-sm font-medium">Réponse donnée : <span class="font-bold">${d.student}</span></span>
            </div>
            ${!d.ok ? `<div class="text-xs sm:text-right font-semibold text-rose-600">Correction : <span class="underline">${d.correct}</span></div>` : '<div class="text-xs font-bold text-emerald-600">Correct</div>'}
        </div>`;
    });
    
    document.getElementById('pdf-correction-details').innerHTML = html;
    switchView('student-result-view');
}

window.downloadIndividualPDF = function() {
    const el = document.getElementById('individual-pdf-copy');
    const filename = `Copie_${activeQuizKey}_${currentStudent.nom.toUpperCase()}.pdf`;
    
    window.html2pdf().set({
        margin: [10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: false, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(el).save();
}

// MANAGEMENT ENSEIGNANT & CALCULS STATISTIQUES AVANCÉS
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

function renderTable() {
    const body = document.getElementById('teacher-table-body');
    if (!body) return;
    
    sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];
    const filterKey = document.getElementById('teacher-quiz-filter').value;
    
    const filteredData = sessionData.filter(s => s.quizKey === filterKey);
    body.innerHTML = "";
    
    document.getElementById('stat-count').innerText = filteredData.length;

    if (filteredData.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 italic">Aucune copie enregistrée pour ce bilan...</td></tr>`;
        document.getElementById('stat-average').innerText = "0 / 8";
        document.getElementById('exercise-stats-grid').innerHTML = "";
        return;
    }

    let sum = 0;
    // Initialisation du compteur pour les statistiques par exercice
    let exerciseSuccessMap = {};
    QUIZZES_DATABASE[filterKey].schema.forEach(q => exerciseSuccessMap[q.id] = 0);

    filteredData.forEach(s => {
        sum += s.score;
        let tricheBadge = s.tricheDetectee ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded border border-amber-300 ml-2 animate-pulse">⚠️ focus perdu</span>` : `<span class="text-emerald-600 text-xs">✓ OK</span>`;
        let badgeColor = s.score >= 6 ? "bg-emerald-100 text-emerald-800" : (s.score >= 4 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800");
        
        // Parcourir le détail de chaque réponse pour l'analyse par item
        s.details.forEach(d => { if(d.ok) exerciseSuccessMap[d.id]++; });

        body.innerHTML += `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition avoid-break">
            <td class="p-4 font-bold text-slate-900">${s.nom.toUpperCase()} ${s.prenom}</td>
            <td class="p-4 text-blue-600 font-bold uppercase text-xs">${s.classe}</td>
            <td class="p-4 text-center"><span class="px-3 py-1 rounded-full font-black border text-xs ${badgeColor}">${s.score} / 8</span></td>
            <td class="p-4 font-semibold text-xs">${tricheBadge}</td>
            <td class="p-4 text-right text-slate-400 text-xs font-mono">${s.time}</td>
        </tr>`;
    });
    
    document.getElementById('stat-average').innerText = `${(sum / filteredData.length).toFixed(1)} / 8`;

    // RENDU DES CALCULS AVANCÉS (TAUX DE RÉUSSITE PAR EXERCICE)
    let statsHtml = "";
    QUIZZES_DATABASE[filterKey].schema.forEach(q => {
        let countCorrect = exerciseSuccessMap[q.id] || 0;
        let pct = Math.round((countCorrect / filteredData.length) * 100);
        statsHtml += `
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
            <span class="text-[11px] uppercase font-bold text-slate-400 block">${q.label}</span>
            <span class="text-lg font-black text-slate-800 block mt-0.5">${pct}%</span>
            <span class="text-[10px] text-slate-500 block">(${countCorrect} / ${filteredData.length} élèves)</span>
        </div>`;
    });
    document.getElementById('exercise-stats-grid').innerHTML = statsHtml;
}

window.exportToCSV = function() {
    const filterKey = document.getElementById('teacher-quiz-filter').value;
    const filteredData = sessionData.filter(s => s.quizKey === filterKey);
    
    if (filteredData.length === 0) return alert("Aucune donnée disponible.");
    
    let csv = "Nom;Prenom;Classe;Score;Alerte Focus;Heure\n";
    filteredData.forEach(s => { 
        csv += `"${s.nom.toUpperCase()}";"${s.prenom}";"${s.classe}";"${s.score}";"${s.tricheDetectee ? 'OUI' : 'NON'}";"${s.time}"\n`; 
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `Notes_${filterKey}.csv`; 
    a.click();
}

window.exportToPDF = function() {
    const filterKey = document.getElementById('teacher-quiz-filter').value;
    const filteredData = sessionData.filter(s => s.quizKey === filterKey);
    if (filteredData.length === 0) return alert("Aucune donnée à exporter.");
    
    const el = document.getElementById('global-class-report');
    const pdfHeader = document.getElementById('pdf-teacher-header');
    
    document.getElementById('pdf-teacher-active-quiz').innerText = `Bilan : ${QUIZZES_DATABASE[filterKey].title}`;
    pdfHeader.classList.remove('hidden');

    window.html2pdf().set({
        margin: [12, 12],
        filename: `Rapport_Classe_${filterKey}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(el).save().then(() => {
        pdfHeader.classList.add('hidden');
    }).catch(err => {
        pdfHeader.classList.add('hidden');
    });
}

window.clearSession = function() {
    if (confirm("⚠️ Voulez-vous vider définitivement la liste des résultats ?")) {
        localStorage.removeItem('arldelattre_eval_db');
        sessionData = [];
        renderTable();
        document.getElementById('triche-alert-box').classList.add('hidden');
        document.getElementById('triche-logs').innerHTML = "";
    }
}

window.resetToLogin = function() {
    currentStudent = {};
    timeLeft = SETTINGS.duration;
    document.getElementById('student-pwd').value = "";
    document.getElementById('student-lastname').value = "";
    document.getElementById('student-firstname').value = "";
    document.getElementById('student-class').value = "";
    switchView('student-login-view');
}