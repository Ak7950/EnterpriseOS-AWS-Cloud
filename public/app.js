const app = document.querySelector('#app');
let token = sessionStorage.token, user = null;

const api = async (p, o = {}) => {
  const r = await fetch('/api' + p, {
    ...o,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.message || 'Request failed');
  return j.data;
};

const esc = s => String(s ?? '').replace(/[&<>]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[x]));
const date = s => s ? new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline';
const indiaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const fields = Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );

  return `${fields.year}-${fields.month}-${fields.day}`;
};
const initials = s => String(s || '?').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
const label = s => String(s || '').replaceAll('_', ' ').replace(/\b\w/g, x => x.toUpperCase());

const toast = m => {
  let e = document.createElement('div');
  e.className = 'toast';
  e.innerHTML = `<b>✓</b>${esc(m)}`;
  document.body.append(e);
  setTimeout(() => e.remove(), 3000);
};

const av = n => `<span class="av">${initials(n)}</span>`;

function closeModal() {
  const existing = document.querySelector('#modal-overlay');
  if (existing) existing.remove();
}

function showModal({ title, subtitle = '', content, submitLabel = 'Save', onsubmit }) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div>
          ${subtitle ? `<small>${esc(subtitle)}</small>` : ''}
          <h2>${esc(title)}</h2>
        </div>
        <button type="button" class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
      </div>
      <form id="modal-form" class="modal-form">
        ${content}
        <div class="modal-actions">
          <button type="button" class="secondary" id="modal-cancel-btn">Cancel</button>
          <button type="submit" id="modal-submit-btn">${esc(submitLabel)}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#modal-form');
  const closeBtn = overlay.querySelector('#modal-close-btn');
  const cancelBtn = overlay.querySelector('#modal-cancel-btn');

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      window.removeEventListener('keydown', onKey);
    }
  };
  window.addEventListener('keydown', onKey);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('#modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    try {
      const data = Object.fromEntries(new FormData(form));
      await onsubmit(data);
      closeModal();
    } catch (err) {
      toast(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  };

  setTimeout(() => {
    const el = form.querySelector('input, select, textarea');
    if (el) el.focus();
  }, 50);
}

async function openNewEmployeeModal() {
  try {
    let deps = [];
    try { deps = await api('/departments'); } catch (_) {}
    const depOpts = deps.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('');

    showModal({
      subtitle: 'ORGANIZATION DIRECTORY',
      title: 'Add New Employee',
      submitLabel: 'Create Employee',
      content: `
        <div class="form-row">
          <div class="form-group">
            <label>First name <em>*</em></label>
            <input name="firstName" placeholder="e.g. Alex" required>
          </div>
          <div class="form-group">
            <label>Last name <em>*</em></label>
            <input name="lastName" placeholder="e.g. Morgan" required>
          </div>
        </div>
        <div class="form-group">
          <label>Work email <em>*</em></label>
          <input name="email" type="email" placeholder="alex.morgan@acme.com" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Role</label>
            <select name="role">
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label>Department</label>
            <select name="departmentId">
              <option value="">Unassigned</option>
              ${depOpts}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Designation / Title</label>
          <input name="designation" placeholder="e.g. Senior Solutions Architect">
        </div>
      `,
      onsubmit: async (data) => {
        const created = await api('/employees', {
          method: 'POST',
          body: JSON.stringify({
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: data.email.trim(),
            role: data.role,
            departmentId: data.departmentId || null,
            designation: data.designation?.trim() || null
          })
        });
        window.alert(`Employee created. Copy and share this one-time initial password through a secure channel:\n\n${created.initialPassword}\n\nThey must change it after signing in.`);
        toast('Employee created successfully');
        route();
      }
    });
  } catch (err) {
    toast(err.message);
  }
}

