// CONFIGURATION D'ACCÈS INTERNE
const SETTINGS = {
    studentPass: "PROF2026",
    teacherPass: "MASTERPROF",
    duration: 20 * 60 // 20 minutes exprimées en secondes
};

let currentStudent = {};
let timer = null;
let timeLeft = SETTINGS.duration;
let isTeacherAuth = false;
let sessionData = JSON.parse(localStorage.getItem('arldelattre_eval_db')) || [];

// CREATION DU CANAL RESEAU LOCAL INTER-ONGLETS
const bc = new BroadcastChannel('arldelattre_channel');

bc.onmessage = (ev) => {
    if (ev.data && ev.data.type === 'SUBMISSION') {
        updateDatabase(ev.data.payload);
    }
};

// GESTION DU ROUTAGE DES VUES (Attaché à window pour exécution immédiate)
window.switchView = function(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    if (id === 'teacher-dashboard-view' && isTeacherAuth) {
        document.getElementById('teacher-auth-block').classList.add('hidden');
        document.getElementById('teacher-dashboard-content').classList.remove('hidden');
        renderTable();
    }
}

// VALIDATION DU LOGIN ELEVE & TIMING
window.startAssessment = function() {
    const pwd = document.getElementById('student-pwd').value;
    const ln = document.getElementById('student-lastname').value.trim();
    const fn = document.getElementById('student-firstname').value.trim();
    const cl = document.getElementById('student-class').value.trim();

    if (pwd === SETTINGS.studentPass && ln && fn && cl) {
        document.getElementById('login-error').classList.add('hidden');
        currentStudent = { nom: ln, prenom: fn, classe: cl };
        document.getElementById('display-student-identity').innerText = `${fn} ${ln.toUpperCase()}`;
        document.getElementById('display-student-class').innerText = `Classe : ${cl}`;
        switchView('student-quiz-view');
        startTimer();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

function startTimer() {
    timeLeft = SETTINGS.duration;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        let s = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('timer-box').innerText = `${m}:${s}`;
        
        if (timeLeft <= 0) { 
            clearInterval(timer); 
            submitResult(false); 
        }
    }, 1000);
}

