/* app.js — consolidated, debug-friendly, auto-init
   Replace your current app.js with this file.
*/

'use strict';

/* -------------------------
   Helper utilities
   ------------------------- */
function by(id){ return document.getElementById(id); }
function log(...args){ console.log('[SIH]', ...args); }

function safeParse(v){
  try{ return JSON.parse(v); } catch(e){ return null; }
}

/* user helper */
function setUser(u){ localStorage.setItem('user', JSON.stringify(u)); log('setUser', u); }
function getUser(){ return safeParse(localStorage.getItem('user')); }
function clearUser(){ localStorage.removeItem('user'); log('cleared user'); }

/* storage keys */
function writeCurrentDrill(drill){ localStorage.setItem('currentDrill', JSON.stringify(drill)); log('writeCurrentDrill', drill); }
function getCurrentDrill(){ return safeParse(localStorage.getItem('currentDrill')); }
function clearCurrentDrill(){ localStorage.removeItem('currentDrill'); log('clearCurrentDrill'); }

function pushDrillResponse(drillId, resp){ 
  const key = `drillResponse:${drillId}:${resp.userId}`;
  localStorage.setItem(key, JSON.stringify(resp));
  // tiny ping so other tabs can react
  localStorage.setItem(`ping:${Date.now()}`, '1');
  log('pushDrillResponse', key, resp);
}

function getResponsesForDrill(drillId){
  const out = [];
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.startsWith(`drillResponse:${drillId}:`)){
      out.push(safeParse(localStorage.getItem(k)));
    }
  }
  return out;
}

function pushDrillReport(drill, responses){
  const reports = safeParse(localStorage.getItem('drillReports')) || [];
  reports.push({ drill, responses });
  localStorage.setItem('drillReports', JSON.stringify(reports));
  log('pushDrillReport', drill.id, responses.length);
}

/* simple toast (use native alert for compatibility) */
function showMsg(text){ try{ /* small non-blocking toast? */ window.alert(text); } catch(e){ console.log(text); } }

/* -------------------------
   Login page
   ------------------------- */
function initLogin(){
  const form = by('loginForm');
  if(!form){ log('initLogin: no loginForm found'); return; }
  log('initLogin start');

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    const fm = new FormData(form);
    const role = (fm.get('role')||'').toString();
    const name = (fm.get('name')||'').toString().trim() || role;
    const cls = (fm.get('cls')||'').toString().trim() || 'ClassA';
    const roll = (fm.get('roll')||'').toString().trim() || '';

    const user = { id: 'u-'+Date.now(), role, name, cls, roll };
    setUser(user);

    log('login submit', user);

    // redirect based on role — ensure admin handled
    if(role === 'student') location.href = 'student.html';
    else if(role === 'teacher') location.href = 'teacher.html';
    else if(role === 'admin') location.href = 'admin.html';
    else location.href = 'index.html';
  });
}

/* -------------------------
   Student page
   ------------------------- */
function initStudent(){
  const user = getUser();
  if(!user || user.role !== 'student'){ log('initStudent: not student -> redirecting'); location.href = 'login.html'; return; }
  log('initStudent for', user.name);

  const greet = by('greetStudent');
  if(greet) greet.innerHTML = `<strong>${user.name}</strong> — ${user.cls}`;

  function refreshAlertBox(){
    const box = by('alertBox');
    if(!box) return;
    const cur = getCurrentDrill();
    if(!cur){
      box.innerHTML = `<div class="small">No active drills right now.</div>`;
      return;
    }
    // only show if the drill is for this class (or for "all")
    if(cur.cls && cur.cls !== user.cls && cur.cls !== 'ALL') {
      box.innerHTML = `<div class="small">No active drills for your class.</div>`;
      return;
    }
    box.innerHTML = `<div class="card">
      <h3>${cur.type}</h3>
      <p>${cur.message || ''}</p>
      <div style="margin-top:10px"><button id="btnSafe" class="btn btn-primary">I'm Safe ✅</button></div>
    </div>`;
    const btn = by('btnSafe');
    if(btn) btn.onclick = ()=>{
      const resp = { drillId: cur.id, userId: user.id, name:user.name, cls:user.cls, time: Date.now() };
      pushDrillResponse(cur.id, resp);
      showMsg('Marked safe. Good job!');
      refreshAlertBox();
    };
  }

  // initial
  refreshAlertBox();
  // also refresh leaderboard if exists
  refreshLeaderboard();

  // respond to storage events from teacher tab
  window.addEventListener('storage', (e)=>{
    if(!e.key) return;
    if(e.key === 'currentDrill' || e.key.startsWith('drillResponse:') || e.key.startsWith('ping:') ) {
      log('student storage event', e.key);
      refreshAlertBox();
    }
    if(e.key === 'studentScores'){
      refreshLeaderboard();
    }
  });
}

