/* ═══════════════════════════════════════════════════════════════
   دفتر التحضير الإلكتروني للمعلم — app.js
   Architecture: Modular JavaScript ES6+, localStorage Data Layer
   Author: Teacher Notebook System
   Version: 1.0.0
   ═══════════════════════════════════════════════════════════════

   MODULE INDEX:
   ─────────────────────────────────────────
   1.  CONFIG & CONSTANTS
   2.  DATA LAYER (localStorage abstraction)
   3.  ROUTER (SPA navigation)
   4.  UTILS (helpers, toast, loading)
   5.  DASHBOARD MODULE
   6.  SCHEDULE MODULE
   7.  CURRICULUM MODULE
   8.  LESSON FORM MODULE
   9.  ARCHIVE MODULE
   10. CLASSES MODULE
   11. STUDENTS MODULE
   12. BEHAVIOR MODULE
   13. RESOURCES MODULE
   14. REPORTS MODULE
   15. DARK MODE & UI
   16. NOTIFICATIONS MODULE
   17. APP INIT
   18. BACKUP & RESTORE MODULE
   19. ADVANCED STATISTICS MODULE
   ─────────────────────────────────────────
*/

'use strict';

/* ═══════════════════════════════════════════════
   1. CONFIG & CONSTANTS
   ═══════════════════════════════════════════════ */
const CONFIG = {
  APP_NAME: 'ترتيب',
  VERSION: '1.0.0',
  DAYS: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  PERIODS: ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'],
  BLOOM_LEVELS: {
    remember:   { label: 'التذكر',   color: '#ef4f6e' },
    understand: { label: 'الفهم',    color: '#f5963a' },
    apply:      { label: 'التطبيق',  color: '#f5c23a' },
    analyze:    { label: 'التحليل',  color: '#2ecb7e' },
    evaluate:   { label: 'التقييم',  color: '#4f6ef7' },
    create:     { label: 'الإبداع',  color: '#9b59f5' },
  },
  BEHAVIOR_TYPES: {
    positive: { label: 'إيجابي', color: '#2ecb7e' },
    negative: { label: 'سلبي',   color: '#ef4f6e' },
    neutral:  { label: 'محايد',  color: '#9097b5' },
  },
  RESOURCE_TYPES: {
    link:  { label: 'رابط',   icon: '🔗' },
    file:  { label: 'ملف',    icon: '📄' },
    video: { label: 'فيديو',  icon: '🎬' },
    book:  { label: 'كتاب',   icon: '📚' },
    other: { label: 'أخرى',   icon: '📌' },
  },
};

/* ═══════════════════════════════════════════════
   2. DATA LAYER — localStorage Abstraction
   ═══════════════════════════════════════════════
   All CRUD operations go through this layer.
   To migrate to Firebase: replace these functions
   with Firestore calls, keeping the same API.
*/
const DB = {
  /** Generic getter — returns parsed array or empty array */
  _get: (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },

  /** Generic setter — stringifies and saves */
  _set: (key, data) => {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch (e) { console.error('Storage error:', e); return false; }
  },

  /** Generate a unique ID */
  _uid: () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,

  /* ── LESSONS ── */
  lessons: {
    getAll: ()    => DB._get('lessons'),
    getById: (id) => DB._get('lessons').find(l => l.id === id) || null,
    add: (lesson) => {
      const lessons = DB._get('lessons');
      const newLesson = { ...lesson, id: DB._uid(), createdAt: Date.now() };
      lessons.unshift(newLesson);
      DB._set('lessons', lessons);
      return newLesson;
    },
    update: (id, data) => {
      const lessons = DB._get('lessons');
      const idx = lessons.findIndex(l => l.id === id);
      if (idx === -1) return false;
      lessons[idx] = { ...lessons[idx], ...data, updatedAt: Date.now() };
      return DB._set('lessons', lessons);
    },
    delete: (id) => {
      const lessons = DB._get('lessons').filter(l => l.id !== id);
      return DB._set('lessons', lessons);
    },
  },

  /* ── CLASSES ── */
  classes: {
    getAll: ()    => DB._get('classes'),
    getById: (id) => DB._get('classes').find(c => c.id === id) || null,
    add: (cls) => {
      const classes = DB._get('classes');
      const newClass = { ...cls, id: DB._uid(), createdAt: Date.now() };
      classes.push(newClass);
      DB._set('classes', classes);
      return newClass;
    },
    update: (id, data) => {
      const classes = DB._get('classes');
      const idx = classes.findIndex(c => c.id === id);
      if (idx === -1) return false;
      classes[idx] = { ...classes[idx], ...data };
      return DB._set('classes', classes);
    },
    delete: (id) => {
      const classes = DB._get('classes').filter(c => c.id !== id);
      return DB._set('classes', classes);
    },
  },

  /* ── STUDENTS ── */
  students: {
    getAll: ()          => DB._get('students'),
    getByClass: (cid)   => DB._get('students').filter(s => s.classId === cid),
    getById: (id)       => DB._get('students').find(s => s.id === id) || null,
    add: (student) => {
      const students = DB._get('students');
      const newStudent = { ...student, id: DB._uid(), createdAt: Date.now() };
      students.push(newStudent);
      DB._set('students', students);
      return newStudent;
    },
    update: (id, data) => {
      const students = DB._get('students');
      const idx = students.findIndex(s => s.id === id);
      if (idx === -1) return false;
      students[idx] = { ...students[idx], ...data };
      return DB._set('students', students);
    },
    delete: (id) => {
      const students = DB._get('students').filter(s => s.id !== id);
      return DB._set('students', students);
    },
    getAverage: (student) => {
      const grades = student.grades || [];
      if (!grades.length) return null;
      return Math.round(grades.reduce((s, g) => s + Number(g), 0) / grades.length);
    },
  },

  /* ── SCHEDULE ── */
  schedule: {
    getAll: ()    => DB._get('schedule'),
    add: (entry) => {
      const schedule = DB._get('schedule');
      const newEntry = { ...entry, id: DB._uid() };
      schedule.push(newEntry);
      DB._set('schedule', schedule);
      return newEntry;
    },
    delete: (id) => {
      const schedule = DB._get('schedule').filter(e => e.id !== id);
      return DB._set('schedule', schedule);
    },
  },

  /* ── CURRICULUM ── */
  curriculum: {
    getAll: ()    => DB._get('curriculum'),
    add: (unit) => {
      const units = DB._get('curriculum');
      const newUnit = { ...unit, id: DB._uid(), completedSessions: unit.completedSessions || 0, createdAt: Date.now() };
      units.push(newUnit);
      DB._set('curriculum', units);
      return newUnit;
    },
    update: (id, data) => {
      const units = DB._get('curriculum');
      const idx = units.findIndex(u => u.id === id);
      if (idx === -1) return false;
      units[idx] = { ...units[idx], ...data };
      return DB._set('curriculum', units);
    },
    delete: (id) => {
      const units = DB._get('curriculum').filter(u => u.id !== id);
      return DB._set('curriculum', units);
    },
  },

  /* ── BEHAVIOR ── */
  behavior: {
    getAll: ()    => DB._get('behavior'),
    add: (entry) => {
      const list = DB._get('behavior');
      const newEntry = { ...entry, id: DB._uid(), createdAt: Date.now() };
      list.unshift(newEntry);
      DB._set('behavior', list);
      return newEntry;
    },
    delete: (id) => {
      const list = DB._get('behavior').filter(b => b.id !== id);
      return DB._set('behavior', list);
    },
  },

  /* ── RESOURCES ── */
  resources: {
    getAll: ()    => DB._get('resources'),
    add: (res) => {
      const list = DB._get('resources');
      const newRes = { ...res, id: DB._uid(), createdAt: Date.now() };
      list.unshift(newRes);
      DB._set('resources', list);
      return newRes;
    },
    delete: (id) => {
      const list = DB._get('resources').filter(r => r.id !== id);
      return DB._set('resources', list);
    },
  },

  /* ── NOTIFICATIONS ── */
  notifications: {
    getAll: () => DB._get('notifications'),
    add: (msg) => {
      const list = DB._get('notifications');
      list.unshift({ id: DB._uid(), msg, date: Date.now(), read: false });
      DB._set('notifications', list);
    },
    markRead: (id) => {
      const list = DB._get('notifications').map(n => n.id === id ? { ...n, read: true } : n);
      DB._set('notifications', list);
    },
    clearAll: () => DB._set('notifications', []),
  },

  /* ── ATTENDANCE ── */
  attendance: {
    getAll:    ()          => DB._get('attendance'),
    getByDate: (date)      => DB._get('attendance').filter(a => a.date === date),
    getByClass:(classId)   => DB._get('attendance').filter(a => a.classId === classId),
    add: (entry) => {
      const list = DB._get('attendance');
      const newEntry = { ...entry, id: DB._uid(), createdAt: Date.now() };
      list.unshift(newEntry);
      DB._set('attendance', list);
      return newEntry;
    },
    saveSession: (sessionData) => {
      const list = DB._get('attendance');
      const filtered = list.filter(a => !(a.classId === sessionData.classId && a.date === sessionData.date));
      const newRecords = sessionData.records.map(r => ({
        ...r,
        id: DB._uid(),
        classId: sessionData.classId,
        className: sessionData.className,
        date: sessionData.date,
        createdAt: Date.now(),
      }));
      return DB._set('attendance', [...newRecords, ...filtered]);
    },
    delete: (id) => {
      const list = DB._get('attendance').filter(a => a.id !== id);
      return DB._set('attendance', list);
    },
  },

  /* ── NOTES ── */
  notes: {
    getAll: () => DB._get('notes'),
    getById: (id) => DB._get('notes').find(n => n.id === id) || null,
    add: (note) => {
      const list = DB._get('notes');
      const newNote = { ...note, id: DB._uid(), createdAt: Date.now(), updatedAt: Date.now() };
      list.unshift(newNote);
      DB._set('notes', list);
      return newNote;
    },
    update: (id, data) => {
      const list = DB._get('notes');
      const idx = list.findIndex(n => n.id === id);
      if (idx === -1) return false;
      list[idx] = { ...list[idx], ...data, updatedAt: Date.now() };
      return DB._set('notes', list);
    },
    delete: (id) => {
      const list = DB._get('notes').filter(n => n.id !== id);
      return DB._set('notes', list);
    },
    pin: (id) => {
      const list = DB._get('notes');
      const idx = list.findIndex(n => n.id === id);
      if (idx === -1) return false;
      list[idx].pinned = !list[idx].pinned;
      return DB._set('notes', list);
    },
  },
};

/* ═══════════════════════════════════════════════
   3. ROUTER — SPA Navigation with History Stack
   ═══════════════════════════════════════════════ */
const PAGE_TITLES = {
  'dashboard':    'لوحة التحكم',
  'schedule':     'جدول الحصص',
  'curriculum':   'توزيع المنهج',
  'lesson-form':  'تحضير درس جديد',
  'archive':      'أرشيف الدروس',
  'classes':      'إدارة الفصول',
  'students':     'إدارة الطلاب',
  'attendance':   'الحضور والغياب',
  'behavior':     'السلوك والانضباط',
  'resources':    'الموارد التعليمية',
  'reports':      'التقارير',
  'tools':        'الأدوات التعليمية',
  'notes':        'مذكراتي',
  'settings':     'الإعدادات',
  'about':        'حول المشروع',
};

/* Navigation history stack */
const navHistory = [];
let _isPopNav = false; /* flag: true when navigating via back button */

const navigate = (page, pushHistory = true) => {
  const target = document.getElementById(`page-${page}`);
  if (!target) return;

  /* Push current page to history before switching (unless called from back) */
  if (pushHistory && !_isPopNav) {
    const current = document.querySelector('.page.active');
    if (current) {
      const currentId = current.id.replace('page-', '');
      if (currentId !== page && (navHistory.length === 0 || navHistory[navHistory.length - 1] !== currentId)) {
        navHistory.push(currentId);
      }
    }
    /* Push to browser history API so device back button works */
    history.pushState({ page }, '', `#${page}`);
  }

  /* Deactivate all pages and nav items */
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  /* Activate target page */
  target.classList.add('active');

  /* Activate nav item */
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  /* Update page title */
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || '';

  /* Show/hide back button */
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    const canGoBack = navHistory.length > 0 && page !== 'dashboard';
    backBtn.classList.toggle('hidden', !canGoBack);
  }

  /* On mobile: close sidebar after navigation */
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('mobile-overlay').classList.remove('active');
  }

  /* Close notifications dropdown */
  document.getElementById('notif-dropdown').classList.add('hidden');

  /* Scroll main content to top */
  document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });

  /* Call page render function */
  const renders = {
    'dashboard':   renderDashboard,
    'schedule':    renderSchedule,
    'curriculum':  renderCurriculum,
    'lesson-form': () => { if (!document.getElementById('lesson-edit-id').value) prepLessonFormDefaults(); populateLessonClassSelect(); },
    'archive':     renderArchive,
    'classes':     renderClasses,
    'students':    renderStudents,
    'attendance':  renderAttendance,
    'behavior':    renderBehavior,
    'resources':   renderResources,
    'reports':     () => {},
    'tools':       renderTools,
    'notes':       renderNotes,
    'settings':    renderSettings,
  };

  if (renders[page]) renders[page]();
};

/* Navigate back — pops from history stack */
const navigateBack = () => {
  if (navHistory.length === 0) {
    navigate('dashboard');
    return;
  }
  const prev = navHistory.pop();
  _isPopNav = true;
  navigate(prev, false);
  _isPopNav = false;
  /* Update back button visibility */
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.classList.toggle('hidden', navHistory.length === 0 || prev === 'dashboard');
};

/* Handle browser/device hardware back button via popstate */
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    _isPopNav = true;
    if (navHistory.length > 0) navHistory.pop();
    navigate(e.state.page, false);
    _isPopNav = false;
  } else {
    /* Fallback: go to dashboard */
    _isPopNav = true;
    navigate('dashboard', false);
    _isPopNav = false;
  }
});

/* Alt+Left arrow for back, plus all global keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); navigateBack(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); navigate('lesson-form'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); navigate('dashboard'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openGlobalSearch(); }
  if (e.key === 'Escape') {
    closeGlobalSearch({ target: document.getElementById('global-search-overlay') });
    closeModal();
  }
});

/* ═══════════════════════════════════════════════
   4. UTILS — Helpers, Toast, Loading
   ═══════════════════════════════════════════════ */

/** Show a toast notification */
const showToast = (message, type = 'success', duration = 3500) => {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-emoji">${icons[type]}</span><span class="toast-text">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 320);
  }, duration);
};

/** Show/hide loading overlay */
const showLoading = () => document.getElementById('loading-overlay').classList.remove('hidden');
const hideLoading = () => document.getElementById('loading-overlay').classList.add('hidden');

/** Simulate async save (for UX polish — ready for real async calls) */
const fakeAsync = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

/** Format a date to Arabic locale */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
};

/** Format timestamp to readable date */
const formatTimestamp = (ts) => {
  try { return new Date(ts).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return '—'; }
};

/** Escape HTML to prevent XSS */
const escHtml = (str) => {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
};

/** Close modal */
const closeModal = (event) => {
  if (!event || event.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
  }
};

/** Open modal with content */
const openModal = (html) => {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
};

/** Populate class selects across pages */
const populateClassSelects = () => {
  const classes = DB.classes.getAll();
  const selects = [
    'lesson-class', 'student-class-filter', 'behavior-class-filter',
    'curriculum-class-filter', 'attendance-class-filter'
  ];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const firstOption = el.querySelector('option:first-child');
    el.innerHTML = '';
    if (firstOption) el.appendChild(firstOption.cloneNode(true));
    classes.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls.id;
      opt.textContent = `${cls.name} — ${cls.grade}`;
      el.appendChild(opt);
    });
  });
};

/* ═══════════════════════════════════════════════
   5. DASHBOARD MODULE
   ═══════════════════════════════════════════════ */
let perfChart = null;

/* Settings helpers — defined early so dashboard can use them */
const getSettings = () => {
  try { return JSON.parse(localStorage.getItem('appSettings')) || {}; }
  catch { return {}; }
};
const getDashboardGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'صباح الخير';
  if (h >= 12 && h < 17) return 'مساء الخير';
  if (h >= 17 && h < 21) return 'مساء النور';
  return 'مرحباً';
};

const renderDashboard = () => {
  const lessons  = DB.lessons.getAll();
  const classes  = DB.classes.getAll();
  const students = DB.students.getAll();

  /* Greeting */
  const cfg = getSettings();
  const greetingEl = document.getElementById('greeting-msg');
  const nameEl2    = document.getElementById('greeting-name');
  const schoolEl2  = document.getElementById('greeting-school');
  if (greetingEl) greetingEl.textContent = getDashboardGreeting();
  if (nameEl2)    nameEl2.textContent = cfg.teacherName ? ` يا ${cfg.teacherName}!` : ' يا معلم!';
  if (schoolEl2)  schoolEl2.textContent = cfg.schoolName ? `🏫 ${cfg.schoolName}${cfg.schoolYear ? ' — ' + cfg.schoolYear : ''}` : '';

  /* Stats */
  const stClasses  = document.getElementById('stat-classes');
  const stStudents = document.getElementById('stat-students');
  const stLessons  = document.getElementById('stat-lessons');
  const stAvg      = document.getElementById('stat-avg');
  if (stClasses)  stClasses.textContent  = classes.length;
  if (stStudents) stStudents.textContent = students.length;
  if (stLessons)  stLessons.textContent  = lessons.length;

  /* Average performance */
  const avgs = students.map(st => DB.students.getAverage(st)).filter(v => v !== null);
  const overallAvg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
  if (stAvg) stAvg.textContent = overallAvg !== null ? `${overallAvg}%` : '—';

  /* CSS chart — always works, no Canvas dependency */
  renderPerformanceChart(classes, students);

  /* Recent lessons */
  const recentEl = document.getElementById('recent-lessons-list');
  if (recentEl) {
    const last3 = lessons.slice(0, 5);
    if (last3.length === 0) {
      recentEl.innerHTML = '<div class="empty-list-msg"><span>📝</span><p>لا توجد دروس بعد</p><button class="btn btn-primary btn-sm" onclick="navigate(\'lesson-form\')">أضف درسك الأول</button></div>';
    } else {
      recentEl.innerHTML = last3.map(l => `
        <div class="recent-item" onclick="viewLessonDetail('${l.id}')">
          <div>
            <div class="recent-item-title">${escHtml(l.title)}</div>
            <div class="recent-item-meta">${escHtml(l.subject)} · ${formatDate(l.date)}</div>
          </div>
          <span class="pill pill-blue">${escHtml(l.grade)}</span>
        </div>
      `).join('');
    }
  }

  /* Curriculum progress */
  const currEl = document.getElementById('curriculum-progress-list');
  if (currEl) {
    const currUnits = DB.curriculum.getAll().slice(0, 4);
    if (currUnits.length === 0) {
      currEl.innerHTML = '<div class="empty-list-msg"><span>📐</span><p>لم يُضف منهج بعد</p><button class="btn btn-outline btn-sm" onclick="navigate(\'curriculum\')">أضف وحدة</button></div>';
    } else {
      currEl.innerHTML = currUnits.map(u => {
        const pct = u.totalSessions > 0 ? Math.round((u.completedSessions / u.totalSessions) * 100) : 0;
        const barColor = pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-orange)' : 'var(--accent-blue)';
        return `
          <div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:6px">
              <span style="font-weight:600;color:var(--text-primary)">${escHtml(u.name)}</span>
              <span style="color:${barColor};font-weight:800">${pct}%</span>
            </div>
            <div class="progress-bar-wrapper">
              <div class="progress-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">${u.completedSessions} من ${u.totalSessions} حصة · ${escHtml(u.className || '')}</div>
          </div>`;
      }).join('');
    }
  }

  /* Today's schedule */
  const todayEl = document.getElementById('today-schedule-list');
  if (todayEl) {
    const todayIdx  = new Date().getDay();
    const dayMap    = { 0:'الأحد', 1:'الاثنين', 2:'الثلاثاء', 3:'الأربعاء', 4:'الخميس' };
    const todayName = dayMap[todayIdx] || '';
    const todaySlots = DB.schedule.getAll().filter(sl => sl.day === todayName)
                        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    if (todaySlots.length === 0) {
      todayEl.innerHTML = todayName
        ? '<div class="empty-list-msg"><span>📅</span><p>لا توجد حصص اليوم</p></div>'
        : '<div class="empty-list-msg"><span>📅</span><p>اليوم إجازة (جمعة / سبت)</p></div>';
    } else {
      todayEl.innerHTML = todaySlots.map(sl => `
        <div class="recent-item">
          <div>
            <div class="recent-item-title">${escHtml(sl.subject)}</div>
            <div class="recent-item-meta">
              الحصة ${escHtml(sl.period)}
              ${sl.startTime ? ` · ${sl.startTime}${sl.endTime ? ' — ' + sl.endTime : ''}` : ''}
              ${sl.className ? ' · ' + escHtml(sl.className) : ''}
            </div>
          </div>
          <span class="pill pill-blue" style="white-space:nowrap">${escHtml(sl.period)}</span>
        </div>
      `).join('');
    }
  }
};