function openNewProjectModal() {
  const today = new Date().toISOString().slice(0, 10);
  showModal({
    subtitle: 'DELIVERY PORTFOLIO',
    title: 'Create New Project',
    submitLabel: 'Create Project',
    content: `
      <div class="form-group">
        <label>Project name <em>*</em></label>
        <input name="name" placeholder="e.g. Mobile Application v2" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Priority</label>
          <select name="priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM" selected>Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div class="form-group">
          <label>Target due date</label>
          <input name="dueDate" type="date" min="${today}">
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea name="description" placeholder="Summarize project objectives, scope, and key deliverables..."></textarea>
      </div>
    `,
    onsubmit: async (data) => {
      await api('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          priority: data.priority,
          dueDate: data.dueDate || null
        })
      });
      toast('Project created successfully');
      route();
    }
  });
}

function openNewDepartmentModal() {
  showModal({
    subtitle: 'ORGANIZATION STRUCTURE',
    title: 'Create Department',
    submitLabel: 'Create Department',
    content: `
      <div class="form-group">
        <label>Department name <em>*</em></label>
        <input name="name" placeholder="e.g. Design & User Experience" required>
      </div>
      <div class="form-group">
        <label>Department Head</label>
        <input name="headName" placeholder="e.g. Elena Rostova">
      </div>
    `,
    onsubmit: async (data) => {
      await api('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name.trim(),
          headName: data.headName?.trim() || null
        })
      });
      toast('Department created successfully');
      route();
    }
  });
}

async function openNewTaskModal() {
  try {
    const [projects, employees] = await Promise.all([
      api('/projects').catch(() => []),
      api('/employees').catch(() => [])
    ]);
    const projOpts = projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    const empOpts = employees.map(e => `<option value="${e.id}">${esc(e.first_name + ' ' + e.last_name)}</option>`).join('');
    const today = new Date().toISOString().slice(0, 10);

    showModal({
      subtitle: 'DELIVERY MANAGEMENT',
      title: 'Create New Task',
      submitLabel: 'Create Task',
      content: `
        <div class="form-group">
          <label>Task title <em>*</em></label>
          <input name="title" placeholder="e.g. Implement real-time notifications" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Project <em>*</em></label>
            <select name="projectId" required>
              ${projOpts || '<option value="">No projects available</option>'}
            </select>
          </div>
          <div class="form-group">
            <label>Assignee</label>
            <select name="assigneeId">
              <option value="">Unassigned</option>
              ${empOpts}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Priority</label>
            <select name="priority">
              <option value="LOW">Low</option>
              <option value="MEDIUM" selected>Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label>Due date</label>
            <input name="dueDate" type="date" min="${today}">
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" placeholder="Task requirements, technical details, acceptance criteria..."></textarea>
        </div>
      `,
      onsubmit: async (data) => {
        await api('/tasks', {
          method: 'POST',
          body: JSON.stringify({
            projectId: data.projectId,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            assigneeId: data.assigneeId || null,
            priority: data.priority,
            dueDate: data.dueDate || null
          })
        });
        toast('Task created successfully');
        kanban();
      }
    });
  } catch (err) {
    toast(err.message);
  }
}

function openLeaveModal() {
  const today = new Date().toISOString().slice(0, 10);
  showModal({
    subtitle: 'WORKFORCE OPERATIONS',
    title: 'Apply for Leave',
    submitLabel: 'Submit Request',
    content: `
      <div class="form-group">
        <label>Leave type <em>*</em></label>
        <select name="leaveType" required>
          <option value="Annual Leave">Annual Leave</option>
          <option value="Sick Leave">Sick Leave</option>
          <option value="Casual Leave">Casual Leave</option>
          <option value="Parental Leave">Parental Leave</option>
          <option value="Unpaid Leave">Unpaid Leave</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Start date <em>*</em></label>
          <input name="startDate" type="date" min="${today}" required>
        </div>
        <div class="form-group">
          <label>End date <em>*</em></label>
          <input name="endDate" type="date" min="${today}" required>
        </div>
      </div>
      <div class="form-group">
        <label>Reason <em>*</em></label>
        <textarea name="reason" placeholder="Please provide details for your leave request..." required></textarea>
      </div>
    `,
    onsubmit: async (data) => {
      await api('/leaves', {
        method: 'POST',
        body: JSON.stringify({
          leaveType: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason.trim()
        })
      });
      toast('Leave request submitted');
      leaves();
    }
  });
}