/* -------------------------
   Teacher page
   ------------------------- */
const alertTemplates = {
  "Fire Drill": { en:"🚨 Fire drill started! Evacuate calmly.", hi:"🚨 अग्नि अभ्यास शुरू!", pa:"🚨 ਅੱਗ ਦਾ ਅਭਿਆਸ ਸ਼ੁਰੂ!" },
  "Earthquake Drill": { en:"🌍 Earthquake drill! Drop, Cover & Hold.", hi:"🌍 भूकंप अभ्यास!", pa:"🌍 ਭੂਚਾਲ ਅਭਿਆਸ!" },
  "Flood Drill": { en:"🌊 Flood drill! Move to higher ground.", hi:"🌊 बाढ़ अभ्यास!", pa:"🌊 ਬਾਢ ਅਭਿਆਸ!" },
  "Closure Alert": { en:"📢 School closed due to emergency.", hi:"📢 आपात के चलते स्कूल बंद है।", pa:"📢 ਐਮਰਜੈਂਸੀ ਕਾਰਨ ਸਕੂਲ ਬੰਦ ਹੈ।" }
};

function initTeacher(){
  const user = getUser();
  if(!user || user.role !== 'teacher'){ log('initTeacher: not teacher -> redirecting'); location.href = 'login.html'; return; }
  log('initTeacher for', user.name);

  const greet = by('greetTeacher'); if(greet) greet.innerHTML = `<strong>${user.name}</strong> — Teacher`;
  const form = by('startDrillForm');
  const rpt = by('reportList');
  const saved = by('savedReports');
  const statCount = by('statCount');

  function refreshReport(){
    const cur = getCurrentDrill();
    if(!cur){ if(rpt) rpt.innerHTML = '<div class="small">No drill running.</div>'; if(statCount) statCount.innerText='0'; return; }
    const res = getResponsesForDrill(cur.id);
    let html = `<div><strong>${cur.type}</strong> — Class ${cur.cls} — Started ${new Date(cur.startedAt).toLocaleString()}</div>`;
    if(res.length === 0) html += '<div class="small">No responses yet.</div>';
    else {
      html += '<table class="table"><thead><tr><th>Name</th><th>Class</th><th>Time</th></tr></thead><tbody>';
      res.forEach(r => { html += `<tr><td>${r.name}</td><td>${r.cls}</td><td>${new Date(r.time).toLocaleString()}</td></tr>`; });
      html += '</tbody></table>';
    }
    if(rpt) rpt.innerHTML = html;
    if(statCount) statCount.innerText = res.length;
  }

  window.addEventListener('storage', (e)=>{
    if(!e.key) return;
    if(e.key.startsWith('drillResponse:') || e.key === 'currentDrill' || e.key.startsWith('ping:')){
      log('teacher storage event', e.key);
      refreshReport();
    }
  });

  // Start drill
  if(form){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      const fm = new FormData(form);
      const type = fm.get('type') || 'Fire Drill';
      const cls = fm.get('cls') || 'ClassA';
      const lang = fm.get('lang') || 'en';
      let message = fm.get('message') || alertTemplates[type] && (alertTemplates[type][lang] || alertTemplates[type].en) || '';
      const drill = { id: 'drill-'+Date.now(), type, cls, message, startedBy: user.name, startedAt: Date.now() };
      writeCurrentDrill(drill);
      showMsg('Drill started: '+type);
      refreshReport();
    });
  }

  // End drill
  const btnEnd = by('btnEnd');
  if(btnEnd) btnEnd.addEventListener('click', ()=>{
    const cur = getCurrentDrill();
    if(!cur){ showMsg('No active drill to end'); return; }
    const responses = getResponsesForDrill(cur.id);
    pushDrillReport(cur, responses);
    clearCurrentDrill();
    showMsg('Drill ended and saved');
    refreshReport();
    // update saved reports display
    const reports = safeParse(localStorage.getItem('drillReports')) || [];
    if(saved) saved.innerHTML = reports.map(r => `<div>${r.drill.type} (${r.drill.cls}) — ${new Date(r.drill.startedAt).toLocaleString()} — ${r.responses.length} responses</div>`).join('');
  });

  // initial load
  refreshReport();
}

/* -------------------------
   Admin page
   ------------------------- */
