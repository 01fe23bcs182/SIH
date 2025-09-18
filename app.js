/******************************
 * Utility Functions
 ******************************/
function by(id) { return document.getElementById(id); }
function getUser() { return JSON.parse(localStorage.getItem("user")); }
function setUser(u) { localStorage.setItem("user", JSON.stringify(u)); }
function clearUser() { localStorage.removeItem("user"); }

function showToast(msg) { alert(msg); }
function formatTime(t) { return new Date(t).toLocaleTimeString(); }

/******************************
 * Drill Storage
 ******************************/
function getCurrentDrill() {
  return JSON.parse(localStorage.getItem("currentDrill") || "null");
}
function writeCurrentDrill(drill) {
  localStorage.setItem("currentDrill", JSON.stringify(drill));
}
function clearCurrentDrill() {
  localStorage.removeItem("currentDrill");
}
function pushDrillResponse(drillId, resp) {
  localStorage.setItem(`drillResponse:${drillId}:${resp.userId}`, JSON.stringify(resp));
}
function getResponsesForDrill(drillId) {
  const responses = [];
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith("drillResponse:" + drillId)) {
      responses.push(JSON.parse(localStorage.getItem(k)));
    }
  }
  return responses;
}
function pushDrillReport(drill, responses) {
  const reports = JSON.parse(localStorage.getItem("drillReports") || "[]");
  reports.push({ drill, responses });
  localStorage.setItem("drillReports", JSON.stringify(reports));
}

/******************************
 * LOGIN PAGE
 ******************************/
function initLogin(){
  const form = by("loginForm");
  if(!form) return;

  form.addEventListener("submit", function(ev){
    ev.preventDefault();
    const fm = new FormData(form);
    const role = fm.get("role");
    const name = fm.get("name") || role;
    const cls = fm.get("cls") || "ClassA";
    const roll = fm.get("roll") || "";

    const user = { id: Date.now(), role, name, cls, roll };
    setUser(user);

    if(role === "student") location.href = "student.html";
    else if(role === "teacher") location.href = "teacher.html";
    else location.href = "index.html";
  });
}

/******************************
 * STUDENT DASHBOARD
 ******************************/
function initStudent(){
  const user = getUser();
  if(!user || user.role !== "student"){ location.href = "login.html"; return; }

  const greet = by("greetStudent");
  if(greet) greet.innerHTML = `<strong>${user.name}</strong> — ${user.cls}`;

  const btn = by("btnSafe");
  const curDrill = getCurrentDrill();

  function refreshAlert(){
    const cur = getCurrentDrill();
    const alertBox = by("alertBox");
    if(!alertBox) return;
    if(cur){
      alertBox.innerHTML = `<div class="card">
        <h3>${cur.type}</h3>
        <p>${cur.message}</p>
        <button id="btnSafe" class="btn btn-primary">I'm Safe</button>
      </div>`;
      by("btnSafe").onclick = ()=> {
        const resp = { drillId: cur.id, userId: user.id, name:user.name, cls:user.cls, time:Date.now() };
        pushDrillResponse(cur.id, resp);
        showToast("Marked Safe!");
        refreshAlert();
      };
    } else {
      alertBox.innerHTML = "<div class='small'>No active drills right now.</div>";
    }
  }

  refreshAlert();

  window.addEventListener("storage", function(e){
    if(e.key === "currentDrill" || (e.key && e.key.startsWith("drillResponse:"))){
      refreshAlert();
    }
  });
}

/******************************
 * TEACHER DASHBOARD
 ******************************/
const alertTemplates = {
  "Fire Drill": {
    en: "🚨 Fire drill started! Please evacuate calmly.",
    hi: "🚨 अग्नि अभ्यास शुरू! कृपया शांतिपूर्वक बाहर निकलें।",
    pa: "🚨 ਅੱਗ ਦਾ ਅਭਿਆਸ ਸ਼ੁਰੂ! ਕਿਰਪਾ ਕਰਕੇ ਸ਼ਾਂਤ ਰਹੋ ਅਤੇ ਬਾਹਰ ਨਿਕਲੋ।"
  },
  "Earthquake Drill": {
    en: "🌍 Earthquake drill! Drop, Cover, Hold & evacuate.",
    hi: "🌍 भूकंप अभ्यास! नीचे झुकें, ढकें, पकड़े रहें और बाहर निकलें।",
    pa: "🌍 ਭੂਚਾਲ ਅਭਿਆਸ! ਝੁਕੋ, ਢੱਕੋ, ਫੜ ਕੇ ਰੱਖੋ ਅਤੇ ਬਾਹਰ ਨਿਕਲੋ।"
  },
  "Flood Drill": {
    en: "🌊 Flood drill! Move to higher ground immediately.",
    hi: "🌊 बाढ़ अभ्यास! तुरंत ऊंची जगह पर जाएं।",
    pa: "🌊 ਬਾਢ ਅਭਿਆਸ! ਫੌਰਨ ਉੱਚੀ ਜਗ੍ਹਾ ਤੇ ਜਾਓ।"
  },
  "Closure Alert": {
    en: "📢 School closed today due to emergency.",
    hi: "📢 आपात स्थिति के कारण आज स्कूल बंद है।",
    pa: "📢 ਐਮਰਜੈਂਸੀ ਕਾਰਨ ਅੱਜ ਸਕੂਲ ਬੰਦ ਹੈ।"
  }
};