// ENGINE DE TRAITEMENT ET CORRECTION AUTOMATIQUE DU QCM
window.submitResult = function(manual) {
    clearInterval(timer);
    if (!manual) alert("⏰ Temps écoulé ! Votre copie a été transmise.");

    let score = 0;
    let corrections = [];
    
    const schema = [
        { id: 'q1', label: "Exercice 1 (She... tennis)", correct: "plays" },
        { id: 'q2', label: "Exercice 2 (They... broccoli)", correct: "don't like" },
        { id: 'q3', label: "Exercice 3 (Interrogatif live)", correct: "Do / live" },
        { id: 'q4', label: "Exercice 4 (He... TV)", correct: "watches" },
        { id: 'q5', label: "Exercice 5 (The sun...)", correct: "rises" },
        { id: 'q6', label: "Exercice 6 (Négatif de He flies)", correct: "He doesn't fly to Paris." },
        { id: 'q7', label: "Exercice 7 (My brother... German)", correct: "studies" },
        { id: 'q8', label: "Exercice 8 (Interrogatif have)", correct: "Does / have" }
    ];

    schema.forEach(q => {
        const checkedNode = document.querySelector(`input[name="${q.id}"]:checked`);
        let studentAns = checkedNode ? checkedNode.value : "Non sélectionné";
        let isOk = (studentAns === q.correct);
        
        if (isOk) score++;
        corrections.push({ label: q.label, student: studentAns, correct: q.correct, ok: isOk });
    });

    const resultPayload = {
        ...currentStudent,
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
    const idx = sessionData.findIndex(s => s.nom.toLowerCase() === res.nom.toLowerCase() && s.prenom.toLowerCase() === res.prenom.toLowerCase());
    
    if (idx !== -1) sessionData[idx] = res; 
    else sessionData.push(res);
    
    localStorage.setItem('arldelattre_eval_db', JSON.stringify(sessionData));
    if (isTeacherAuth) renderTable();
}

function showStudentEndScreen(res) {
    document.getElementById('pdf-student-info').innerText = `${res.prenom} ${res.nom.toUpperCase()} - ${res.classe}`;
    document.getElementById('pdf-score-box').innerText = `${res.score} / 8`;
    
    let html = "";
    res.details.forEach(d => {
        html += `
        <div class="p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${d.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}">
            <div>
                <span class="font-bold text-xs uppercase block text-slate-400 mb-0.5">${d.label}</span>
                <span class="text-sm font-medium">Réponse donnée : <span class="font-bold">${d.student}</span></span>
            </div>
            ${!d.ok ? `<div class="text-xs sm:text-right font-semibold text-rose-600">Correction : <span class="underline">${d.correct}</span></div>` : '<div class="text-xs font-bold text-emerald-600">Correct</div>'}
        </div>`;
    });
    
    document.getElementById('pdf-correction-details').innerHTML = html;
    switchView('student-result-view');
    document.getElementById('quiz-form').reset();
}

// GENERATION PDF CLIENT ELEVE (FIXÉ POUR MODE LOCAL)
window.downloadIndividualPDF = function() {
    const el = document.getElementById('individual-pdf-copy');
    const studentName = currentStudent.nom ? currentStudent.nom.toUpperCase() : "ELEVE";
    const studentPre = currentStudent.prenom ? currentStudent.prenom : "";
    const filename = `Copie_PresentSimple_${studentName}_${studentPre}.pdf`;
    
    if (typeof window.html2pdf === 'undefined') {
        alert("La bibliothèque PDF rencontre un problème de chargement local.");
        return;
    }

    const opt = {
        margin: [10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: false, logging: false }, // useCORS désactivé pour file:///
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(el).save();
}

// MANAGEMENT / PANEL ENSEIGNANT
window.unlockDashboard = function() {
    const typed = document.getElementById('teacher-pass').value;
    if (typed === SETTINGS.teacherPass) {
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
    body.innerHTML = "";
    
    document.getElementById('stat-count').innerText = sessionData.length;

    if (sessionData.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400 italic">En attente de soumission...</td></tr>`;
        document.getElementById('stat-average').innerText = "0 / 8";
        return;
    }

    let sum = 0;
    sessionData.forEach(s => {
        sum += s.score;
        let badgeColor = s.score >= 6 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : (s.score >= 4 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-rose-100 text-rose-800 border-rose-200");
        
        body.innerHTML += `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition">
            <td class="p-4 font-bold text-slate-900">${s.nom.toUpperCase()} ${s.prenom}</td>
            <td class="p-4 text-blue-600 font-bold uppercase text-xs">${s.classe}</td>
            <td class="p-4 text-center"><span class="px-3 py-1 rounded-full font-black border text-xs ${badgeColor}">${s.score} / 8</span></td>
            <td class="p-4 text-right text-slate-400 text-xs font-mono">${s.time}</td>
        </tr>`;
    });
    
    document.getElementById('stat-average').innerText = `${(sum / sessionData.length).toFixed(1)} / 8`;
}

// EXPORTS PROFESSEUR : CSV
window.exportToCSV = function() {
    if (sessionData.length === 0) return alert("Aucune donnée disponible.");
    let csv = "Nom;Prenom;Classe;Score;Heure de rendu\n";
    sessionData.forEach(s => { 
        csv += `"${s.nom.toUpperCase()}";"${s.prenom}";"${s.classe}";"${s.score}";"${s.time}"\n`; 
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `Notes_Classe_Present_Simple.csv`; 
    a.click();
}

// EXPORTS PROFESSEUR : PDF GLOBAL (FIXÉ POUR MODE LOCAL)
window.exportToPDF = function() {
    if (sessionData.length === 0) return alert("Aucune donnée à exporter.");
    
    const el = document.getElementById('global-class-report');
    const pdfHeader = document.getElementById('pdf-teacher-header');
    
    pdfHeader.classList.remove('hidden');

    const opt = {
        margin: [10, 10],
        filename: 'Rapport_Classe_ARL_Delattre_PresentSimple.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: false }, // useCORS désactivé pour file:///
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(el).save().then(() => {
        pdfHeader.classList.add('hidden');
    }).catch(err => {
        console.error("Erreur PDF:", err);
        pdfHeader.classList.add('hidden');
    });
}

window.clearSession = function() {
    if (confirm("⚠️ Voulez-vous vider définitivement la liste des résultats de cette session ?")) {
        localStorage.removeItem('arldelattre_eval_db');
        sessionData = [];
        renderTable();
    }
}

window.resetToLogin = function() {
    currentStudent = {};
    document.getElementById('student-pwd').value = "";
    document.getElementById('student-lastname').value = "";
    document.getElementById('student-firstname').value = "";
    document.getElementById('student-class').value = "";
    switchView('student-login-view');
}