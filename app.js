/* app.js - core logic for demo (login, drill signalling via localStorage, UI helpers) */

(function(){
  // --- helper utilities ---
  function setUser(u){ localStorage.setItem('user', JSON.stringify(u)); }
  function getUser(){ try { return JSON.parse(localStorage.getItem('user')); } catch(e){return null} }
  function clearUser(){ localStorage.removeItem('user'); }
  function nowTs(){ return Date.now(); }
  function by(id){ return document.getElementById(id); }
  function qs(sel){ return document.querySelector(sel); }

  function showToast(msg, timeout=3000){
    let t = document.getElementById('___toast');
    if(!t){
      t = document.createElement('div'); t.id='___toast';
      t.style.position='fixed'; t.style.right='18px'; t.style.bottom='18px';
      t.style.background='rgba(15,23,42,0.92)'; t.style.color='white';
      t.style.padding='10px 14px'; t.style.borderRadius='10px'; t.style.zIndex=9999;
      t.style.boxShadow='0 10px 30px rgba(2,6,23,0.3)';
      document.body.appendChild(t);
    }
    t.innerText = msg;
    t.style.opacity = '1';
    setTimeout(()=>{ t.style.opacity = '0'; }, timeout);
  }

  function formatTime(ts){
    try{ return new Date(ts).toLocaleString(); }catch(e){return ''+ts}
  }

  /* localStorage helpers for drills/responses */
  function writeCurrentDrill(obj){
    localStorage.setItem('currentDrill', JSON.stringify(obj));
  }
  function clearCurrentDrill(){
    localStorage.removeItem('currentDrill');
  }
  function getCurrentDrill(){
    try{ return JSON.parse(localStorage.getItem('currentDrill')); }catch(e){return null}
  }
  function pushDrillReport(drill, responses){
    const key = 'drillReports';
    const a = JSON.parse(localStorage.getItem(key) || '[]');
    a.push({ drill, responses, endedAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(a));
  }

  function setStudentResponse(drillId, student){
    const key = `drillResponse:${drillId}:${student.id}`;
    const payload = { studentId: student.id, name: student.name, cls: student.cls, roll: student.roll||'', safe: true, time: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
    return payload;
  }

  function getResponsesForDrill(drillId){
    const out = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.indexOf(`drillResponse:${drillId}:`) === 0){
        try{ out.push(JSON.parse(localStorage.getItem(k))); }catch(e){}
      }
    }
    return out;
  }

  // --- page inits ---
  function initIndex(){
    const user = getUser();
    const elUser = by('navUser');
    if(elUser){
      elUser.innerText = user ? `${user.name} (${user.role})` : 'Not logged in';
    }
    // optional tiny animation
  }

  function initLogin(){
    const form = by('loginForm');
    const sample = by('sampleRoles');
    if(sample){
      sample.addEventListener('click',(e)=>{
        const role = e.target.dataset.role;
        if(role){
          by('role').value = role;
        }
      });
    }

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const fm = new FormData(form);
      const role = fm.get('role');
      const name = (fm.get('name') || '').trim() || (role==='student' ? 'Student' : 'Teacher');
      const cls = (fm.get('cls') || '').trim() || 'ClassA';
      const roll = (fm.get('roll') || '').trim() || '';
      const id = `${role}-${Date.now()}-${Math.floor(Math.random()*9999)}`;
      const user = { id, role, name, cls, roll };
      setUser(user);
      showToast(`Welcome, ${user.name}! Redirecting...`, 1200);
      setTimeout(()=>{
        if(role === 'student') location.href = 'student.html';
        else if(role === 'teacher') location.href = 'teacher.html';
        else location.href = 'index.html';
      },750);
    });

    // convenience: prefill demo
    const prev = getUser();
    if(prev){ by('name').value = prev.name || ''; by('role').value = prev.role || 'student'; by('cls').value = prev.cls || ''; by('roll').value = prev.roll || ''; }
  }

  function initStudent(){
    const user = getUser();
    if(!user || user.role !== 'student'){ location.href = 'login.html'; return; }

    // greet
    const g = by('greet');
    if(g) g.innerHTML = `<strong>${user.name}</strong> — ${user.cls} ${user.roll?(' • Roll '+user.roll):''}`;

    // populate sample modules
    const modules = [
      {title:'Earthquake Safety', desc:'Drop, Cover and Hold. Evacuation map and assembly points.'},
      {title:'Fire Safety', desc:'How to use a fire extinguisher and safe exits.'},
      {title:'Flood Response', desc:'Where to go when heavy rain or floods are expected.'},
      {title:'First Aid Basics', desc:'How to handle minor injuries and seek help.'},
    ];
    const container = by('modules');
    if(container){
      container.innerHTML = '';
      modules.forEach(m=>{
        const d = document.createElement('div'); d.className='module';
        d.innerHTML = `<h4>${m.title}</h4><p class="small">${m.desc}</p><div style="margin-top:10px"><button class="btn btn-outline" onclick="alert('Module open — demo')">Open</button></div>`;
        container.appendChild(d);
      });
    }

    // show current drill if any
    function maybeShowDrill(drill){
      if(!drill) return;
      if(drill.cls && drill.cls !== user.cls) return; // not for this class
      // show modal
      showDrillPopup(drill);
    }

    const cur = getCurrentDrill();
    if(cur) maybeShowDrill(cur);

    window.addEventListener('storage', function(e){
      if(e.key === 'currentDrill'){
        let drill = null;
        try{ drill = JSON.parse(e.newValue); }catch(e){}
        maybeShowDrill(drill);
      }
    });

    // builds/show modal
    window.showDrillPopup = function(drill){
      // remove any existing overlay
      let overlay = document.getElementById('modalOverlay');
      if(overlay) overlay.remove();

      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modalOverlay';
      overlay.style.display = 'flex';
      const box = document.createElement('div'); box.className='modal';
      box.innerHTML = `<h3>🚨 ${drill.type} — Drill Started</h3>
        <p>${drill.message || 'A drill has been started by your teacher. Please follow instructions and mark yourself safe when you are at the assembly point.'}</p>
        <div class="small">Class: <span class="kv">${drill.cls}</span> • Started: ${formatTime(drill.startedAt)}</div>
        <div class="actions" style="margin-top:14px">
          <button id="btnSafe" class="btn btn-primary">I'm Safe ✅</button>
          <button id="btnLater" class="btn btn-outline">Remind me later</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      by('btnLater').onclick = ()=>{ overlay.remove(); showToast('We will remind you until you mark safe'); };
      by('btnSafe').onclick = ()=>{
        const resp = setStudentResponse(drill.id, user);
        showToast('Marked safe — thank you!');
        overlay.remove();
        // notify teacher by writing a small "ping" key so other tabs can react
        localStorage.setItem(`ping:${drill.id}:${user.id}`, JSON.stringify({time:Date.now()}));
      };
    };
  }

  function initTeacher(){
    const user = getUser();
    if(!user || user.role !== 'teacher'){ location.href = 'login.html'; return; }

    const greet = by('greetTeacher'); if(greet) greet.innerHTML = `<strong>${user.name}</strong> — Teacher`;

    const form = by('startDrillForm');
    const reportList = by('reportList');
    const statCount = by('statCount');

    function refreshReport(){
      const cur = getCurrentDrill();
      if(!cur){ if(reportList) reportList.innerHTML = '<div class="small">No drill running.</div>'; if(statCount) statCount.innerText='0'; return; }
      const res = getResponsesForDrill(cur.id);
      if(reportList){
        reportList.innerHTML = `<div style="margin-bottom:10px"><strong>${cur.type}</strong> — Class <span class="kv">${cur.cls}</span> • started ${formatTime(cur.startedAt)}</div>`;
        if(res.length === 0) reportList.innerHTML += '<div class="small">No responses yet.</div>';
        else {
          const table = document.createElement('table'); table.className='table';
          table.innerHTML = `<thead><tr><th>Name</th><th>Class / Roll</th><th>Time</th></tr></thead><tbody></tbody>`;
          res.forEach(r=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.name}</td><td>${r.cls} ${r.roll?(' / '+r.roll):''}</td><td>${formatTime(r.time)}</td>`;
            table.querySelector('tbody').appendChild(tr);
          });
          reportList.appendChild(table);
        }
      }
      if(statCount) statCount.innerText = res.length;
    }

    window.addEventListener('storage', function(e){
      // react to new responses
      if(e.key && e.key.indexOf('drillResponse:') === 0){
        refreshReport();
      }
      if(e.key && e.key === 'currentDrill'){
        // show live drill info
        refreshReport();
      }
    });

    // start drill
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      const fm = new FormData(form);
      const type = fm.get('type') || 'Fire Drill';
      const cls = fm.get('cls') || 'ClassA';
      const message = fm.get('message') || '';
      const drill = { id: `drill-${Date.now()}`, type, cls, message, startedBy: user.name, startedAt: Date.now() };
      writeCurrentDrill(drill);
      showToast(`Drill started for ${cls}`);
      refreshReport();
    });

    // end drill
    const btnEnd = by('btnEnd');
    if(btnEnd) btnEnd.addEventListener('click', ()=>{
      const cur = getCurrentDrill();
      if(!cur){ showToast('No active drill'); return; }
      const responses = getResponsesForDrill(cur.id);
      pushDrillReport(cur, responses);
      clearCurrentDrill();
      showToast('Drill ended and report saved');
      refreshReport();
    });

    // on load refresh
    refreshReport();
  }

  // --- boot ---
  document.addEventListener('DOMContentLoaded', function(){
    const page = document.body && document.body.dataset && document.body.dataset.page;
    if(page === 'index') initIndex();
    else if(page === 'login') initLogin();
    else if(page === 'student') initStudent();
    else if(page === 'teacher') initTeacher();
    // add global logout link if present
    const out = document.getElementById('logoutBtn'); if(out) out.onclick = ()=>{
      clearUser(); location.href = 'login.html';
    };
    // update simple nav user name if present
    const navUser = document.getElementById('navUser'); if(navUser){
      const u = getUser(); navUser.innerText = u ? `${u.name} (${u.role})` : 'Not logged in';
    }
  });

})(); // end IIFE