const renderPerformanceChart = (classes, students) => {
  /* Pure HTML/CSS chart — no Canvas, no CDN dependency, always renders */
  const wrapper = document.getElementById('performance-chart');
  if (!wrapper) return;

  /* Build per-class averages */
  const barColors = ['#4f6ef7','#2ecb7e','#9b59f5','#f5963a','#ef4f6e','#1cc9b0'];
  const items = classes.map((cls, i) => {
    const clsStudents = students.filter(st => st.classId === cls.id);
    const validAvgs   = clsStudents.map(st => DB.students.getAverage(st)).filter(v => v !== null);
    const avg = validAvgs.length ? Math.round(validAvgs.reduce((a,b)=>a+b,0)/validAvgs.length) : 0;
    return { name: cls.name, avg, color: barColors[i % barColors.length] };
  });

  if (items.length === 0) {
    wrapper.innerHTML = `
      <div class="css-chart-empty">
        <span>📊</span>
        <p>أضف فصولاً وطلاباً لرؤية الرسم البياني</p>
        <button class="btn btn-primary btn-sm" onclick="navigate('classes')">إضافة فصل</button>
      </div>`;
    return;
  }

  /* Y-axis labels */
  const yLabels = [100, 75, 50, 25, 0];

  wrapper.innerHTML = `
    <div class="css-chart">
      <div class="css-chart-y">
        ${yLabels.map(v => `<span>${v}%</span>`).join('')}
      </div>
      <div class="css-chart-area">
        <div class="css-chart-grid">
          ${yLabels.slice(0,-1).map(() => `<div class="css-chart-line"></div>`).join('')}
        </div>
        <div class="css-chart-bars">
          ${items.map(item => `
            <div class="css-chart-bar-wrap" title="${item.name}: ${item.avg}%">
              <div class="css-chart-bar-bg">
                <div class="css-chart-bar-fill" style="height:${item.avg}%;background:${item.color}">
                  <span class="css-chart-val">${item.avg}%</span>
                </div>
              </div>
              <div class="css-chart-label">${item.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
};

/* ═══════════════════════════════════════════════
   6. SCHEDULE MODULE
   ═══════════════════════════════════════════════ */
const renderSchedule = () => {
  const schedule = DB.schedule.getAll();
  const tbody = document.getElementById('schedule-tbody');
  if (!tbody) return;

  tbody.innerHTML = CONFIG.PERIODS.map((period) => {
    const cells = CONFIG.DAYS.map(day => {
      const entry = schedule.find(sl => sl.day === day && sl.period === period);
      if (entry) {
        const timeLabel = (entry.startTime && entry.endTime)
          ? `<div class="cell-time">${entry.startTime} – ${entry.endTime}</div>`
          : entry.startTime ? `<div class="cell-time">${entry.startTime}</div>` : '';
        return `<td>
          <div class="schedule-cell" title="${escHtml(entry.subject)}">
            <span class="cell-delete" onclick="deleteScheduleEntry('${entry.id}')">✕</span>
            <div class="cell-subject">${escHtml(entry.subject)}</div>
            <small class="cell-class">${escHtml(entry.className || '')}</small>
            ${timeLabel}
            <button class="cell-edit-time" onclick="openEditScheduleTimeModal('${entry.id}')" title="تعديل الوقت">⏱</button>
          </div>
        </td>`;
      }
      return `<td>
        <button class="btn btn-ghost btn-sm schedule-add-btn"
          onclick="openAddScheduleModal('${day}', '${period}')">+</button>
      </td>`;
    }).join('');

    /* Get time range from any existing entry in this period */
    const anyEntry = schedule.find(sl => sl.period === period && sl.startTime);
    const periodTime = anyEntry ? `<small class="period-time">${anyEntry.startTime}${anyEntry.endTime ? '–' + anyEntry.endTime : ''}</small>` : '';

    return `<tr>
      <td class="schedule-row-header">
        <div>الحصة ${period}</div>
        ${periodTime}
      </td>
      ${cells}
    </tr>`;
  }).join('');
};

const openAddScheduleModal = (preDay = '', prePeriod = '') => {
  const classes = DB.classes.getAll();
  const classOptions   = classes.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.name)}</option>`).join('');
  const dayOptions     = CONFIG.DAYS.map(d => `<option value="${d}" ${d === preDay ? 'selected' : ''}>${d}</option>`).join('');
  const periodOptions  = CONFIG.PERIODS.map(p => `<option value="${p}" ${p === prePeriod ? 'selected' : ''}>${p}</option>`).join('');

  /* Suggest default times based on period */
  const defaultTimes = {
    'الأولى':   { s: '07:30', e: '08:10' },
    'الثانية':  { s: '08:15', e: '08:55' },
    'الثالثة':  { s: '09:00', e: '09:40' },
    'الرابعة':  { s: '09:55', e: '10:35' },
    'الخامسة':  { s: '10:40', e: '11:20' },
    'السادسة':  { s: '11:25', e: '12:05' },
  };
  const dt = defaultTimes[prePeriod] || { s: '', e: '' };

  openModal(`
    <div class="modal-title">➕ إضافة حصة جديدة</div>
    <div class="form-row">
      <div class="form-group">
        <label>اليوم</label>
        <select id="m-sched-day" class="form-select" onchange="suggestScheduleTime()">${dayOptions}</select>
      </div>
      <div class="form-group">
        <label>الحصة</label>
        <select id="m-sched-period" class="form-select" onchange="suggestScheduleTime()">${periodOptions}</select>
      </div>
    </div>
    <div class="form-group mt-1">
      <label>المادة الدراسية *</label>
      <input type="text" id="m-sched-subject" class="form-input" placeholder="اسم المادة" />
    </div>
    <div class="form-group mt-1">
      <label>الفصل</label>
      <select id="m-sched-class" class="form-select"><option value="">اختر الفصل</option>${classOptions}</select>
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="form-group">
        <label>⏰ وقت البداية</label>
        <input type="time" id="m-sched-start" class="form-input" value="${dt.s}" />
      </div>
      <div class="form-group">
        <label>🏁 وقت النهاية</label>
        <input type="time" id="m-sched-end" class="form-input" value="${dt.e}" />
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveScheduleEntry()">💾 حفظ</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

/* Suggest times when period changes in the modal */
const suggestScheduleTime = () => {
  const period = document.getElementById('m-sched-period')?.value;
  const startEl = document.getElementById('m-sched-start');
  const endEl   = document.getElementById('m-sched-end');
  if (!startEl || !endEl) return;
  const defaults = {
    'الأولى':  { s:'07:30', e:'08:10' }, 'الثانية': { s:'08:15', e:'08:55' },
    'الثالثة': { s:'09:00', e:'09:40' }, 'الرابعة': { s:'09:55', e:'10:35' },
    'الخامسة': { s:'10:40', e:'11:20' }, 'السادسة': { s:'11:25', e:'12:05' },
  };
  const dt = defaults[period];
  if (dt && !startEl.value) { startEl.value = dt.s; endEl.value = dt.e; }
};

/* Edit time of an existing schedule entry */
const openEditScheduleTimeModal = (id) => {
  const entry = DB.schedule.getAll().find(sl => sl.id === id);
  if (!entry) return;
  openModal(`
    <div class="modal-title">⏱️ تعديل وقت الحصة</div>
    <div style="background:var(--bg-tertiary);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-weight:800;font-size:1rem">${escHtml(entry.subject)}</div>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">
        ${entry.day} · الحصة ${entry.period}${entry.className ? ' · ' + escHtml(entry.className) : ''}
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>⏰ وقت البداية</label>
        <input type="time" id="m-edit-start" class="form-input" value="${entry.startTime || ''}" />
      </div>
      <div class="form-group">
        <label>🏁 وقت النهاية</label>
        <input type="time" id="m-edit-end" class="form-input" value="${entry.endTime || ''}" />
      </div>
    </div>
    <div id="edit-time-duration" class="time-duration-badge" style="margin-bottom:12px"></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveScheduleTime('${id}')">💾 حفظ الوقت</button>
      <button class="btn btn-ghost btn-sm" onclick="clearScheduleTime('${id}')">✕ مسح الوقت</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
  /* Auto calculate duration */
  ['m-edit-start','m-edit-end'].forEach(eid => {
    document.getElementById(eid)?.addEventListener('input', () => {
      const s = document.getElementById('m-edit-start')?.value;
      const e = document.getElementById('m-edit-end')?.value;
      const dEl = document.getElementById('edit-time-duration');
      if (!dEl) return;
      if (s && e) {
        const [sh,sm] = s.split(':').map(Number);
        const [eh,em] = e.split(':').map(Number);
        const mins = (eh*60+em) - (sh*60+sm);
        dEl.textContent = mins > 0 ? `مدة الحصة: ${mins} دقيقة` : '';
      } else { dEl.textContent = ''; }
    });
  });
};

const saveScheduleTime = (id) => {
  const startTime = document.getElementById('m-edit-start')?.value || '';
  const endTime   = document.getElementById('m-edit-end')?.value   || '';
  const schedule  = DB.schedule.getAll();
  const idx       = schedule.findIndex(sl => sl.id === id);
  if (idx === -1) return;
  schedule[idx] = { ...schedule[idx], startTime, endTime };
  DB._set('schedule', schedule);
  closeModal();
  renderSchedule();
  showToast('تم تحديث وقت الحصة ✅');
};

const clearScheduleTime = (id) => {
  const schedule = DB.schedule.getAll();
  const idx = schedule.findIndex(sl => sl.id === id);
  if (idx === -1) return;
  schedule[idx] = { ...schedule[idx], startTime: '', endTime: '' };
  DB._set('schedule', schedule);
  closeModal();
  renderSchedule();
  showToast('تم مسح الوقت', 'info');
};

const saveScheduleEntry = async () => {
  const day       = document.getElementById('m-sched-day')?.value;
  const period    = document.getElementById('m-sched-period')?.value;
  const subject   = document.getElementById('m-sched-subject')?.value.trim();
  const classId   = document.getElementById('m-sched-class')?.value;
  const startTime = document.getElementById('m-sched-start')?.value || '';
  const endTime   = document.getElementById('m-sched-end')?.value   || '';

  if (!subject) { showToast('يرجى إدخال اسم المادة', 'warn'); return; }

  /* Check for duplicate slot */
  const existing = DB.schedule.getAll().find(sl => sl.day === day && sl.period === period);
  if (existing) { showToast('هذه الحصة محجوزة بالفعل', 'warn'); return; }

  const cls = classId ? DB.classes.getById(classId) : null;
  showLoading(); await fakeAsync();
  DB.schedule.add({ day, period, subject, classId, className: cls ? cls.name : '', startTime, endTime });
  hideLoading();
  closeModal();
  renderSchedule();
  showToast('تمت إضافة الحصة بنجاح ✅');
  DB.notifications.add(`تمت إضافة حصة "${subject}" يوم ${day}${startTime ? ' الساعة ' + startTime : ''}`);
  updateNotifBadge();
};

const deleteScheduleEntry = (id) => {
  DB.schedule.delete(id);
  renderSchedule();
  showToast('تم حذف الحصة', 'info');
};

/* ═══════════════════════════════════════════════
   7. CURRICULUM MODULE
   ═══════════════════════════════════════════════ */
const renderCurriculum = () => {
  const filter = document.getElementById('curriculum-class-filter')?.value || '';
  let units = DB.curriculum.getAll();
  if (filter) units = units.filter(u => u.classId === filter);

  const container = document.getElementById('curriculum-list');
  if (units.length === 0) {
    container.innerHTML = `<div class="empty-state"><span>📐</span><p>لا توجد وحدات منهجية</p></div>`;
    return;
  }

  container.innerHTML = units.map(u => {
    const pct = u.totalSessions > 0 ? Math.round((u.completedSessions / u.totalSessions) * 100) : 0;
    return `
      <div class="curriculum-card">
        <div class="curriculum-card-header">
          <div>
            <div class="curriculum-title">${escHtml(u.name)}</div>
            <div class="curriculum-meta">${escHtml(u.className || '')} · ${u.totalSessions} حصة</div>
          </div>
          <div class="action-btns">
            <button class="btn btn-ghost btn-sm" onclick="incrementCurriculum('${u.id}')">+حصة</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCurriculum('${u.id}')">حذف</button>
          </div>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-label">
          <span>${u.completedSessions} حصة مكتملة</span>
          <span style="font-weight:700;color:var(--accent-blue)">${pct}%</span>
        </div>
        ${u.description ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:8px">${escHtml(u.description)}</p>` : ''}
      </div>`;
  }).join('');
};

const openAddCurriculumModal = () => {
  const classes = DB.classes.getAll();
  const classOptions = classes.map(c => `<option value="${c.id}">${escHtml(c.name)} — ${escHtml(c.grade)}</option>`).join('');

  openModal(`
    <div class="modal-title">📐 إضافة وحدة منهجية</div>
    <div class="form-group mt-1"><label>اسم الوحدة *</label>
      <input type="text" id="m-cur-name" class="form-input" placeholder="مثال: الوحدة الأولى - الأعداد" /></div>
    <div class="form-group mt-1"><label>الفصل الدراسي</label>
      <select id="m-cur-class" class="form-select"><option value="">اختر الفصل</option>${classOptions}</select></div>
    <div class="form-group mt-1"><label>عدد الحصص الإجمالي *</label>
      <input type="number" id="m-cur-sessions" class="form-input" placeholder="10" min="1" /></div>
    <div class="form-group mt-1"><label>وصف الوحدة</label>
      <textarea id="m-cur-desc" class="form-textarea" rows="2" placeholder="نبذة عن محتوى الوحدة…"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveCurriculum()">حفظ</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const saveCurriculum = async () => {
  const name     = document.getElementById('m-cur-name').value.trim();
  const classId  = document.getElementById('m-cur-class').value;
  const sessions = parseInt(document.getElementById('m-cur-sessions').value);
  const desc     = document.getElementById('m-cur-desc').value.trim();

  if (!name || !sessions || isNaN(sessions)) { showToast('يرجى ملء الحقول المطلوبة', 'warn'); return; }

  const cls = classId ? DB.classes.getById(classId) : null;
  showLoading(); await fakeAsync();
  DB.curriculum.add({ name, classId, className: cls ? cls.name : '', totalSessions: sessions, description: desc });
  hideLoading();
  closeModal();
  populateCurriculumClassFilter();
  renderCurriculum();
  showToast('تمت إضافة الوحدة بنجاح');
};

const incrementCurriculum = (id) => {
  const unit = DB.curriculum.getAll().find(u => u.id === id);
  if (!unit) return;
  if (unit.completedSessions >= unit.totalSessions) { showToast('اكتملت جميع حصص هذه الوحدة', 'info'); return; }
  DB.curriculum.update(id, { completedSessions: unit.completedSessions + 1 });
  renderCurriculum();
  showToast('تم تسجيل حصة مكتملة ✅');
};

const deleteCurriculum = (id) => {
  DB.curriculum.delete(id);
  renderCurriculum();
  showToast('تم حذف الوحدة', 'info');
};

const populateCurriculumClassFilter = () => {
  const classes = DB.classes.getAll();
  const sel = document.getElementById('curriculum-class-filter');
  if (!sel) return;
  sel.innerHTML = '<option value="">كل الفصول</option>';
  classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} — ${c.grade}`;
    sel.appendChild(opt);
  });
};

/* ═══════════════════════════════════════════════
   8. LESSON FORM MODULE
   ═══════════════════════════════════════════════ */
const prepLessonFormDefaults = () => {
  document.getElementById('lesson-edit-id').value = '';
  document.getElementById('lesson-form-title').textContent = 'تحضير درس جديد';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('lesson-date').value = today;

  /* Time inputs — compute total */
  const timeIds = ['time-intro', 'time-explain', 'time-activities', 'time-assessment', 'time-closure'];
  timeIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateTimeTotal);
  });
};

const updateTimeTotal = () => {
  const ids = ['time-intro', 'time-explain', 'time-activities', 'time-assessment', 'time-closure'];
  const total = ids.reduce((sum, id) => sum + (parseInt(document.getElementById(id)?.value) || 0), 0);
  document.getElementById('time-total-display').textContent = total;
};

const populateLessonClassSelect = () => {
  const classes = DB.classes.getAll();
  const sel = document.getElementById('lesson-class');
  if (!sel) return;
  const first = sel.querySelector('option:first-child');
  sel.innerHTML = '';
  if (first) sel.appendChild(first.cloneNode(true));
  classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} — ${c.grade}`;
    sel.appendChild(opt);
  });
};