function initAdmin(){
  const user = getUser();
  if(!user || user.role !== 'admin'){ log('initAdmin: not admin -> redirecting'); location.href = 'login.html'; return; }
  log('initAdmin for', user.name);

  const greet = by('greetAdmin'); if(greet) greet.innerHTML = `<strong>${user.name}</strong> — Admin`;
  const reports = safeParse(localStorage.getItem('drillReports')) || [];
  const adminReports = by('adminReports');

  if(reports.length === 0){
    if(adminReports) adminReports.innerHTML = 'No reports yet.';
    if(by('statTotalDrills')) by('statTotalDrills').innerText = '0';
    if(by('statTotalResponses')) by('statTotalResponses').innerText = '0';
    return;
  }

  let totalResponses = 0;
  let html = '<table class="table"><thead><tr><th>Type</th><th>Class</th><th>Date</th><th>Responses</th></tr></thead><tbody>';
  reports.forEach(r=>{
    totalResponses += (r.responses && r.responses.length) || 0;
    html += `<tr><td>${r.drill.type}</td><td>${r.drill.cls}</td><td>${new Date(r.drill.startedAt).toLocaleString()}</td><td>${(r.responses && r.responses.length)||0}</td></tr>`;
  });
  html += '</tbody></table>';
  if(adminReports) adminReports.innerHTML = html;
  if(by('statTotalDrills')) by('statTotalDrills').innerText = reports.length;
  if(by('statTotalResponses')) by('statTotalResponses').innerText = totalResponses;
}

/* -------------------------
   Quiz + Leaderboard
   ------------------------- */
let currentQuiz = [], currentIndex = 0, currentScore = 0;

function startQuiz(topic){
  if(typeof quizzes === 'undefined'){ showMsg('Quiz data not found (quizzes.js missing)'); return; }
  currentQuiz = quizzes[topic] || [];
  if(currentQuiz.length === 0){ showMsg('No questions for this quiz'); return; }
  currentIndex = 0; currentScore = 0;
  const modal = by('quizModal'); if(modal) modal.style.display = 'flex';
  const title = by('quizTitle'); if(title) title.innerText = topic.toUpperCase() + ' Quiz';
  loadQuestion();
}

function loadQuestion(){
  const q = currentQuiz[currentIndex];
  by('quizQuestion').innerText = q.q;
  let html = '';
  q.options.forEach((opt,i)=> html += `<label style="display:block;margin:6px 0"><input type="radio" name="opt" value="${i}"> ${opt}</label>`);
  by('quizOptions').innerHTML = html;
}

function nextQuestion(){
  const choice = document.querySelector('input[name="opt"]:checked');
  if(!choice){ showMsg('Please pick an answer'); return; }
  if(parseInt(choice.value,10) === currentQuiz[currentIndex].answer) currentScore++;
  currentIndex++;
  if(currentIndex < currentQuiz.length) loadQuestion();
  else {
    showMsg(`Quiz complete: ${currentScore}/${currentQuiz.length}`);
    // save last score
    localStorage.setItem('lastQuizScore', currentScore);
    // gamify: add to studentScores
    const user = getUser();
    if(user && user.role === 'student'){
      const scores = safeParse(localStorage.getItem('studentScores')) || {};
      scores[user.name] = (scores[user.name] || 0) + currentScore;
      localStorage.setItem('studentScores', JSON.stringify(scores));
      log('added points', user.name, currentScore);
      // trigger update event for other tabs
      localStorage.setItem(`studentScores_update:${Date.now()}`, '1');
    }
    refreshLeaderboard();
    closeQuiz();
  }
}

function closeQuiz(){
  const modal = by('quizModal'); if(modal) modal.style.display = 'none';
}

function refreshLeaderboard(){
  const node = by('leaderboard'); if(!node) return;
  const scores = safeParse(localStorage.getItem('studentScores')) || {};
  const arr = Object.entries(scores).sort((a,b) => b[1]-a[1]);
  if(arr.length === 0){ node.innerHTML = 'No scores yet.'; return; }
  let html = '<table class="table"><thead><tr><th>Student</th><th>Points</th></tr></thead><tbody>';
  arr.forEach(([name,pts]) => html += `<tr><td>${name}</td><td>${pts}</td></tr>`);
  html += '</tbody></table>';
  node.innerHTML = html;
}

/* -------------------------
   Auto-init based on body dataset
   ------------------------- */
document.addEventListener('DOMContentLoaded', function(){
  const page = (document.body && document.body.dataset && document.body.dataset.page) || '';
  log('DOM ready, page=', page);
  // run initializer for page
  if(page === 'login') initLogin();
  else if(page === 'student') initStudent();
  else if(page === 'teacher') initTeacher();
  else if(page === 'admin') initAdmin();
  else log('No initializer for page:', page);

  // general: if navUser exists, display current user
  const navUser = by('navUser');
  if(navUser){
    const u = getUser();
    navUser.innerText = u ? `${u.name} (${u.role})` : 'Not logged in';
  }
});
