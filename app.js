/* app.js - simple client-side logic using localStorage
   Demo users:
     teacher: username=teacher1, pass=pass
     student: username=student1, pass=pass
*/

const sampleUsers = [
  { id: 't1', role: 'teacher', username: 'teacher1', password: 'pass', name: 'Mr Teacher' },
  { id: 's1', role: 'student', username: 'student1', password: 'pass', name: 'Student One' },
  { id: 's2', role: 'student', username: 'student2', password: 'pass', name: 'Student Two' }
];

function ensureSeed() {
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(sampleUsers));
  }
  if (!localStorage.getItem('drills')) {
    localStorage.setItem('drills', JSON.stringify([]));
  }
  if (!localStorage.getItem('participation')) {
    localStorage.setItem('participation', JSON.stringify([]));
  }
}
ensureSeed();

// --- Auth ---
function login(username, password) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return null;
  localStorage.setItem('currentUser', JSON.stringify(user));
  return user;
}
function logout() {
  localStorage.removeItem('currentUser');
  window.location = 'index.html';
}
function currentUser() {
  return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

// --- Drill / Alert logic ---
function triggerDrill({ school='Demo School', title='Drill', kind='fire', message='Drill started!' } = {}) {
  const drills = JSON.parse(localStorage.getItem('drills') || '[]');
  const drill = {
    id: 'd' + Date.now(),
    title,
    kind,
    message,
    school,
    triggeredAt: new Date().toISOString(),
    status: 'running'
  };
  drills.unshift(drill);
  localStorage.setItem('drills', JSON.stringify(drills));
  // store current active drill (for students to see)
  localStorage.setItem('current_drill', JSON.stringify(drill));
  // create notification event by updating 'drill_event' key (forces storage event)
  localStorage.setItem('drill_event', JSON.stringify({ id: drill.id, ts: Date.now() }));
  return drill;
}

function endDrill(drillId) {
  const drills = JSON.parse(localStorage.getItem('drills') || '[]');
  const idx = drills.findIndex(d => d.id === drillId);
  if (idx !== -1) {
    drills[idx].status = 'completed';
    localStorage.setItem('drills', JSON.stringify(drills));
  }
  localStorage.removeItem('current_drill');
  localStorage.setItem('drill_event', JSON.stringify({ id: null, ts: Date.now() }));
}

// --- Participation (teacher marks student safe OR student acknowledges)
function markParticipation(drillId, studentId, status='safe') {
  const participation = JSON.parse(localStorage.getItem('participation') || '[]');
  participation.push({ id: 'p'+Date.now(), drillId, studentId, status, time: new Date().toISOString() });
  localStorage.setItem('participation', JSON.stringify(participation));
  return true;
}

// --- Helper get functions ---
function getDrills() {
  return JSON.parse(localStorage.getItem('drills') || '[]');
}
function getParticipationForDrill(drillId) {
  return JSON.parse(localStorage.getItem('participation') || '[]').filter(p => p.drillId === drillId);
}
function getStudents() {
  return JSON.parse(localStorage.getItem('users') || '[]').filter(u => u.role === 'student');
}

// --- UI helpers for pages ---
function renderTeacherDashboard() {
  const user = currentUser();
  if (!user || user.role !== 'teacher') {
    document.body.innerHTML = '<p>Please login as teacher to view this page. <a href="login.html">Login</a></p>';
    return;
  }
  document.getElementById('teacherName').textContent = user.name;
  const drills = getDrills();
  const list = document.getElementById('drillList');
  list.innerHTML = '';
  drills.forEach(d => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${d.title}</strong> (${d.kind}) - ${new Date(d.triggeredAt).toLocaleString()} - ${d.status}
      <br><button onclick="endDrill('${d.id}')">End Drill</button>
      <button onclick="showParticipation('${d.id}')">View Participation</button>`;
    list.appendChild(li);
  });
}

function renderStudentDashboard() {
  const user = currentUser();
  if (!user || user.role !== 'student') {
    document.body.innerHTML = '<p>Please login as student to view this page. <a href="login.html">Login</a></p>';
    return;
  }
  document.getElementById('studentName').textContent = user.name;
  // show lessons statically
}

// listener for storage events (other tabs)
window.addEventListener('storage', (e) => {
  if (e.key === 'drill_event') {
    const drill = JSON.parse(localStorage.getItem('current_drill') || 'null');
    if (drill) {
      // if on student page, show alert
      if (document.getElementById('studentAlert')) {
        showStudentAlert(drill);
      }
    } else {
      // drill ended
      if (document.getElementById('studentAlert')) hideStudentAlert();
    }
  }
});

// UI functions for student alert display
function showStudentAlert(drill) {
  const container = document.getElementById('studentAlert');
  if (!container) return;
  container.innerHTML = `<div style="padding:15px;border:2px solid #c00;background:#ffecec;">
    <strong>ALERT:</strong> ${drill.message} <br>
    <small>${drill.title} (${drill.kind}) - ${new Date(drill.triggeredAt).toLocaleTimeString()}</small><br><br>
    <button onclick="acknowledgeDrill('${drill.id}')">I am safe</button>
  </div>`;
  container.style.display = 'block';
}
function hideStudentAlert() {
  const container = document.getElementById('studentAlert');
  if (!container) return;
  container.style.display = 'none';
  container.innerHTML = '';
}
function acknowledgeDrill(drillId) {
  const user = currentUser();
  if (!user) return alert('Please login as student');
  markParticipation(drillId, user.id, 'safe');
  hideStudentAlert();
  alert('Marked safe. Teacher will see this in participation.');
}

// teacher view participation modal
function showParticipation(drillId) {
  const parts = getParticipationForDrill(drillId);
  let html = `<h3>Participation for ${drillId}</h3><ul>`;
  const students = getStudents();
  students.forEach(s => {
    const p = parts.find(x => x.studentId === s.id);
    html += `<li>${s.name} - ${p ? p.status : 'not-marked'}
      ${!p ? `<button onclick="markParticipation('${drillId}','${s.id}','safe')">Mark Safe</button>` : ''}</li>`;
  });
  html += '</ul>';
  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(html);
}

// small helper to auto-show current drill to a student if present (when page loads)
function checkCurrentDrillOnLoad() {
  const drill = JSON.parse(localStorage.getItem('current_drill') || 'null');
  if (drill && document.getElementById('studentAlert')) {
    showStudentAlert(drill);
  }
}

// Expose needed functions to global for HTML onclick use
window.app = {
  login, logout, triggerDrill, getDrills, markParticipation, showParticipation, currentUser, checkCurrentDrillOnLoad, renderTeacherDashboard, renderStudentDashboard
};