const saveLesson = async (event) => {
  event.preventDefault();

  /* Gather bloom taxonomy selections */
  const bloomChecked = [...document.querySelectorAll('input[name="bloom"]:checked')].map(cb => cb.value);

  const lessonData = {
    title:       document.getElementById('lesson-title').value.trim(),
    subject:     document.getElementById('lesson-subject').value.trim(),
    grade:       document.getElementById('lesson-grade').value.trim(),
    classId:     document.getElementById('lesson-class').value,
    date:        document.getElementById('lesson-date').value,
    objectives:  document.getElementById('lesson-objectives').value.trim(),
    bloom:       bloomChecked,
    explanation: document.getElementById('lesson-explanation').value.trim(),
    elements:    document.getElementById('lesson-elements').value.trim(),
    strategies:  document.getElementById('lesson-strategies').value.trim(),
    tools:       document.getElementById('lesson-tools').value.trim(),
    activities:  document.getElementById('lesson-activities').value.trim(),
    assessment:  document.getElementById('lesson-assessment').value.trim(),
    homework:    document.getElementById('lesson-homework').value.trim(),
    closure:     document.getElementById('lesson-closure').value.trim(),
    time: {
      intro:      parseInt(document.getElementById('time-intro').value) || 0,
      explain:    parseInt(document.getElementById('time-explain').value) || 0,
      activities: parseInt(document.getElementById('time-activities').value) || 0,
      assessment: parseInt(document.getElementById('time-assessment').value) || 0,
      closure:    parseInt(document.getElementById('time-closure').value) || 0,
    },
  };

  /* Get class name */
  const cls = lessonData.classId ? DB.classes.getById(lessonData.classId) : null;
  lessonData.className = cls ? cls.name : '';

  showLoading();
  await fakeAsync();

  const editId = document.getElementById('lesson-edit-id').value;
  if (editId) {
    DB.lessons.update(editId, lessonData);
    showToast('تم تحديث الدرس بنجاح ✅');
  } else {
    DB.lessons.add(lessonData);
    DB.notifications.add(`تم تحضير درس جديد: "${lessonData.title}"`);
    updateNotifBadge();
    showToast('تم حفظ الدرس بنجاح ✅');
  }

  hideLoading();
  resetLessonForm();
  navigate('archive');
};

const resetLessonForm = () => {
  document.getElementById('lesson-form').reset();
  document.getElementById('lesson-edit-id').value = '';
  document.getElementById('lesson-form-title').textContent = 'تحضير درس جديد';
  document.getElementById('time-total-display').textContent = '0';
};

const editLesson = (id) => {
  const lesson = DB.lessons.getById(id);
  if (!lesson) return;

  navigate('lesson-form');
  setTimeout(() => {
    document.getElementById('lesson-edit-id').value  = id;
    document.getElementById('lesson-form-title').textContent = 'تعديل الدرس';
    document.getElementById('lesson-title').value    = lesson.title || '';
    document.getElementById('lesson-subject').value  = lesson.subject || '';
    document.getElementById('lesson-grade').value    = lesson.grade || '';
    document.getElementById('lesson-date').value     = lesson.date || '';
    document.getElementById('lesson-objectives').value  = lesson.objectives || '';
    document.getElementById('lesson-explanation').value = lesson.explanation || '';
    document.getElementById('lesson-elements').value    = lesson.elements || '';
    document.getElementById('lesson-strategies').value  = lesson.strategies || '';
    document.getElementById('lesson-tools').value       = lesson.tools || '';
    document.getElementById('lesson-activities').value  = lesson.activities || '';
    document.getElementById('lesson-assessment').value  = lesson.assessment || '';
    document.getElementById('lesson-homework').value    = lesson.homework || '';
    document.getElementById('lesson-closure').value     = lesson.closure || '';

    /* Bloom */
    document.querySelectorAll('input[name="bloom"]').forEach(cb => {
      cb.checked = (lesson.bloom || []).includes(cb.value);
    });

    /* Time */
    if (lesson.time) {
      document.getElementById('time-intro').value      = lesson.time.intro || '';
      document.getElementById('time-explain').value    = lesson.time.explain || '';
      document.getElementById('time-activities').value = lesson.time.activities || '';
      document.getElementById('time-assessment').value = lesson.time.assessment || '';
      document.getElementById('time-closure').value    = lesson.time.closure || '';
      updateTimeTotal();
    }

    /* Class select */
    populateLessonClassSelect();
    setTimeout(() => {
      if (lesson.classId) document.getElementById('lesson-class').value = lesson.classId;
    }, 50);
  }, 100);
};

/* ═══════════════════════════════════════════════
   9. ARCHIVE MODULE (مع بحث متقدم)
   ═══════════════════════════════════════════════ */
