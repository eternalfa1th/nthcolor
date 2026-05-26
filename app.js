/* ═══════════════════════════════════════════════════════════════════
   가히의 공부 대시보드 — app.js
   Pure Vanilla JS, localStorage persistence
═══════════════════════════════════════════════════════════════════ */

// ── HELPERS ──────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const ls = {
  get: (k, def = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

function fmtTime(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateKor(date) {
  const days = ['일','월','화','수','목','금','토'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = days[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${w})`;
}

function getWeekDates() {
  const today = new Date();
  const dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

// ── SUBJECTS ─────────────────────────────────────────────────────────
const SUBJECTS = [
  { key: 'math',    label: '수학',   color: '#f9a8c9' },
  { key: 'science', label: '과학',   color: '#ffc0cb' },
  { key: 'english', label: '영어',   color: '#ffb3d1' },
  { key: 'korean',  label: '국어',   color: '#f4849e' },
  { key: 'social',  label: '사회',   color: '#ffa8be' },
  { key: 'history', label: '한국사', color: '#e88fa8' },
  { key: 'hanja',   label: '한문',   color: '#f0aab8' },
];

const MENTAL_CATS = [
  { key: 'positive', label: '긍정적인 마음 갖기' },
  { key: 'stress',   label: '스트레스 해소' },
  { key: 'social',   label: '사회적 관계' },
  { key: 'selfcare', label: '자기 돌봄' },
];

// ── STATE ─────────────────────────────────────────────────────────────
let currentDate = new Date();
let studyTimer = { running: false, elapsed: ls.get('studyElapsed', 0), interval: null };
let mealCount   = ls.get(`mealCount_${todayKey()}`, 0);
let studying    = false;
let eating      = false;
let eatTimer    = null;

// ── DATE NAV ──────────────────────────────────────────────────────────
function renderDate() {
  $('#dateDisplay').textContent = formatDateKor(currentDate);
  renderSubjects();
  renderMental();
}

$('#prevDay').onclick = () => { currentDate.setDate(currentDate.getDate() - 1); renderDate(); };
$('#nextDay').onclick = () => { currentDate.setDate(currentDate.getDate() + 1); renderDate(); };

// ── TABS (TODO PANEL) ─────────────────────────────────────────────────
$$('[data-tab]').forEach(btn => {
  btn.onclick = () => {
    $$('[data-tab]').forEach(b => b.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    $(`#tab-${btn.dataset.tab}`).classList.add('active');
  };
});

// ── SUBJECTS ──────────────────────────────────────────────────────────
function getDateKey(date = currentDate) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getSubjectTasks(subKey) {
  return ls.get(`tasks_${subKey}_${getDateKey()}`, []);
}

function saveSubjectTasks(subKey, tasks) {
  ls.set(`tasks_${subKey}_${getDateKey()}`, tasks);
}

function renderSubjects() {
  const container = $('#subjectsList');
  container.innerHTML = '';
  SUBJECTS.forEach(sub => {
    const tasks = getSubjectTasks(sub.key);
    const done  = tasks.filter(t => t.done).length;
    const block = document.createElement('div');
    block.className = 'subject-block fade-in';
    block.innerHTML = `
      <div class="subject-header" data-key="${sub.key}">
        <div class="subject-header-left">
          <span class="subject-dot" style="background:${sub.color}"></span>
          <span>${sub.label}</span>
          ${tasks.length ? `<span class="subject-badge">${done}/${tasks.length}</span>` : ''}
        </div>
        <div class="subject-actions">
          <button class="subj-btn add-task" data-key="${sub.key}">+ 추가</button>
          ${tasks.length ? `<button class="subj-btn del del-task" data-key="${sub.key}">- 삭제</button>` : ''}
        </div>
      </div>
      <div class="subject-tasks" id="tasks-${sub.key}">
        ${tasks.map((t, i) => `
          <div class="task-item fade-in">
            <div class="custom-check ${t.done ? 'checked' : ''}" data-key="${sub.key}" data-idx="${i}"></div>
            <span class="task-text ${t.done ? 'done' : ''}">${t.text}</span>
            <button class="task-del-btn" data-key="${sub.key}" data-idx="${i}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`).join('')}
      </div>`;

    // toggle open/close
    block.querySelector('.subject-header').onclick = (e) => {
      if (e.target.closest('.subj-btn')) return;
      const tp = block.querySelector('.subject-tasks');
      tp.classList.toggle('open');
    };

    // auto-open if has tasks
    if (tasks.length) block.querySelector('.subject-tasks').classList.add('open');

    // add task
    block.querySelector('.add-task').onclick = (e) => {
      e.stopPropagation();
      const text = prompt(`${sub.label} — 세부 계획을 입력하세요:`);
      if (!text || !text.trim()) return;
      const arr = getSubjectTasks(sub.key);
      arr.push({ text: text.trim(), done: false });
      saveSubjectTasks(sub.key, arr);
      renderSubjects();
      updateAbility();
    };

    // delete last uncompleted task
    const delBtn = block.querySelector('.del-task');
    if (delBtn) delBtn.onclick = (e) => {
      e.stopPropagation();
      const arr = getSubjectTasks(sub.key);
      const lastIdx = [...arr].reverse().findIndex(t => !t.done);
      if (lastIdx !== -1) {
        arr.splice(arr.length - 1 - lastIdx, 1);
        saveSubjectTasks(sub.key, arr);
        renderSubjects();
        updateAbility();
      }
    };

    container.appendChild(block);
  });

  // checkbox
  $$('.custom-check', container).forEach(cb => {
    cb.onclick = () => {
      const { key, idx } = cb.dataset;
      const arr = getSubjectTasks(key);
      arr[+idx].done = !arr[+idx].done;
      saveSubjectTasks(key, arr);
      renderSubjects();
      updateExpFromTasks();
      updateAbility();
    };
  });

  // individual task delete
  $$('.task-del-btn', container).forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const { key, idx } = btn.dataset;
      const arr = getSubjectTasks(key);
      arr.splice(+idx, 1);
      saveSubjectTasks(key, arr);
      renderSubjects();
      updateAbility();
    };
  });
}

// ── MENTAL CARE ───────────────────────────────────────────────────────
function getMentalTasks(catKey) {
  return ls.get(`mental_${catKey}_${getDateKey()}`, []);
}
function saveMentalTasks(catKey, tasks) {
  ls.set(`mental_${catKey}_${getDateKey()}`, tasks);
}

function renderMental() {
  const container = $('#mentalList');
  container.innerHTML = '';
  MENTAL_CATS.forEach(cat => {
    const tasks = getMentalTasks(cat.key);
    const done  = tasks.filter(t => t.done).length;
    const block = document.createElement('div');
    block.className = 'mental-block fade-in';
    block.innerHTML = `
      <div class="mental-header">
        <div class="mental-header-left">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
          ${cat.label}
          ${tasks.length ? `<span class="subject-badge">${done}/${tasks.length}</span>` : ''}
        </div>
        <button class="mental-add" data-cat="${cat.key}">+ 추가</button>
      </div>
      <div class="subject-tasks open" id="mental-tasks-${cat.key}">
        ${tasks.map((t, i) => `
          <div class="task-item fade-in">
            <div class="custom-check ${t.done ? 'checked' : ''}" data-cat="${cat.key}" data-idx="${i}" data-mental="1"></div>
            <span class="task-text ${t.done ? 'done' : ''}">${t.text}</span>
            <button class="task-del-btn" data-cat="${cat.key}" data-idx="${i}" data-mental="1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`).join('')}
      </div>`;

    block.querySelector('.mental-add').onclick = () => {
      const text = prompt(`${cat.label} — 할 일을 입력하세요:`);
      if (!text || !text.trim()) return;
      const arr = getMentalTasks(cat.key);
      arr.push({ text: text.trim(), done: false });
      saveMentalTasks(cat.key, arr);
      renderMental();
    };

    container.appendChild(block);
  });

  // mental checkboxes
  $$('[data-mental]', container).forEach(el => {
    if (el.classList.contains('custom-check')) {
      el.onclick = () => {
        const { cat, idx } = el.dataset;
        const arr = getMentalTasks(cat);
        arr[+idx].done = !arr[+idx].done;
        saveMentalTasks(cat, arr);
        renderMental();
        updateAbility();
      };
    }
    if (el.classList.contains('task-del-btn')) {
      el.onclick = () => {
        const { cat, idx } = el.dataset;
        const arr = getMentalTasks(cat);
        arr.splice(+idx, 1);
        saveMentalTasks(cat, arr);
        renderMental();
        updateAbility();
      };
    }
  });
}

// ── WEEKLY RECORD ─────────────────────────────────────────────────────
const HABITS = [
  { key: 'sleep',    label: '수면 7시간' },
  { key: 'exercise', label: '운동하기' },
  { key: 'reading',  label: '독서하기' },
  { key: 'journal',  label: '일기 쓰기' },
  { key: 'water',    label: '물 마시기' },
];
const DAY_LABELS = ['월', '화', '수', '목', '금'];

function getHabitData(habitKey) {
  return ls.get(`habit_${habitKey}`, {});
}

function renderHabits() {
  const container = $('#habitsGrid');
  container.innerHTML = '';
  const weekDates = getWeekDates();
  const todayStr = todayKey();

  HABITS.forEach(habit => {
    const data = getHabitData(habit.key);
    const row = document.createElement('div');
    row.className = 'habit-row';
    row.innerHTML = `<span class="habit-label">${habit.label}</span>
      <div class="habit-days">
        ${weekDates.map((d, i) => {
          const dKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const isToday = dKey === todayStr;
          const isDone  = !!data[dKey];
          return `<button class="day-pill ${isToday ? 'today' : ''} ${isDone ? 'done' : ''}"
            data-habit="${habit.key}" data-dkey="${dKey}" ${!isToday ? 'disabled' : ''}>${DAY_LABELS[i]}</button>`;
        }).join('')}
      </div>`;
    container.appendChild(row);
  });

  $$('.day-pill:not([disabled])', container).forEach(pill => {
    pill.onclick = () => {
      const { habit, dkey } = pill.dataset;
      const data = getHabitData(habit);
      data[dkey] = !data[dkey];
      ls.set(`habit_${habit}`, data);
      renderHabits();
      updateAbility();
    };
  });
}

// ── CHARACTER ─────────────────────────────────────────────────────────
function loadCharState() {
  const saved = ls.get('charImg', null);
  if (saved) $('#charImg').src = saved;

  const cond = ls.get('condition', '최상');
  $$('.cond-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.c === cond);
  });

  renderExp();
}

$('#charFileInput').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const src = ev.target.result;
    ls.set('charImg', src);
    $('#charImg').src = src;
  };
  reader.readAsDataURL(file);
};

$$('.cond-pill').forEach(p => {
  p.onclick = () => {
    $$('.cond-pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    ls.set('condition', p.dataset.c);
  };
});

function renderExp() {
  const exp   = ls.get('exp', 0);
  const level = Math.floor(exp / 100) + 1;
  const pct   = (exp % 100);
  $('#charLevel').textContent = level;
  $('#expFill').style.width   = pct + '%';
  $('#expText').textContent   = `${exp % 100} / 100`;
}

function updateExpFromTasks() {
  let done = 0;
  SUBJECTS.forEach(sub => {
    done += getSubjectTasks(sub.key).filter(t => t.done).length;
  });
  const exp = done * 5;
  ls.set('exp', exp);
  renderExp();
}

// ── STUDY TIMER ───────────────────────────────────────────────────────
const studyBtn = $('#studyBtn');
const lockLayer = $('#lockLayer');
const lockTimerEl = $('#lockTimer');
const lockStopBtn = $('#lockStopBtn');

function startStudy() {
  studying = true;
  studyBtn.textContent = '';
  studyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="1"/></svg> 공부 중단`;
  studyBtn.classList.add('studying');
  lockLayer.classList.add('active');
  studyTimer.running = true;
  studyTimer.interval = setInterval(() => {
    studyTimer.elapsed++;
    ls.set('studyElapsed', studyTimer.elapsed);
    const t = fmtTime(studyTimer.elapsed);
    $('#studyTimerDisplay').textContent = t;
    lockTimerEl.textContent = t;
    // EXP: +1 per minute of study
    if (studyTimer.elapsed % 60 === 0) {
      const cur = ls.get('exp', 0);
      ls.set('exp', cur + 1);
      renderExp();
    }
    updateQuestProgress();
  }, 1000);
}

function stopStudy() {
  studying = false;
  studyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> 공부 시작`;
  studyBtn.classList.remove('studying');
  lockLayer.classList.remove('active');
  clearInterval(studyTimer.interval);
  studyTimer.running = false;
}

studyBtn.onclick  = () => { studying ? stopStudy() : startStudy(); };
lockStopBtn.onclick = () => { stopStudy(); };

// restore timer
if (studyTimer.elapsed > 0) {
  $('#studyTimerDisplay').textContent = fmtTime(studyTimer.elapsed);
  lockTimerEl.textContent = fmtTime(studyTimer.elapsed);
}

// ── MEAL TRACKER ──────────────────────────────────────────────────────
const mealBtn = $('#mealBtn');

function updateMealDisplay() {
  $('#mealCountDisplay').textContent = mealCount + '회';
}
updateMealDisplay();

mealBtn.onclick = () => {
  if (eating) {
    eating = false;
    clearTimeout(eatTimer);
    mealBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> 식사하기`;
    mealBtn.classList.remove('eating');
    mealCount++;
    ls.set(`mealCount_${todayKey()}`, mealCount);
    updateMealDisplay();
    updateQuestProgress();
  } else {
    eating = true;
    mealBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 완료`;
    mealBtn.classList.add('eating');
  }
};

// ── QUESTS ────────────────────────────────────────────────────────────
const QUESTS = [
  {
    key: 'q_study3h',
    title: '3시간 공부 달성',
    desc: '오늘 공부 타이머를 3시간(10800초) 이상 채워보세요. 꾸준한 집중이 능력치를 올려요!',
    reward: 'EXP +50',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    getProgress: () => Math.min(100, Math.round((studyTimer.elapsed / 10800) * 100)),
    canComplete: () => studyTimer.elapsed >= 10800,
    onComplete: () => { const e = ls.get('exp', 0); ls.set('exp', e + 50); renderExp(); },
  },
  {
    key: 'q_tasks5',
    title: '오늘 할 일 5개 완료',
    desc: '공부 계획 탭에서 세부 항목을 5개 이상 체크해 보세요.',
    reward: 'EXP +30',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    getProgress: () => {
      let done = 0;
      SUBJECTS.forEach(s => { done += getSubjectTasks(s.key).filter(t => t.done).length; });
      return Math.min(100, Math.round((done / 5) * 100));
    },
    canComplete: () => {
      let done = 0;
      SUBJECTS.forEach(s => { done += getSubjectTasks(s.key).filter(t => t.done).length; });
      return done >= 5;
    },
    onComplete: () => { const e = ls.get('exp', 0); ls.set('exp', e + 30); renderExp(); },
  },
  {
    key: 'q_meals3',
    title: '하루 3끼 챙겨먹기',
    desc: '식사하기 버튼을 3번 눌러 오늘 세 끼를 모두 기록하세요.',
    reward: 'EXP +20',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>`,
    getProgress: () => Math.min(100, Math.round((mealCount / 3) * 100)),
    canComplete: () => mealCount >= 3,
    onComplete: () => { const e = ls.get('exp', 0); ls.set('exp', e + 20); renderExp(); },
  },
  {
    key: 'q_habits3',
    title: '오늘 습관 3개 달성',
    desc: '주간 기록 패널에서 오늘(월~금) 해당하는 습관 버튼 3개를 눌러보세요.',
    reward: 'EXP +25',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    getProgress: () => {
      const today = todayKey();
      let done = 0;
      HABITS.forEach(h => { if (getHabitData(h.key)[today]) done++; });
      return Math.min(100, Math.round((done / 3) * 100));
    },
    canComplete: () => {
      const today = todayKey();
      let done = 0;
      HABITS.forEach(h => { if (getHabitData(h.key)[today]) done++; });
      return done >= 3;
    },
    onComplete: () => { const e = ls.get('exp', 0); ls.set('exp', e + 25); renderExp(); },
  },
  {
    key: 'q_mental2',
    title: '정신 관리 할 일 2개',
    desc: '정신 관리 탭에서 항목을 추가하고 2개 이상을 완료해 보세요.',
    reward: 'EXP +15',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    getProgress: () => {
      let done = 0;
      MENTAL_CATS.forEach(c => { done += getMentalTasks(c.key).filter(t => t.done).length; });
      return Math.min(100, Math.round((done / 2) * 100));
    },
    canComplete: () => {
      let done = 0;
      MENTAL_CATS.forEach(c => { done += getMentalTasks(c.key).filter(t => t.done).length; });
      return done >= 2;
    },
    onComplete: () => { const e = ls.get('exp', 0); ls.set('exp', e + 15); renderExp(); },
  },
];

function renderQuests() {
  const container = $('#questsList');
  container.innerHTML = '';

  QUESTS.forEach(q => {
    const pct       = q.getProgress();
    const completed = !!ls.get(`quest_done_${todayKey()}_${q.key}`, false);
    const card = document.createElement('div');
    card.className = 'quest-card fade-in';
    card.innerHTML = `
      <div class="quest-header">
        <div class="quest-header-left">
          <div class="quest-icon">${q.icon}</div>
          <div>
            <div class="quest-title">${q.title} ${completed ? '✦' : ''}</div>
            <div class="quest-sub">보상: ${q.reward}</div>
          </div>
        </div>
        <div class="quest-progress-wrap">
          <span class="quest-pct">${pct}%</span>
          <div class="quest-mini-bar"><div class="quest-mini-fill" style="width:${pct}%"></div></div>
          <svg class="quest-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="quest-body">
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-full-bar"><div class="quest-full-fill" style="width:${pct}%"></div></div>
        <button class="quest-complete-btn" data-qkey="${q.key}" ${(!q.canComplete() || completed) ? 'disabled' : ''}>
          ${completed ? '완료됨 ✦' : '완료하기'}
        </button>
      </div>`;

    card.querySelector('.quest-header').onclick = () => {
      card.classList.toggle('open');
    };

    card.querySelector('.quest-complete-btn').onclick = () => {
      if (completed) return;
      ls.set(`quest_done_${todayKey()}_${q.key}`, true);
      q.onComplete();
      renderQuests();
      updateAbility();
    };

    container.appendChild(card);
  });
}

function updateQuestProgress() {
  $$('.quest-card').forEach((card, i) => {
    const q   = QUESTS[i];
    const pct = q.getProgress();
    const miniF = card.querySelector('.quest-mini-fill');
    const fullF = card.querySelector('.quest-full-fill');
    const pctEl = card.querySelector('.quest-pct');
    if (miniF) miniF.style.width = pct + '%';
    if (fullF) fullF.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    const btn = card.querySelector('.quest-complete-btn');
    const completed = !!ls.get(`quest_done_${todayKey()}_${q.key}`, false);
    if (btn && !completed) btn.disabled = !q.canComplete();
  });
}

// ── ABILITY STATS ─────────────────────────────────────────────────────
const STUDY_STATS = [
  { key: 'math',       label: '수학 능력', color: '#f9a8c9' },
  { key: 'science',    label: '과학 능력', color: '#ffb3d1' },
  { key: 'english',    label: '영어 능력', color: '#ffc0cb' },
  { key: 'korean',     label: '국어 능력', color: '#f4849e' },
  { key: 'social',     label: '사회 능력', color: '#ffa8be' },
  { key: 'history',    label: '역사 능력', color: '#e88fa8' },
  { key: 'hanja',      label: '한문 능력', color: '#f0aab8' },
];

const MENTAL_STATS = [
  { key: 'focus',      label: '집중력',   color: '#f4849e' },
  { key: 'patience',   label: '인내심',   color: '#ffa8be' },
  { key: 'confidence', label: '자신감',   color: '#f9a8c9' },
  { key: 'mood',       label: '기분 지수', color: '#ffb3d1' },
  { key: 'social',     label: '사교성',   color: '#ffc0cb' },
];

function getAbilityValue(statKey, section) {
  return ls.get(`ability_${section}_${statKey}`, Math.floor(Math.random() * 40) + 30);
}

function computeAbility() {
  // study: based on task completion
  const result = {};
  SUBJECTS.forEach(sub => {
    const tasks = getSubjectTasks(sub.key);
    const done  = tasks.filter(t => t.done).length;
    const base  = ls.get(`ability_base_${sub.key}`, Math.floor(Math.random() * 30) + 20);
    result[sub.key] = Math.min(100, base + done * 10);
    ls.set(`ability_base_${sub.key}`, base);
  });

  // mental: based on habits and mental tasks
  const today = todayKey();
  let habitDone = 0;
  HABITS.forEach(h => { if (getHabitData(h.key)[today]) habitDone++; });
  let mentalDone = 0;
  MENTAL_CATS.forEach(c => { mentalDone += getMentalTasks(c.key).filter(t => t.done).length; });

  MENTAL_STATS.forEach(stat => {
    const base = ls.get(`ability_mental_base_${stat.key}`, Math.floor(Math.random() * 30) + 30);
    ls.set(`ability_mental_base_${stat.key}`, base);
    result[`mental_${stat.key}`] = Math.min(100, base + habitDone * 4 + mentalDone * 3);
  });

  return result;
}

function updateAbility() {
  const vals = computeAbility();
  const studySec  = $('#abilityStudy');
  const mentalSec = $('#abilityMental');
  studySec.innerHTML  = '';
  mentalSec.innerHTML = '';

  STUDY_STATS.forEach(stat => {
    const v = vals[stat.key] || 0;
    studySec.appendChild(makeStatEl(stat, v));
  });
  MENTAL_STATS.forEach(stat => {
    const v = vals[`mental_${stat.key}`] || 0;
    mentalSec.appendChild(makeStatEl(stat, v));
  });
}

function makeStatEl(stat, val) {
  const el = document.createElement('div');
  el.className = 'ability-stat';
  el.innerHTML = `
    <div class="ability-stat-header">
      <span class="ability-stat-name">${stat.label}</span>
      <span class="ability-stat-val">${val}</span>
    </div>
    <div class="ability-bar">
      <div class="ability-fill" style="width:${val}%; background:${stat.color}"></div>
    </div>`;
  return el;
}

// ability tabs
$$('[data-atab]').forEach(btn => {
  btn.onclick = () => {
    $$('[data-atab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.atab === 'study') {
      $('#abilityStudy').classList.remove('hidden');
      $('#abilityMental').classList.add('hidden');
    } else {
      $('#abilityStudy').classList.add('hidden');
      $('#abilityMental').classList.remove('hidden');
    }
  };
});

// ── SMARTPHONE WIDGET ─────────────────────────────────────────────────
const phoneWidget = $('#phoneWidget');
const phoneHandle = $('#phoneHandle');
let phoneExpanded = false;

phoneHandle.onclick = () => {
  phoneExpanded = !phoneExpanded;
  phoneWidget.classList.toggle('expanded', phoneExpanded);
};

// chat navigation
$$('.chat-item').forEach(item => {
  item.onclick = () => {
    const room = item.dataset.room;
    $('#chatListView').style.display = 'none';
    $$('.chat-room').forEach(r => r.classList.add('hidden'));
    $(`#room-${room}`).classList.remove('hidden');
    // clear badge
    const dot = $(`#dot-${room}`);
    if (dot) dot.classList.add('hidden');
    updateHandleBadges();
  };
});

$$('.room-back').forEach(btn => {
  btn.onclick = () => {
    $$('.chat-room').forEach(r => r.classList.add('hidden'));
    $('#chatListView').style.display = 'flex';
  };
});

// choice replies
$$('.choice-btn').forEach(btn => {
  btn.onclick = () => {
    const { room, reply } = btn.dataset;
    const msgs = $(`#msgs-${room}`);
    const msgEl = document.createElement('div');
    msgEl.className = 'msg sent fade-in';
    msgEl.innerHTML = `<div class="bubble">${reply}</div>`;
    msgs.appendChild(msgEl);
    msgs.scrollTop = msgs.scrollHeight;

    // auto-reply after delay
    setTimeout(() => {
      const replies = {
        aori: {
          '응, 열심히 하고 있어!': '역시 가히야! 열심히 해봐~ 응원해!',
          '조금 힘들지만 버티는 중...': '힘들면 잠깐 쉬어도 괜찮아. 무리하지 마!',
          '잠깐 쉬고 다시 시작할게!': '좋아! 충분히 쉬고 다시 달려봐~',
        },
        hotaru: {
          '고마워! 덕분에 힘이 나!': '언제든 응원해줄게! 같이 열심히 하자!',
          '오늘은 좀 쉬고 싶어...': '그럼 오늘 하루쯤은 쉬어도 돼. 내일 더 잘 할 수 있을 거야.',
          '같이 공부할 수 있으면 좋겠다!': '나도 그러고 싶어! 언젠가 같이 공부해요~',
        },
      };
      const autoReply = replies[room]?.[reply];
      if (autoReply) {
        const repEl = document.createElement('div');
        repEl.className = 'msg recv fade-in';
        const ava = room === 'aori'
          ? `<img class="msg-ava" src="/aori.jpeg" alt="아오리" />`
          : `<img class="msg-ava" src="/hotaru.jpeg" alt="호타루" />`;
        repEl.innerHTML = `${ava}<div class="bubble">${autoReply}</div>`;
        msgs.appendChild(repEl);
        msgs.scrollTop = msgs.scrollHeight;

        const preview = $(`#preview-${room}`);
        if (preview) preview.textContent = autoReply;
      }
    }, 800);
  };
});

function updateHandleBadges() {
  const container = $('#handleBadges');
  container.innerHTML = '';
  ['aori','hotaru','system'].forEach(r => {
    const dot = $(`#dot-${r}`);
    if (dot && !dot.classList.contains('hidden')) {
      const badge = document.createElement('span');
      badge.className = 'handle-dot';
      badge.textContent = dot.textContent;
      container.appendChild(badge);
    }
  });
}
updateHandleBadges();

// alarm save
$('#alarmSave').onclick = () => {
  const config = {
    study:   $('#alarmStudy').value,
    meal:    $('#alarmMeal').value,
    sleep:   $('#alarmSleep').value,
    enabled: $('#alarmEnabled').checked,
  };
  ls.set('alarmConfig', config);

  const msgs = $('#msgs-system');
  const msg = document.createElement('div');
  msg.className = 'msg recv sys-recv fade-in';
  msg.innerHTML = `<div class="bubble">알림 설정이 저장되었어요! ✦ 공부: ${config.study} / 식사: ${config.meal} / 취침: ${config.sleep}</div>`;
  msgs.appendChild(msg);
  msgs.scrollTop = msgs.scrollHeight;
};

// restore alarm config
const alarmCfg = ls.get('alarmConfig', null);
if (alarmCfg) {
  $('#alarmStudy').value = alarmCfg.study;
  $('#alarmMeal').value  = alarmCfg.meal;
  $('#alarmSleep').value = alarmCfg.sleep;
  $('#alarmEnabled').checked = alarmCfg.enabled;
}

// ── INIT ───────────────────────────────────────────────────────────────
function init() {
  renderDate();
  renderHabits();
  loadCharState();
  renderQuests();
  updateAbility();
}

init();