function initTeacher(){
  const user = getUser();
  if(!user || user.role !== "teacher"){ location.href = "login.html"; return; }

  const greet = by("greetTeacher");
  if(greet) greet.innerHTML = `<strong>${user.name}</strong> — Teacher`;

  const form = by("startDrillForm");
  const reportList = by("reportList");
  const savedReports = by("savedReports");
  const statCount = by("statCount");

  function refreshReport(){
    const cur = getCurrentDrill();
    if(!cur){
      reportList.innerHTML = '<div class="small">No drill running.</div>';
      statCount.innerText = '0';
      return;
    }
    const res = getResponsesForDrill(cur.id);
    let html = `<div><strong>${cur.type}</strong> — Class ${cur.cls} — Started ${formatTime(cur.startedAt)}</div>`;
    if(res.length === 0) html += '<div class="small">No responses yet.</div>';
    else {
      html += '<table class="table"><thead><tr><th>Name</th><th>Class</th><th>Time</th></tr></thead><tbody>';
      res.forEach(r=>{
        html += `<tr><td>${r.name}</td><td>${r.cls}</td><td>${formatTime(r.time)}</td></tr>`;
      });
      html += '</tbody></table>';
    }
    reportList.innerHTML = html;
    statCount.innerText = res.length;
  }

  // Listen for student responses
  window.addEventListener('storage', function(e){
    if(e.key && e.key.indexOf('drillResponse:') === 0) refreshReport();
    if(e.key === 'currentDrill') refreshReport();
  });

  // Start Drill
  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    const fm = new FormData(form);
    const type = fm.get('type');
    const cls = fm.get('cls') || 'ClassA';
    const lang = fm.get('lang') || 'en';
    const message = fm.get('message') || alertTemplates[type][lang];
    const drill = {
      id: `drill-${Date.now()}`,
      type, cls,
      message,
      startedBy: user.name,
      startedAt: Date.now()
    };
    writeCurrentDrill(drill);
    showToast(`Drill started: ${drill.type} (${lang.toUpperCase()})`);
    refreshReport();
  });

  // End Drill
  const btnEnd = by('btnEnd');
  if(btnEnd) btnEnd.addEventListener('click', ()=>{
    const cur = getCurrentDrill();
    if(!cur){ showToast('No active drill'); return; }
    const responses = getResponsesForDrill(cur.id);
    pushDrillReport(cur, responses);
    clearCurrentDrill();
    showToast('Drill ended & report saved');
    refreshReport();
    // show saved reports
    const reports = JSON.parse(localStorage.getItem('drillReports') || '[]');
    savedReports.innerHTML = reports.map(r =>
      `<div>${r.drill.type} (${r.drill.cls}) — ${formatTime(r.drill.startedAt)} — Responses: ${r.responses.length}</div>`
    ).join('');
  });

  refreshReport();
}

/******************************
 * QUIZ SYSTEM (Student)
 ******************************/
let currentQuiz = [];
let currentIndex = 0;
let currentScore = 0;

function startQuiz(topic) {
  currentQuiz = quizzes[topic];
  currentIndex = 0;
  currentScore = 0;
  by("quizTitle").innerText = topic.toUpperCase() + " Quiz";
  by("quizModal").style.display = "flex";
  loadQuestion();
}

function loadQuestion() {
  const q = currentQuiz[currentIndex];
  by("quizQuestion").innerText = q.q;
  let html = "";
  q.options.forEach((opt, i) => {
    html += `<label><input type="radio" name="opt" value="${i}"> ${opt}</label><br>`;
  });
  by("quizOptions").innerHTML = html;
}

function nextQuestion() {
  const choice = document.querySelector('input[name="opt"]:checked');
  if (!choice) { alert("Please select an option"); return; }
  if (parseInt(choice.value) === currentQuiz[currentIndex].answer) {
    currentScore++;
  }
  currentIndex++;
  if (currentIndex < currentQuiz.length) {
    loadQuestion();
  } else {
    alert("Quiz Finished! Score: " + currentScore + "/" + currentQuiz.length);
    localStorage.setItem("lastQuizScore", currentScore);
    closeQuiz();
  }
}

function closeQuiz() {
  by("quizModal").style.display = "none";
}