const renderArchive = () => {
  let lessons = DB.lessons.getAll();
  const search  = document.getElementById('archive-search')?.value.toLowerCase() || '';
  const subject = document.getElementById('archive-subject-filter')?.value || '';
  const month = document.getElementById('archive-month-filter')?.value || '';

  if (search)  lessons = lessons.filter(l => l.title.toLowerCase().includes(search) || (l.subject || '').toLowerCase().includes(search));
  if (subject) lessons = lessons.filter(l => l.subject === subject);
  if (month) {
    lessons = lessons.filter(l => {
      if (!l.date) return false;
      const lessonMonth = l.date.split('-')[1];
      return lessonMonth === month;
    });
  }

  const tbody   = document.getElementById('archive-tbody');
  const table   = document.getElementById('archive-table');
  const empty   = document.getElementById('archive-empty');

  if (lessons.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  table.classList.remove('hidden');
  empty.classList.add('hidden');

  tbody.innerHTML = lessons.map((l, idx) => {
    const bloomPills = (l.bloom || []).map(b =>
      `<span class="pill" style="background:${CONFIG.BLOOM_LEVELS[b]?.color}22;color:${CONFIG.BLOOM_LEVELS[b]?.color}">${CONFIG.BLOOM_LEVELS[b]?.label}</span>`
    ).join(' ');
    return `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight:600">${escHtml(l.title)}</td>
        <td>${escHtml(l.subject)}</td>
        <td>${escHtml(l.grade)}</td>
        <td>${escHtml(l.className || '—')}</td>
        <td>${formatDate(l.date)}</td>
        <td>${bloomPills || '<span class="text-muted">—</span>'}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-ghost btn-sm" onclick="viewLessonDetail('${l.id}')">عرض</button>
            <button class="btn btn-outline btn-sm" onclick="editLesson('${l.id}')">تعديل</button>
            <button class="btn btn-ghost btn-sm" onclick="exportLessonPDF('${l.id}')">PDF</button>
            <button class="btn btn-danger btn-sm" onclick="deleteLesson('${l.id}')">حذف</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  /* Populate subject filter */
  const subjects = [...new Set(DB.lessons.getAll().map(l => l.subject).filter(Boolean))];
  const sf = document.getElementById('archive-subject-filter');
  if (sf) {
    const current = sf.value;
    sf.innerHTML = '<option value="">كل المواد</option>';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      if (s === current) opt.selected = true;
      sf.appendChild(opt);
    });
  }
};

const viewLessonDetail = (id) => {
  const l = DB.lessons.getById(id);
  if (!l) return;

  const bloomPills = (l.bloom || []).map(b =>
    `<span class="pill" style="background:${CONFIG.BLOOM_LEVELS[b]?.color}22;color:${CONFIG.BLOOM_LEVELS[b]?.color};margin:2px">${CONFIG.BLOOM_LEVELS[b]?.label}</span>`
  ).join('');

  const timeTotal = l.time ? Object.values(l.time).reduce((a,b) => a+b, 0) : 0;

  const row = (label, value) => value
    ? `<div style="margin-bottom:12px"><strong style="font-size:0.78rem;color:var(--text-muted)">${label}</strong><p style="margin-top:4px;font-size:0.88rem;line-height:1.8;white-space:pre-wrap">${escHtml(value)}</p></div>`
    : '';

  // Linked resources
  const linkedResources = DB.resources.getAll().filter(r => r.lessonId === l.id);
  const resHTML = linkedResources.length ? `
    <div style="margin-top:14px;padding:12px;background:var(--bg-tertiary);border-radius:8px">
      <strong style="font-size:0.8rem;color:var(--text-muted)">🔗 الموارد المرتبطة (${linkedResources.length})</strong>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
        ${linkedResources.map(r => `
          <a href="${r.url || '#'}" target="${r.url ? '_blank' : '_self'}" class="pill pill-blue" style="font-size:0.75rem">
            ${CONFIG.RESOURCE_TYPES[r.type]?.icon || '📌'} ${escHtml(r.title)}
          </a>`).join('')}
      </div>
    </div>` : '';

  openModal(`
    <div class="modal-title">📋 ${escHtml(l.title)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:0.82rem">
      <span><strong>المادة:</strong> ${escHtml(l.subject)}</span>
      <span><strong>الصف:</strong> ${escHtml(l.grade)}</span>
      <span><strong>الفصل:</strong> ${escHtml(l.className || '—')}</span>
      <span><strong>التاريخ:</strong> ${formatDate(l.date)}</span>
    </div>
    ${bloomPills ? `<div style="margin-bottom:14px">${bloomPills}</div>` : ''}
    ${row('أهداف الدرس', l.objectives)}
    ${row('شرح الدرس', l.explanation)}
    ${row('عناصر الدرس', l.elements)}
    ${row('استراتيجيات التدريس', l.strategies)}
    ${row('الوسائل التعليمية', l.tools)}
    ${row('الأنشطة', l.activities)}
    ${row('التقويم', l.assessment)}
    ${row('الواجب المنزلي', l.homework)}
    ${row('غلق الدرس', l.closure)}
    ${timeTotal ? `<div style="background:var(--bg-tertiary);padding:10px;border-radius:8px;font-size:0.82rem;margin-top:8px">⏱️ إجمالي الزمن: <strong>${timeTotal} دقيقة</strong></div>` : ''}
    ${resHTML}
    <div class="form-actions">
      <button class="btn btn-primary" onclick="exportLessonPDF('${l.id}')">📄 تصدير PDF</button>
      <button class="btn btn-outline" onclick="closeModal();openAddResourceModal('${l.id}')">🔗 إضافة مورد</button>
      <button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>
    </div>
  `);
};

const deleteLesson = (id) => {
  DB.lessons.delete(id);
  renderArchive();
  showToast('تم حذف الدرس', 'info');
};

const exportLessonPDF = (id) => {
  const l = DB.lessons.getById(id);
  if (!l) { showToast('الدرس غير موجود', 'error'); return; }

  const bloomLabels = (l.bloom || []).map(b => CONFIG.BLOOM_LEVELS[b]?.label).join('، ') || '—';
  const timeTotal = l.time ? Object.values(l.time).reduce((a,b)=>a+b,0) : 0;
  const timeStr = l.time ? `مقدمة ${l.time.intro}د | شرح ${l.time.explain}د | أنشطة ${l.time.activities}د | تقويم ${l.time.assessment}د | إغلاق ${l.time.closure}د` : '';

  const field = (label, value) => value ? `
    <div class="pdf-field">
      <div class="pdf-label">${label}</div>
      <div class="pdf-value">${value.replace(/\n/g,'<br>')}</div>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>تحضير درس: ${l.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #fff; color: #1a1d2e; direction: rtl; font-size: 13px; }
  .page { width: 210mm; min-height: 297mm; padding: 18mm 15mm; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #4f6ef7 0%, #9b59f5 100%); color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
  .header-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 12px; opacity: 0.9; }
  .header-meta span strong { display: block; font-size: 10px; opacity: 0.75; margin-bottom: 2px; }
  .bloom-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .bloom-badge { background: rgba(255,255,255,0.25); padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .section { margin-bottom: 8px; }
  .section-title { font-size: 11px; font-weight: 800; color: #4f6ef7; border-bottom: 2px solid #4f6ef7; padding-bottom: 4px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fields-grid.single { grid-template-columns: 1fr; }
  .pdf-field { background: #f5f6fa; border-radius: 8px; padding: 10px 12px; border-right: 3px solid #4f6ef7; }
  .pdf-label { font-size: 10px; font-weight: 700; color: #5a6282; margin-bottom: 4px; }
  .pdf-value { font-size: 12px; color: #1a1d2e; line-height: 1.7; }
  .time-row { display: flex; flex-wrap: wrap; gap: 8px; background: #f5f6fa; padding: 10px 12px; border-radius: 8px; font-size: 11px; margin-top: 6px; }
  .time-total { background: #4f6ef7; color: #fff; font-weight: 800; padding: 6px 14px; border-radius: 20px; margin-top: 6px; font-size: 12px; display: inline-block; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9097b5; border-top: 1px solid #e4e7f0; padding-top: 12px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 12mm 10mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>📋 ${l.title}</h1>
    <div class="header-meta">
      <span><strong>المادة</strong>${l.subject}</span>
      <span><strong>الصف</strong>${l.grade}</span>
      <span><strong>الفصل</strong>${l.className || '—'}</span>
      <span><strong>التاريخ</strong>${formatDate(l.date)}</span>
      <span><strong>إجمالي الزمن</strong>${timeTotal} دقيقة</span>
    </div>
    ${bloomLabels !== '—' ? `<div class="bloom-badges">${(l.bloom||[]).map(b=>`<span class="bloom-badge">${CONFIG.BLOOM_LEVELS[b]?.label}</span>`).join('')}</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">🎯 أهداف الدرس وتخطيطه</div>
    <div class="fields-grid single">
      ${field('أهداف الدرس', l.objectives)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">📚 محتوى الدرس</div>
    <div class="fields-grid">
      ${field('شرح الدرس', l.explanation)}
      ${field('عناصر / محتوى الدرس', l.elements)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">🛠️ استراتيجيات ووسائل التدريس</div>
    <div class="fields-grid">
      ${field('استراتيجيات التدريس', l.strategies)}
      ${field('الوسائل التعليمية', l.tools)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">✏️ الأنشطة والتقويم</div>
    <div class="fields-grid">
      ${field('الأنشطة الصفية', l.activities)}
      ${field('التقويم والتقييم', l.assessment)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">🏠 الواجب وغلق الدرس</div>
    <div class="fields-grid">
      ${field('الواجب المنزلي', l.homework)}
      ${field('غلق الدرس', l.closure)}
    </div>
  </div>

  ${timeTotal ? `<div class="section">
    <div class="section-title">⏱️ التوزيع الزمني</div>
    <div class="time-row">${timeStr}</div>
    <div class="time-total">الإجمالي: ${timeTotal} دقيقة</div>
  </div>` : ''}

  <div class="footer">تم إنشاؤه بواسطة ${CONFIG.APP_NAME} v${CONFIG.VERSION} — ${new Date().toLocaleDateString('ar-SA')}</div>
</div>
<script>window.onload = () => { window.print(); setTimeout(()=>window.close(),1500); }<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { showToast('يرجى السماح بالنوافذ المنبثقة لتصدير PDF', 'warn'); return; }
  win.document.write(html);
  win.document.close();
  showToast('جارٍ فتح نافذة الطباعة / PDF ✅');
};

/* ═══════════════════════════════════════════════
   10. CLASSES MODULE
   ═══════════════════════════════════════════════ */
const renderClasses = () => {
  const search = document.getElementById('class-search')?.value.toLowerCase() || '';
  let classes = DB.classes.getAll();
  if (search) classes = classes.filter(c =>
    c.name.toLowerCase().includes(search) ||
    c.grade.toLowerCase().includes(search) ||
    (c.teacher || '').toLowerCase().includes(search)
  );

  const grid    = document.getElementById('classes-grid');
  const empty   = document.getElementById('classes-empty');

  if (classes.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const students = DB.students.getAll();
  grid.innerHTML = classes.map(cls => {
    const classStudents = students.filter(s => s.classId === cls.id);
    const studentCount = classStudents.length;
    const avgs = classStudents.map(s => DB.students.getAverage(s)).filter(v => v !== null);
    const clsAvg = avgs.length ? Math.round(avgs.reduce((a,b)=>a+b,0)/avgs.length) : null;
    const colorMap = { 'أزرق': '#4f6ef7', 'أخضر': '#2ecb7e', 'بنفسجي': '#9b59f5', 'برتقالي': '#f5963a', 'أحمر': '#ef4f6e' };
    const cardColor = colorMap[cls.color] || '#4f6ef7';

    return `
      <div class="class-card" style="border-top: 3px solid ${cardColor}">
        <div class="class-card-header">
          <div class="class-card-name" style="color:${cardColor}">${escHtml(cls.name)}</div>
          <span class="pill" style="background:${cardColor}22;color:${cardColor}">${escHtml(cls.grade)}</span>
        </div>
        <div class="class-card-grade">👨‍🏫 ${escHtml(cls.teacher || 'لم يحدد')} · ${formatTimestamp(cls.createdAt)}</div>
        <div class="class-card-stats">
          <div class="class-stat"><strong>${studentCount}</strong><small>طالب</small></div>
          <div class="class-stat"><strong>${cls.capacity || '—'}</strong><small>مقعد</small></div>
          <div class="class-stat"><strong style="color:${clsAvg !== null ? (clsAvg>=80?'var(--accent-green)':clsAvg>=60?'var(--accent-orange)':'var(--accent-red)') : 'var(--text-muted)'}">${clsAvg !== null ? clsAvg+'%' : '—'}</strong><small>متوسط</small></div>
        </div>
        <div class="class-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="openAddStudentModal('${cls.id}')" title="إضافة طالب لهذا الفصل">👤+</button>
          <button class="btn btn-ghost btn-sm" onclick="viewClassStudents('${cls.id}')">الطلاب</button>
          <button class="btn btn-outline btn-sm" onclick="openEditClassModal('${cls.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteClass('${cls.id}')">حذف</button>
        </div>
      </div>`;
  }).join('');
};

const openAddClassModal = () => {
  openModal(`
    <div class="modal-title">🏫 إضافة فصل دراسي</div>
    <div class="form-group mt-1"><label>اسم الفصل *</label>
      <input type="text" id="m-cls-name" class="form-input" placeholder="مثال: فصل أ" /></div>
    <div class="form-group mt-1"><label>الصف الدراسي *</label>
      <input type="text" id="m-cls-grade" class="form-input" placeholder="مثال: الثالث الابتدائي" /></div>
    <div class="form-group mt-1"><label>اسم المعلم</label>
      <input type="text" id="m-cls-teacher" class="form-input" placeholder="اسم المعلم المسؤول" /></div>
    <div class="form-group mt-1"><label>عدد المقاعد</label>
      <input type="number" id="m-cls-capacity" class="form-input" placeholder="30" min="1" /></div>
    <div class="form-group mt-1"><label>لون الفصل</label>
      <select id="m-cls-color" class="form-select">
        <option value="أزرق">🔵 أزرق</option>
        <option value="أخضر">🟢 أخضر</option>
        <option value="بنفسجي">🟣 بنفسجي</option>
        <option value="برتقالي">🟠 برتقالي</option>
        <option value="أحمر">🔴 أحمر</option>
      </select></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveClass()">حفظ</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const openEditClassModal = (id) => {
  const cls = DB.classes.getById(id);
  if (!cls) return;
  openModal(`
    <div class="modal-title">✏️ تعديل الفصل</div>
    <input type="hidden" id="m-cls-edit-id" value="${id}" />
    <div class="form-group mt-1"><label>اسم الفصل</label>
      <input type="text" id="m-cls-name" class="form-input" value="${escHtml(cls.name)}" /></div>
    <div class="form-group mt-1"><label>الصف الدراسي</label>
      <input type="text" id="m-cls-grade" class="form-input" value="${escHtml(cls.grade)}" /></div>
    <div class="form-group mt-1"><label>المعلم</label>
      <input type="text" id="m-cls-teacher" class="form-input" value="${escHtml(cls.teacher || '')}" /></div>
    <div class="form-group mt-1"><label>عدد المقاعد</label>
      <input type="number" id="m-cls-capacity" class="form-input" value="${cls.capacity || ''}" min="1" /></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveClass(true)">تحديث</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const saveClass = async (isEdit = false) => {
  const name     = document.getElementById('m-cls-name').value.trim();
  const grade    = document.getElementById('m-cls-grade').value.trim();
  const teacher  = document.getElementById('m-cls-teacher').value.trim();
  const capacity = parseInt(document.getElementById('m-cls-capacity').value) || null;
  const color    = document.getElementById('m-cls-color')?.value || 'أزرق';

  if (!name || !grade) { showToast('يرجى ملء الحقول المطلوبة', 'warn'); return; }

  showLoading(); await fakeAsync();

  if (isEdit) {
    const editId = document.getElementById('m-cls-edit-id').value;
    DB.classes.update(editId, { name, grade, teacher, capacity, color });
    showToast('تم تحديث الفصل بنجاح ✅');
  } else {
    DB.classes.add({ name, grade, teacher, capacity, color });
    showToast('تمت إضافة الفصل بنجاح ✅');
    DB.notifications.add(`تمت إضافة فصل جديد: "${name}"`);
    updateNotifBadge();
  }

  hideLoading();
  closeModal();
  renderClasses();
  populateClassSelects();
};

const deleteClass = (id) => {
  // Update students in this class to have no class
  const students = DB.students.getAll();
  students.forEach(s => {
    if (s.classId === id) DB.students.update(s.id, { classId: '' });
  });
  DB.classes.delete(id);
  renderClasses();
  populateClassSelects();
  showToast('تم حذف الفصل', 'info');
};

const confirmDeleteClass = (id) => {
  const cls = DB.classes.getById(id);
  if (!cls) return;
  const studentCount = DB.students.getAll().filter(s => s.classId === id).length;
  openModal(`
    <div class="modal-title" style="color:var(--accent-red)">⚠️ تأكيد حذف الفصل</div>
    <p style="margin-bottom:16px">هل أنت متأكد من حذف الفصل <strong>${escHtml(cls.name)}</strong>؟</p>
    ${studentCount > 0 ? `<div style="background:rgba(239,79,110,0.1);border:1px solid var(--accent-red);border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem;color:var(--accent-red)">
      ⚠️ يوجد <strong>${studentCount} طالب</strong> في هذا الفصل. سيتم إزالة ارتباطهم بالفصل (لن يُحذفوا).
    </div>` : ''}
    <div class="form-actions">
      <button class="btn btn-danger" onclick="deleteClass('${id}');closeModal()">نعم، احذف الفصل</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

/* ═══════════════════════════════════════════════
   11. STUDENTS MODULE
   ═══════════════════════════════════════════════ */
const renderStudents = () => {
  const classFilter  = document.getElementById('student-class-filter')?.value || '';
  const searchQuery  = document.getElementById('student-search')?.value.toLowerCase() || '';
  let students = DB.students.getAll();
  if (classFilter) students = students.filter(s => s.classId === classFilter);
  if (searchQuery)  students = students.filter(s => s.name.toLowerCase().includes(searchQuery) || (s.notes||'').toLowerCase().includes(searchQuery));

  const tbody  = document.getElementById('students-tbody');
  const table  = document.getElementById('students-table');
  const empty  = document.getElementById('students-empty');

  if (students.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  table.classList.remove('hidden');
  empty.classList.add('hidden');

  tbody.innerHTML = students.map((s, idx) => {
    const avg = DB.students.getAverage(s);
    const avgColor = avg === null ? 'var(--text-muted)' : avg >= 80 ? 'var(--accent-green)' : avg >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';
    const cls = s.classId ? DB.classes.getById(s.classId) : null;
    const behaviorPill = {
      'ممتاز': 'pill-green', 'جيد': 'pill-blue', 'مقبول': 'pill-orange', 'ضعيف': 'pill-red'
    }[s.behavior] || 'pill-gray';

    // Count behavior entries for this student
    const behaviorCount = DB.behavior.getAll().filter(b => b.studentId === s.id).length;

    return `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight:600">
          <a onclick="viewStudentReport('${s.id}')" style="cursor:pointer;color:var(--accent-blue)">${escHtml(s.name)}</a>
        </td>
        <td>
          ${cls ? `<a onclick="viewClassStudents('${cls.id}')" style="cursor:pointer;color:var(--text-secondary)">${escHtml(cls.name)}</a>` : '—'}
        </td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
            ${(s.grades || []).map((g, gi) =>
              `<span class="pill pill-blue" style="cursor:pointer" title="انقر لحذف" onclick="removeGrade('${s.id}',${gi})">${g}</span>`
            ).join('')}
            <button class="btn btn-ghost btn-sm" onclick="addGradeToStudent('${s.id}')">+ درجة</button>
          </div>
        </td>
        <td style="font-weight:800;color:${avgColor}">${avg !== null ? avg + '%' : '—'}</td>
        <td><span class="pill ${behaviorPill}">${escHtml(s.behavior || '—')}</span></td>
        <td style="font-size:0.78rem;color:var(--text-muted)">${escHtml(s.notes || '—')}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-outline btn-sm" onclick="openEditStudentModal('${s.id}')">تعديل</button>
            <button class="btn btn-ghost btn-sm" onclick="openAddBehaviorModal('', '${s.id}')" title="تسجيل ملاحظة سلوكية">📋${behaviorCount > 0 ? `<sup style="color:var(--accent-orange)">${behaviorCount}</sup>` : ''}</button>
            <button class="btn btn-ghost btn-sm" onclick="viewStudentReport('${s.id}')">تقرير</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteStudent('${s.id}')">حذف</button>
          </div>
        </td>
      </tr>`;
  }).join('');
};

const openAddStudentModal = (preClassId = '') => {
  const classes = DB.classes.getAll();
  const classOptions = classes.map(c => `<option value="${c.id}" ${c.id === preClassId ? 'selected' : ''}>${escHtml(c.name)} — ${escHtml(c.grade)}</option>`).join('');

  openModal(`
    <div class="modal-title">👤 إضافة طالب</div>
    <div class="form-group mt-1"><label>اسم الطالب *</label>
      <input type="text" id="m-std-name" class="form-input" placeholder="الاسم الكامل" /></div>
    <div class="form-group mt-1"><label>الفصل *</label>
      <select id="m-std-class" class="form-select"><option value="">اختر الفصل</option>${classOptions}</select></div>
    <div class="form-group mt-1"><label>السلوك الأولي</label>
      <select id="m-std-behavior" class="form-select">
        <option value="ممتاز">ممتاز</option><option value="جيد" selected>جيد</option>
        <option value="مقبول">مقبول</option><option value="ضعيف">ضعيف</option>
      </select></div>
    <div class="form-group mt-1"><label>ملاحظات</label>
      <textarea id="m-std-notes" class="form-textarea" rows="2" placeholder="ملاحظات عن الطالب…"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveStudent()">حفظ</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const openEditStudentModal = (id) => {
  const s = DB.students.getById(id);
  if (!s) return;
  const classes = DB.classes.getAll();
  const classOptions = classes.map(c =>
    `<option value="${c.id}" ${c.id === s.classId ? 'selected' : ''}>${escHtml(c.name)}</option>`
  ).join('');

  openModal(`
    <div class="modal-title">✏️ تعديل بيانات الطالب</div>
    <input type="hidden" id="m-std-edit-id" value="${id}" />
    <div class="form-group mt-1"><label>الاسم</label>
      <input type="text" id="m-std-name" class="form-input" value="${escHtml(s.name)}" /></div>
    <div class="form-group mt-1"><label>الفصل</label>
      <select id="m-std-class" class="form-select">${classOptions}</select></div>
    <div class="form-group mt-1"><label>السلوك</label>
      <select id="m-std-behavior" class="form-select">
        ${['ممتاز','جيد','مقبول','ضعيف'].map(b => `<option ${b === s.behavior ? 'selected' : ''}>${b}</option>`).join('')}
      </select></div>
    <div class="form-group mt-1"><label>ملاحظات</label>
      <textarea id="m-std-notes" class="form-textarea" rows="2">${escHtml(s.notes || '')}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveStudent(true)">تحديث</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const saveStudent = async (isEdit = false) => {
  const name     = document.getElementById('m-std-name').value.trim();
  const classId  = document.getElementById('m-std-class').value;
  const behavior = document.getElementById('m-std-behavior').value;
  const notes    = document.getElementById('m-std-notes').value.trim();

  if (!name) { showToast('يرجى إدخال اسم الطالب', 'warn'); return; }

  showLoading(); await fakeAsync();

  if (isEdit) {
    const editId = document.getElementById('m-std-edit-id').value;
    DB.students.update(editId, { name, classId, behavior, notes });
    showToast('تم تحديث بيانات الطالب ✅');
  } else {
    DB.students.add({ name, classId, behavior, notes, grades: [] });
    showToast('تمت إضافة الطالب ✅');
  }

  hideLoading();
  closeModal();
  renderStudents();
};

const addGradeToStudent = (id) => {
  openModal(`
    <div class="modal-title">📊 إضافة درجة</div>
    <div class="form-group mt-1"><label>الدرجة (من 100)</label>
      <input type="number" id="m-grade-val" class="form-input" placeholder="85" min="0" max="100" /></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="confirmAddGrade('${id}')">إضافة</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const confirmAddGrade = (id) => {
  const val = parseInt(document.getElementById('m-grade-val').value);
  if (isNaN(val) || val < 0 || val > 100) { showToast('الدرجة يجب أن تكون بين 0 و 100', 'warn'); return; }

  const s = DB.students.getById(id);
  if (!s) return;
  const grades = [...(s.grades || []), val];
  DB.students.update(id, { grades });
  closeModal();
  renderStudents();
  showToast(`تمت إضافة الدرجة: ${val} ✅`);
};

const removeGrade = (id, gIdx) => {
  const s = DB.students.getById(id);
  if (!s) return;
  const grades = (s.grades || []).filter((_, i) => i !== gIdx);
  DB.students.update(id, { grades });
  renderStudents();
  showToast('تم حذف الدرجة', 'info');
};

const deleteStudent = (id) => {
  DB.students.delete(id);
  renderStudents();
  showToast('تم حذف الطالب', 'info');
};

const confirmDeleteStudent = (id) => {
  const s = DB.students.getById(id);
  if (!s) return;
  openModal(`
    <div class="modal-title" style="color:var(--accent-red)">⚠️ تأكيد الحذف</div>
    <p style="margin-bottom:16px">هل أنت متأكد من حذف الطالب <strong>${escHtml(s.name)}</strong>؟<br><small style="color:var(--text-muted)">سيتم حذف جميع درجاته وسجلاته من النظام.</small></p>
    <div class="form-actions">
      <button class="btn btn-danger" onclick="deleteStudent('${id}');closeModal()">نعم، احذف</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const viewStudentReport = (id) => {
  const s = DB.students.getById(id);
  if (!s) return;
  const cls = s.classId ? DB.classes.getById(s.classId) : null;
  const avg = DB.students.getAverage(s);
  const behaviorLogs = DB.behavior.getAll().filter(b => b.studentId === s.id);

  const behaviorHTML = behaviorLogs.length ? `
    <div style="margin-top:16px">
      <strong style="font-size:0.82rem;color:var(--text-muted)">📋 سجل السلوك (${behaviorLogs.length})</strong>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:150px;overflow-y:auto">
        ${behaviorLogs.slice(0,5).map(b => `
          <div style="background:var(--bg-tertiary);padding:8px 12px;border-radius:8px;border-right:3px solid ${b.type==='positive'?'var(--accent-green)':b.type==='negative'?'var(--accent-red)':'var(--text-muted)'}">
            <div style="font-size:0.8rem;font-weight:600">${CONFIG.BEHAVIOR_TYPES[b.type]?.label} · ${formatTimestamp(b.createdAt)}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px">${escHtml(b.note)}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  // Attendance stats
  const attendanceAll = DB.attendance.getAll().filter(a => a.studentId === s.id);
  const presentCount = attendanceAll.filter(a => a.status === 'present').length;
  const absentCount = attendanceAll.filter(a => a.status === 'absent').length;
  const attendancePct = attendanceAll.length ? Math.round((presentCount / attendanceAll.length) * 100) : null;

  openModal(`
    <div class="modal-title">📋 تقرير الطالب: ${escHtml(s.name)}</div>
    <div class="student-report-grid">
      <div style="text-align:center;background:var(--bg-tertiary);padding:16px;border-radius:12px">
        <div style="font-size:2rem;font-weight:800;color:var(--accent-blue)">${avg !== null ? avg + '%' : '—'}</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">المتوسط العام</div>
      </div>
      <div style="text-align:center;background:var(--bg-tertiary);padding:16px;border-radius:12px">
        <div style="font-size:2rem;font-weight:800;color:var(--accent-green)">${(s.grades||[]).length}</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">عدد التقييمات</div>
      </div>
      <div style="text-align:center;background:var(--bg-tertiary);padding:16px;border-radius:12px">
        <div style="font-size:2rem;font-weight:800;color:var(--accent-teal)">${attendancePct !== null ? attendancePct + '%' : '—'}</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">نسبة الحضور</div>
      </div>
    </div>
    <div style="font-size:0.85rem;margin-bottom:8px"><strong>الفصل:</strong> ${cls ? `<a onclick="closeModal();viewClassStudents('${cls.id}')" style="cursor:pointer;color:var(--accent-blue)">${escHtml(cls.name)}</a>` : '—'}</div>
    <div style="font-size:0.85rem;margin-bottom:8px"><strong>السلوك:</strong> ${escHtml(s.behavior || '—')}</div>
    <div style="font-size:0.85rem;margin-bottom:8px"><strong>ملاحظات:</strong> ${escHtml(s.notes || '—')}</div>
    ${(s.grades||[]).length ? `
      <div style="margin-top:14px">
        <strong style="font-size:0.82rem">الدرجات:</strong>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          ${(s.grades||[]).map((g,i) => `<span class="pill ${g >= 80 ? 'pill-green' : g >= 60 ? 'pill-orange' : 'pill-red'}">${g}</span>`).join('')}
        </div>
      </div>` : ''}
    ${behaviorHTML}
    <div class="form-actions">
      <button class="btn btn-outline" onclick="openAddBehaviorModal('','${s.id}')">📋 سجل سلوك</button>
      <button class="btn btn-outline" onclick="addGradeToStudent('${s.id}')">+ درجة</button>
      <button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>
    </div>
  `);
};

const viewStudentReportById = (id) => { if (id) viewStudentReport(id); };

const viewClassStudents = (classId) => {
  document.getElementById('student-class-filter').value = classId;
  navigate('students');
};

const viewLessonByTitle = (lessonId) => {
  if (lessonId) viewLessonDetail(lessonId);
};

/* ═══════════════════════════════════════════════
   12. BEHAVIOR MODULE
   ═══════════════════════════════════════════════ */
const renderBehavior = () => {
  const filter      = document.getElementById('behavior-class-filter')?.value || '';
  const typeFilter  = document.getElementById('behavior-type-filter')?.value || '';
  const searchQuery = document.getElementById('behavior-search')?.value.toLowerCase() || '';
  let list = DB.behavior.getAll();
  if (filter)      list = list.filter(b => b.classId === filter);
  if (typeFilter)  list = list.filter(b => b.type === typeFilter);
  if (searchQuery) list = list.filter(b =>
    b.studentName.toLowerCase().includes(searchQuery) ||
    (b.note || '').toLowerCase().includes(searchQuery)
  );

  const container = document.getElementById('behavior-list');
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><span>📋</span><p>لا توجد ملاحظات سلوكية</p></div>`;
    return;
  }

  container.innerHTML = list.map(b => `
    <div class="behavior-item ${b.type}">
      <div class="behavior-info">
        <h4>
          <a onclick="viewStudentReportById('${b.studentId}')" style="cursor:pointer;color:inherit">${escHtml(b.studentName)}</a>
          <span class="pill ${b.type === 'positive' ? 'pill-green' : b.type === 'negative' ? 'pill-red' : 'pill-gray'}" style="font-size:0.68rem">${CONFIG.BEHAVIOR_TYPES[b.type]?.label}</span>
        </h4>
        <p>${escHtml(b.note)}</p>
        <div class="behavior-meta">
          الفصل: ${escHtml(b.className || '—')} · ${formatTimestamp(b.createdAt)}
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteBehaviorEntry('${b.id}')">حذف</button>
    </div>
  `).join('');
};

const openAddBehaviorModal = (preClassId = '', preStudentId = '') => {
  const classes  = DB.classes.getAll();
  const students = DB.students.getAll();

  const classOptions = classes.map(c =>
    `<option value="${c.id}" ${c.id === preClassId ? 'selected' : ''}>${escHtml(c.name)} — ${escHtml(c.grade)}</option>`
  ).join('');

  /* If preStudentId given, derive its class */
  let resolvedClassId = preClassId;
  if (!resolvedClassId && preStudentId) {
    const preStd = students.find(st => st.id === preStudentId);
    if (preStd) resolvedClassId = preStd.classId || '';
  }

  const buildStudentOptions = (classId) => {
    const filtered = classId ? students.filter(st => st.classId === classId) : students;
    return filtered.map(st =>
      `<option value="${st.id}" ${st.id === preStudentId ? 'selected' : ''}>${escHtml(st.name)}</option>`
    ).join('');
  };

  openModal(`
    <div class="modal-title">📋 تسجيل ملاحظة سلوكية</div>
    <div class="form-group mt-1">
      <label>الفصل</label>
      <select id="m-beh-class" class="form-select" onchange="filterBehaviorStudents()">
        <option value="">كل الفصول</option>${classOptions}
      </select>
    </div>
    <div class="form-group mt-1">
      <label>الطالب *</label>
      <select id="m-beh-student" class="form-select">
        <option value="">اختر طالبًا</option>${buildStudentOptions(resolvedClassId)}
      </select>
    </div>
    <div class="form-group mt-1">
      <label>نوع السلوك</label>
      <select id="m-beh-type" class="form-select">
        <option value="positive">✅ إيجابي</option>
        <option value="negative">❌ سلبي</option>
        <option value="neutral">➖ محايد</option>
      </select>
    </div>
    <div class="form-group mt-1">
      <label>الملاحظة *</label>
      <textarea id="m-beh-note" class="form-textarea" rows="3" placeholder="وصف السلوك الملاحظ…"></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveBehaviorEntry()">💾 حفظ</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);

  /* Pre-set class filter if resolved */
  if (resolvedClassId) {
    const clsSel = document.getElementById('m-beh-class');
    if (clsSel) clsSel.value = resolvedClassId;
  }
};

/* Filter students in behavior modal when class changes */
const filterBehaviorStudents = () => {
  const classId    = document.getElementById('m-beh-class')?.value || '';
  const stdSel     = document.getElementById('m-beh-student');
  if (!stdSel) return;
  const students   = DB.students.getAll();
  const filtered   = classId ? students.filter(st => st.classId === classId) : students;
  const currentVal = stdSel.value;
  stdSel.innerHTML = '<option value="">اختر طالبًا</option>' +
    filtered.map(st => `<option value="${st.id}" ${st.id === currentVal ? 'selected' : ''}>${escHtml(st.name)}</option>`).join('');
};

const saveBehaviorEntry = async () => {
  const studentId = document.getElementById('m-beh-student')?.value;
  const type      = document.getElementById('m-beh-type')?.value;
  const note      = document.getElementById('m-beh-note')?.value.trim();

  if (!studentId) { showToast('يرجى اختيار الطالب', 'warn'); return; }
  if (!note)      { showToast('يرجى كتابة الملاحظة', 'warn'); return; }

  const student = DB.students.getById(studentId);
  /* Use class from modal selector if set, else fall back to student's class */
  const modalClassId = document.getElementById('m-beh-class')?.value || student?.classId || '';
  const cls = modalClassId ? DB.classes.getById(modalClassId) : null;

  showLoading(); await fakeAsync();
  DB.behavior.add({
    studentId,
    studentName: student?.name || '',
    classId:     cls?.id      || student?.classId || '',
    className:   cls?.name    || '',
    type,
    note,
  });
  hideLoading();
  closeModal();
  renderBehavior();
  showToast('تم تسجيل الملاحظة السلوكية ✅');
  DB.notifications.add(`ملاحظة سلوكية: ${student?.name || ''} — ${CONFIG.BEHAVIOR_TYPES[type]?.label || ''}`);
  updateNotifBadge();
};

const deleteBehaviorEntry = (id) => {
  DB.behavior.delete(id);
  renderBehavior();
  showToast('تم حذف الملاحظة', 'info');
};

/* ═══════════════════════════════════════════════
   13. RESOURCES MODULE
   ═══════════════════════════════════════════════ */
const renderResources = () => {
  const filter      = document.getElementById('resource-type-filter')?.value || '';
  const searchQuery = document.getElementById('resource-search')?.value.toLowerCase() || '';
  let list = DB.resources.getAll();
  if (filter)      list = list.filter(r => r.type === filter);
  if (searchQuery) list = list.filter(r =>
    r.title.toLowerCase().includes(searchQuery) ||
    (r.description || '').toLowerCase().includes(searchQuery) ||
    (r.lessonTitle || '').toLowerCase().includes(searchQuery)
  );

  const grid  = document.getElementById('resources-grid');
  const empty = document.getElementById('resources-empty');

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = list.map(r => {
    const typeInfo = CONFIG.RESOURCE_TYPES[r.type] || { label: 'أخرى', icon: '📌' };
    const badgeCls = `badge-${r.type}`;
    return `
      <div class="resource-card">
        <div><span class="resource-type-badge ${badgeCls}">${typeInfo.icon} ${typeInfo.label}</span></div>
        <div class="resource-title">${escHtml(r.title)}</div>
        <div class="resource-desc">${escHtml(r.description || '')}</div>
        ${r.url ? `<a href="${escHtml(r.url)}" target="_blank" class="resource-link">🔗 ${escHtml(r.url)}</a>` : ''}
        ${r.lessonTitle ? `<div class="text-muted" style="margin-top:6px;font-size:0.8rem;cursor:pointer" onclick="viewLessonByTitle('${escHtml(r.lessonId||'')}')">📝 مرتبط بـ: ${escHtml(r.lessonTitle)}</div>` : ''}
        <div style="display:flex;justify-content:flex-end;margin-top:10px;gap:6px">
          ${r.url ? `<a href="${escHtml(r.url)}" target="_blank" class="btn btn-ghost btn-sm">فتح</a>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteResource('${r.id}')">حذف</button>
        </div>
      </div>`;
  }).join('');
};

const openAddResourceModal = (preLessonId = '') => {
  const lessons = DB.lessons.getAll();
  const lessonOptions = lessons.map(l => `<option value="${l.id}" ${l.id === preLessonId ? 'selected' : ''}>${escHtml(l.title)}</option>`).join('');

  openModal(`
    <div class="modal-title">🔗 إضافة مورد تعليمي</div>
    <div class="form-group mt-1"><label>عنوان المورد *</label>
      <input type="text" id="m-res-title" class="form-input" placeholder="اسم المورد" /></div>
    <div class="form-group mt-1"><label>نوع المورد</label>
      <select id="m-res-type" class="form-select">
        <option value="link">🔗 رابط</option><option value="file">📄 ملف</option>
        <option value="video">🎬 فيديو</option><option value="book">📚 كتاب</option><option value="other">📌 أخرى</option>
      </select></div>
    <div class="form-group mt-1"><label>الرابط / URL</label>
      <input type="url" id="m-res-url" class="form-input" placeholder="https://..." /></div>
    <div class="form-group mt-1"><label>وصف المورد</label>
      <textarea id="m-res-desc" class="form-textarea" rows="2" placeholder="وصف مختصر…"></textarea></div>
    <div class="form-group mt-1"><label>ربط بدرس</label>
      <select id="m-res-lesson" class="form-select"><option value="">لا يوجد</option>${lessonOptions}</select></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveResource()">حفظ</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const saveResource = async () => {
  const title    = document.getElementById('m-res-title').value.trim();
  const type     = document.getElementById('m-res-type').value;
  const url      = document.getElementById('m-res-url').value.trim();
  const desc     = document.getElementById('m-res-desc').value.trim();
  const lessonId = document.getElementById('m-res-lesson').value;

  if (!title) { showToast('يرجى إدخال عنوان المورد', 'warn'); return; }

  const lesson = lessonId ? DB.lessons.getById(lessonId) : null;

  showLoading(); await fakeAsync();
  DB.resources.add({ title, type, url, description: desc, lessonId, lessonTitle: lesson?.title || '' });
  hideLoading();
  closeModal();
  renderResources();
  showToast('تمت إضافة المورد ✅');
};

const deleteResource = (id) => {
  DB.resources.delete(id);
  renderResources();
  showToast('تم حذف المورد', 'info');
};

/* ═══════════════════════════════════════════════
   14. REPORTS MODULE
   ═══════════════════════════════════════════════ */
const generateStudentReport = () => {
  const students = DB.students.getAll();
  const classes  = DB.classes.getAll();
  if (students.length === 0) { showToast('لا يوجد طلاب لإنشاء التقرير', 'warn'); return; }

  const classOptions = classes.map(c =>
    `<option value="${c.id}">${escHtml(c.name)} — ${escHtml(c.grade)}</option>`
  ).join('');

  const buildStudentOpts = (classId = '') => {
    const list = classId ? students.filter(s => s.classId === classId) : students;
    return list.map(s => {
      const cls = s.classId ? classes.find(c => c.id === s.classId) : null;
      return `<option value="${s.id}">${escHtml(s.name)}${cls ? ' — ' + escHtml(cls.name) : ''}</option>`;
    }).join('');
  };

  openModal(`
    <div class="modal-title">👤 تقرير طالب</div>
    <div class="form-group mt-1">
      <label>الفصل (للتصفية)</label>
      <select id="r-report-class" class="form-select" onchange="filterReportStudents()">
        <option value="">كل الفصول</option>${classOptions}
      </select>
    </div>
    <div class="form-group mt-1">
      <label>اختر الطالب *</label>
      <select id="r-student-sel" class="form-select">
        <option value="">اختر…</option>${buildStudentOpts()}
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="showStudentReportModal()">📊 عرض التقرير</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const filterReportStudents = () => {
  const classId  = document.getElementById('r-report-class')?.value || '';
  const stdSel   = document.getElementById('r-student-sel');
  if (!stdSel) return;
  const students = DB.students.getAll();
  const classes  = DB.classes.getAll();
  const list     = classId ? students.filter(s => s.classId === classId) : students;
  stdSel.innerHTML = '<option value="">اختر…</option>' +
    list.map(s => {
      const cls = s.classId ? classes.find(c => c.id === s.classId) : null;
      return `<option value="${s.id}">${escHtml(s.name)}${cls ? ' — ' + escHtml(cls.name) : ''}</option>`;
    }).join('');
};

const showStudentReportModal = () => {
  const id = document.getElementById('r-student-sel').value;
  if (!id) { showToast('يرجى اختيار طالب', 'warn'); return; }
  closeModal();
  viewStudentReport(id);
};

const generateClassReport = () => {
  const classes = DB.classes.getAll();
  if (classes.length === 0) { showToast('لا توجد فصول لإنشاء التقرير', 'warn'); return; }

  openModal(`
    <div class="modal-title">🏫 تقرير الفصل</div>
    <div class="form-group mt-1"><label>اختر الفصل</label>
      <select id="r-class-sel" class="form-select">
        <option value="">اختر…</option>
        ${classes.map(c => `<option value="${c.id}">${escHtml(c.name)} — ${escHtml(c.grade)}</option>`).join('')}
      </select></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="renderClassReport()">عرض التقرير</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const renderClassReport = () => {
  const classId = document.getElementById('r-class-sel').value;
  if (!classId) { showToast('يرجى اختيار فصل', 'warn'); return; }
  closeModal();

  const cls      = DB.classes.getById(classId);
  const students = DB.students.getByClass(classId);
  const avgs     = students.map(s => DB.students.getAverage(s)).filter(v => v !== null);
  const classAvg = avgs.length ? Math.round(avgs.reduce((a,b)=>a+b,0)/avgs.length) : null;
  const behaviorCount = {ممتاز:0, جيد:0, مقبول:0, ضعيف:0};
  students.forEach(s => { if (behaviorCount.hasOwnProperty(s.behavior)) behaviorCount[s.behavior]++; });

  const _outer = document.getElementById('report-output'); _outer.classList.remove('hidden'); const outputEl = document.getElementById('report-output-content');
  outputEl.innerHTML = `
    <h2 style="margin-bottom:20px">📊 تقرير الفصل: ${escHtml(cls.name)} — ${escHtml(cls.grade)}</h2>
    <div class="report-stats-grid">
      <div style="text-align:center;background:var(--bg-tertiary);padding:20px;border-radius:12px">
        <div style="font-size:2rem;font-weight:800;color:var(--accent-blue)">${students.length}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">عدد الطلاب</div>
      </div>
      <div style="text-align:center;background:var(--bg-tertiary);padding:20px;border-radius:12px">
        <div style="font-size:2rem;font-weight:800;color:var(--accent-green)">${classAvg !== null ? classAvg + '%' : '—'}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">متوسط الأداء</div>
      </div>
      <div style="text-align:center;background:var(--bg-tertiary);padding:20px;border-radius:12px">
        <div style="font-size:2rem;font-weight:800;color:var(--accent-purple)">${cls.capacity || '—'}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">عدد المقاعد</div>
      </div>
    </div>
    <h3 style="margin-bottom:12px">توزيع السلوك</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
      ${Object.entries(behaviorCount).map(([b,c]) => `<span class="pill pill-blue" style="font-size:0.85rem;padding:6px 14px">${b}: ${c}</span>`).join('')}
    </div>
    <h3 style="margin-bottom:12px">قائمة الطلاب</h3>
    <div class="data-table-wrapper">
    <table class="data-table">
      <thead><tr><th>#</th><th>الاسم</th><th>المتوسط</th><th>السلوك</th><th>الملاحظات</th></tr></thead>
      <tbody>
        ${students.map((s,i) => {
          const avg = DB.students.getAverage(s);
          return `<tr>
            <td>${i+1}</td><td>${escHtml(s.name)}</td>
            <td style="font-weight:700;color:${avg !== null ? (avg>=80?'var(--accent-green)':avg>=60?'var(--accent-orange)':'var(--accent-red)') : 'var(--text-muted)'}">${avg !== null ? avg+'%' : '—'}</td>
            <td>${escHtml(s.behavior||'—')}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${escHtml(s.notes||'—')}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
  `;
  _outer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const generateCurriculumReport = () => {
  const units = DB.curriculum.getAll();
  const _outer = document.getElementById('report-output'); _outer.classList.remove('hidden'); const outputEl = document.getElementById('report-output-content');

  if (units.length === 0) {
    outputEl.innerHTML = '<div class="empty-state"><span>📐</span><p>لا توجد وحدات منهجية</p></div>';
    return;
  }

  const totalSessions     = units.reduce((s, u) => s + u.totalSessions, 0);
  const completedSessions = units.reduce((s, u) => s + u.completedSessions, 0);
  const overallPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  outputEl.innerHTML = `
    <h2 style="margin-bottom:20px">📐 تقرير إنجاز المنهج</h2>
    <div style="text-align:center;background:var(--bg-tertiary);padding:24px;border-radius:12px;margin-bottom:24px">
      <div style="font-size:3rem;font-weight:800;color:var(--accent-blue)">${overallPct}%</div>
      <div>إجمالي الإنجاز — ${completedSessions} من ${totalSessions} حصة</div>
    </div>
    ${units.map(u => {
      const pct = u.totalSessions > 0 ? Math.round((u.completedSessions / u.totalSessions) * 100) : 0;
      return `<div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-weight:600;margin-bottom:6px">
          <span>${escHtml(u.name)} <span class="text-muted">(${escHtml(u.className||'')})</span></span>
          <span style="color:var(--accent-blue)">${pct}%</span>
        </div>
        <div class="progress-bar-wrapper"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="progress-label"><span>${u.completedSessions}/${u.totalSessions} حصة</span></div>
      </div>`;
    }).join('')}
  `;
  _outer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const generateFullReport = () => {
  const lessons  = DB.lessons.getAll();
  const classes  = DB.classes.getAll();
  const students = DB.students.getAll();
  const units    = DB.curriculum.getAll();
  const avgs     = students.map(s => DB.students.getAverage(s)).filter(v => v !== null);
  const overallAvg = avgs.length ? Math.round(avgs.reduce((a,b)=>a+b,0)/avgs.length) : null;
  const totalSessions = units.reduce((s,u)=>s+u.totalSessions,0);
  const completedSessions = units.reduce((s,u)=>s+u.completedSessions,0);
  const overallPct = totalSessions > 0 ? Math.round((completedSessions/totalSessions)*100) : 0;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>التقرير الشامل</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #fff; color: #1a1d2e; direction: rtl; font-size: 13px; }
  .page { max-width: 210mm; margin: 0 auto; padding: 18mm 15mm; }
  h1 { font-size: 22px; color: #4f6ef7; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #9097b5; margin-bottom: 24px; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .stat { background: #f5f6fa; border-radius: 10px; padding: 16px; text-align: center; border-right: 3px solid #4f6ef7; }
  .stat strong { display: block; font-size: 24px; font-weight: 800; color: #4f6ef7; }
  .stat span { font-size: 11px; color: #5a6282; }
  h2 { font-size: 15px; color: #4f6ef7; border-bottom: 2px solid #4f6ef7; padding-bottom: 6px; margin: 24px 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f5f6fa; padding: 8px 10px; text-align: right; font-weight: 700; color: #5a6282; border-bottom: 2px solid #e4e7f0; }
  td { padding: 8px 10px; border-bottom: 1px solid #e4e7f0; }
  tr:last-child td { border-bottom: none; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; }
  .green { background: rgba(46,203,126,.15); color: #2ecb7e; }
  .orange { background: rgba(245,150,58,.15); color: #f5963a; }
  .red { background: rgba(239,79,110,.15); color: #ef4f6e; }
  .progress-wrap { background: #e4e7f0; border-radius: 20px; height: 8px; overflow: hidden; margin-top: 4px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg,#4f6ef7,#9b59f5); border-radius: 20px; }
  .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #9097b5; border-top: 1px solid #e4e7f0; padding-top: 12px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <h1>📊 التقرير الشامل</h1>
  <div class="subtitle">تم إنشاؤه بتاريخ: ${new Date().toLocaleDateString('ar-SA', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>

  <div class="stats">
    <div class="stat"><strong>${classes.length}</strong><span>الفصول</span></div>
    <div class="stat"><strong>${students.length}</strong><span>الطلاب</span></div>
    <div class="stat"><strong>${lessons.length}</strong><span>الدروس</span></div>
    <div class="stat"><strong>${overallAvg !== null ? overallAvg+'%' : '—'}</strong><span>متوسط الأداء</span></div>
  </div>

  <h2>🏫 الفصول الدراسية</h2>
  <table>
    <thead><tr><th>#</th><th>الفصل</th><th>الصف</th><th>المعلم</th><th>الطلاب</th><th>المقاعد</th></tr></thead>
    <tbody>
      ${classes.map((c,i)=>{
        const cnt = students.filter(s=>s.classId===c.id).length;
        return `<tr><td>${i+1}</td><td><strong>${escHtml(c.name)}</strong></td><td>${escHtml(c.grade)}</td><td>${escHtml(c.teacher||'—')}</td><td>${cnt}</td><td>${c.capacity||'—'}</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2>👥 الطلاب</h2>
  <table>
    <thead><tr><th>#</th><th>الاسم</th><th>الفصل</th><th>المتوسط</th><th>السلوك</th></tr></thead>
    <tbody>
      ${students.map((s,i)=>{
        const avg = DB.students.getAverage(s);
        const cls = s.classId ? classes.find(c=>c.id===s.classId) : null;
        const pillCls = avg===null?'':(avg>=80?'green':avg>=60?'orange':'red');
        return `<tr><td>${i+1}</td><td><strong>${escHtml(s.name)}</strong></td><td>${cls?escHtml(cls.name):'—'}</td><td><span class="pill ${pillCls}">${avg!==null?avg+'%':'—'}</span></td><td>${escHtml(s.behavior||'—')}</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2>📝 الدروس المحضّرة</h2>
  <table>
    <thead><tr><th>#</th><th>عنوان الدرس</th><th>المادة</th><th>الصف</th><th>التاريخ</th></tr></thead>
    <tbody>
      ${lessons.map((l,i)=>`<tr><td>${i+1}</td><td><strong>${escHtml(l.title)}</strong></td><td>${escHtml(l.subject)}</td><td>${escHtml(l.grade)}</td><td>${formatDate(l.date)}</td></tr>`).join('')}
    </tbody>
  </table>

  ${units.length ? `<h2>📐 إنجاز المنهج (${overallPct}%)</h2>
  <table>
    <thead><tr><th>#</th><th>الوحدة</th><th>الفصل</th><th>الحصص المكتملة</th><th>الإنجاز</th></tr></thead>
    <tbody>
      ${units.map((u,i)=>{
        const pct = u.totalSessions>0 ? Math.round((u.completedSessions/u.totalSessions)*100) : 0;
        return `<tr><td>${i+1}</td><td><strong>${escHtml(u.name)}</strong></td><td>${escHtml(u.className||'—')}</td><td>${u.completedSessions}/${u.totalSessions}</td><td><div>${pct}%</div><div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div></td></tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">${CONFIG.APP_NAME} v${CONFIG.VERSION}</div>
</div>
<script>window.onload = () => { window.print(); setTimeout(()=>window.close(),1500); }<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { showToast('يرجى السماح بالنوافذ المنبثقة لتصدير PDF', 'warn'); return; }
  win.document.write(html);
  win.document.close();
  showToast('جارٍ فتح نافذة التقرير الشامل ✅');
};

/* ═══════════════════════════════════════════════
   15. DARK MODE & UI
   ═══════════════════════════════════════════════ */
const toggleDarkMode = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
};

const toggleSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  const shell   = document.getElementById('app-shell');
  const overlay = document.getElementById('mobile-overlay');

  if (window.innerWidth <= 900) {
    const isOpen = sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active', isOpen);
  } else {
    sidebar.classList.toggle('collapsed');
    shell.classList.toggle('sidebar-collapsed');
    const icon = sidebar.classList.contains('collapsed') ? '⇥' : '⇤';
    document.getElementById('sidebar-toggle').textContent = icon;
  }
};

/* ═══════════════════════════════════════════════
   16. NOTIFICATIONS MODULE
   ═══════════════════════════════════════════════ */
const updateNotifBadge = () => {
  const unread = DB.notifications.getAll().filter(n => !n.read).length;
  const badge  = document.getElementById('notif-count');
  const bell   = document.getElementById('notif-count');
  badge.textContent = unread;
  badge.classList.toggle('hidden', unread === 0);
};

const toggleNotifications = () => {
  const dropdown = document.getElementById('notif-dropdown');
  const isHidden = dropdown.classList.contains('hidden');
  dropdown.classList.toggle('hidden', !isHidden);

  if (isHidden) {
    /* Render notifications list */
    const list = DB.notifications.getAll().slice(0, 10);
    const listEl = document.getElementById('notif-list');
    if (list.length === 0) {
      listEl.innerHTML = '<div class="notif-item">لا توجد إشعارات</div>';
    } else {
      listEl.innerHTML = list.map(n => `
        <div class="notif-item ${n.read ? 'read' : ''}" onclick="DB.notifications.markRead('${n.id}');updateNotifBadge();this.style.opacity='0.6'">
          <div>${escHtml(n.msg)}</div>
          <small style="color:var(--text-muted)">${formatTimestamp(n.date)}</small>
        </div>
      `).join('');
    }
  }
};

/* Close notifications on outside click */
document.addEventListener('click', (e) => {
  const bell = document.getElementById('notification-bell');
  const drop = document.getElementById('notif-dropdown');
  if (!bell.contains(e.target)) drop.classList.add('hidden');
});

/* ═══════════════════════════════════════════════
   17. APP INIT — Bootstrap everything
   ═══════════════════════════════════════════════ */
const initApp = () => {
  /* Hide splash screen after a brief branded moment */
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('splash-out');
      setTimeout(() => { splash.style.display = 'none'; }, 600);
    }
  }, 1800);
  /* Restore dark mode preference */
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('dark-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    const modeIcon = document.querySelector('#dark-mode-btn-top .mode-icon');
    if (modeIcon) modeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }

  /* Push initial history state */
  history.replaceState({ page: 'dashboard' }, '', '#dashboard');

  /* Set current date in top bar */
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  /* ✅ Seed sample data FIRST (before any render) */
  seedSampleData();

  /* Populate all class selects after seeding */
  populateClassSelects();
  populateCurriculumClassFilter();
  populateLessonClassSelect();

  /* Wire up lesson time inputs */
  prepLessonFormDefaults();

  /* Update notification badge */
  updateNotifBadge();

  /* Render dashboard last — data is guaranteed to exist now */
  renderDashboard();

  console.log(`%c${CONFIG.APP_NAME} v${CONFIG.VERSION} — Initialized ✅`, 'color:#4f6ef7;font-weight:700;font-size:14px');
};

/* ─── SEED SAMPLE DATA (first-run only) ─── */
const seedSampleData = () => {
  if (localStorage.getItem('seeded')) return;

  /* Sample classes */
  const cls1 = DB.classes.add({ name: 'الفصل أ', grade: 'الثالث الابتدائي', teacher: 'محمد أحمد', capacity: 30, color: 'أزرق' });
  const cls2 = DB.classes.add({ name: 'الفصل ب', grade: 'الثالث الابتدائي', teacher: 'فاطمة علي',  capacity: 28, color: 'أخضر' });

  /* Sample students */
  DB.students.add({ name: 'أحمد محمد',  classId: cls1.id, behavior: 'ممتاز', notes: 'طالب متفوق',  grades: [95, 88, 92] });
  DB.students.add({ name: 'سارة خالد',  classId: cls1.id, behavior: 'جيد',   notes: '',             grades: [75, 80, 78] });
  DB.students.add({ name: 'عمر فيصل',   classId: cls2.id, behavior: 'مقبول', notes: 'يحتاج متابعة', grades: [60, 55, 65] });
  DB.students.add({ name: 'نورة سعيد',  classId: cls2.id, behavior: 'ممتاز', notes: '',             grades: [98, 95, 97] });

  /* Sample lesson */
  DB.lessons.add({
    title: 'الأعداد من 1 إلى 100',
    subject: 'الرياضيات',
    grade: 'الثالث الابتدائي',
    classId: cls1.id,
    className: 'الفصل أ',
    date: new Date().toISOString().split('T')[0],
    objectives: 'أن يتعرف الطالب على الأعداد من 1 إلى 100 ويرتبها تصاعديًا وتنازليًا',
    bloom: ['remember', 'understand', 'apply'],
    explanation: 'نبدأ الدرس بمراجعة الأعداد السابقة ثم ننتقل إلى الأعداد الجديدة بشكل تدريجي',
    elements: 'مفهوم العدد، الترتيب التصاعدي والتنازلي، الأعداد الفردية والزوجية',
    strategies: 'التعلم التعاوني، التعلم باللعب، العصف الذهني',
    tools: 'السبورة التفاعلية، البطاقات المرقمة، مكعبات العد',
    activities: 'ترتيب البطاقات المرقمة، لعبة العد التصاعدي والتنازلي',
    assessment: 'أسئلة شفهية، تمرين كتابي في الكراسة',
    homework: 'كتابة الأعداد من 50 إلى 100',
    closure: 'تلخيص الدرس وتشجيع الطلاب على المراجعة',
    time: { intro: 5, explain: 15, activities: 15, assessment: 5, closure: 5 },
    createdAt: Date.now(),
  });

  /* Sample curriculum */
  DB.curriculum.add({ name: 'الوحدة الأولى — الأعداد', classId: cls1.id, className: 'الفصل أ', totalSessions: 12, completedSessions: 7, description: 'تشمل الأعداد والعمليات الأساسية' });
  DB.curriculum.add({ name: 'الوحدة الثانية — الهندسة', classId: cls2.id, className: 'الفصل ب', totalSessions: 8, completedSessions: 2, description: 'الأشكال الهندسية والمساحة' });

  /* Sample schedule */
  DB.schedule.add({ day: 'الأحد', period: 'الأولى', subject: 'الرياضيات', classId: cls1.id, className: 'الفصل أ' });
  DB.schedule.add({ day: 'الاثنين', period: 'الثانية', subject: 'اللغة العربية', classId: cls2.id, className: 'الفصل ب' });
  DB.schedule.add({ day: 'الثلاثاء', period: 'الأولى', subject: 'العلوم', classId: cls1.id, className: 'الفصل أ' });

  /* Sample behavior */
  DB.behavior.add({ studentId: DB.students.getAll()[0]?.id || '', studentName: 'أحمد محمد', classId: cls1.id, className: 'الفصل أ', type: 'positive', note: 'تميّز في حل تمارين الأعداد وساعد زملاءه' });
  DB.behavior.add({ studentId: DB.students.getAll()[2]?.id || '', studentName: 'عمر فيصل',  classId: cls2.id, className: 'الفصل ب', type: 'negative', note: 'تأخر عن الحصة مرتين هذا الأسبوع' });

  /* Sample notes */
  DB.notes.add({ title: 'تذكير مهم', content: 'مراجعة خطة الوحدة الأولى قبل يوم الأحد\nإحضار النماذج المطبوعة للاختبار القصير', color: 'yellow', pinned: true });
  DB.notes.add({ title: 'أفكار لتطوير الدرس', content: 'تجربة أسلوب التعلم التعاوني في درس الأعداد\nإضافة نشاط تفاعلي باستخدام البطاقات', color: 'blue', pinned: false });
  DB.notes.add({ title: 'اجتماع أولياء الأمور', content: 'الموعد: الخميس 8 مساءً\nموضوعات البحث: تقدم الطلاب، الواجبات، الأنشطة القادمة', color: 'green', pinned: false });

  /* Notification */
  DB.notifications.add('مرحبًا! تم تحميل بيانات تجريبية للبدء بالنظام 🎉');

  localStorage.setItem('seeded', '1');
  /* Note: UI refresh is handled by initApp after seedSampleData returns */
};

/* ═══════════════════════════════════════════════
   18. BACKUP & RESTORE MODULE
   ═══════════════════════════════════════════════ */

const backupData = () => {
  try {
    const data = {
      lessons: DB.lessons.getAll(),
      classes: DB.classes.getAll(),
      students: DB.students.getAll(),
      schedule: DB.schedule.getAll(),
      curriculum: DB.curriculum.getAll(),
      behavior: DB.behavior.getAll(),
      resources: DB.resources.getAll(),
      attendance: DB.attendance.getAll(),
      notes: DB.notes.getAll(),
      notifications: DB.notifications.getAll(),
      appSettings: localStorage.getItem('appSettings') || '{}',
      backupDate: new Date().toISOString(),
      version: CONFIG.VERSION
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-notebook-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم إنشاء النسخة الاحتياطية بنجاح', 'success');
  } catch (error) {
    showToast('حدث خطأ أثناء إنشاء النسخة الاحتياطية', 'error');
  }
};

const restoreData = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validate data structure
      if (!data.lessons || !data.classes || !data.students) {
        showToast('ملف غير صالح', 'error');
        return;
      }
      
      showLoading();
      
      localStorage.setItem('lessons',       JSON.stringify(data.lessons));
      localStorage.setItem('classes',       JSON.stringify(data.classes));
      localStorage.setItem('students',      JSON.stringify(data.students));
      localStorage.setItem('schedule',      JSON.stringify(data.schedule || []));
      localStorage.setItem('curriculum',    JSON.stringify(data.curriculum || []));
      localStorage.setItem('behavior',      JSON.stringify(data.behavior || []));
      localStorage.setItem('resources',     JSON.stringify(data.resources || []));
      localStorage.setItem('attendance',    JSON.stringify(data.attendance || []));
      localStorage.setItem('notes',         JSON.stringify(data.notes || []));
      localStorage.setItem('notifications', JSON.stringify(data.notifications || []));
      if (data.appSettings) localStorage.setItem('appSettings', data.appSettings);
      localStorage.setItem('seeded', '1');
      
      hideLoading();
      showToast('تم استعادة البيانات بنجاح ✅', 'success');

      /* Full UI refresh */
      populateClassSelects();
      populateCurriculumClassFilter();
      populateLessonClassSelect();
      renderDashboard();
      updateNotifBadge();

      /* Refresh current page */
      const activePage = document.querySelector('.page.active');
      if (activePage) {
        const currentPage = activePage.id.replace('page-', '');
        if (currentPage && currentPage !== 'dashboard') navigate(currentPage);
      }
      
    } catch (error) {
      hideLoading();
      showToast('خطأ في قراءة الملف', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset input
};

/* ═══════════════════════════════════════════════
   19. ADVANCED STATISTICS MODULE
   ═══════════════════════════════════════════════ */

const showAdvancedStats = () => {
  const lessons = DB.lessons.getAll();
  const students = DB.students.getAll();
  const classes = DB.classes.getAll();
  const behavior = DB.behavior.getAll();
  
  // Calculate statistics
  const lessonsBySubject = {};
  lessons.forEach(l => {
    lessonsBySubject[l.subject] = (lessonsBySubject[l.subject] || 0) + 1;
  });
  
  const behaviorStats = {
    positive: behavior.filter(b => b.type === 'positive').length,
    negative: behavior.filter(b => b.type === 'negative').length,
    neutral: behavior.filter(b => b.type === 'neutral').length
  };
  
  const topSubjects = Object.entries(lessonsBySubject)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const avgGradesByClass = {};
  classes.forEach(cls => {
    const clsStudents = students.filter(s => s.classId === cls.id);
    const avgs = clsStudents.map(s => DB.students.getAverage(s)).filter(v => v !== null);
    avgGradesByClass[cls.name] = avgs.length ? 
      Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
  });
  
  const html = `
    <div class="modal-title">📊 إحصائيات متقدمة</div>
    
    <div style="margin-bottom: 20px;">
      <h4 style="color: var(--accent-blue); margin-bottom: 10px;">📚 توزيع الدروس حسب المادة</h4>
      <table class="data-table" style="min-width: auto;">
        <thead>
          <tr><th>المادة</th><th>عدد الدروس</th><th>النسبة</th></tr>
        </thead>
        <tbody>
          ${topSubjects.map(([subject, count]) => `
            <tr>
              <td><strong>${escHtml(subject)}</strong></td>
              <td>${count}</td>
              <td>${Math.round((count / lessons.length) * 100)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h4 style="color: var(--accent-green); margin-bottom: 10px;">📊 تحليل السلوك</h4>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <span class="pill pill-green">إيجابي: ${behaviorStats.positive}</span>
        <span class="pill pill-red">سلبي: ${behaviorStats.negative}</span>
        <span class="pill pill-gray">محايد: ${behaviorStats.neutral}</span>
      </div>
    </div>
    
    <div>
      <h4 style="color: var(--accent-purple); margin-bottom: 10px;">🏫 متوسط الأداء حسب الفصل</h4>
      <table class="data-table" style="min-width: auto;">
        <thead>
          <tr><th>الفصل</th><th>المتوسط</th><th>التقييم</th></tr>
        </thead>
        <tbody>
          ${Object.entries(avgGradesByClass).map(([className, avg]) => `
            <tr>
              <td><strong>${escHtml(className)}</strong></td>
              <td style="font-weight:700; color: ${avg >= 80 ? 'var(--accent-green)' : avg >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)'}">${avg}%</td>
              <td>
                <span class="pill ${avg >= 80 ? 'pill-green' : avg >= 60 ? 'pill-orange' : 'pill-red'}">
                  ${avg >= 80 ? 'ممتاز' : avg >= 60 ? 'جيد' : 'بحاجة تحسين'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="form-actions">
      <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة</button>
      <button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>
    </div>
  `;
  
  openModal(html);
};

/* ═══════════════════════════════════════════════
   20. EXPORT ALL LESSONS MODULE
   ═══════════════════════════════════════════════ */

const exportAllLessons = () => {
  const lessons = DB.lessons.getAll();
  if (lessons.length === 0) {
    showToast('لا توجد دروس للتصدير', 'warn');
    return;
  }
  
  const data = lessons.map(l => ({
    العنوان: l.title,
    المادة: l.subject,
    الصف: l.grade,
    الفصل: l.className,
    التاريخ: formatDate(l.date),
    الأهداف: l.objectives,
    الشرح: l.explanation
  }));
  
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  ].join('\n');
  
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all-lessons-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير جميع الدروس بنجاح', 'success');
};

/* ═══════════════════════════════════════════════
   23. SETTINGS MODULE
   ═══════════════════════════════════════════════ */
/* getSettings and getDashboardGreeting are defined early in section 5 */

const saveSettings = () => {
  const settings = {
    teacherName:    document.getElementById('s-teacher-name')?.value.trim() || '',
    teacherSubject: document.getElementById('s-teacher-subject')?.value.trim() || '',
    schoolName:     document.getElementById('s-school-name')?.value.trim() || '',
    schoolYear:     document.getElementById('s-school-year')?.value.trim() || '',
  };
  localStorage.setItem('appSettings', JSON.stringify(settings));
  showToast('تم حفظ الإعدادات بنجاح ✅');
  /* Update avatar */
  const av = document.getElementById('settings-avatar');
  if (av && settings.teacherName) av.textContent = settings.teacherName.charAt(0);
  /* Update dashboard greeting */
  renderDashboard();
};

const renderSettings = () => {
  const s = getSettings();
  const nameEl    = document.getElementById('s-teacher-name');
  const subjEl    = document.getElementById('s-teacher-subject');
  const schoolEl  = document.getElementById('s-school-name');
  const yearEl    = document.getElementById('s-school-year');
  const avatarEl  = document.getElementById('settings-avatar');

  if (nameEl)   nameEl.value   = s.teacherName    || '';
  if (subjEl)   subjEl.value   = s.teacherSubject  || '';
  if (schoolEl) schoolEl.value = s.schoolName      || '';
  if (yearEl)   yearEl.value   = s.schoolYear      || '';
  if (avatarEl) avatarEl.textContent = s.teacherName ? s.teacherName.charAt(0) : 'م';

  /* Theme checkmarks */
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('theme-light-check')?.classList.toggle('hidden', isDark);
  document.getElementById('theme-dark-check')?.classList.toggle('hidden', !isDark);

  /* Usage stats */
  const statsEl = document.getElementById('usage-stats-list');
  if (statsEl) {
    const lessons   = DB.lessons.getAll().length;
    const students  = DB.students.getAll().length;
    const classes   = DB.classes.getAll().length;
    const resources = DB.resources.getAll().length;
    const behavior  = DB.behavior.getAll().length;
    const attendance= DB.attendance.getAll().length;
    const notes     = DB.notes.getAll().length;
    const storageStr = JSON.stringify(localStorage).length;
    const storagekb  = (storageStr / 1024).toFixed(1);

    statsEl.innerHTML = `
      <div class="usage-stats-grid">
        <div class="usage-stat"><strong>${lessons}</strong><small>درس محضَّر</small></div>
        <div class="usage-stat"><strong>${students}</strong><small>طالب</small></div>
        <div class="usage-stat"><strong>${classes}</strong><small>فصل دراسي</small></div>
        <div class="usage-stat"><strong>${resources}</strong><small>مورد تعليمي</small></div>
        <div class="usage-stat"><strong>${behavior}</strong><small>ملاحظة سلوك</small></div>
        <div class="usage-stat"><strong>${notes}</strong><small>مذكرة</small></div>
      </div>
      <div style="margin-top:16px;padding:12px;background:var(--bg-tertiary);border-radius:10px;font-size:0.82rem;color:var(--text-muted);text-align:center">
        💾 حجم البيانات المستخدمة: <strong style="color:var(--accent-blue)">${storagekb} KB</strong>
      </div>`;
  }
};

const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('darkMode', theme);
  document.getElementById('dark-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  const modeIcon = document.querySelector('#dark-mode-btn-top .mode-icon');
  if (modeIcon) modeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('theme-light-check')?.classList.toggle('hidden', theme === 'dark');
  document.getElementById('theme-dark-check')?.classList.toggle('hidden', theme !== 'dark');
  /* Redraw chart if on dashboard */
  if (document.getElementById('page-dashboard')?.classList.contains('active')) {
    renderPerformanceChart(DB.classes.getAll(), DB.students.getAll());
  }
};

const confirmClearAllData = () => {
  openModal(`
    <div class="modal-title danger">⚠️ حذف جميع البيانات</div>
    <div style="background:rgba(239,68,68,0.08);border:2px solid var(--accent-red);border-radius:12px;padding:20px;margin-bottom:20px">
      <p style="font-weight:700;color:var(--accent-red);margin-bottom:8px">تحذير: هذه العملية لا يمكن التراجع عنها!</p>
      <p style="font-size:0.9rem;color:var(--text-secondary)">سيتم حذف جميع البيانات بما فيها: الدروس، الطلاب، الفصول، جداول الحصص، المنهج، السجلات السلوكية، الحضور، والموارد التعليمية.</p>
    </div>
    <p style="font-size:0.9rem;margin-bottom:16px">اكتب <strong>حذف</strong> للتأكيد:</p>
    <input type="text" id="clear-confirm-input" class="form-input" placeholder='اكتب "حذف" هنا' />
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-danger" onclick="executeClearAllData()">🗑️ حذف كل البيانات</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const executeClearAllData = () => {
  const input = document.getElementById('clear-confirm-input')?.value.trim();
  if (input !== 'حذف') { showToast('يجب كتابة "حذف" للتأكيد', 'warn'); return; }
  const settings = localStorage.getItem('appSettings');
  const theme    = localStorage.getItem('darkMode');
  localStorage.clear();
  if (settings) localStorage.setItem('appSettings', settings);
  if (theme)    localStorage.setItem('darkMode', theme);
  closeModal();
  showToast('تم حذف جميع البيانات', 'info');
  navigate('dashboard');
};

/* ═══════════════════════════════════════════════
   25. TOOLS MODULE — الأدوات التعليمية
   ═══════════════════════════════════════════════ */

/* ── Timer State ── */
let _timerSeconds   = 45 * 60;
let _timerTotal     = 45 * 60;
let _timerInterval  = null;
let _timerRunning   = false;

const renderTools = () => {
  /* Populate class selects in tools */
  const classes = DB.classes.getAll();
  ['picker-class-sel', 'part-class-sel'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">اختر الفصل…</option>';
    classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} — ${c.grade}`;
      if (c.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  });
  updateTimerDisplay();
  updatePomoDisplay();
};

/* ─ Countdown Timer ─ */
const setTimer = (minutes) => {
  resetTimer();
  _timerSeconds = _timerTotal = minutes * 60;
  updateTimerDisplay();
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  const allPresets = document.querySelectorAll('.preset-btn');
  allPresets.forEach(b => { if (b.textContent === minutes + 'د') b.classList.add('active'); });
};

const openCustomTimerModal = () => {
  openModal(`
    <div class="modal-title">⏱️ مؤقت مخصص</div>
    <div class="form-group mt-1"><label>الدقائق</label>
      <input type="number" id="m-timer-min" class="form-input" placeholder="مثال: 25" min="1" max="180" /></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="applyCustomTimer()">تطبيق</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>`);
};

const applyCustomTimer = () => {
  const m = parseInt(document.getElementById('m-timer-min').value);
  if (!m || m < 1) { showToast('أدخل عدد دقائق صحيح', 'warn'); return; }
  closeModal(); setTimer(m);
};

const toggleTimer = () => {
  if (_timerRunning) {
    clearInterval(_timerInterval); _timerRunning = false;
    document.getElementById('timer-start-btn').textContent = '▶ استمرار';
  } else {
    if (_timerSeconds <= 0) { resetTimer(); return; }
    _timerRunning = true;
    document.getElementById('timer-start-btn').textContent = '⏸ إيقاف';
    _timerInterval = setInterval(() => {
      _timerSeconds--;
      updateTimerDisplay();
      if (_timerSeconds <= 0) {
        clearInterval(_timerInterval); _timerRunning = false;
        document.getElementById('timer-start-btn').textContent = '▶ ابدأ';
        document.getElementById('timer-label').textContent = 'انتهى الوقت! 🎉';
        showToast('⏰ انتهى وقت الحصة!', 'info', 5000);
        try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA').play(); } catch(e) {}
      }
    }, 1000);
  }
};

const resetTimer = () => {
  clearInterval(_timerInterval); _timerRunning = false;
  _timerSeconds = _timerTotal;
  document.getElementById('timer-start-btn').textContent = '▶ ابدأ';
  document.getElementById('timer-label').textContent = 'مستعد';
  updateTimerDisplay();
};

const updateTimerDisplay = () => {
  const el = document.getElementById('timer-time');
  const ring = document.getElementById('timer-ring-fill');
  if (!el) return;
  const m = Math.floor(_timerSeconds / 60).toString().padStart(2, '0');
  const s = (_timerSeconds % 60).toString().padStart(2, '0');
  el.textContent = `${m}:${s}`;
  /* Ring progress */
  if (ring) {
    const r = 88;
    const circumference = 2 * Math.PI * r;
    const pct = _timerTotal > 0 ? _timerSeconds / _timerTotal : 1;
    const offset = circumference * (1 - pct);
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;
    /* Color: green → orange → red */
    ring.style.stroke = pct > 0.5 ? '#10b981' : pct > 0.2 ? '#f59e0b' : '#ef4444';
  }
  /* Warn label */
  if (el) {
    const lbl = document.getElementById('timer-label');
    if (lbl && _timerRunning) {
      lbl.textContent = _timerSeconds <= 60 ? '⚠️ دقيقة أخيرة!' : _timerSeconds <= 300 ? '⏰ 5 دقائق' : 'جارٍ العد…';
    }
  }
};

/* ─ Pomodoro Timer ─ */
let _pomoSeconds  = 25 * 60;
let _pomoTotal    = 25 * 60;
let _pomoInterval = null;
let _pomoRunning  = false;
let _pomoSession  = 1;
let _pomoPhase    = 'work'; /* work | short | long */
const POMO_TIMES  = { work: 25, short: 5, long: 15 };

const setPomodoro = (phase) => {
  resetPomodoro();
  _pomoPhase = phase;
  _pomoSeconds = _pomoTotal = POMO_TIMES[phase] * 60;
  document.querySelectorAll('.pomo-phase-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`pomo-${phase === 'work' ? 'work' : phase === 'short' ? 'short' : 'long'}-btn`)?.classList.add('active');
  updatePomoDisplay();
};

const togglePomodoro = () => {
  if (_pomoRunning) {
    clearInterval(_pomoInterval); _pomoRunning = false;
    document.getElementById('pomo-start-btn').textContent = '▶ استمرار';
  } else {
    if (_pomoSeconds <= 0) { resetPomodoro(); return; }
    _pomoRunning = true;
    document.getElementById('pomo-start-btn').textContent = '⏸ إيقاف';
    _pomoInterval = setInterval(() => {
      _pomoSeconds--;
      updatePomoDisplay();
      if (_pomoSeconds <= 0) {
        clearInterval(_pomoInterval); _pomoRunning = false;
        if (_pomoPhase === 'work') {
          _pomoSession++;
          showToast(`✅ جلسة تركيز ${_pomoSession - 1} انتهت! استرح الآن`, 'success', 5000);
          setPomodoro(_pomoSession % 4 === 0 ? 'long' : 'short');
        } else {
          showToast('⚡ انتهت الاستراحة، ابدأ جلسة تركيز جديدة!', 'info', 5000);
          setPomodoro('work');
        }
      }
    }, 1000);
  }
};

const resetPomodoro = () => {
  clearInterval(_pomoInterval); _pomoRunning = false;
  _pomoSeconds = _pomoTotal = POMO_TIMES[_pomoPhase] * 60;
  document.getElementById('pomo-start-btn').textContent = '▶ ابدأ';
  updatePomoDisplay();
};

const updatePomoDisplay = () => {
  const el = document.getElementById('pomo-display');
  const sc = document.getElementById('pomo-session-count');
  if (!el) return;
  const m = Math.floor(_pomoSeconds / 60).toString().padStart(2, '0');
  const s = (_pomoSeconds % 60).toString().padStart(2, '0');
  el.textContent = `${m}:${s}`;
  if (sc) sc.textContent = `جلسة ${_pomoSession} من 4`;
};

/* ─ Random Student Picker ─ */
let _pickerStudents   = [];
let _pickerExcluded   = [];

const loadPickerStudents = () => {
  const classId = document.getElementById('picker-class-sel')?.value;
  if (!classId) return;
  _pickerStudents = DB.students.getByClass(classId);
  _pickerExcluded = [];
  const btn = document.getElementById('picker-btn');
  if (btn) btn.disabled = _pickerStudents.length === 0;
  updatePickerRemaining();
  document.getElementById('picker-result')?.classList.add('hidden');
  document.getElementById('picker-empty').textContent = _pickerStudents.length === 0 ? 'لا يوجد طلاب في هذا الفصل' : 'اضغط "اختر طالباً"';
};

const pickRandomStudent = () => {
  const available = _pickerStudents.filter(s => !_pickerExcluded.includes(s.id));
  if (available.length === 0) {
    showToast('تم اختيار جميع الطلاب! جارٍ إعادة التعيين…', 'info');
    _pickerExcluded = [];
    return;
  }
  const picked = available[Math.floor(Math.random() * available.length)];
  const avEl  = document.getElementById('picker-avatar');
  const nmEl  = document.getElementById('picker-name');
  const resEl = document.getElementById('picker-result');
  const empEl = document.getElementById('picker-empty');
  if (avEl) avEl.textContent = picked.name.charAt(0);
  if (nmEl) nmEl.textContent = picked.name;
  resEl?.classList.remove('hidden');
  if (empEl) empEl.style.display = 'none';
  resEl?.classList.add('picker-bounce');
  setTimeout(() => resEl?.classList.remove('picker-bounce'), 600);
  const exBtn = document.getElementById('picker-exclude-btn');
  if (exBtn) { exBtn.style.display = 'inline-flex'; exBtn.dataset.id = picked.id; }
  updatePickerRemaining();
};

const excludePickedStudent = () => {
  const btn = document.getElementById('picker-exclude-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  if (id && !_pickerExcluded.includes(id)) {
    _pickerExcluded.push(id);
    updatePickerRemaining();
    pickRandomStudent();
  }
};

const updatePickerRemaining = () => {
  const remEl = document.getElementById('picker-remaining');
  if (!remEl) return;
  const total = _pickerStudents.length;
  const remaining = total - _pickerExcluded.length;
  remEl.textContent = total > 0 ? `${remaining} طالب لم يُختاروا بعد من ${total}` : '';
};

/* ─ Grade Calculator ─ */
const addGradeRow = () => {
  const container = document.getElementById('grade-calc-rows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'grade-calc-row';
  row.innerHTML = `
    <input type="text"   class="form-input" placeholder="اسم التقييم" style="flex:2"/>
    <input type="number" class="form-input" placeholder="الدرجة" min="0" max="100" style="flex:1" oninput="calcGrades()"/>
    <input type="number" class="form-input" placeholder="الوزن%" min="0" max="100" style="flex:1" value="100" oninput="calcGrades()"/>
    <button class="btn btn-danger btn-sm" onclick="removeGradeRow(this)">✕</button>`;
  container.appendChild(row);
};

const removeGradeRow = (btn) => {
  btn.closest('.grade-calc-row')?.remove();
  calcGrades();
};

const calcGrades = () => {
  const rows = document.querySelectorAll('.grade-calc-row');
  let weightedSum = 0, totalWeight = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input[type="number"]');
    const grade  = parseFloat(inputs[0]?.value);
    const weight = parseFloat(inputs[1]?.value) || 0;
    if (!isNaN(grade) && weight > 0) {
      weightedSum  += grade * weight;
      totalWeight  += weight;
    }
  });
  const resultEl = document.getElementById('grade-calc-result');
  const scoreEl  = resultEl?.querySelector('.gcr-score');
  const letterEl = document.getElementById('gcr-grade-letter');
  if (!resultEl) return;
  if (totalWeight === 0) { resultEl.classList.add('hidden'); return; }
  resultEl.classList.remove('hidden');
  const final = Math.round((weightedSum / totalWeight) * 10) / 10;
  if (scoreEl) scoreEl.textContent = final + '%';
  if (letterEl) {
    const letters = [[95,'A+'], [90,'A'], [85,'B+'], [80,'B'], [75,'C+'], [70,'C'], [65,'D+'], [60,'D'], [0,'F']];
    const letter = letters.find(([min]) => final >= min)?.[1] || 'F';
    const colors  = { 'A+': '#10b981', 'A': '#10b981', 'B+': '#3b82f6', 'B': '#3b82f6',
                      'C+': '#f59e0b', 'C': '#f59e0b', 'D+': '#ef4444', 'D': '#ef4444', 'F': '#6b7280' };
    letterEl.textContent = letter;
    letterEl.style.color = colors[letter] || '#6b7280';
  }
};

/* ─ Question Generator ─ */
const QUESTION_TEMPLATES = {
  remember:   t => [`ما تعريف ${t}؟`, `اذكر خصائص ${t}؟`, `من اكتشف ${t}؟`, `متى ظهر مفهوم ${t}؟`],
  understand: t => [`اشرح بأسلوبك مفهوم ${t}`, `ما الفرق بين ${t} ومفهوم مشابه؟`, `لماذا يُعدّ ${t} مهماً؟`],
  apply:      t => [`طبّق ${t} على مثال من حياتك`, `حل مسألة تتضمن ${t}`, `استخدم ${t} لحل المشكلة التالية…`],
  analyze:    t => [`حلّل العلاقة بين ${t} وعواملها`, `ما أسباب ظاهرة ${t}؟`, `قارن بين نتائج تطبيق ${t}`],
  evaluate:   t => [`قيّم أهمية ${t} في الحياة اليومية`, `هل ${t} مفيد أم ضار؟ وضّح مع الأدلة`, `ناقد مفهوم ${t}`],
  create:     t => [`صمّم نشاطاً يوضّح ${t}`, `اقترح حلاً إبداعياً لمشكلة ${t}`, `أنشئ قصة قصيرة تتضمن ${t}`],
};

const generateQuestions = () => {
  const topic  = document.getElementById('qgen-topic')?.value.trim();
  const bloom  = document.getElementById('qgen-bloom')?.value || 'remember';
  if (!topic) { showToast('أدخل موضوع الدرس', 'warn'); return; }
  const questions = QUESTION_TEMPLATES[bloom](topic);
  const outEl = document.getElementById('qgen-output');
  if (!outEl) return;
  outEl.classList.remove('hidden');
  outEl.innerHTML = `
    <div class="qgen-title">أسئلة على مستوى <strong>${CONFIG.BLOOM_LEVELS[bloom]?.label}</strong>:</div>
    <ol class="qgen-list">
      ${questions.map(q => `<li>${q}</li>`).join('')}
    </ol>
    <button class="btn btn-ghost btn-sm" onclick="copyQuestions()" style="width:100%;margin-top:8px">📋 نسخ الأسئلة</button>`;
};

const copyQuestions = () => {
  const list = document.querySelectorAll('.qgen-list li');
  const text = Array.from(list).map((li, i) => `${i+1}. ${li.textContent}`).join('\n');
  navigator.clipboard?.writeText(text).then(() => showToast('تم نسخ الأسئلة ✅'));
};

/* ─ Participation Counter ─ */
let _partData = {}; /* { studentId: count } */

const loadParticipationStudents = () => {
  const classId = document.getElementById('part-class-sel')?.value;
  if (!classId) return;
  const students = DB.students.getByClass(classId);
  if (!_partData[classId]) _partData[classId] = {};
  const pdata = _partData[classId];

  const container = document.getElementById('participation-list');
  if (!container) return;
  if (students.length === 0) {
    container.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px">لا يوجد طلاب</div>';
    return;
  }
  container.innerHTML = students.map(s => {
    const count = pdata[s.id] || 0;
    return `
      <div class="part-student-row" id="part-row-${s.id}">
        <span class="part-name">${escHtml(s.name)}</span>
        <div class="part-controls">
          <button class="part-btn minus" onclick="changeParticipation('${classId}','${s.id}',-1)">−</button>
          <span class="part-count ${count > 0 ? 'has-count' : ''}" id="part-count-${s.id}">${count}</span>
          <button class="part-btn plus" onclick="changeParticipation('${classId}','${s.id}',1)">+</button>
        </div>
      </div>`;
  }).join('');
};

const changeParticipation = (classId, studentId, delta) => {
  if (!_partData[classId]) _partData[classId] = {};
  _partData[classId][studentId] = Math.max(0, (_partData[classId][studentId] || 0) + delta);
  const countEl = document.getElementById(`part-count-${studentId}`);
  if (countEl) {
    countEl.textContent = _partData[classId][studentId];
    countEl.className = `part-count ${_partData[classId][studentId] > 0 ? 'has-count' : ''}`;
  }
};

const resetParticipation = () => {
  const classId = document.getElementById('part-class-sel')?.value;
  if (classId && _partData[classId]) { _partData[classId] = {}; loadParticipationStudents(); }
};

const exportParticipation = () => {
  const classId = document.getElementById('part-class-sel')?.value;
  if (!classId) { showToast('اختر فصلاً أولاً', 'warn'); return; }
  const students = DB.students.getByClass(classId);
  const cls = DB.classes.getById(classId);
  const pdata = _partData[classId] || {};
  const rows = students.map(s => `${s.name},${pdata[s.id] || 0}`).join('\n');
  const csv = `\uFEFFالطالب,عدد المشاركات\n${rows}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `مشاركة-${cls?.name || 'فصل'}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير سجل المشاركة ✅');
};

/* ═══════════════════════════════════════════════
   26. NOTES MODULE — مذكراتي
   ═══════════════════════════════════════════════ */
const NOTE_COLORS = {
  yellow: { bg: '#fef3c7', border: '#f59e0b', label: 'أصفر' },
  blue:   { bg: '#dbeafe', border: '#3b82f6', label: 'أزرق' },
  green:  { bg: '#d1fae5', border: '#10b981', label: 'أخضر' },
  pink:   { bg: '#fce7f3', border: '#ec4899', label: 'وردي' },
  purple: { bg: '#ede9fe', border: '#8b5cf6', label: 'بنفسجي' },
};
const NOTE_COLORS_DARK = {
  yellow: { bg: '#451a03', border: '#f59e0b', label: 'أصفر' },
  blue:   { bg: '#1e3a5f', border: '#3b82f6', label: 'أزرق' },
  green:  { bg: '#064e3b', border: '#10b981', label: 'أخضر' },
  pink:   { bg: '#500724', border: '#ec4899', label: 'وردي' },
  purple: { bg: '#2e1065', border: '#8b5cf6', label: 'بنفسجي' },
};

const renderNotes = () => {
  const search = document.getElementById('notes-search')?.value.toLowerCase() || '';
  const colorF = document.getElementById('notes-color-filter')?.value || '';
  let notes = DB.notes.getAll();
  if (search) notes = notes.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
  if (colorF) notes = notes.filter(n => n.color === colorF);

  /* Sort: pinned first */
  notes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const grid  = document.getElementById('notes-grid');
  const empty = document.getElementById('notes-empty');
  if (!grid) return;

  if (notes.length === 0) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const colorMap = isDark ? NOTE_COLORS_DARK : NOTE_COLORS;

  grid.innerHTML = notes.map(n => {
    const c = colorMap[n.color] || colorMap.yellow;
    return `
      <div class="note-card" style="background:${c.bg};border-color:${c.border}">
        <div class="note-card-header">
          <span class="note-title">${escHtml(n.title || '(بلا عنوان)')}</span>
          <div class="note-actions">
            <button class="note-action-btn" onclick="DB.notes.pin('${n.id}');renderNotes()" title="${n.pinned ? 'إلغاء التثبيت' : 'تثبيت'}">${n.pinned ? '📌' : '📍'}</button>
            <button class="note-action-btn" onclick="openEditNoteModal('${n.id}')" title="تعديل">✏️</button>
            <button class="note-action-btn" onclick="deleteNote('${n.id}')" title="حذف">🗑️</button>
          </div>
        </div>
        <div class="note-content">${escHtml(n.content || '').replace(/\n/g, '<br>')}</div>
        <div class="note-footer">
          <span class="note-color-dot" style="background:${c.border}"></span>
          <span class="note-date">${formatTimestamp(n.updatedAt)}</span>
          ${n.pinned ? '<span class="note-pin-badge">📌 مثبّتة</span>' : ''}
        </div>
      </div>`;
  }).join('');
};

const openAddNoteModal = () => {
  const colorOpts = Object.entries(NOTE_COLORS).map(([k, v]) =>
    `<option value="${k}">${v.label}</option>`).join('');
  openModal(`
    <div class="modal-title">📝 ملاحظة جديدة</div>
    <div class="form-group mt-1"><label>العنوان</label>
      <input type="text" id="m-note-title" class="form-input" placeholder="عنوان الملاحظة…" /></div>
    <div class="form-group mt-1"><label>المحتوى *</label>
      <textarea id="m-note-content" class="form-textarea" rows="5" placeholder="اكتب ملاحظتك هنا…"></textarea></div>
    <div class="form-group mt-1"><label>اللون</label>
      <select id="m-note-color" class="form-select">${colorOpts}</select></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveNote()">💾 حفظ</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>`);
};

const openEditNoteModal = (id) => {
  const n = DB.notes.getById(id);
  if (!n) return;
  const colorOpts = Object.entries(NOTE_COLORS).map(([k, v]) =>
    `<option value="${k}" ${k === n.color ? 'selected' : ''}>${v.label}</option>`).join('');
  openModal(`
    <div class="modal-title">✏️ تعديل الملاحظة</div>
    <input type="hidden" id="m-note-edit-id" value="${id}" />
    <div class="form-group mt-1"><label>العنوان</label>
      <input type="text" id="m-note-title" class="form-input" value="${escHtml(n.title || '')}" /></div>
    <div class="form-group mt-1"><label>المحتوى</label>
      <textarea id="m-note-content" class="form-textarea" rows="5">${escHtml(n.content || '')}</textarea></div>
    <div class="form-group mt-1"><label>اللون</label>
      <select id="m-note-color" class="form-select">${colorOpts}</select></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveNote(true)">تحديث</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>`);
};

const saveNote = async (isEdit = false) => {
  const title   = document.getElementById('m-note-title')?.value.trim() || '';
  const content = document.getElementById('m-note-content')?.value.trim() || '';
  const color   = document.getElementById('m-note-color')?.value || 'yellow';
  if (!content) { showToast('أدخل محتوى الملاحظة', 'warn'); return; }
  showLoading(); await fakeAsync(300);
  if (isEdit) {
    const id = document.getElementById('m-note-edit-id')?.value;
    DB.notes.update(id, { title, content, color });
    showToast('تم تحديث الملاحظة ✅');
  } else {
    DB.notes.add({ title, content, color, pinned: false });
    showToast('تمت إضافة الملاحظة ✅');
  }
  hideLoading(); closeModal(); renderNotes();
};

const deleteNote = (id) => {
  openModal(`
    <div class="modal-title danger">🗑️ حذف الملاحظة</div>
    <p style="margin-bottom:20px">هل أنت متأكد من حذف هذه الملاحظة؟</p>
    <div class="form-actions">
      <button class="btn btn-danger" onclick="DB.notes.delete('${id}');closeModal();renderNotes();showToast('تم الحذف','info')">نعم، احذف</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>`);
};

/* ─── START APP ON DOM READY ─── */
document.addEventListener('DOMContentLoaded', initApp);
/* ═══════════════════════════════════════════════
   21. ADDITIONAL MODULES — Notifications, FAB, Global Search, Attendance
   ═══════════════════════════════════════════════ */

/* ── Clear Notifications ── */
const clearAllNotifications = () => {
  DB.notifications.clearAll();
  updateNotifBadge();
  const el = document.getElementById('notif-list');
  if (el) el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">لا توجد إشعارات</div>';
  showToast('تم مسح الإشعارات', 'info');
};

/* ── Auto-fill grade from class in lesson form ── */
const autoFillGradeFromClass = () => {
  const classId = document.getElementById('lesson-class')?.value;
  if (!classId) return;
  const cls = DB.classes.getById(classId);
  if (cls && cls.grade) {
    const gradeInput = document.getElementById('lesson-grade');
    if (gradeInput && !gradeInput.value) {
      gradeInput.value = cls.grade;
      gradeInput.style.transition = 'border-color 0.3s';
      gradeInput.style.borderColor = 'var(--accent-green)';
      setTimeout(() => { gradeInput.style.borderColor = ''; }, 2000);
      showToast(`تم تعبئة الصف: ${cls.grade}`, 'info', 1500);
    }
  }
};

/* ── FAB ── */
let fabOpen = false;
const toggleFAB = () => {
  fabOpen = !fabOpen;
  const menu = document.getElementById('fab-menu');
  const icon = document.getElementById('fab-icon');
  const btn  = document.getElementById('fab-main');
  if (menu) menu.classList.toggle('hidden', !fabOpen);
  if (icon) icon.textContent = fabOpen ? '✕' : '+';
  if (btn)  btn.classList.toggle('fab-open', fabOpen);
};
const closeFAB = () => {
  fabOpen = false;
  const menu = document.getElementById('fab-menu');
  const icon = document.getElementById('fab-icon');
  const btn  = document.getElementById('fab-main');
  if (menu) menu.classList.add('hidden');
  if (icon) icon.textContent = '+';
  if (btn)  btn.classList.remove('fab-open');
};
document.addEventListener('click', (e) => {
  if (fabOpen && !e.target.closest('.fab-container')) closeFAB();
});

/* ── Global Search ── */
const openGlobalSearch = () => {
  document.getElementById('global-search-overlay')?.classList.remove('hidden');
  setTimeout(() => document.getElementById('global-search-input')?.focus(), 100);
};
const closeGlobalSearch = (event) => {
  if (!event || event.target === document.getElementById('global-search-overlay')) {
    document.getElementById('global-search-overlay')?.classList.add('hidden');
    const inp = document.getElementById('global-search-input');
    if (inp) inp.value = '';
    const res = document.getElementById('global-search-results');
    if (res) res.innerHTML = '<div class="search-hint">اكتب للبدء بالبحث…</div>';
  }
};
const performGlobalSearch = () => {
  const q = (document.getElementById('global-search-input')?.value || '').toLowerCase().trim();
  const results = document.getElementById('global-search-results');
  if (!results) return;
  if (!q || q.length < 2) {
    results.innerHTML = '<div class="search-hint">اكتب للبدء بالبحث…</div>';
    return;
  }
  let html = '';
  const lessons  = DB.lessons.getAll().filter(l => l.title.toLowerCase().includes(q) || (l.subject||'').toLowerCase().includes(q));
  const students = DB.students.getAll().filter(s => s.name.toLowerCase().includes(q));
  const classes  = DB.classes.getAll().filter(c => c.name.toLowerCase().includes(q) || c.grade.toLowerCase().includes(q));
  const resources = DB.resources.getAll().filter(r => r.title.toLowerCase().includes(q));

  if (lessons.length) {
    html += `<div class="search-group-label">📝 الدروس</div>`;
    html += lessons.slice(0,4).map(l => `
      <div class="search-result-item" onclick="closeGlobalSearch({target:document.getElementById('global-search-overlay')});viewLessonDetail('${l.id}')">
        <span class="search-result-icon">📋</span>
        <div><div class="search-result-title">${escHtml(l.title)}</div><div class="search-result-meta">${escHtml(l.subject)} · ${formatDate(l.date)}</div></div>
      </div>`).join('');
  }
  if (students.length) {
    html += `<div class="search-group-label">👥 الطلاب</div>`;
    html += students.slice(0,4).map(s => {
      const cls = s.classId ? DB.classes.getById(s.classId) : null;
      return `<div class="search-result-item" onclick="closeGlobalSearch({target:document.getElementById('global-search-overlay')});viewStudentReport('${s.id}')">
        <span class="search-result-icon">👤</span>
        <div><div class="search-result-title">${escHtml(s.name)}</div><div class="search-result-meta">${cls ? escHtml(cls.name) : '—'}</div></div>
      </div>`;
    }).join('');
  }
  if (classes.length) {
    html += `<div class="search-group-label">🏫 الفصول</div>`;
    html += classes.slice(0,3).map(c => `
      <div class="search-result-item" onclick="closeGlobalSearch({target:document.getElementById('global-search-overlay')});viewClassStudents('${c.id}')">
        <span class="search-result-icon">🏫</span>
        <div><div class="search-result-title">${escHtml(c.name)}</div><div class="search-result-meta">${escHtml(c.grade)}</div></div>
      </div>`).join('');
  }
  if (resources.length) {
    html += `<div class="search-group-label">🔗 الموارد</div>`;
    html += resources.slice(0,3).map(r => `
      <div class="search-result-item" onclick="closeGlobalSearch({target:document.getElementById('global-search-overlay')});navigate('resources')">
        <span class="search-result-icon">${CONFIG.RESOURCE_TYPES[r.type]?.icon || '📌'}</span>
        <div><div class="search-result-title">${escHtml(r.title)}</div><div class="search-result-meta">${CONFIG.RESOURCE_TYPES[r.type]?.label || ''}</div></div>
      </div>`).join('');
  }
  if (!html) html = '<div class="search-hint">لا توجد نتائج مطابقة</div>';
  results.innerHTML = html;
};
/* Global keyboard shortcuts are handled in the router section */


/* ═══════════════════════════════════════════════
   22. ATTENDANCE MODULE
   ═══════════════════════════════════════════════ */
const renderAttendance = () => {
  const classFilter  = document.getElementById('attendance-class-filter')?.value || '';
  const searchQuery  = (document.getElementById('attendance-search')?.value || '').toLowerCase();
  const dateFilter   = document.getElementById('attendance-date-filter')?.value || '';

  let records = DB.attendance.getAll();
  if (classFilter) records = records.filter(a => a.classId === classFilter);
  if (dateFilter)  records = records.filter(a => a.date === dateFilter);
  if (searchQuery) records = records.filter(a => (a.studentName||'').toLowerCase().includes(searchQuery));

  const container = document.getElementById('attendance-list');
  const emptyEl   = document.getElementById('attendance-empty');
  const summaryEl = document.getElementById('attendance-summary');

  if (records.length === 0) {
    if (container) container.innerHTML = '';
    if (emptyEl)   emptyEl.classList.remove('hidden');
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  const presentCount = records.filter(a => a.status === 'present').length;
  const absentCount  = records.filter(a => a.status === 'absent').length;
  const lateCount    = records.filter(a => a.status === 'late').length;
  const total = records.length;

  if (summaryEl) summaryEl.innerHTML = `
    <div class="attendance-stats">
      <div class="att-stat att-present"><strong>${presentCount}</strong><small>حاضر</small></div>
      <div class="att-stat att-absent"><strong>${absentCount}</strong><small>غائب</small></div>
      <div class="att-stat att-late"><strong>${lateCount}</strong><small>متأخر</small></div>
      <div class="att-stat"><strong>${total > 0 ? Math.round((presentCount/total)*100) : 0}%</strong><small>نسبة الحضور</small></div>
    </div>`;

  const byDate = {};
  records.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });

  if (container) container.innerHTML = Object.entries(byDate)
    .sort(([a],[b]) => b.localeCompare(a))
    .map(([date, recs]) => `
      <div class="attendance-session card" style="margin-bottom:16px;padding:0;overflow:hidden">
        <div class="attendance-session-header">
          <span>📅 ${formatDate(date)}</span>
          <span class="pill pill-blue">${recs[0]?.className || '—'}</span>
          <span style="font-size:0.8rem;color:var(--text-muted);margin-right:auto">${recs.filter(r=>r.status==='present').length}/${recs.length} حاضر</span>
        </div>
        <div class="attendance-records">
          ${recs.map(r => `
            <div class="attendance-record">
              <span class="att-student-name" onclick="viewStudentReportById('${r.studentId}')">${escHtml(r.studentName)}</span>
              <span class="pill ${r.status==='present'?'pill-green':r.status==='absent'?'pill-red':'pill-orange'}" style="font-size:0.72rem">
                ${r.status==='present'?'✅ حاضر':r.status==='absent'?'❌ غائب':'⚠️ متأخر'}
              </span>
            </div>`).join('')}
        </div>
      </div>`).join('');
};

const openTakeAttendanceModal = () => {
  const classes = DB.classes.getAll();
  if (classes.length === 0) { showToast('يجب إضافة فصول أولاً', 'warn'); return; }
  const today = new Date().toISOString().split('T')[0];
  const classOptions = classes.map(c => `<option value="${c.id}">${escHtml(c.name)} — ${escHtml(c.grade)}</option>`).join('');

  openModal(`
    <div class="modal-title">✅ تسجيل الحضور</div>
    <div class="form-group mt-1"><label>الفصل *</label>
      <select id="m-att-class" class="form-select" onchange="loadStudentsForAttendance()">
        <option value="">اختر الفصل</option>${classOptions}
      </select></div>
    <div class="form-group mt-1"><label>التاريخ *</label>
      <input type="date" id="m-att-date" class="form-input" value="${today}" /></div>
    <div id="m-att-students-container" style="margin-top:12px"></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveAttendance()">💾 حفظ الحضور</button>
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    </div>
  `);
};

const loadStudentsForAttendance = () => {
  const classId = document.getElementById('m-att-class')?.value;
  const container = document.getElementById('m-att-students-container');
  if (!container) return;
  if (!classId) { container.innerHTML = ''; return; }
  const students = DB.students.getByClass(classId);
  if (students.length === 0) {
    container.innerHTML = '<div class="text-muted" style="padding:12px;text-align:center">لا يوجد طلاب في هذا الفصل</div>';
    return;
  }
  container.innerHTML = `
    <div style="background:var(--bg-tertiary);border-radius:10px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <strong style="font-size:0.85rem">الطلاب (${students.length})</strong>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="markAllAttendance('present')">✅ الكل حاضر</button>
          <button class="btn btn-ghost btn-sm" onclick="markAllAttendance('absent')">❌ الكل غائب</button>
        </div>
      </div>
      ${students.map(s => `
        <div class="att-student-row" id="att-row-${s.id}" data-status="present">
          <span style="flex:1;font-size:0.88rem">${escHtml(s.name)}</span>
          <div class="att-toggle-group">
            <button class="att-toggle att-present-btn active" onclick="setStudentAttendance('${s.id}','present')">✅</button>
            <button class="att-toggle att-absent-btn" onclick="setStudentAttendance('${s.id}','absent')">❌</button>
            <button class="att-toggle att-late-btn" onclick="setStudentAttendance('${s.id}','late')">⚠️</button>
          </div>
        </div>`).join('')}
    </div>`;
};

const setStudentAttendance = (studentId, status) => {
  const row = document.getElementById(`att-row-${studentId}`);
  if (!row) return;
  row.dataset.status = status;
  row.querySelectorAll('.att-toggle').forEach(btn => btn.classList.remove('active'));
  const activeBtn = row.querySelector(`.att-${status}-btn`);
  if (activeBtn) activeBtn.classList.add('active');
};

const markAllAttendance = (status) => {
  document.querySelectorAll('[id^="att-row-"]').forEach(row => {
    const studentId = row.id.replace('att-row-', '');
    setStudentAttendance(studentId, status);
  });
};

const saveAttendance = async () => {
  const classId = document.getElementById('m-att-class')?.value;
  const date    = document.getElementById('m-att-date')?.value;
  if (!classId || !date) { showToast('يرجى تحديد الفصل والتاريخ', 'warn'); return; }
  const cls  = DB.classes.getById(classId);
  const rows = document.querySelectorAll('[id^="att-row-"]');
  if (rows.length === 0) { showToast('يرجى تحديد الطلاب أولاً', 'warn'); return; }
  const records = [];
  rows.forEach(row => {
    const studentId = row.id.replace('att-row-', '');
    const student = DB.students.getById(studentId);
    if (student) records.push({ studentId, studentName: student.name, status: row.dataset.status || 'present' });
  });
  showLoading();
  await fakeAsync(400);
  DB.attendance.saveSession({ classId, className: cls.name, date, records });
  hideLoading();
  closeModal();
  renderAttendance();
  showToast(`تم تسجيل حضور ${records.length} طالب ✅`);
  DB.notifications.add(`تم تسجيل الحضور لـ ${escHtml(cls.name)} بتاريخ ${formatDate(date)}`);
  updateNotifBadge();
};