function login() {
  app.innerHTML = `<section class="login"><div class="login-art"><div class="brand"><i>E</i>Enterprise<span>OS</span></div><small>WORKFORCE OPERATIONS PLATFORM</small><h1>One shared pulse<br>for every team.</h1><p>EnterpriseOS connects your people, work, and decisions in one secure workspace.</p><b>✓ Secure role-based workspace</b></div><form class="login-card" id="login"><div class="brand mobile"><i>E</i>Enterprise<span>OS</span></div><small>SECURE SIGN IN</small><h2>Welcome back</h2><p>Sign in to continue to your organization.</p><label>Email address</label><input name="email" type="email" placeholder="you@company.com" autocomplete="username" required><label>Password</label><input name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required><button>Sign in to workspace <b>→</b></button></form></section>`;
  document.querySelector('#login').onsubmit = async e => {
    e.preventDefault();
    try {
      let d = await api('/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      token = d.token;
      sessionStorage.token = token;
      user = d.user;
      if (d.mustChangePassword) return changePassword();
      route();
    } catch (e) {
      toast(e.message);
    }
  };
}

function changePassword() {
  app.innerHTML = `<section class="login"><div class="login-art"><div class="brand"><i>E</i>Enterprise<span>OS</span></div><small>ACCOUNT SECURITY</small><h1>Set your own<br>secure password.</h1><p>Your initial password can only be used to sign in and set a new password.</p></div><form class="login-card" id="change-password"><div class="brand mobile"><i>E</i>Enterprise<span>OS</span></div><small>PASSWORD REQUIRED</small><h2>Change your password</h2><p>Create a unique password with at least 12 characters to continue.</p><label>Initial password</label><input name="currentPassword" type="password" required autocomplete="current-password"><label>New password</label><input name="newPassword" type="password" minlength="12" required autocomplete="new-password"><button>Save password <b>→</b></button></form></section>`;
  document.querySelector('#change-password').onsubmit = async e => {
    e.preventDefault();
    try {
      const d = await api('/auth/change-password', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      token = d.token;
      sessionStorage.token = token;
      user = null;
      route();
    } catch (e) {
      toast(e.message);
    }
  };
}

const nav = [
  ['Workspace', [['dashboard', '▦', 'Overview'], ['reports', '↗', 'Reports & insights']]],
  ['Organization', [['employees', '◉', 'People directory'], ['departments', '▤', 'Departments']]],
  ['Delivery', [['projects', '▣', 'Projects'], ['kanban', '▧', 'Execution board'], ['tasks', '☷', 'All tasks']]],
  ['Workforce', [['attendance', '◷', 'Attendance'], ['leaves', '◫', 'Leave center'], ['performance', '✦', 'Performance']]],
  ['Governance', [['notifications', '♢', 'Notifications'], ['audit', '⌁', 'Audit trail']]]
];

function frame(page, body) {
  let links = nav.map(([g, items]) => `<section><small>${g}</small>${items.map(([key, i, n]) => `<a href="#${key}" class="${page === key ? 'active' : ''}"><i>${i}</i>${n}</a>`).join('')}</section>`).join('');
  app.innerHTML = `<div class="shell"><aside class="side"><div class="brand"><i>E</i>Enterprise<span>OS</span></div><div class="workspace"><b>A</b><div><strong>EnterpriseOS</strong><small>Enterprise workspace</small></div>⌄</div><nav>${links}</nav><footer>?</footer></aside><main><header><div class="crumb">EnterpriseOS  <b>/</b> ${page === 'dashboard' ? 'Overview' : label(page)}</div><div class="head-actions"><button class="quiet">⌕</button><button class="quiet">♢</button><div class="profile">${av(user.name)}<span><b>${esc(user.name)}</b><small>${label(user.role)}</small></span></div><button class="quiet" id="logout">⇥</button></div></header>${body}</main></div>`;
  document.querySelector('#logout').onclick = () => {
    sessionStorage.clear();
    token = null;
    user = null;
    login();
  };
}

const stat = (ico, name, value, detail) => `<article class="stat"><i>${ico}</i><div><small>${name}</small><b>${value}</b></div><em>${detail}</em></article>`;

async function dashboard() {
  let d = await api('/dashboard'), s = d.stats, done = d.taskStats.find(x => x.status === 'DONE')?.total || 0, pct = s.tasks ? Math.round(done / s.tasks * 100) : 0, active = d.taskStats.filter(x => x.status !== 'DONE').reduce((n, x) => n + +x.total, 0);
  frame('dashboard', `<section class="hero"><div><small>${new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  month: 'long',
  day: 'numeric'
}).format(new Date()).toUpperCase()}</small><h1>Good morning, ${esc(user.name.split(' ')[0])} 👋</h1><p>Here is what needs your attention across EnterpriseOS today.</p></div><div><button class="secondary" id="clock">◷ Clock in</button><a href="#kanban">Open workboard →</a></div></section><section class="stats">${stat('◉', 'Total employees', s.employees, 'Active directory')}${stat('▣', 'Active projects', s.projects, 'Across all teams')}${stat('✓', 'Tasks in motion', active, `${pct}% delivery progress`)}${stat('◷', 'Attendance today', s.attendance, `${s.employees ? Math.round(s.attendance / s.employees * 100) : 0}% of team checked in`)}</section><section class="two"><article class="card"><div class="card-title"><div><small>EXECUTION</small><h2>Priority work</h2></div><a href="#kanban">View board →</a></div>${d.recent.slice(0, 5).map((t, i) => `<div class="work"><em>0${i + 1}</em><div><b>${esc(t.title)}</b><small>${av(t.assignee)}${esc(t.assignee || 'Unassigned')} · Due ${date(t.due_date)}</small></div><span class="tag ${t.status}">${label(t.status)}</span></div>`).join('') || '<p class="empty">No work items yet.</p>'}</article><article class="card health"><div class="card-title"><div><small>WORKFLOW HEALTH</small><h2>Delivery progress</h2></div><b class="percent">${pct}%</b></div><div class="donut" style="--p:${pct}"><div><b>${done}</b><small>complete</small></div></div><div class="legend"><span><i></i>Done <b>${done}</b></span><span><i></i>In progress <b>${d.taskStats.find(x => x.status === 'IN_PROGRESS')?.total || 0}</b></span><span><i></i>To do <b>${d.taskStats.find(x => x.status === 'TODO')?.total || 0}</b></span></div></article></section><section class="two lower"><article class="card"><div class="card-title"><div><small>WORKFORCE</small><h2>Leave approvals</h2></div><a href="#leaves">Open center →</a></div><div class="callout">◫<div><b>${s.pendingLeaves} request${s.pendingLeaves === 1 ? '' : 's'} awaiting review</b><small>Keep your teams informed and covered.</small></div></div></article><article class="card"><small>CONNECTED OPERATIONS</small><h2>Today at a glance</h2><p class="event"><i></i><span><b>Attendance is being recorded</b><small>${s.attendance} team members checked in today</small></span></p><p class="event purple"><i></i><span><b>Delivery is on track</b><small>${done} tasks have reached completion</small></span></p></article></section>`);
  document.querySelector('#clock').onclick = async () => {
    try {
      await api('/attendance/clock-in', { method: 'POST' });
      toast('Clock-in recorded. Have a great day!');
    } catch (e) {
      toast(e.message);
    }
  };
}

function table(title, kicker, action, heads, body) {
  return `<section class="page-title"><div><small>${kicker}</small><h1>${title}</h1></div>${action || ''}</section><section class="tablecard"><div class="toolbar"><label>⌕ <input placeholder="Search ${title.toLowerCase()}"></label><button class="secondary">☷ Filter</button></div><div class="scroll"><table><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

async function tablePage(page, path, cols) {
  let rows = await api(path), title = page === 'employees' ? 'People directory' : label(page);
  let body = rows.map(r => `<tr>${cols.map(c => {
    let k = c.toLowerCase().replaceAll(' ', '_'), v = r[k] ?? r[c.toLowerCase()] ?? '—';
    if (c === 'First name') return `<td class="person">${av(r.first_name + ' ' + r.last_name)}<span><b>${esc(r.first_name)}</b><small>${esc(r.email)}</small></span></td>`;
    if (c === 'Status' || c === 'Active') return `<td><span class="tag ${v === true ? 'ACTIVE' : v}">${v === true ? 'Active' : label(v)}</span></td>`;
    if (c === 'Priority') return `<td><span class="tag ${v}">${label(v)}</span></td>`;
    if (c === 'Rating') return `<td><strong class="rating">★ ${esc(v)}</strong></td>`;
    return `<td>${esc(v)}</td>`;
  }).join('')}</tr>`).join('') || `<tr><td class="empty" colspan="${cols.length}">No records to show.</td></tr>`;

  let btnId = `btn-new-${page === 'employees' ? 'employee' : page === 'departments' ? 'department' : page === 'projects' ? 'project' : page}`;
  let btnLabel = page === 'employees' ? '+ New employee' : page === 'departments' ? '+ New department' : page === 'projects' ? '+ New project' : `+ New ${page.slice(0, -1)}`;
  let action = ['employees', 'departments', 'projects'].includes(page) ? `<button id="${btnId}">${btnLabel}</button>` : '';

  frame(page, table(title, page === 'projects' ? 'DELIVERY PORTFOLIO' : 'ORGANIZATION OPERATIONS', action, cols.map(c => `<th>${c}</th>`).join(''), body));

  if (page === 'employees') {
    document.querySelector('#' + btnId)?.addEventListener('click', openNewEmployeeModal);
  } else if (page === 'projects') {
    document.querySelector('#' + btnId)?.addEventListener('click', openNewProjectModal);
  } else if (page === 'departments') {
    document.querySelector('#' + btnId)?.addEventListener('click', openNewDepartmentModal);
  }

  const searchInput = document.querySelector('.toolbar input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('tbody tr').forEach(tr => {
        if (tr.querySelector('.empty')) return;
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}

async function kanban() {
  let tasks = await api('/tasks'), cols = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE'];
  frame('kanban', `<section class="page-title"><div><small>DELIVERY MANAGEMENT</small><h1>Execution board</h1><p>Move work through a shared, visible delivery flow.</p></div><button id="btn-create-task">+ Create task</button></section><div class="summary"><span><b>${tasks.length}</b>Total work items</span><span><b>${tasks.filter(t => t.status === 'IN_PROGRESS').length}</b>In active progress</span><span><b>${tasks.filter(t => t.status === 'DONE').length}</b>Delivered</span></div><section class="board">${cols.map(c => `<article><h3>${label(c)} <b>${tasks.filter(t => t.status === c).length}</b></h3>${tasks.filter(t => t.status === c).map(t => `<div class="task"><header><span>${esc(t.project || 'General')}</span><i class="${t.priority}"></i></header><b>${esc(t.title)}</b><p>${esc(t.description || 'No task description added.')}</p><footer>${av(t.assignee)}${esc(t.assignee || 'Unassigned')} <small>◷ ${date(t.due_date)}</small></footer>${t.assignee_id === user.id || ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role) ? `<select data-task="${t.id}"><option value="">Move task…</option>${cols.filter(x => x !== c).map(x => `<option value="${x}">${label(x)}</option>`).join('')}</select>` : ''}</div>`).join('') || '<div class="empty">No work items</div>'}</article>`).join('')}</section>`);
  document.querySelector('#btn-create-task')?.addEventListener('click', openNewTaskModal);
  document.querySelectorAll('.task').forEach(card => {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'task-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = 'Details <span>⌄</span>';
    toggle.onclick = () => {
      const expanded = card.classList.toggle('expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.innerHTML = expanded ? 'Hide details <span>⌃</span>' : 'Details <span>⌄</span>';
    };
    card.append(toggle);
  });
  document.querySelectorAll('[data-task]').forEach(e => e.onchange = async () => {
    if (e.value) try {
      await api('/tasks/' + e.dataset.task + '/status', { method: 'PUT', body: JSON.stringify({ status: e.value }) });
      toast('Task moved to ' + label(e.value));
      kanban();
    } catch (x) {
      toast(x.message);
    }
  });
}

function exportCsv(filename, headers, rows) {
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers, ...rows].map(row => row.map(quote).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function tasksTable() {
  const tasks = await api('/tasks');
  frame('tasks', `<section class="page-title"><div><small>DELIVERY MANAGEMENT</small><h1>All tasks</h1><p>A searchable operational table for the complete task database.</p></div><div class="view-actions"><a class="secondary" href="#kanban">Board preview</a><button id="export-tasks" class="secondary export">⇩ Export CSV</button><button id="btn-create-task">+ Create task</button></div></section><p class="data-note"><b>${tasks.length} task records</b> · Search, scroll, or export a spreadsheet-ready copy.</p><section class="tablecard"><div class="toolbar"><label>⌕ <input id="task-search" placeholder="Search tasks, people, or projects"></label></div><div class="scroll"><table><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due date</th></tr></thead><tbody>${tasks.map(t => `<tr><td><b>${esc(t.title)}</b><br><small>${esc(t.description || 'No description')}</small></td><td>${esc(t.project || '—')}</td><td>${esc(t.assignee || 'Unassigned')}</td><td><span class="tag ${t.status}">${label(t.status)}</span></td><td><span class="tag ${t.priority}">${label(t.priority)}</span></td><td>${date(t.due_date)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No tasks to show.</td></tr>'}</tbody></table></div></section>`);
  document.querySelector('#btn-create-task')?.addEventListener('click', openNewTaskModal);
  document.querySelector('#task-search').oninput = e => document.querySelectorAll('tbody tr').forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(e.target.value.toLowerCase()) ? '' : 'none');
  document.querySelector('#export-tasks').onclick = () => exportCsv('enterpriseos-tasks.csv', ['Task', 'Project', 'Assignee', 'Status', 'Priority', 'Due date', 'Description'], tasks.map(t => [t.title, t.project, t.assignee, label(t.status), label(t.priority), date(t.due_date), t.description]));
}

async function attendance() {
  const [rows, team] = await Promise.all([api('/attendance?limit=1000'), ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role) ? api('/team-members') : Promise.resolve([{ name: user.name }])]);
  const records = user.role === 'MANAGER' ? rows.filter(r => team.some(member => member.name === r.employee)) : rows;
  const dayKey = value => String(value || '').slice(0, 10);
  const today = indiaDate();
  const todayRows = records.filter(r => dayKey(r.work_date) === today), present = new Set(todayRows.map(r => r.employee)).size, teamSize = team.length || 1, coverage = Math.min(100, Math.round(present / teamSize * 100)), clockedIn = todayRows.filter(r => !r.clock_out).length, missing = Math.max(0, teamSize - present);
  frame('attendance', `<section class="page-title"><div><small>WORKFORCE OPERATIONS</small><h1>Attendance hub</h1><p>Keep a reliable, transparent record of the workday.</p></div><div class="view-actions"><button id="export-attendance" class="secondary export">⇩ Export CSV</button></div></section><section class="attendance"><article><small>YOUR WORKDAY</small><h2>Ready to start?</h2><p>Record your time securely. Your working duration is calculated automatically.</p><button id="in">◷ Clock in</button><button class="trans" id="out">Clock out</button><footer>✓ One attendance record per working day</footer></article><article class="card coverage-card"><small>TODAY'S COVERAGE</small><h2>${user.role === 'MANAGER' ? 'Your team attendance' : user.role === 'EMPLOYEE' ? 'Your attendance status' : 'Workforce attendance'}</h2><div class="coverage-number"><b>${coverage}%</b><span>${present} of ${teamSize} ${teamSize === 1 ? 'person' : 'people'} present</span></div><div class="coverage-meter" role="progressbar" aria-label="Attendance coverage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${coverage}"><i style="width:${coverage}%"></i></div><div class="coverage-stats"><span><b>${clockedIn}</b> currently clocked in</span><span><b>${missing}</b> not recorded</span></div><small>Updated from today’s actual clock-in records.</small></article></section><section style="margin-top:24px"><div class="card-title"><div><small>FULL RECORD</small><h2>Attendance database</h2></div></div><p class="data-note"><b>${records.length} records loaded</b> · Search the complete record and export it for Excel.</p><section class="tablecard"><div class="toolbar"><label>⌕ <input id="attendance-search" placeholder="Search employee, email, or department"></label></div><div class="scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Work date</th><th>Clock in</th><th>Clock out</th><th>Status</th></tr></thead><tbody>${records.map(r => `<tr><td class="person">${av(r.employee)}<span><b>${esc(r.employee)}</b><small>${esc(r.email)}</small></span></td><td>${esc(r.department || '—')}</td><td>${date(r.work_date)}</td><td>${r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td>${r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open'}</td><td><span class="tag status-present">${label(r.status || 'PRESENT')}</span></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No attendance records yet.</td></tr>'}</tbody></table></div></section></section>`);
  for (let [id, path] of [['in', 'clock-in'], ['out', 'clock-out']]) {
    document.querySelector('#' + id).onclick = async () => {
      try {
        await api('/attendance/' + path, { method: 'POST' });
        toast(id === 'in' ? 'Clock-in recorded' : 'Clock-out recorded');
      } catch (e) {
        toast(e.message);
      }
    };
  }
  document.querySelector('#attendance-search').oninput = e => document.querySelectorAll('tbody tr').forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(e.target.value.toLowerCase()) ? '' : 'none');
  document.querySelector('#export-attendance').onclick = () => exportCsv('enterpriseos-attendance.csv', ['Employee', 'Email', 'Department', 'Work date', 'Clock in', 'Clock out', 'Status'], records.map(r => [r.employee, r.email, r.department, date(r.work_date), r.clock_in, r.clock_out, r.status]));
}

async function leaves() {
  let rows = await api('/leaves');
  frame('leaves', table('Leave center', 'WORKFORCE OPERATIONS', '<button id="btn-apply-leave">+ Apply for leave</button>', '<th>Team member</th><th>Leave type</th><th>Period</th><th>Status</th><th>Decision</th>', rows.map(r => `<tr><td class="person">${av(r.employee || user.name)}<span><b>${esc(r.employee || user.name)}</b><small>Leave request</small></span></td><td>${esc(r.leave_type)}</td><td>${date(r.start_date)} → ${date(r.end_date)}</td><td><span class="tag ${r.status}">${label(r.status)}</span></td><td>${r.status === 'PENDING' && ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role) ? `<button class="approve" data-id="${r.id}" data-s="APPROVED">Approve</button><button class="reject" data-id="${r.id}" data-s="REJECTED">Reject</button>` : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No leave requests found.</td></tr>'));
  document.querySelector('#btn-apply-leave')?.addEventListener('click', openLeaveModal);
  document.querySelectorAll('[data-id]').forEach(e => e.onclick = async () => {
    await api('/leaves/' + e.dataset.id + '/decision', { method: 'PUT', body: JSON.stringify({ status: e.dataset.s }) });
    toast('Leave ' + e.dataset.s.toLowerCase());
    leaves();
  });
}

async function reports() {
  let d = await api('/dashboard'), s = d.stats, done = d.taskStats.find(x => x.status === 'DONE')?.total || 0;
  frame('reports', `<section class="page-title"><div><small>DECISION SUPPORT</small><h1>Reports & insights</h1><p>Organization-wide signals, designed for faster, clearer decisions.</p></div><button class="secondary">⇩ Export snapshot</button></section><section class="reports"><article class="card"><small>DELIVERY</small><h2>Task distribution</h2>${d.taskStats.map(x => `<p class="bar"><span>${label(x.status)}</span><i><b style="width:${s.tasks ? x.total / s.tasks * 100 : 0}%"></b></i><strong>${x.total}</strong></p>`).join('')}</article><article class="card"><small>WORKFORCE</small><h2>Operational health</h2><div class="score">${s.employees ? Math.round(s.attendance / s.employees * 100) : 0}<sup>%</sup><small>Today’s attendance coverage</small></div><p class="line">Active workforce <b>${s.employees} people</b></p><p class="line">Pending leave decisions <b>${s.pendingLeaves}</b></p></article><article class="card wide"><div><small>PORTFOLIO</small><h2>Delivery at a glance</h2><p>${s.projects} active initiatives are supported by ${s.tasks} tracked work items. ${done} have been delivered.</p></div><div><b>${s.projects}<small>Projects</small></b><b>${s.tasks}<small>Tasks</small></b><b>${done}<small>Completed</small></b></div></article></section>`);
}

async function reportsWithFilters() {
  const [tasks, attendanceRows, departments, projects, team] = await Promise.all([api('/tasks'), api('/attendance?limit=1000'), api('/departments'), api('/projects'), ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role) ? api('/team-members') : Promise.resolve([])]);
  await reports();
  const controls = document.createElement('section');
  controls.className = 'tablecard report-filters';
  controls.innerHTML = '<div class="toolbar"><label>Project <select id="report-project"><option value="">All projects</option></select></label><label>Department <select id="report-department"><option value="">All departments</option></select></label><label>From <input id="report-start" type="date"></label><label>To <input id="report-end" type="date"></label></div>';
  document.querySelector('.reports').before(controls);
  const projectSelect = controls.querySelector('#report-project'), departmentSelect = controls.querySelector('#report-department');
  projects.forEach(p => { const option = new Option(p.name, p.id); projectSelect.add(option); });
  departments.forEach(d => { const option = new Option(d.name, d.name); departmentSelect.add(option); });
  const employeeDepartments = new Map(attendanceRows.map(r => [r.employee, r.department]));
  const teamNames = new Set(team.length ? team.map(member => member.name) : [user.name]);
  if (user.role === 'MANAGER') document.querySelectorAll('.reports article:not(:first-child)').forEach(card => card.remove());
  const applyFilters = () => {
    const project = projectSelect.value, department = departmentSelect.value, start = controls.querySelector('#report-start').value, end = controls.querySelector('#report-end').value;
    const filtered = tasks.filter(t => (!project || t.project_id === project) && (!department || employeeDepartments.get(t.assignee) === department) && (!start || !t.due_date || t.due_date >= start) && (!end || !t.due_date || t.due_date <= end) && (user.role !== 'MANAGER' || teamNames.has(t.assignee)));
    const statuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE'];
    const delivery = document.querySelector('.reports article:first-child');
    delivery.innerHTML = '<small>DELIVERY</small><h2>Filtered task distribution</h2>' + statuses.map(status => { const total = filtered.filter(t => t.status === status).length; const width = filtered.length ? total / filtered.length * 100 : 0; return '<p class="bar"><span>' + label(status) + '</span><i><b style="width:' + width + '%"></b></i><strong>' + total + '</strong></p>'; }).join('') + '<p class="data-note"><b>' + filtered.length + ' tasks</b> match the selected filters.</p>';
  };
  controls.querySelectorAll('select,input').forEach(control => control.addEventListener('change', applyFilters));
  applyFilters();
}

async function route() {
  try {
    if (!token) {
      user = null;
      return login();
    }
    if (!user) {
      try {
        user = await api('/me');
        user.name ||= `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
      } catch (authErr) {
        sessionStorage.clear();
        token = null;
        user = null;
        return login();
      }
    }
    if (!user) {
      sessionStorage.clear();
      token = null;
      user = null;
      return login();
    }
    let p = location.hash.slice(1) || 'dashboard';
    if (p === 'dashboard') return dashboard();
    if (p === 'reports') return reportsWithFilters();
    if (p === 'kanban') return kanban();
    if (p === 'tasks') return tasksTable();
    if (p === 'attendance') return attendance();
    if (p === 'leaves') return leaves();
    let x = {
      employees: ['/employees', ['First name', 'Last name', 'Role', 'Department', 'Designation', 'Active']],
      departments: ['/departments', ['Name', 'Head name', 'Employee count', 'Active']],
      projects: ['/projects', ['Name', 'Status', 'Priority', 'Manager', 'Task count', 'Done count']],
      performance: ['/performance', ['Employee', 'Reviewer', 'Rating', 'Feedback', 'Goals']],
      notifications: ['/notifications', ['Title', 'Message', 'Type', 'Read']],
      audit: ['/audit-logs', ['Actor', 'Action', 'Entity', 'Created at']]
    };
    if (x[p]) return tablePage(p, ...x[p]);
    return dashboard();
  } catch (e) {
    console.error(e);
    toast(e.message);
    if (!user || /Session|token|auth|unauthorized/i.test(e.message)) {
      sessionStorage.clear();
      token = null;
      user = null;
      login();
    }
  }
}

window.onhashchange = route;
route();
