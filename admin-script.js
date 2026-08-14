/* ==========================================
   POS-SST ADMIN DASHBOARD — SCRIPT.JS
   Full logic: Auth, CRUD, Charts, Reports
   v2 — 100% i18n ready, multilingual mock data
   ========================================== */

'use strict';

const UI_FONT_KEY = 'pos-sst-font-scale';
const UI_FONT_STEPS = [1, 1.1, 1.22, 1.34, 1.48];
const UI_FONT_DEFAULT = 1.1;
const UI_THEME_KEY = 'pos-sst-theme-mode';
const UI_THEME_DEFAULT = 'dark';

function getThemeMode() {
  return localStorage.getItem(UI_THEME_KEY) === 'light' ? 'light' : UI_THEME_DEFAULT;
}

function applyThemeMode(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('theme-light', next === 'light');
  document.body.classList.toggle('theme-dark', next === 'dark');
  document.querySelectorAll('.theme-toggle-text').forEach(el => {
    el.textContent = next === 'light' ? 'Light' : 'Dark';
  });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f7f3ec' : '#0c0c10');
}

function toggleThemeMode() {
  const next = getThemeMode() === 'light' ? 'dark' : 'light';
  localStorage.setItem(UI_THEME_KEY, next);
  applyThemeMode(next);
  redrawActivePage();
}

function applyUiFontScale(scale) {
  const next = Math.min(UI_FONT_STEPS[UI_FONT_STEPS.length - 1], Math.max(UI_FONT_STEPS[0], Number(scale) || UI_FONT_DEFAULT));
  document.documentElement.style.setProperty('--font-scale', next);
  document.querySelectorAll('.font-size-label').forEach(el => {
    el.textContent = `${Math.round(next * 100)}%`;
  });
}

function getUiFontScale() {
  return Number(localStorage.getItem(UI_FONT_KEY)) || UI_FONT_DEFAULT;
}

function changeUiFontSize(direction) {
  const current = getUiFontScale();
  const nearest = UI_FONT_STEPS.reduce((best, step, index) =>
    Math.abs(step - current) < Math.abs(UI_FONT_STEPS[best] - current) ? index : best, 0);
  const nextIndex = Math.min(UI_FONT_STEPS.length - 1, Math.max(0, nearest + direction));
  const next = UI_FONT_STEPS[nextIndex];
  localStorage.setItem(UI_FONT_KEY, next);
  applyUiFontScale(next);
  redrawActivePage();
}

function resetUiFontSize() {
  localStorage.removeItem(UI_FONT_KEY);
  applyUiFontScale(UI_FONT_DEFAULT);
  redrawActivePage();
}

function redrawActivePage() {
  if (!DB?.currentUser) return;
  const active = document.querySelector('.page.active');
  if (!active) return;
  navTo(active.id.replace('page-', ''), null);
}

function scaledChartFont(px) {
  return Math.round(px * getUiFontScale());
}

// ════════════════════════════════
// 0. MULTILINGUAL HELPERS
// ════════════════════════════════
function localName(item) {
  if (!item) return '';
  if (typeof item.name === 'object') {
    return item.name[i18n.getLang()] || item.name.lo || item.name.th || item.name.en || '';
  }
  return item.name || '';
}
function localDesc(item) {
  if (!item) return '';
  if (typeof item.desc === 'object') {
    return item.desc[i18n.getLang()] || item.desc.lo || item.desc.th || item.desc.en || '';
  }
  return item.desc || '';
}

// ════════════════════════════════
// 1. MOCK DATA (Multilingual)
// ════════════════════════════════

// DB = session state + live views onto POS_DB (single source of truth = localStorage)
let DB = {
  currentUser: null,
  orderNum: 100,
  get users()    { return POS_DB.users.getAll();    },
  get products() { return POS_DB.products.getAll();  },
  get orders()   { return POS_DB.orders.getAll();    },
  get stockLog() { return POS_DB.stockLog.getAll();  },
};

// ── Order shape helpers (รองรับทั้ง items แบบ array ແລະ string) ──
function orderItemList(o) {
  if (Array.isArray(o.items)) {
    return o.items.map(i => ({
      name: typeof i.name === 'object' ? (i.name[i18n.getLang()] || i.name.lo || i.name.th || i.name.en) : i.name,
      qty:  i.qty || 1,
      id:   i.id,
    }));
  }
  return String(o.items || '').split(', ').filter(Boolean).map(s => {
    const [name, q] = s.split(' x');
    return { name, qty: parseInt(q) || 1, id: null };
  });
}
function orderItemsText(o) {
  return orderItemList(o).map(i => `${i.name} x${i.qty}`).join(', ');
}
function orderTable(o) { return o.tableCode || o.table || '-'; }
function orderVat(o)   { return o.vatAmt != null ? o.vatAmt : (o.vat || 0); }

// ════════════════════════════════
// 2. AUTH
// ════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  applyThemeMode(getThemeMode());
  applyUiFontScale(getUiFontScale());
  const loginLangMount = document.getElementById('loginLangMount');
  if (loginLangMount) i18n.buildSwitcher(loginLangMount);
});

function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const user = POS_DB.users.authenticate(u, p);
  if (!user || user.status !== 'active') {
    document.getElementById('loginError').textContent = i18n.t('login.error');
    return;
  }
  DB.currentUser = user;
  POS_DB.users.touchLogin(user.id);          // บันทึกเวลาเข้าใช้ลง tbl_user.last_login
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  updateNavVisibility();

  document.getElementById('sbUserName').textContent = user.name;
  document.getElementById('sbAvatar').textContent   = user.name[0].toUpperCase();
  document.getElementById('tbAvatar').textContent   = user.name[0].toUpperCase();

  const mount = document.getElementById('langMount');
  if (mount && !mount.hasChildNodes()) {
    i18n.buildSwitcher(mount);
  }

  window.addEventListener('langchange', () => {
    const active = document.querySelector('.page.active');
    if (active) {
      const page = active.id.replace('page-', '');
      switch(page) {
        case 'dashboard':  renderDashboard();   break;
        case 'orders':     renderOrdersPage();  break;
        case 'products':   renderProductsPage();break;
        case 'inventory':  renderInventoryPage();break;
        case 'reports':    renderReportsPage(); break;
        case 'users':      renderUsersPage();   break;
      }
      const info = pageMap[page];
      if (info) document.getElementById('tbTitle').textContent = i18n.t(info.i18nKey || 'admin.dashboard');
    }
    document.querySelectorAll('.sb-item[data-page]').forEach(btn => {
      const labelEl = btn.querySelector('.sb-label');
      if (labelEl && labelEl.dataset.i18n) labelEl.textContent = i18n.t(labelEl.dataset.i18n);
    });
  });

  navTo('dashboard', null);
  startClock();
  updateOrderBadge();
  updateKitchenBadge();

  // บันทึกลง MySQL ไม่สำเร็จ → ต้องเห็นบนจอ ไม่ใช่เงียบไปเฉย ๆ
  window.addEventListener('posdb:error', e => {
    showToast('⛔ ບັນທຶກລົງຖານຂໍ້ມູນບໍ່ສຳເລັດ: ' + e.detail);
  });

  // Real-time: เซิร์ฟเวอร์ push ผ่าน api/events.php แล้ว Db.js ยิง event นี้
  // "เฉพาะตอนข้อมูลเปลี่ยนจริง" → ออเดอร์ใหม่จากมือถือลูกค้า (คนละเครื่อง)
  // ขึ้นหน้าครัวเองภายในเสี้ยววินาที ไม่ต้องกด F5
  window.addEventListener('posdb:resynced', () => {
    updateKitchenBadge();
    updateOrderBadge();
    rerenderActivePage();
  });
}

function doLogout() {
  if (!confirm(i18n.t('toast.logoutconfirm'))) return;
  DB.currentUser = null;
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginError').textContent = '';
}

function togglePw() {
  const inp = document.getElementById('loginPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ════════════════════════════════
// 3. NAVIGATION
// ════════════════════════════════
const pageMap = {
  dashboard: { icon:'📊', i18nKey:'admin.dashboard' },
  orders:    { icon:'📦', i18nKey:'admin.orders'    },
  products:  { icon:'🍽️', i18nKey:'admin.products'  },
  inventory: { icon:'📋', i18nKey:'admin.inventory' },
  materials: { icon:'🥩', label:'ຈັດການວັດຖຸດິບ'    },
  categories:{ icon:'🏷️', label:'ຈັດການປະເພດ'       },
  purchase:  { icon:'🧾', label:'ການສັ່ງຊື້'        },
  import:    { icon:'📥', label:'ການນຳເຂົ້າ'        },
  tables:    { icon:'🪑', label:'ຈັດການໂຕະ'         },
  kitchen:   { icon:'👨‍🍳', label:'ຫ້ອງຄົວ (KDS)'     },
  reports:   { icon:'📈', i18nKey:'admin.reports'   },
  users:     { icon:'👥', i18nKey:'admin.users'     },
  settings:  { icon:'⚙️', i18nKey:'admin.settings'  },
};

function navTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.sb-item').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  document.querySelectorAll('.mn-item').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  const info = pageMap[page] || { icon:'⚡', i18nKey:'admin.dashboard' };
  document.getElementById('tbIcon').textContent  = info.icon;
  document.getElementById('tbTitle').textContent = info.label || i18n.t(info.i18nKey);

  document.getElementById('pageContent').scrollTo({ top: 0, behavior: 'smooth' });
  closeMobileMenu();

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'orders':    renderOrdersPage(); break;
    case 'products':  renderProductsPage(); break;
    case 'inventory': renderInventoryPage(); break;
    case 'materials': renderMaterialsPage(); break;
    case 'categories':renderCategoriesPage(); break;
    case 'purchase':  renderPurchasePage(); break;
    case 'import':    renderImportPage(); break;
    case 'tables':    renderTablesPage(); break;
    case 'kitchen':   renderKitchenPage(); break;
    case 'reports':   renderReportsPage(); break;
    case 'users':     renderUsersPage(); break;
  }
}

/* วาดหน้าที่เปิดอยู่ใหม่ เมื่อข้อมูลถูก push มาจากเซิร์ฟเวอร์
   ต่างจาก navTo() ตรงที่ "ไม่รบกวนสิ่งที่แอดมินกำลังทำอยู่":
     • ไม่เด้งกลับไปบนสุด (navTo สั่ง scrollTo(0) ทุกครั้ง)
     • ไม่ปิดเมนูมือถือ
     • ถ้ามีหน้าต่าง modal เปิดอยู่ (กำลังกรอกฟอร์ม) ให้พักไว้ก่อน
       แล้วค่อยวาดตอนปิด modal — ไม่งั้นค่าที่พิมพ์ค้างไว้จะหาย
   ของเดิมเรียก navTo() ตรง ๆ ทุก 5 วินาที จึงกระตุกและเลื่อนจอเอง */
let pendingRerender = false;

function rerenderActivePage() {
  if (document.querySelector('.modal-overlay.show')) { pendingRerender = true; return; }
  const active = document.querySelector('.page.active');
  if (!active) return;
  const page   = active.id.replace('page-', '');
  const scroll = document.getElementById('pageContent');
  const top    = scroll ? scroll.scrollTop : 0;

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'orders':    renderOrdersPage(); break;
    case 'products':  renderProductsPage(); break;
    case 'inventory': renderInventoryPage(); break;
    case 'materials': renderMaterialsPage(); break;
    case 'categories':renderCategoriesPage(); break;
    case 'purchase':  renderPurchasePage(); break;
    case 'import':    renderImportPage(); break;
    case 'tables':    renderTablesPage(); break;
    case 'kitchen':   renderKitchenPage(); break;
    case 'reports':   renderReportsPage(); break;
    case 'users':     renderUsersPage(); break;
  }
  if (scroll) scroll.scrollTop = top;   // คงตำแหน่งที่แอดมินเลื่อนค้างไว้
}

// ════════════════════════════════
// 4. SIDEBAR COLLAPSE
// ════════════════════════════════
let sidebarCollapsed = false;
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
}

function toggleMobileMenu() {
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('mobOverlay');
  const open = sb.classList.toggle('mobile-open');
  ov.classList.toggle('show', open);
}
function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobOverlay').classList.remove('show');
}

function updateNavVisibility() {
  const isMobile = window.innerWidth <= 768;
  document.getElementById('mobileNav').style.display = isMobile ? 'grid' : 'none';
}
window.addEventListener('resize', updateNavVisibility);

// ════════════════════════════════
// 5. CLOCK
// ════════════════════════════════
function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById('tbDatetime').textContent =
      now.toLocaleDateString('th-TH') + '  ' + now.toLocaleTimeString('th-TH');
  }
  tick();
  setInterval(tick, 1000);
}

// ════════════════════════════════
// 6. DASHBOARD
// ════════════════════════════════
function renderDashboard() {
  const orders   = POS_DB.orders.getAll();
  const done     = orders.filter(o => o.status === 'done');
  const todayKey = new Date().toLocaleDateString('en-CA');
  const todayOrd = done.filter(o => o.dateKey === todayKey);
  const todayRev = todayOrd.reduce((s, o) => s + o.total, 0);
  const allRev   = done.reduce((s, o) => s + o.total, 0);
  const pending  = orders.filter(o => o.status === 'pending').length;
  const lowStock = DB.products.filter(p => p.stock <= 5).length;

  const kpiGrid = document.getElementById('kpiGrid');
  kpiGrid.innerHTML = kpiCard('💰', fmt(todayRev), i18n.t('dash.today.rev'), '+12%', 'up')
    + kpiCard('📦', orders.length, i18n.t('dash.total.orders'), pending + ' ' + i18n.t('status.pending'), 'neu', true)
    + kpiCard('🍽️', POS_DB.products.getAll().filter(p=>p.status==='active').length, i18n.t('dash.products'), lowStock + ' ' + i18n.t('products.status'), lowStock > 0 ? 'down' : 'neu')
    + kpiCard('👥', POS_DB.users.getAll().filter(u=>u.status==='active').length, i18n.t('admin.users'), 'Active', 'up');

  const recent = orders.slice(0, 8);
  document.getElementById('dashOrdersTable').innerHTML =
    orderTableHead() + `<tbody>${recent.map(orderRow).join('')}</tbody>`;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    drawSalesChart('salesChart', 'week');
    drawTopChart('topChart');
  }));

  updateOrderBadge();
}

function kpiCard(icon, val, lbl, change, dir, isAccent = false) {
  return `
  <div class="kpi-card ${isAccent ? 'accent-card' : ''}">
    <div class="kpi-top">
      <span class="kpi-icon">${icon}</span>
      <span class="kpi-change ${dir}">${change}</span>
    </div>
    <div class="kpi-val ${String(val).length > 8 ? 'sm' : ''}">${val}</div>
    <div class="kpi-lbl">${lbl}</div>
  </div>`;
}

// ════════════════════════════════
// 7. CHARTS (Canvas)
// ════════════════════════════════
function switchChart(mode, btn) {
  document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  drawSalesChart('salesChart', mode);
}

function drawSalesChart(canvasId, mode) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const days = mode === 'week' ? 7 : 30;
  const labels = [], values = [];
  const now = new Date();
  const dayNames = {
    lo: ['ອາ','ຈ','ອ','ພ','ພ຤','ສ','ສ'],
    th: ['อา','จ','อ','พ','พฤ','ศ','ส'],
    en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    zh: ['日','一','二','三','四','五','六']
  };
  const lang = i18n.getLang();
  const dn = dayNames[lang] || dayNames['en'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = mode === 'week' ? dn[d.getDay()] : d.getDate() + '';
    labels.push(label);
    const dateKey = d.toLocaleDateString('en-CA');
    const dayTotal = DB.orders
      .filter(o => o.status === 'done' && o.dateKey === dateKey)
      .reduce((s, o) => s + o.total, 0);
    // ວັນທີ່ບໍ່ມີການຂາຍຕ້ອງເປັນ 0 — ແຕ່ກ່ອນໃສ່ເລກສຸ່ມ 50k–450k ແທນ
    // ເຮັດໃຫ້ລາຍງານສະແດງຍອດທີ່ບໍ່ມີຢູ່ຈິງ ແລະ ອ່ານທຽບກັບ MySQL ບໍ່ໄດ້
    values.push(dayTotal);
  }

  drawBarChart(ctx, canvas, labels, values, '#ff6b35', '#ffb347');
}

function drawTopChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const freq = {};
  DB.orders.filter(o => o.status === 'done').forEach(o => {
    orderItemList(o).forEach(i => {
      freq[i.name] = (freq[i.name] || 0) + i.qty;
    });
  });
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,5);
  const labels = sorted.map(x => x[0]);
  const values = sorted.map(x => x[1]);
  drawHorizBar(ctx, canvas, labels, values);
}

function drawBarChart(ctx, canvas, labels, values, color1, color2) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W   = canvas.clientWidth  || 400;
  const H   = canvas.clientHeight || 200;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = { top:20, right:10, bottom:36, left:60 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;
  const max  = Math.max(...values) * 1.15 || 1;
  const barW = (cW / labels.length) * 0.55;
  const gap  = cW / labels.length;

  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + cH - (cH * i / 4);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(160,160,184,0.6)';
    ctx.font = `${scaledChartFont(10)}px DM Mono`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtK(max * i / 4), pad.left - 6, y + 4);
  }

  labels.forEach((lbl, i) => {
    const bH = (values[i] / max) * cH;
    const x  = pad.left + i * gap + (gap - barW) / 2;
    const y  = pad.top + cH - bH;

    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2 + '88');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(160,160,184,0.8)';
    ctx.font = `${scaledChartFont(10)}px Noto Sans Thai`;
    ctx.textAlign = 'center';
    ctx.fillText(lbl, x + barW / 2, pad.top + cH + 16);
  });
}

function drawHorizBar(ctx, canvas, labels, values) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W   = canvas.clientWidth  || 280;
  const H   = canvas.clientHeight || 200;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const max    = Math.max(...values) || 1;
  const rowH   = H / labels.length;
  const pad    = { left: 90, right: 40, top: 8, bar: 14 };
  const colors = ['#ff6b35','#ffb347','#3498db','#2ecc71','#9b59b6'];

  ctx.clearRect(0, 0, W, H);

  labels.forEach((lbl, i) => {
    const y   = i * rowH + rowH / 2;
    const bW  = ((values[i] / max) * (W - pad.left - pad.right));

    ctx.fillStyle = 'rgba(160,160,184,0.85)';
    ctx.font = `${scaledChartFont(10)}px Noto Sans Thai`;
    ctx.textAlign = 'right';
    const truncated = lbl.length > 7 ? lbl.substring(0,7)+'…' : lbl;
    ctx.fillText(truncated, pad.left - 8, y + 4);

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(pad.left, y - pad.bar/2, W - pad.left - pad.right, pad.bar, 4);
    ctx.fill();

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect(pad.left, y - pad.bar/2, bW, pad.bar, 4);
    ctx.fill();

    ctx.fillStyle = '#ffb347';
    ctx.font = `bold ${scaledChartFont(10)}px DM Mono`;
    ctx.textAlign = 'left';
    ctx.fillText(values[i], pad.left + bW + 6, y + 4);
  });
}

function drawCategoryChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W   = canvas.clientWidth  || 280;
  const H   = canvas.clientHeight || 220;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const catNames = {
    rice:    { lo:'ຂ້າວ',    th:'ข้าว',    en:'Rice',    zh:'米饭' },
    noodle:  { lo:'ເຝີ/ກ໋ວຍ', th:'เฝอ/ก๋วย', en:'Noodles', zh:'面条' },
    grill:   { lo:'ປີ້ງ',    th:'ปิ้ง',    en:'Grilled', zh:'烤制' },
    drink:   { lo:'ດື່ມ',     th:'ดื่ม',    en:'Drinks',  zh:'饮品' },
    dessert: { lo:'ຂອງຫວານ', th:'ของหวาน', en:'Dessert', zh:'甜点' }
  };
  const catColors= ['#ff6b35','#ffb347','#3498db','#2ecc71','#9b59b6'];
  const cats = Object.keys(catNames);
  const lang = i18n.getLang();

  const freq = {};
  cats.forEach(c => freq[c] = 0);
  const prods = DB.products;
  DB.orders.filter(o => o.status === 'done').forEach(o => {
    orderItemList(o).forEach(it => {
      const p = prods.find(pr => pr.id === it.id) || prods.find(pr => localName(pr) === it.name);
      if (p && freq[p.cat] !== undefined) freq[p.cat] += it.qty;
    });
  });

  const total  = cats.reduce((s, c) => s + freq[c], 0) || 1;
  const cx = W/2, cy = H/2 - 10, r = Math.min(W, H) * 0.32;

  ctx.clearRect(0, 0, W, H);

  let angle = -Math.PI / 2;
  cats.forEach((cat, i) => {
    const slice = (freq[cat] / total) * Math.PI * 2;
    ctx.fillStyle = catColors[i];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(12,12,16,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += slice;
  });

  cats.forEach((cat, i) => {
    const x = 10 + (i % 3) * (W / 3);
    const y = cy + r + 16 + Math.floor(i / 3) * 16;
    ctx.fillStyle = catColors[i];
    ctx.fillRect(x, y, 10, 10);
    ctx.fillStyle = 'rgba(160,160,184,0.8)';
    ctx.font = `${scaledChartFont(9)}px Noto Sans Thai`;
    ctx.textAlign = 'left';
    const pct = total > 0 ? Math.round(freq[cat]/total*100) : 0;
    const label = (catNames[cat][lang] || catNames[cat].en);
    ctx.fillText(label + ' ' + pct + '%', x + 13, y + 9);
  });
}

// ════════════════════════════════
// 8. ORDERS PAGE
// ════════════════════════════════
function orderTableHead() {
  return `<thead><tr>
    <th>${i18n.t('tbl.order')}</th>
    <th>${i18n.t('tbl.table')}</th>
    <th>${i18n.t('tbl.items')}</th>
    <th>${i18n.t('tbl.total')}</th>
    <th>${i18n.t('tbl.time')}</th>
    <th>${i18n.t('tbl.status')}</th>
    <th>${i18n.t('tbl.actions')}</th>
  </tr></thead>`;
}

function orderRow(o) {
  const badge = o.status === 'done' ? 'badge-green' : o.status === 'cancel' ? 'badge-red' : 'badge-yellow';
  const label = o.status === 'done' ? `✅ ${i18n.t('status.done')}` : o.status === 'cancel' ? `❌ ${i18n.t('status.cancel')}` : `⏳ ${i18n.t('status.pending')}`;
  return `<tr>
    <td><b class="mono">#${o.num}</b></td>
    <td><span class="badge badge-blue">${orderTable(o)}</span></td>
    <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2);font-size:0.8rem">${orderItemsText(o)}</td>
    <td><b>${fmt(o.total)}</b> <span style="color:var(--muted);font-size:0.75rem">${i18n.t('currency')}</span></td>
    <td style="color:var(--muted);font-size:0.78rem;white-space:nowrap">${o.time}</td>
    <td><span class="badge ${badge}">${label}</span></td>
    <td><div class="tbl-actions">
      <button class="tbl-btn" onclick="viewOrder(${o.id})">📄 ${i18n.t('tbl.view')}</button>
      ${o.status === 'pending' ? `<button class="tbl-btn" onclick="completeOrder(${o.id})">✅</button>
      <button class="tbl-btn danger" onclick="cancelOrder(${o.id})">❌</button>` : ''}
    </div></td>
  </tr>`;
}

function renderOrdersPage() {
  const f = document.getElementById('orderStatusFilter')?.value || 'all';
  let orders = f === 'all' ? DB.orders : DB.orders.filter(o => o.status === f);
  const tbody = `<tbody>${orders.map(orderRow).join('')}</tbody>`;
  document.getElementById('ordersTable').innerHTML = orderTableHead() + tbody;
  document.getElementById('ordersEmpty').style.display = orders.length ? 'none' : 'block';
}

function viewOrder(id) {
  const o = DB.orders.find(x => x.id === id);
  if (!o) return;
  document.getElementById('odTitle').textContent = 'Order #' + o.num;
  document.getElementById('odBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.85rem">
      <div><span style="color:var(--muted)">${i18n.t('tbl.order')}:</span> <b>#${o.num}</b></div>
      <div><span style="color:var(--muted)">${i18n.t('tbl.table')}:</span> <b>${orderTable(o)}</b></div>
      <div><span style="color:var(--muted)">${i18n.t('tbl.time')}:</span> ${o.time}</div>
      <div><span style="color:var(--muted)">${i18n.t('tbl.status')}:</span> ${o.status}</div>
    </div>
    <div style="margin-top:14px;padding:12px;background:var(--surface2);border-radius:10px;font-size:0.85rem">
      <b>${i18n.t('tbl.items')}:</b><br>${orderItemList(o).map(i => `• ${i.name} x${i.qty}`).join('<br>')}
    </div>
    <div style="margin-top:10px;font-size:0.85rem;display:flex;flex-direction:column;gap:5px">
      <div style="display:flex;justify-content:space-between"><span>${i18n.t('order.subtotal')}</span><span>${fmt(o.subtotal)} ${i18n.t('currency')}</span></div>
      <div style="display:flex;justify-content:space-between"><span>${i18n.t('vat.label')}</span><span>${fmt(orderVat(o))} ${i18n.t('currency')}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--border);padding-top:8px">
        <span>${i18n.t('order.grandtotal')}</span><span style="color:var(--accent2)">${fmt(o.total)} ${i18n.t('currency')}</span>
      </div>
    </div>`;
  openModal('orderDetailModal');
}

function completeOrder(id) {
  const o = DB.orders.find(x => x.id === id);
  if (o) { POS_DB.orders.updateStatus(id, 'done'); renderOrdersPage(); updateOrderBadge(); showToast('✅ ' + i18n.t('toast.orderdone') + ' #' + o.num); }
}
function cancelOrder(id) {
  const o = DB.orders.find(x => x.id === id);
  if (o && confirm(i18n.t('toast.cancelconfirm') + ' #' + o.num + '?')) {
    POS_DB.orders.updateStatus(id, 'cancel'); renderOrdersPage(); updateOrderBadge(); showToast('❌ ' + i18n.t('toast.ordercancel') + ' #' + o.num);
  }
}

function updateOrderBadge() {
  const pending = POS_DB.orders.getAll().filter(o => o.status === 'pending').length;
  const badge = document.getElementById('sbBadgeOrders');
  if (!badge) return;
  badge.textContent = pending;
  badge.dataset.count = pending;
}

function printReceipt() {
  showToast('🖨️ ' + i18n.t('toast.printsent')); closeModal('orderDetailModal');
}

// ════════════════════════════════
// 9. PRODUCTS PAGE
// ════════════════════════════════
function renderProductsPage() {
  const q   = (document.getElementById('productSearch')?.value || '').toLowerCase();
  const cat = document.getElementById('productCatFilter')?.value || 'all';

  const filtered = POS_DB.products.getAll().filter(p => {
    const matchQ   = !q || localName(p).toLowerCase().includes(q) || localDesc(p).toLowerCase().includes(q);
    const matchCat = cat === 'all' || p.cat === cat;
    return matchQ && matchCat;
  });

  const statusBadge = s => {
    if (s === 'active')  return `<span class="badge badge-green">✅ ${i18n.t('products.active')}</span>`;
    if (s === 'soldout') return `<span class="badge badge-red">❌ ${i18n.t('products.soldout')}</span>`;
    return `<span class="badge badge-gray">🚫 ${i18n.t('products.hidden')}</span>`;
  };

  const thead = `<thead><tr>
    <th>${i18n.t('products.name')}</th>
    <th>${i18n.t('products.cat')}</th>
    <th>${i18n.t('products.price')}</th>
    <th>${i18n.t('products.stock')}</th>
    <th>${i18n.t('products.status')}</th>
    <th>${i18n.t('orders.manage')}</th>
  </tr></thead>`;

  const thumb = p => p.img
    ? `<span style="width:40px;height:40px;border-radius:10px;overflow:hidden;flex-shrink:0;display:inline-flex"><img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='${p.emoji||'🍽️'}'"></span>`
    : `<span style="font-size:1.5rem">${p.emoji}</span>`;

  const tbody = `<tbody>${filtered.map(p => `<tr>
    <td><div style="display:flex;align-items:center;gap:10px">
      ${thumb(p)}
      <div><div style="font-weight:600">${localName(p)}</div><div style="font-size:0.75rem;color:var(--muted)">${localDesc(p)}</div></div>
    </div></td>
    <td style="font-size:0.82rem">${i18n.t('cat.' + p.cat)}</td>
    <td><b>${fmt(p.price)}</b> <span style="color:var(--muted);font-size:0.75rem">${i18n.t('currency')}</span></td>
    <td><span style="color:${p.stock <= 5 ? 'var(--red)' : p.stock <= 20 ? 'var(--yellow)' : 'var(--green)'}; font-weight:600">${p.stock}</span></td>
    <td>${statusBadge(p.status)}</td>
    <td><div class="tbl-actions">
      <button class="tbl-btn" onclick="openProductModal(${p.id})">✏️ ${i18n.t('btn.edit')}</button>
      <button class="tbl-btn danger" onclick="deleteProduct(${p.id})">🗑️</button>
    </div></td>
  </tr>`).join('')}</tbody>`;

  document.getElementById('productsTable').innerHTML = thead + tbody;
}

function openProductModal(id = null) {
  document.getElementById('productModalTitle').textContent = id ? i18n.t('modal.editproduct') : i18n.t('modal.addproduct');
  if (id) {
    const p = DB.products.find(x => x.id === id);
    if (!p) return;
    const nm = typeof p.name === 'object' ? p.name : { lo:p.name, th:p.name, en:p.name, zh:p.name };
    const ds = typeof p.desc === 'object' ? p.desc : { lo:p.desc, th:p.desc, en:p.desc, zh:p.desc };
    document.getElementById('pmId').value    = p.id;
    ['lo','th','en','zh'].forEach(l => {
      document.getElementById('pmName_' + l).value = nm[l] || '';
      document.getElementById('pmDesc_' + l).value = ds[l] || '';
    });
    document.getElementById('pmPrice').value = p.price;
    document.getElementById('pmCat').value   = p.cat;
    document.getElementById('pmStock').value = p.stock;
    document.getElementById('pmStatus').value= p.status;
    document.getElementById('pmImg').value   = p.img || '';
    renderProductImgPreview(p.img || '', p.emoji);
  } else {
    ['pmId','pmPrice','pmStock','pmImg',
     'pmName_lo','pmName_th','pmName_en','pmName_zh',
     'pmDesc_lo','pmDesc_th','pmDesc_en','pmDesc_zh'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pmStatus').value = 'active';
    renderProductImgPreview('', '');
  }
  openModal('productModal');
}

// ── รูปสินค้า: อัปโหลด + ย่อขนาด + พรีวิว ──────────────────
function renderProductImgPreview(url, emoji) {
  const box = document.getElementById('pmImgPreview');
  const clr = document.getElementById('pmImgClear');
  if (url) {
    box.innerHTML = `<img src="${url}" alt="preview" style="width:100%;height:100%;object-fit:cover">`;
    clr.style.display = '';
  } else {
    box.innerHTML = `<svg viewBox="0 0 24 24" style="width:34px;height:34px;fill:var(--muted,#888);opacity:.6"><path d="M8.1 2a.6.6 0 0 1 .6.6V9a2.4 2.4 0 0 1-1.8 2.33V21a1 1 0 1 1-2 0v-9.67A2.4 2.4 0 0 1 3.1 9V2.6a.6.6 0 0 1 1.2 0V8a.5.5 0 0 0 1 0V2.6a.6.6 0 0 1 1.2 0V8a.5.5 0 0 0 1 0V2.6a.6.6 0 0 1 .6-.6Zm7.4 0c1.9 0 3.4 2.4 3.4 5.6 0 2.5-.9 4.5-2.3 5.2V21a1 1 0 1 1-2 0v-8.2c-1.4-.7-2.3-2.7-2.3-5.2C12.3 4.4 13.8 2 15.5 2Z"/></svg>`;
    clr.style.display = 'none';
  }
}

function clearProductImage() {
  document.getElementById('pmImg').value = '';
  renderProductImgPreview('', '');
}

// อ่านไฟล์รูป → ย่อเป็น ~600px → บีบอัด JPEG
// คืนทั้ง blob (สำหรับอัปโหลดขึ้นเซิร์ฟเวอร์) และ data URL (ไว้เป็นทางสำรอง)
function resizeImageFile(file, maxSize = 600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        else if (height >= width && height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (!canvas.toBlob) return resolve({ blob: null, dataUrl });
        canvas.toBlob(blob => resolve({ blob, dataUrl }), 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ส่งรูปขึ้นเซิร์ฟเวอร์ → ได้ "เส้นทางไฟล์" กลับมา (images/menu/xxx.jpg)
// เก็บเส้นทางสั้น ๆ ลง tbl_product.img แทน base64 ก้อนใหญ่:
// รูปอยู่บนดิสก์จริง จึงไม่หายเมื่อปิดเบราว์เซอร์/รีสตาร์ตเซิร์ฟเวอร์
// และ JSON ที่ POST ตอนบันทึกเมนูก็ไม่บวมจนเกิน post_max_size
function uploadProductImage(blob) {
  return new Promise((resolve, reject) => {
    const fd  = new FormData();
    fd.append('image', blob, 'menu.jpg');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'api/upload.php', true);
    xhr.onload = () => {
      let r = null;
      try { r = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && r && r.ok) resolve(r.path);
      else reject(new Error((r && r.error) || ('HTTP ' + xhr.status)));
    };
    xhr.onerror = () => reject(new Error('ຕິດຕໍ່ເຊີບເວີບໍ່ໄດ້'));
    xhr.send(fd);
  });
}

function setProductImage(value) {
  document.getElementById('pmImg').value = value;
  renderProductImgPreview(value, '');
}

async function handleProductImage(input) {
  const file = input.files && input.files[0];
  input.value = '';                       // ให้เลือกไฟล์เดิมซ้ำได้
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('⚠️ ໄຟລ໌ຕ້ອງເປັນຮູບພາບ'); return; }

  let out;
  try { out = await resizeImageFile(file, 600, 0.8); }
  catch { showToast('⚠️ ອ່ານຮູບບໍ່ສຳເລັດ'); return; }

  if (out.blob) {
    try {
      setProductImage(await uploadProductImage(out.blob));
      showToast('✅ ອັບໂຫຼດຮູບແລ້ວ — ກົດ "ບັນທຶກ" ເພື່ອໃຊ້ຮູບນີ້');
      return;
    } catch (e) {
      // อัปโหลดไม่ได้ → ยังบันทึกเป็น data URL ลง MySQL ได้ (หนักกว่า แต่ไม่หาย)
      showToast('⚠️ ອັບໂຫຼດຂຶ້ນເຊີບເວີບໍ່ໄດ້: ' + e.message + ' — ໃຊ້ຮູບຝັງໃນຖານຂໍ້ມູນແທນ');
    }
  }
  setProductImage(out.dataUrl);
  showToast('✅ ໂຫຼດຮູບແລ້ວ — ກົດ "ບັນທຶກ" ເພື່ອໃຊ້ຮູບນີ້');
}

function saveProduct() {
  const id    = document.getElementById('pmId').value;
  const price = parseInt(document.getElementById('pmPrice').value);
  const cat   = document.getElementById('pmCat').value;
  const stock = parseInt(document.getElementById('pmStock').value) || 0;
  const status= document.getElementById('pmStatus').value;
  const img   = document.getElementById('pmImg').value || '';
  const emojis= { rice:'🍽️', noodle:'🍜', grill:'🔥', drink:'🥤', dessert:'🍮' };

  // อ่านชื่อ/คำอธิบายแยกแต่ละภาษา — ภาษาที่ว่างไว้ ใช้ค่าจากภาษาแรกที่กรอก (ไม่ทับกัน)
  const rawName = { lo:0,th:0,en:0,zh:0 }, rawDesc = { lo:0,th:0,en:0,zh:0 };
  ['lo','th','en','zh'].forEach(l => {
    rawName[l] = document.getElementById('pmName_' + l).value.trim();
    rawDesc[l] = document.getElementById('pmDesc_' + l).value.trim();
  });
  const primaryName = rawName.lo || rawName.th || rawName.en || rawName.zh;
  const primaryDesc = rawDesc.lo || rawDesc.th || rawDesc.en || rawDesc.zh;
  const name = primaryName;   // ใช้ตอนแจ้งเตือน/ตรวจว่ากรอกชื่อไหม

  if (!name || isNaN(price)) { showToast('⚠️ ' + i18n.t('toast.fillall')); return; }

  // เติมภาษาที่ว่างด้วยค่าหลัก เพื่อไม่ให้แสดงว่างเวลาสลับภาษา
  const nameObj = { lo:rawName.lo||primaryName, th:rawName.th||primaryName, en:rawName.en||primaryName, zh:rawName.zh||primaryName };
  const descObj = { lo:rawDesc.lo||primaryDesc, th:rawDesc.th||primaryDesc, en:rawDesc.en||primaryDesc, zh:rawDesc.zh||primaryDesc };

  if (id) {
    const p = DB.products.find(x => x.id === parseInt(id));
    POS_DB.products.update(parseInt(id), { name:nameObj, price, desc:descObj, cat, stock, status, img });
    showToast('✅ ' + i18n.t('toast.saved') + ' ' + name);
  } else {
    POS_DB.products.add({ name:nameObj, price, desc:descObj, cat, stock, status, img, emoji: emojis[cat] || '🍽️' });
    showToast('✅ ' + i18n.t('toast.added') + ' ' + name);
  }
  closeModal('productModal');
  renderProductsPage();
}

function deleteProduct(id) {
  const p = DB.products.find(x => x.id === id);
  if (!p || !confirm(i18n.t('toast.deleteconfirm') + ' ' + localName(p) + '?')) return;
  POS_DB.products.delete(id);
  renderProductsPage();
  showToast('🗑️ ' + i18n.t('toast.deleted') + ' ' + localName(p));
}

// ════════════════════════════════
// 10. INVENTORY PAGE
// ════════════════════════════════
function renderInventoryPage() {
  const low = DB.products.filter(p => p.stock <= 5);
  const alertEl = document.getElementById('stockAlert');
  if (low.length > 0) {
    alertEl.classList.add('show');
    alertEl.textContent = '⚠️ ' + i18n.t('inv.lowstock') + ' ' + low.map(p => localName(p) + ' (' + p.stock + ')').join(', ');
  } else {
    alertEl.classList.remove('show');
  }

  const thead = `<thead><tr>
    <th>${i18n.t('products.name')}</th>
    <th>${i18n.t('products.cat')}</th>
    <th>${i18n.t('products.stock')}</th>
    <th>${i18n.t('products.status')}</th>
    <th>${i18n.t('orders.manage')}</th>
  </tr></thead>`;

  const tbody = `<tbody>${DB.products.map(p => {
    const lvl = p.stock <= 0 ? 'badge-red' : p.stock <= 5 ? 'badge-yellow' : p.stock <= 20 ? 'badge-blue' : 'badge-green';
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px">${p.emoji} <b>${localName(p)}</b></div></td>
      <td style="color:var(--muted);font-size:0.82rem">${i18n.t('cat.' + p.cat)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${lvl}" style="font-size:0.85rem;padding:4px 12px">${p.stock}</span>
          <div style="flex:1;max-width:80px;height:6px;background:var(--surface3);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.min(p.stock/100*100,100)}%;background:${p.stock<=5?'var(--red)':p.stock<=20?'var(--yellow)':'var(--green)'};border-radius:4px"></div>
          </div>
        </div>
      </td>
      <td>${p.status === 'active' ? `<span class="badge badge-green">✅ ${i18n.t('products.active')}</span>` : `<span class="badge badge-red">❌ ${i18n.t('products.soldout')}</span>`}</td>
      <td><button class="tbl-btn" onclick="quickStock(${p.id})">📦 ${i18n.t('inv.adjust')}</button></td>
    </tr>`;
  }).join('')}</tbody>`;
  document.getElementById('inventoryTable').innerHTML = thead + tbody;

  const logHead = `<thead><tr>
    <th>${i18n.t('products.name')}</th>
    <th>${i18n.t('modal.type')}</th>
    <th>${i18n.t('modal.qty')}</th>
    <th>${i18n.t('modal.note')}</th>
    <th>${i18n.t('tbl.time')}</th>
  </tr></thead>`;
  const logBody = `<tbody>${POS_DB.stockLog.getAll().map(l => `<tr>
    <td><b>${l.productName}</b></td>
    <td><span class="badge ${l.type==='in'?'badge-green':l.type==='out'?'badge-red':'badge-blue'}">${l.type==='in'?'▲ '+i18n.t('inv.in'):l.type==='out'?'▼ '+i18n.t('inv.out'):'= '+i18n.t('inv.set')}</span></td>
    <td><b>${l.qty}</b></td>
    <td style="color:var(--muted);font-size:0.82rem">${l.note}</td>
    <td style="color:var(--muted);font-size:0.78rem">${POS_DB.fmtDateTime(l.date)}</td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('stockLogTable').innerHTML = logHead + logBody;
}

function openStockModal() {
  const sel = document.getElementById('smProduct');
  sel.innerHTML = DB.products.map(p => `<option value="${p.id}">${p.emoji} ${localName(p)} (${i18n.t('products.stock')}: ${p.stock})</option>`).join('');
  openModal('stockModal');
}
function quickStock(id) {
  const sel = document.getElementById('smProduct');
  sel.innerHTML = DB.products.map(p => `<option value="${p.id}" ${p.id===id?'selected':''}>${p.emoji} ${localName(p)} (${i18n.t('products.stock')}: ${p.stock})</option>`).join('');
  openModal('stockModal');
}

function saveStock() {
  const pId  = parseInt(document.getElementById('smProduct').value);
  const type = document.getElementById('smType').value;
  const qty  = parseInt(document.getElementById('smQty').value);
  const note = document.getElementById('smNote').value.trim() || i18n.t('inv.adjust');
  if (isNaN(qty) || qty < 0) { showToast('⚠️ ' + i18n.t('toast.fillall')); return; }

  const p = DB.products.find(x => x.id === pId);
  if (!p) return;

  let newStock = p.stock;
  if (type === 'in')  newStock += qty;
  else if (type === 'out') newStock = Math.max(0, p.stock - qty);
  else newStock = qty;
  const newStatus = newStock === 0 ? 'soldout' : (p.status === 'soldout' ? 'active' : p.status);
  POS_DB.products.update(pId, { stock: newStock, status: newStatus });

  POS_DB.stockLog.add({ productId: p.id, productName: localName(p), type, qty, note });

  closeModal('stockModal');
  renderInventoryPage();
  showToast('✅ ' + i18n.t('toast.stockadjusted') + ' ' + localName(p));
}

// ════════════════════════════════
// 11. REPORTS PAGE
// ════════════════════════════════
/* ຄີຂອງໝວດທີ່ນັບເປັນ "ເຄື່ອງດື່ມ" — ອີງ type ຂອງໝວດ (tbl_category.type)
   ບໍ່ແມ່ນທຽບ cat === 'drink' ຕົງ ໆ ຮ້ານເພີ່ມໝວດເຄື່ອງດື່ມໃໝ່ໄດ້ ແລ້ວ
   ລາຍງານຈະນັບໃຫ້ເອງ ບໍ່ຕົກຫຼົ່ນ */
function drinkCatKeys() {
  return new Set(POS_DB.categories.getAll().filter(c => c.type === 'drink').map(c => c.cat));
}

/* 5 ປະເພດລາຍງານ ຕາມແຜນພາບລວມຂອງລະບົບ ຂໍ້ 5.1–5.5
   period:false = ລາຍງານແບບ "ພາບຄົງເຫຼືອ ณ ຕອນນີ້" ບໍ່ໄດ້ອີງຊ່ວງເວລາ */
const REPORT_META = {
  drink:    { title:'5.1 🥤 ລາຍງານເຄື່ອງດື່ມ',    chart:'ສະຕັອກເຄື່ອງດື່ມແຕ່ລະລາຍການ', table:'ລາຍການເຄື່ອງດື່ມທັງໝົດ', period:false },
  material: { title:'5.2 🥩 ລາຍງານວັດຖຸດິບ',     chart:'ຄົງເຫຼືອວັດຖຸດິບ',            table:'ລາຍການວັດຖຸດິບທັງໝົດ',  period:false },
  purchase: { title:'5.3 🧾 ລາຍງານການສັ່ງຊື້',    chart:'ມູນຄ່າສັ່ງຊື້ຕາມວັນ',         table:'ໃບສັ່ງຊື້ທັງໝົດ',       period:true  },
  // 5.4 ແຍກເປັນ 2 ໃບ ຕາມ D8 / D9 ໃນເອກສານ
  importDrink:    { title:'5.4.1 🥤 ລາຍງານນຳເຂົ້າເຄື່ອງດື່ມ', chart:'ຈຳນວນເຄື່ອງດື່ມນຳເຂົ້າຕາມວັນ', table:'ລາຍການນຳເຂົ້າເຄື່ອງດື່ມ (D8)', period:true },
  importMaterial: { title:'5.4.2 🥩 ລາຍງານນຳເຂົ້າວັດຖຸດິບ',  chart:'ຈຳນວນວັດຖຸດິບນຳເຂົ້າຕາມວັນ',  table:'ລາຍການນຳເຂົ້າວັດຖຸດິບ (D9)',  period:true },
  sales:    { title:'5.5 📈 ລາຍງານການຂາຍສິນຄ້າ', chart:null,                          table:null,                     period:true  },
};

/* ຕັ້ງຫົວຂໍ້ໜ້າ/ຊື່ກຣາຟ/ຊື່ຕາຕະລາງ ໃຫ້ຕົງກັບປະເພດທີ່ເລືອກ
   ແຕ່ກ່ອນຫົວຂໍ້ຄ້າງເປັນ "ຍອດຂາຍ" ທຸກປະເພດ ຈຶ່ງເບິ່ງຄືບໍ່ໄດ້ແຍກລາຍງານເລີຍ */
function applyReportChrome(type) {
  const m = REPORT_META[type] || REPORT_META.sales;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('reportTitle',      m.title);
  set('reportChartTitle', m.chart || i18n.t('rep.daily'));
  set('reportTableTitle', m.table || i18n.t('rep.all'));
  // ວົງກົມສັດສ່ວນໝວດເປັນຂອງຍອດຂາຍໂດຍສະເພາະ — ປະເພດອື່ນເຊື່ອງໄວ້
  const cat = document.getElementById('catChartCard');
  if (cat) cat.style.display = type === 'sales' ? '' : 'none';
  const per = document.getElementById('reportPeriod');
  if (per) per.style.display = m.period ? '' : 'none';
}

function reportDays() {
  return parseInt(document.getElementById('reportPeriod')?.value) || 7;
}

/* canvas ຕ້ອງມີຄວາມກວ້າງຈິງກ່ອນຈຶ່ງວາດຖືກ — ລໍ 2 ເຟຣມຄືກັບກຣາຟຍອດຂາຍ
   (ເຟຣມດຽວບໍ່ພໍ ຕອນຫາກໍ່ສະຫຼັບໜ້າ clientWidth ຍັງເປັນ 0) */
function drawWhenLaidOut(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

/* ວາດກຣາຟແທ່ງຂອງລາຍງານ — ກັນກໍລະນີບໍ່ມີຂໍ້ມູນ ບໍ່ໃຫ້ແກນເປັນ NaN */
function drawReportBars(labels, values, c1, c2) {
  const canvas = document.getElementById('reportChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!labels.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  drawBarChart(ctx, canvas, labels, values, c1, c2);
}

/* ຍອດລວມແຕ່ລະວັນຍ້ອນຫຼັງ N ວັນ — ໃຊ້ຮ່ວມກັນລະຫວ່າງລາຍງານສັ່ງຊື້/ນຳເຂົ້າ
   pick() ຄືນຄ່າທີ່ຢາກບວກຂອງແຖວນັ້ນ (ມູນຄ່າ ຫຼື ຈຳນວນ) */
function dailySeries(rows, dateOf, pick, days) {
  const labels = [], values = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    labels.push(d.getDate() + '');
    values.push(rows.filter(r => {
      const rd = dateOf(r);
      return rd && new Date(rd).toLocaleDateString('en-CA') === key;
    }).reduce((s, r) => s + pick(r), 0));
  }
  return { labels, values };
}

function renderReportsPage() {
  const type = document.getElementById('reportType')?.value || 'sales';
  applyReportChrome(type);
  if (type !== 'sales') { renderSubReport(type); return; }
  const period = parseInt(document.getElementById('reportPeriod')?.value || 7);
  const filtered = DB.orders.filter(o => o.status === 'done');

  const revenue = filtered.reduce((s, o) => s + o.total, 0);
  const count   = filtered.length;
  const avg     = count ? Math.round(revenue / count) : 0;
  const freq = {};
  filtered.forEach(o => orderItemList(o).forEach(i => {
    freq[i.name] = (freq[i.name]||0)+i.qty;
  }));
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('reportKpi').innerHTML =
    kpiCard('💰', fmt(revenue), i18n.t('rep.revenue'), '', 'neu', true)
    + kpiCard('📦', count, i18n.t('rep.completed'), '', 'up')
    + kpiCard('📊', fmt(avg), i18n.t('rep.avg'), i18n.t('currency'), 'neu')
    + kpiCard('🏆', top ? top[0] : '—', i18n.t('rep.top'), top ? top[1]+' '+i18n.t('rep.times') : '', 'up');

  const thead = `<thead><tr>
    <th>${i18n.t('tbl.order')}</th>
    <th>${i18n.t('tbl.table')}</th>
    <th>${i18n.t('tbl.items')}</th>
    <th>${i18n.t('tbl.total')}</th>
    <th>${i18n.t('tbl.time')}</th>
  </tr></thead>`;
  const tbody = `<tbody>${filtered.slice(0,20).map(o => `<tr>
    <td><b class="mono">#${o.num}</b></td>
    <td><span class="badge badge-blue">${orderTable(o)}</span></td>
    <td style="color:var(--text2);font-size:0.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${orderItemsText(o)}</td>
    <td><b>${fmt(o.total)}</b> ${i18n.t('currency')}</td>
    <td style="color:var(--muted);font-size:0.78rem">${o.time}</td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('reportTable').innerHTML = thead + tbody;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    drawSalesChart('reportChart', 'week');
    drawCategoryChart('catChart');
  }));
}

// ── รายงานย่อย: เครื่องดื่ม / วัตถุดิบ / สั่งซื้อ / นำเข้า ──
function renderSubReport(type) {
  const kpiEl   = document.getElementById('reportKpi');
  const tableEl = document.getElementById('reportTable');

  if (type === 'drink') {
    const dk = drinkCatKeys();
    const drinks = POS_DB.products.getAll().filter(p => dk.has(p.cat));
    // นับยอดขายเครื่องดื่มจากรายละเอียดการขาย (tbl_sale_detail)
    const sold = {};
    POS_DB.orders.getAll().filter(o => o.status === 'done').forEach(o => {
      (o.items || []).forEach(i => { if (drinks.some(d => d.id === i.id)) sold[i.id] = (sold[i.id] || 0) + i.qty; });
    });
    kpiEl.innerHTML =
      kpiCard('🥤', drinks.length, 'ລາຍການເຄື່ອງດື່ມ', '', 'neu', true)
      + kpiCard('📦', drinks.reduce((s, d) => s + d.stock, 0), 'ສະຕັອກລວມ', '', 'neu')
      + kpiCard('📉', drinks.filter(d => d.stock <= 5).length, 'ໃກ້ໝົດ (≤5)', '', 'down')
      + kpiCard('💰', fmt(Object.entries(sold).reduce((s, [id, q]) => s + q * (drinks.find(d => d.id == id)?.price || 0), 0)), 'ຍອດຂາຍເຄື່ອງດື່ມ', i18n.t('currency'), 'up');
    tableEl.innerHTML = `<thead><tr><th>ເຄື່ອງດື່ມ</th><th>ລາຄາ</th><th>ສະຕັອກ</th><th>ຂາຍແລ້ວ</th><th>ສະຖານະ</th></tr></thead>
      <tbody>${drinks.map(d => `<tr>
        <td>${d.emoji} <b>${localName(d)}</b></td>
        <td>${fmt(d.price)} ${i18n.t('currency')}</td>
        <td><b>${d.stock}</b></td>
        <td>${sold[d.id] || 0}</td>
        <td>${d.status === 'active' ? '<span class="badge badge-green">✅</span>' : '<span class="badge badge-red">❌</span>'}</td>
      </tr>`).join('')}</tbody>`;
    drawWhenLaidOut(() => drawReportBars(
      drinks.map(d => localName(d)), drinks.map(d => d.stock), '#3498db', '#5dade2'));
  }

  if (type === 'material') {
    const mats = POS_DB.materials.getAll();
    kpiEl.innerHTML =
      kpiCard('🥩', mats.length, 'ລາຍການວັດຖຸດິບ', '', 'neu', true)
      + kpiCard('📦', mats.reduce((s, m) => s + m.stock, 0), 'ສະຕັອກລວມ', '', 'neu')
      + kpiCard('⚠️', mats.filter(m => m.stock <= m.min).length, 'ຕ່ຳກວ່າຂັ້ນຕ່ຳ', '', 'down')
      + kpiCard('🧾', POS_DB.purchases.getAll().length, 'ໃບສັ່ງຊື້ທັງໝົດ', '', 'neu');
    tableEl.innerHTML = `<thead><tr><th>ວັດຖຸດິບ</th><th>ຫົວໜ່ວຍ</th><th>ຄົງເຫຼືອ</th><th>ຂັ້ນຕ່ຳ</th><th>ສະຖານະ</th></tr></thead>
      <tbody>${mats.map(m => `<tr>
        <td><b>${localName(m)}</b></td>
        <td>${m.unit}</td>
        <td><b>${m.stock}</b></td>
        <td style="color:var(--muted)">${m.min}</td>
        <td>${m.stock <= m.min ? '<span class="badge badge-red">⚠️ ຕ້ອງສັ່ງຊື້</span>' : '<span class="badge badge-green">✅ ພຽງພໍ</span>'}</td>
      </tr>`).join('')}</tbody>`;
    drawWhenLaidOut(() => drawReportBars(
      mats.map(m => localName(m)), mats.map(m => m.stock), '#2ecc71', '#58d68d'));
  }

  if (type === 'purchase') {
    const pos = POS_DB.purchases.getAll();
    kpiEl.innerHTML =
      kpiCard('🧾', pos.length, 'ໃບສັ່ງຊື້ທັງໝົດ', '', 'neu', true)
      + kpiCard('⏳', pos.filter(p => p.status === 'pending').length, 'ລໍຖ້ານຳເຂົ້າ', '', 'neu')
      + kpiCard('✅', pos.filter(p => p.status === 'imported').length, 'ນຳເຂົ້າແລ້ວ', '', 'up')
      + kpiCard('💰', fmt(pos.reduce((s, p) => s + p.total, 0)), 'ມູນຄ່າລວມ', i18n.t('currency'), 'neu');
    tableEl.innerHTML = `<thead><tr><th>ເລກທີ</th><th>ວັນທີ</th><th>ລາຍການ</th><th>ມູນຄ່າ</th><th>ຜູ້ສັ່ງ</th><th>ສະຖານະ</th></tr></thead>
      <tbody>${pos.map(p => `<tr>
        <td><b class="mono">#${p.id}</b></td>
        <td style="font-size:0.8rem;color:var(--muted)">${POS_DB.fmtDateTime(p.pur_date || p.date)}</td>
        <td style="font-size:0.82rem">${p.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
        <td><b>${fmt(p.total)}</b> ${i18n.t('currency')}</td>
        <td>${p.userName || '-'}</td>
        <td>${p.status === 'imported' ? '<span class="badge badge-green">✅ ນຳເຂົ້າແລ້ວ</span>' : '<span class="badge badge-yellow">⏳ ລໍຖ້າ</span>'}</td>
      </tr>`).join('')}</tbody>`;
    const ps = dailySeries(pos, p => p.pur_date || p.date, p => p.total || 0, reportDays());
    drawWhenLaidOut(() => drawReportBars(ps.labels, ps.values, '#f39c12', '#f8c471'));
  }

  if (type === 'importDrink') {
    renderImportKindReport('drink', kpiEl, tableEl,
      { icon:'🥤', itemsKpi:'ຊະນິດເຄື່ອງດື່ມ', col:'ເຄື່ອງດື່ມ' }, '#3498db', '#5dade2');
  }

  if (type === 'importMaterial') {
    renderImportKindReport('material', kpiEl, tableEl,
      { icon:'🥩', itemsKpi:'ຊະນິດວັດຖຸດິບ', col:'ວັດຖຸດິບ' }, '#2ecc71', '#58d68d');
  }
}

/* ໃບນຳເຂົ້າໜຶ່ງໃບມີຫຼາຍປະເພດປົນກັນໄດ້ (ເຄື່ອງດື່ມ + ວັດຖຸດິບ ໃນໃບດຽວ)
   ແຕ່ D8 ແລະ D9 ໃນເອກສານເປັນຄົນລະ store ຈຶ່ງຕ້ອງ "ແຕກໃບອອກເປັນລາຍແຖວ"
   ແລ້ວຄັດສະເພາະ kind ທີ່ຕ້ອງການ — ຄັດທັງໃບຈະໄດ້ຂໍ້ມູນປົນ ຫຼື ຕົກຫຼົ່ນ */
function importLines(kind) {
  const out = [];
  POS_DB.imports.getAll().forEach(im => {
    (im.items || []).filter(i => i.kind === kind).forEach(i => out.push({
      impId: im.id,
      date:  im.imp_date || im.date,
      purId: im.purId,
      user:  im.userName,
      name:  i.name,
      qty:   i.qty,
      price: i.price || 0,
      total: i.qty * (i.price || 0),
    }));
  });
  return out;
}

/* 5.4.1 (D8) ແລະ 5.4.2 (D9) ໃຊ້ໂຄງດຽວກັນ ຕ່າງກັນແຕ່ kind ກັບປ້າຍຊື່ */
function renderImportKindReport(kind, kpiEl, tableEl, label, c1, c2) {
  const lines = importLines(kind);
  // ນັບ "ຄັ້ງ" ຈາກເລກໃບທີ່ບໍ່ຊ້ຳ — ໃບດຽວທີ່ມີ 3 ແຖວ ຕ້ອງນັບເປັນ 1 ຄັ້ງ
  const times = new Set(lines.map(l => l.impId)).size;
  const qty   = lines.reduce((s, l) => s + l.qty, 0);
  const value = lines.reduce((s, l) => s + l.total, 0);
  const kinds = new Set(lines.map(l => l.name)).size;

  kpiEl.innerHTML =
    kpiCard('📥', times, 'ຄັ້ງທີ່ນຳເຂົ້າ', '', 'neu', true)
    + kpiCard('📦', qty, 'ຈຳນວນລວມ', '', 'up')
    + kpiCard('💰', fmt(value), 'ມູນຄ່າລວມ', i18n.t('currency'), 'neu')
    + kpiCard(label.icon, kinds, label.itemsKpi, '', 'neu');

  tableEl.innerHTML = `<thead><tr>
      <th>ເລກທີ</th><th>ວັນທີ</th><th>ອ້າງອີງ</th><th>${label.col}</th>
      <th>ຈຳນວນ</th><th>ຕົ້ນທຶນ/ໜ່ວຍ</th><th>ລວມ</th><th>ຜູ້ຮັບ</th>
    </tr></thead>
    <tbody>${lines.map(l => `<tr>
      <td><b class="mono">#${l.impId}</b></td>
      <td style="font-size:0.8rem;color:var(--muted)">${POS_DB.fmtDateTime(l.date)}</td>
      <td>${l.purId
            ? `<span class="badge badge-blue">#${l.purId}</span>`
            : `<span class="badge badge-yellow">ໂດຍກົງ</span>`}</td>
      <td><b>${l.name}</b></td>
      <td><b>${l.qty}</b></td>
      <td>${fmt(l.price)}</td>
      <td><b>${fmt(l.total)}</b> ${i18n.t('currency')}</td>
      <td>${l.user || '-'}</td>
    </tr>`).join('')}</tbody>`;

  const s = dailySeries(lines, l => l.date, l => l.qty, reportDays());
  drawWhenLaidOut(() => drawReportBars(s.labels, s.values, c1, c2));
}

// ════════════════════════════════
// 11A1. MATERIALS PAGE (ຈັດການວັດຖຸດິບ) — ຂອບເຂດ 1.4.1
// ════════════════════════════════
function renderMaterialsPage() {
  const mats = POS_DB.materials.getAll();
  const thead = `<thead><tr>
    <th>ຊື່ວັດຖຸດິບ</th><th>ຫົວໜ່ວຍ</th><th>ຄົງເຫຼືອ</th><th>ຂັ້ນຕ່ຳ</th><th>ສະຖານະ</th><th>${i18n.t('orders.manage')}</th>
  </tr></thead>`;
  const tbody = `<tbody>${mats.map(m => `<tr>
    <td><b>${localName(m)}</b></td>
    <td style="color:var(--muted)">${m.unit || '-'}</td>
    <td><b>${m.stock}</b></td>
    <td style="color:var(--muted)">${m.min}</td>
    <td>${m.stock <= m.min ? '<span class="badge badge-red">⚠️ ຕ້ອງສັ່ງຊື້</span>' : '<span class="badge badge-green">✅ ພຽງພໍ</span>'}</td>
    <td><div class="tbl-actions">
      <button class="tbl-btn" onclick="openMaterialModal(${m.id})">✏️ ${i18n.t('btn.edit')}</button>
      <button class="tbl-btn danger" onclick="deleteMaterial(${m.id})">🗑️</button>
    </div></td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('materialsTable').innerHTML = thead + tbody;
}

function openMaterialModal(id = null) {
  document.getElementById('materialModalTitle').textContent = id ? 'ແກ້ໄຂວັດຖຸດິບ' : 'ເພີ່ມວັດຖຸດິບ';
  if (id) {
    const m = POS_DB.materials.get(id);
    if (!m) return;
    document.getElementById('mtId').value    = m.id;
    document.getElementById('mtName').value  = localName(m);
    document.getElementById('mtUnit').value  = m.unit || '';
    document.getElementById('mtStock').value = m.stock;
    document.getElementById('mtMin').value   = m.min;
  } else {
    ['mtId','mtName','mtUnit','mtStock','mtMin'].forEach(x => document.getElementById(x).value = '');
  }
  openModal('materialModal');
}

function saveMaterial() {
  const id    = document.getElementById('mtId').value;
  const name  = document.getElementById('mtName').value.trim();
  const unit  = document.getElementById('mtUnit').value.trim();
  const stock = parseInt(document.getElementById('mtStock').value) || 0;
  const min   = parseInt(document.getElementById('mtMin').value) || 0;
  if (!name) { showToast('⚠️ ' + i18n.t('toast.fillall')); return; }
  const nameObj = { lo:name, th:name, en:name, zh:name };
  if (id) POS_DB.materials.update(parseInt(id), { name:nameObj, unit, stock, min });
  else    POS_DB.materials.add({ name:nameObj, unit, stock, min });
  closeModal('materialModal');
  renderMaterialsPage();
  showToast('✅ ບັນທຶກວັດຖຸດິບ ' + name + ' ແລ້ວ');
}

function deleteMaterial(id) {
  const m = POS_DB.materials.get(id);
  if (!m || !confirm('ລຶບວັດຖຸດິບ ' + localName(m) + '?')) return;
  POS_DB.materials.delete(id);
  renderMaterialsPage();
  showToast('🗑️ ລຶບແລ້ວ');
}

// ════════════════════════════════
// 11A2. CATEGORIES PAGE (ຈັດການປະເພດ) — ຂອບເຂດ 1.4.1
// ════════════════════════════════
function renderCategoriesPage() {
  const cats = POS_DB.categories.getAll();
  const typeLabel = t => t === 'drink' ? '🥤 ເຄື່ອງດື່ມ' : '🍽️ ອາຫານ';
  const thead = `<thead><tr>
    <th>ຊື່ປະເພດ</th><th>ໝວດຫຼັກ</th><th>${i18n.t('orders.manage')}</th>
  </tr></thead>`;
  const tbody = `<tbody>${cats.map(c => `<tr>
    <td><b>${localName(c) || c.cate_name || '-'}</b></td>
    <td><span class="badge ${c.type === 'drink' ? 'badge-blue' : 'badge-green'}">${typeLabel(c.type)}</span></td>
    <td><div class="tbl-actions">
      <button class="tbl-btn" onclick="openCategoryModal(${c.id})">✏️ ${i18n.t('btn.edit')}</button>
      <button class="tbl-btn danger" onclick="deleteCategory(${c.id})">🗑️</button>
    </div></td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('categoriesTable').innerHTML = thead + tbody;
}

function openCategoryModal(id = null) {
  document.getElementById('categoryModalTitle').textContent = id ? 'ແກ້ໄຂປະເພດ' : 'ເພີ່ມປະເພດ';
  if (id) {
    const c = POS_DB.categories.get(id);
    if (!c) return;
    document.getElementById('ctId').value   = c.id;
    document.getElementById('ctName').value = localName(c) || c.cate_name || '';
    document.getElementById('ctType').value = c.type || 'food';
  } else {
    document.getElementById('ctId').value   = '';
    document.getElementById('ctName').value = '';
    document.getElementById('ctType').value = 'food';
  }
  openModal('categoryModal');
}

function saveCategory() {
  const id   = document.getElementById('ctId').value;
  const name = document.getElementById('ctName').value.trim();
  const type = document.getElementById('ctType').value;
  if (!name) { showToast('⚠️ ' + i18n.t('toast.fillall')); return; }
  const nameObj  = { lo:name, th:name, en:name, zh:name };
  const prodName = type === 'drink' ? 'ເຄື່ອງດື່ມ' : 'ອາຫານ';
  if (id) POS_DB.categories.update(parseInt(id), { name:nameObj, cate_name:name, type, prod_name:prodName });
  else    POS_DB.categories.add({ name:nameObj, cate_name:name, type, prod_name:prodName });
  closeModal('categoryModal');
  renderCategoriesPage();
  showToast('✅ ບັນທຶກປະເພດ ' + name + ' ແລ້ວ');
}

function deleteCategory(id) {
  const c = POS_DB.categories.get(id);
  if (!c || !confirm('ລຶບປະເພດ ' + (localName(c) || c.cate_name) + '?')) return;
  POS_DB.categories.delete(id);
  renderCategoriesPage();
  showToast('🗑️ ລຶບແລ້ວ');
}

// ════════════════════════════════
// 11B. PURCHASE PAGE (ສັ່ງຊື້)
// ════════════════════════════════
let _poLines = [];

function renderPurchasePage() {
  const pos = POS_DB.purchases.getAll();
  const thead = `<thead><tr><th>ເລກທີ</th><th>ວັນທີ</th><th>ລາຍການ</th><th>ມູນຄ່າ</th><th>ຜູ້ສັ່ງ</th><th>ສະຖານະ</th></tr></thead>`;
  const tbody = `<tbody>${pos.map(p => `<tr>
    <td><b class="mono">#${p.id}</b></td>
    <td style="font-size:0.8rem;color:var(--muted)">${POS_DB.fmtDateTime(p.pur_date || p.date)}</td>
    <td style="font-size:0.82rem;max-width:260px">${p.items.map(i => `${i.kind === 'material' ? '🥩' : '🥤'} ${i.name} x${i.qty}`).join(', ')}</td>
    <td><b>${fmt(p.total)}</b> ${i18n.t('currency')}</td>
    <td>${p.userName || '-'}</td>
    <td>${p.status === 'imported' ? '<span class="badge badge-green">✅ ນຳເຂົ້າແລ້ວ</span>' : '<span class="badge badge-yellow">⏳ ລໍຖ້ານຳເຂົ້າ</span>'}</td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('purchaseTable').innerHTML = thead + tbody;
  document.getElementById('purchaseEmpty').style.display = pos.length ? 'none' : 'block';
}

function openPurchaseModal() {
  _poLines = [];
  renderPoLines();
  fillPoItemOptions();
  document.getElementById('poQty').value = '';
  document.getElementById('poPrice').value = '';
  openModal('purchaseModal');
}

/* ລາຍການທີ່ເລືອກໄດ້ຕາມປະເພດ — ໃຊ້ຮ່ວມກັນທັງໃບສັ່ງຊື້ ແລະ ນຳເຂົ້າໂດຍກົງ
   ແຍກອາຫານ/ເຄື່ອງດື່ມດ້ວຍ type ຂອງປະເພດ (tbl_category.type) ບໍ່ແມ່ນ
   ທຽບ cat === 'drink' ຕົງ ໆ — ຮ້ານເພີ່ມປະເພດເຄື່ອງດື່ມໃໝ່ (ເຊັ່ນ 'beer')
   ໄດ້ ແລ້ວມັນຈະຖືກຈັດເຂົ້າກຸ່ມຖືກຕ້ອງເອງ ບໍ່ຕ້ອງມາແກ້ໂຄ້ດ */
function stockItemOptions(kind) {
  if (kind === 'material') {
    const ms = POS_DB.materials.getAll();
    return ms.length
      ? ms.map(m => `<option value="${m.id}">${localName(m)} (ຄົງເຫຼືອ: ${m.stock} ${m.unit})</option>`).join('')
      : '<option value="">— ຍັງບໍ່ມີວັດຖຸດິບ —</option>';
  }
  const drinkCats = drinkCatKeys();
  const ps = POS_DB.products.getAll()
    .filter(p => kind === 'drink' ? drinkCats.has(p.cat) : !drinkCats.has(p.cat));
  return ps.length
    ? ps.map(p => `<option value="${p.id}">${p.emoji || ''} ${localName(p)} (ຄົງເຫຼືອ: ${p.stock})</option>`).join('')
    : '<option value="">— ຍັງບໍ່ມີລາຍການ —</option>';
}

function fillPoItemOptions() {
  document.getElementById('poItem').innerHTML =
    stockItemOptions(document.getElementById('poKind').value);
}

function addPoLine() {
  const kind  = document.getElementById('poKind').value;
  const refId = parseInt(document.getElementById('poItem').value);
  const qty   = parseInt(document.getElementById('poQty').value);
  const price = parseInt(document.getElementById('poPrice').value);
  if (isNaN(refId) || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
    showToast('⚠️ ' + i18n.t('toast.fillall')); return;
  }
  const item = kind === 'material' ? POS_DB.materials.get(refId) : POS_DB.products.get(refId);
  if (!item) return;
  _poLines.push({ kind, refId, name: localName(item), qty, price });
  document.getElementById('poQty').value = '';
  document.getElementById('poPrice').value = '';
  renderPoLines();
}

function removePoLine(idx) { _poLines.splice(idx, 1); renderPoLines(); }

function renderPoLines() {
  const el = document.getElementById('poLines');
  if (!_poLines.length) { el.innerHTML = 'ຍັງບໍ່ມີລາຍການ'; return; }
  const total = _poLines.reduce((s, l) => s + l.qty * l.price, 0);
  el.innerHTML = _poLines.map((l, i) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
      <span>${l.kind === 'material' ? '🥩' : '🥤'} ${l.name} x${l.qty} @ ${fmt(l.price)}</span>
      <span><b>${fmt(l.qty * l.price)}</b> <button class="tbl-btn danger" onclick="removePoLine(${i})">✕</button></span>
    </div>`).join('')
    + `<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:700">
        <span>ລວມ</span><span style="color:var(--accent2)">${fmt(total)} ${i18n.t('currency')}</span>
      </div>`;
}

function savePurchase() {
  if (!_poLines.length) { showToast('⚠️ ກະລຸນາເພີ່ມລາຍການກ່ອນ'); return; }
  const po = POS_DB.purchases.create({
    items: _poLines,
    userId:   DB.currentUser?.id,
    userName: DB.currentUser?.name,
  });
  closeModal('purchaseModal');
  renderPurchasePage();
  showToast('✅ ສ້າງໃບສັ່ງຊື້ #' + po.id + ' ແລ້ວ');
}

// ════════════════════════════════
// 11C. IMPORT PAGE (ນຳເຂົ້າ)
// ════════════════════════════════
function renderImportPage() {
  const pending = POS_DB.purchases.getPending();
  const pHead = `<thead><tr><th>ເລກທີ</th><th>ວັນທີສັ່ງ</th><th>ລາຍການ</th><th>ມູນຄ່າ</th><th>ຈັດການ</th></tr></thead>`;
  const pBody = `<tbody>${pending.map(p => `<tr>
    <td><b class="mono">#${p.id}</b></td>
    <td style="font-size:0.8rem;color:var(--muted)">${POS_DB.fmtDateTime(p.pur_date || p.date)}</td>
    <td style="font-size:0.82rem">${p.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
    <td><b>${fmt(p.total)}</b> ${i18n.t('currency')}</td>
    <td><button class="tbl-btn" onclick="receivePurchase(${p.id})">📥 ຮັບເຂົ້າສະຕັອກ</button></td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('importPendingTable').innerHTML = pHead + pBody;
  document.getElementById('importPendingEmpty').style.display = pending.length ? 'none' : 'block';

  const imps = POS_DB.imports.getAll();
  const hHead = `<thead><tr><th>ເລກທີ</th><th>ວັນທີນຳເຂົ້າ</th><th>ອ້າງອີງ</th><th>ລາຍການ</th><th>ຜູ້ຮັບ</th></tr></thead>`;
  const hBody = `<tbody>${imps.map(im => `<tr>
    <td><b class="mono">#${im.id}</b></td>
    <td style="font-size:0.8rem;color:var(--muted)">${POS_DB.fmtDateTime(im.imp_date || im.date)}</td>
    <td>${im.purId
          ? `<span class="badge badge-blue">#${im.purId}</span>`
          : `<span class="badge badge-yellow">ໂດຍກົງ</span>`}</td>
    <td style="font-size:0.82rem">${im.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
    <td>${im.userName || '-'}</td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('importHistoryTable').innerHTML = hHead + hBody;
  document.getElementById('importHistoryEmpty').style.display = imps.length ? 'none' : 'block';
}

function receivePurchase(purId) {
  if (!confirm('ຢືນຢັນນຳເຂົ້າສິນຄ້າຕາມໃບສັ່ງຊື້ #' + purId + '?')) return;
  const imp = POS_DB.imports.createFromPurchase(purId, {
    userId:   DB.currentUser?.id,
    userName: DB.currentUser?.name,
  });
  if (imp) { renderImportPage(); showToast('✅ ນຳເຂົ້າສຳເລັດ — ສະຕັອກຖືກອັບເດດແລ້ວ'); }
}

/* ── ນຳເຂົ້າໂດຍກົງ (ບໍ່ຕ້ອງມີໃບສັ່ງຊື້) ─────────────────────
   ໜ້ານີ້ແຕ່ກ່ອນມີແຕ່ຕາຕະລາງ ບໍ່ມີປຸ່ມໃດເລີຍ ຕອນທີ່ຍັງບໍ່ມີໃບສັ່ງຊື້
   ຄ້າງ — ຄົນໃຊ້ຈຶ່ງບໍ່ຮູ້ວ່າຈະບັນທຶກການນຳເຂົ້າແນວໃດ */
let _impLines = [];

function openImportModal() {
  _impLines = [];
  renderImpLines();
  fillImpItemOptions();
  document.getElementById('impQty').value   = '';
  document.getElementById('impPrice').value = '';
  openModal('importModal');
}

function fillImpItemOptions() {
  document.getElementById('impItem').innerHTML =
    stockItemOptions(document.getElementById('impKind').value);
}

function addImpLine() {
  const kind  = document.getElementById('impKind').value;
  const refId = parseInt(document.getElementById('impItem').value);
  const qty   = parseInt(document.getElementById('impQty').value);
  // ຕົ້ນທຶນບໍ່ບັງຄັບ — ຂອງທີ່ໄດ້ມາຟຣີ/ແຖມ ກໍ່ຕ້ອງນຳເຂົ້າໄດ້ ຈຶ່ງປ່ອຍວ່າງເປັນ 0
  const price = parseInt(document.getElementById('impPrice').value) || 0;
  if (isNaN(refId)) { showToast('⚠️ ກະລຸນາເລືອກລາຍການ'); return; }
  if (isNaN(qty) || qty <= 0) { showToast('⚠️ ຈຳນວນຕ້ອງຫຼາຍກວ່າ 0'); return; }
  if (price < 0) { showToast('⚠️ ຕົ້ນທຶນຕິດລົບບໍ່ໄດ້'); return; }
  const item = kind === 'material' ? POS_DB.materials.get(refId) : POS_DB.products.get(refId);
  if (!item) return;
  _impLines.push({ kind, refId, name: localName(item), qty, price });
  document.getElementById('impQty').value   = '';
  document.getElementById('impPrice').value = '';
  renderImpLines();
}

function removeImpLine(idx) { _impLines.splice(idx, 1); renderImpLines(); }

function renderImpLines() {
  const el = document.getElementById('impLines');
  if (!_impLines.length) { el.innerHTML = 'ຍັງບໍ່ມີລາຍການ'; return; }
  const total = _impLines.reduce((s, l) => s + l.qty * l.price, 0);
  const icon  = k => k === 'material' ? '🥩' : k === 'drink' ? '🥤' : '🍽️';
  el.innerHTML = _impLines.map((l, i) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
      <span>${icon(l.kind)} ${l.name} x${l.qty}${l.price ? ` @ ${fmt(l.price)}` : ''}</span>
      <span><b>${fmt(l.qty * l.price)}</b> <button class="tbl-btn danger" onclick="removeImpLine(${i})">✕</button></span>
    </div>`).join('')
    + `<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:700">
        <span>ລວມຕົ້ນທຶນ</span><span style="color:var(--accent2)">${fmt(total)} ${i18n.t('currency')}</span>
      </div>`;
}

function saveDirectImport() {
  if (!_impLines.length) { showToast('⚠️ ກະລຸນາເພີ່ມລາຍການກ່ອນ'); return; }
  const imp = POS_DB.imports.createDirect({
    items:    _impLines,
    userId:   DB.currentUser?.id,
    userName: DB.currentUser?.name,
  });
  if (!imp) { showToast('⚠️ ບັນທຶກບໍ່ສຳເລັດ'); return; }
  _impLines = [];
  closeModal('importModal');
  renderImportPage();
  showToast('✅ ນຳເຂົ້າ #' + imp.id + ' ສຳເລັດ — ສະຕັອກຖືກອັບເດດແລ້ວ');
}

// ════════════════════════════════
// 11D. TABLES PAGE (ຈັດການໂຕະ)
// ════════════════════════════════
function renderTablesPage() {
  const tbs = POS_DB.tables.getAll();
  const thead = `<thead><tr><th>ເລກທີໂຕະ</th><th>ສະຖານະ</th><th>ຈັດການ</th></tr></thead>`;
  const tbody = `<tbody>${tbs.map(t => `<tr>
    <td><b>🪑 ${t.name}</b></td>
    <td>${t.status === 'free'
      ? '<span class="badge badge-green">🟢 ວ່າງ</span>'
      : '<span class="badge badge-red">🔴 ບໍ່ວ່າງ</span>'}</td>
    <td><div class="tbl-actions">
      <button class="tbl-btn" onclick="toggleTableStatus(${t.id})">${t.status === 'free' ? '🔓 ເປີດໂຕະ' : '🔒 ປິດໂຕະ'}</button>
      <button class="tbl-btn" onclick="openTableModal(${t.id})">✏️</button>
      <button class="tbl-btn danger" onclick="deleteTable(${t.id})">🗑️</button>
    </div></td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('tablesTable').innerHTML = thead + tbody;
}

function toggleTableStatus(id) {
  const t = POS_DB.tables.get(id);
  if (!t) return;
  POS_DB.tables.setStatus(id, t.status === 'free' ? 'busy' : 'free');
  renderTablesPage();
  showToast(t.status === 'free' ? '🔓 ເປີດໂຕະ ' + t.name : '🔒 ປິດໂຕະ ' + t.name);
}

function openTableModal(id = null) {
  document.getElementById('tableModalTitle').textContent = id ? 'ແກ້ໄຂໂຕະ' : 'ເພີ່ມໂຕະ';
  if (id) {
    const t = POS_DB.tables.get(id);
    if (!t) return;
    document.getElementById('tmId').value     = t.id;
    document.getElementById('tmName').value   = t.name;
    document.getElementById('tmStatus').value = t.status;
  } else {
    document.getElementById('tmId').value     = '';
    document.getElementById('tmName').value   = '';
    document.getElementById('tmStatus').value = 'free';
  }
  openModal('tableModal');
}

function saveTable() {
  const id     = document.getElementById('tmId').value;
  const name   = document.getElementById('tmName').value.trim();
  const status = document.getElementById('tmStatus').value;
  if (!name) { showToast('⚠️ ' + i18n.t('toast.fillall')); return; }
  if (id) POS_DB.tables.update(parseInt(id), { name, status });
  else    POS_DB.tables.add({ name, status });
  closeModal('tableModal');
  renderTablesPage();
  showToast('✅ ບັນທຶກໂຕະ ' + name + ' ແລ້ວ');
}

function deleteTable(id) {
  const t = POS_DB.tables.get(id);
  if (!t || !confirm('ລຶບໂຕະ ' + t.name + '?')) return;
  POS_DB.tables.delete(id);
  renderTablesPage();
  showToast('🗑️ ລຶບໂຕະ ' + t.name + ' ແລ້ວ');
}

// ════════════════════════════════
// 11E. KITCHEN PAGE (KDS)
// ════════════════════════════════
function renderKitchenPage() {
  const pending = POS_DB.orders.getAll()
    .filter(o => o.status === 'pending' || o.status === 'cooking')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const grid = document.getElementById('kdsGrid');
  document.getElementById('kdsEmpty').style.display = pending.length ? 'none' : 'block';

  grid.innerHTML = pending.map(o => `
    <div class="kpi-card" style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b class="mono">#${o.num}</b>
        <span class="badge badge-blue">🪑 ${o.tableCode || o.table || '-'}</span>
        <span class="badge ${o.status === 'cooking' ? 'badge-yellow' : 'badge-red'}">${o.status === 'cooking' ? '🔥 ກຳລັງເຮັດ' : '🆕 ໃໝ່'}</span>
      </div>
      <div style="font-size:0.78rem;color:var(--muted)">${o.time || ''}</div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px;font-size:0.9rem;flex:1">
        ${Array.isArray(o.items)
          ? o.items.map(i => `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${i.emoji || '🍽️'} ${typeof i.name === 'object' ? (i.name.lo || i.name.th) : i.name}</span><b>x${i.qty}</b></div>`).join('')
          : String(o.items).split(', ').map(i => '• ' + i).join('<br>')}
      </div>
      <div style="display:flex;gap:8px">
        ${o.status !== 'cooking' ? `<button class="tbl-btn" style="flex:1" onclick="kdsSetStatus(${o.id},'cooking')">🔥 ເລີ່ມເຮັດ</button>` : ''}
        <button class="tbl-btn" style="flex:1" onclick="kdsSetStatus(${o.id},'done')">✅ ສຳເລັດ</button>
      </div>
    </div>`).join('');

  updateKitchenBadge();
}

function kdsSetStatus(id, status) {
  POS_DB.orders.updateStatus(id, status);
  renderKitchenPage();
  showToast(status === 'done' ? '✅ ອໍເດີ້ສຳເລັດ' : '🔥 ເລີ່ມກະກຽມອາຫານ');
}

function updateKitchenBadge() {
  const n = POS_DB.orders.getAll().filter(o => o.status === 'pending' || o.status === 'cooking').length;
  const badge = document.getElementById('sbBadgeKitchen');
  if (badge) { badge.textContent = n; badge.dataset.count = n; }
}

/* Export ຕາມປະເພດລາຍງານທີ່ກຳລັງເປີດຢູ່ — ແຕ່ກ່ອນສົ່ງອອກ "ບິນຂາຍ" ສະເໝີ
   ເປີດລາຍງານວັດຖຸດິບແລ້ວກົດ Export ກໍ່ຍັງໄດ້ໄຟລ໌ບິນຂາຍ ເຊິ່ງຜິດ */
function exportCSV() {
  const type = document.getElementById('reportType')?.value || 'sales';
  // ຫຸ້ມທຸກຊ່ອງ: ຊື່ເມນູ/ໝາຍເຫດ ມີ , ແລະ " ໄດ້ ຖ້າບໍ່ escape ຖັນຈະເລື່ອນ
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  let rows, name;

  if (type === 'drink') {
    const dk = drinkCatKeys();
    const drinks = POS_DB.products.getAll().filter(p => dk.has(p.cat));
    rows = [['ເຄື່ອງດື່ມ', 'ລາຄາ', 'ສະຕັອກ', 'ສະຖານະ']];
    drinks.forEach(d => rows.push([localName(d), d.price, d.stock, d.status]));
    name = 'report_drink';

  } else if (type === 'material') {
    rows = [['ວັດຖຸດິບ', 'ຫົວໜ່ວຍ', 'ຄົງເຫຼືອ', 'ຂັ້ນຕ່ຳ']];
    POS_DB.materials.getAll().forEach(m => rows.push([localName(m), m.unit, m.stock, m.min]));
    name = 'report_material';

  } else if (type === 'purchase') {
    rows = [['ເລກທີ', 'ວັນທີ', 'ລາຍການ', 'ມູນຄ່າ', 'ຜູ້ສັ່ງ', 'ສະຖານະ']];
    POS_DB.purchases.getAll().forEach(p => rows.push([
      p.id, POS_DB.fmtDateTime(p.pur_date || p.date),
      p.items.map(i => `${i.name} x${i.qty}`).join(' | '), p.total, p.userName, p.status]));
    name = 'report_purchase';

  } else if (type === 'importDrink' || type === 'importMaterial') {
    const kind = type === 'importDrink' ? 'drink' : 'material';
    rows = [['ເລກທີ', 'ວັນທີ', 'ອ້າງອີງ',
             kind === 'drink' ? 'ເຄື່ອງດື່ມ' : 'ວັດຖຸດິບ',
             'ຈຳນວນ', 'ຕົ້ນທຶນ/ໜ່ວຍ', 'ລວມ', 'ຜູ້ຮັບ']];
    importLines(kind).forEach(l => rows.push([
      l.impId, POS_DB.fmtDateTime(l.date), l.purId ? '#' + l.purId : 'ໂດຍກົງ',
      l.name, l.qty, l.price, l.total, l.user]));
    name = kind === 'drink' ? 'report_import_drink' : 'report_import_material';

  } else {
    rows = [[i18n.t('tbl.order'), i18n.t('tbl.table'), i18n.t('tbl.items'),
             i18n.t('tbl.total'), i18n.t('tbl.time'), i18n.t('tbl.status')]];
    DB.orders.forEach(o => rows.push([o.num, orderTable(o), orderItemsText(o), o.total, o.time, o.status]));
    name = 'report_sales';
  }

  // BOM: ບໍ່ງັ້ນ Excel ເປີດພາສາລາວ/ໄທ ເປັນຕົວຫຍຸ້ງ
  const csv = '﻿' + rows.map(r => r.map(q).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = name + '.csv'; a.click();
  showToast('⬇ ' + i18n.t('toast.exportdone'));
}

// ════════════════════════════════
// 12. USERS PAGE
// ════════════════════════════════
function renderUsersPage() {
  const roleLabel = {
    admin:   i18n.t('user.role.admin'),
    manager: i18n.t('user.role.mgr'),
    cashier: i18n.t('user.role.cash')
  };
  const thead = `<thead><tr>
    <th>${i18n.t('admin.users')}</th>
    <th>${i18n.t('users.username')}</th>
    <th>${i18n.t('users.role')}</th>
    <th>${i18n.t('products.status')}</th>
    <th>${i18n.t('users.last.login')}</th>
    <th>${i18n.t('orders.manage')}</th>
  </tr></thead>`;
  const tbody = `<tbody>${DB.users.map(u => `<tr>
    <td><div style="display:flex;align-items:center;gap:10px">
      <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--blue),#1a252f);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;flex-shrink:0">${u.name[0]}</div>
      <b>${u.name}</b>
    </div></td>
    <td style="font-family:'DM Mono',monospace;font-size:0.82rem;color:var(--text2)">${u.username}</td>
    <td><span class="badge badge-blue">${roleLabel[u.role]||u.role}</span></td>
    <td>${u.status==='active'?`<span class="badge badge-green">✅ ${i18n.t('users.active')}</span>`:`<span class="badge badge-red">🚫 ${i18n.t('users.inactive')}</span>`}</td>
    <td style="color:var(--muted);font-size:0.78rem">${POS_DB.fmtDateTime(u.lastLogin)}</td>
    <td><div class="tbl-actions">
      <button class="tbl-btn" onclick="openUserModal(${u.id})">✏️</button>
      ${u.id !== DB.currentUser?.id ? `<button class="tbl-btn danger" onclick="deleteUser(${u.id})">🗑️</button>` : ''}
    </div></td>
  </tr>`).join('')}</tbody>`;
  document.getElementById('usersTable').innerHTML = thead + tbody;
}

function openUserModal(id = null) {
  document.getElementById('userModalTitle').textContent = id ? i18n.t('modal.edituser') : i18n.t('modal.adduser');
  if (id) {
    const u = DB.users.find(x => x.id === id);
    if (!u) return;
    document.getElementById('umId').value     = u.id;
    document.getElementById('umName').value   = u.name;
    document.getElementById('umUser').value   = u.username;
    document.getElementById('umPass').value   = '';
    document.getElementById('umRole').value   = u.role;
    document.getElementById('umStatus').value = u.status;
  } else {
    ['umId','umName','umUser','umPass'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('umRole').value   = 'cashier';
    document.getElementById('umStatus').value = 'active';
  }
  openModal('userModal');
}

function saveUser() {
  const id     = document.getElementById('umId').value;
  const name   = document.getElementById('umName').value.trim();
  const uname  = document.getElementById('umUser').value.trim();
  const pass   = document.getElementById('umPass').value;
  const role   = document.getElementById('umRole').value;
  const status = document.getElementById('umStatus').value;
  if (!name || !uname) { showToast('⚠️ ' + i18n.t('toast.fillall')); return; }

  if (id) {
    const u = DB.users.find(x => x.id === parseInt(id));
    POS_DB.users.update(parseInt(id), { name, username: uname, role, status });
    if (pass) POS_DB.users.update(parseInt(id), { password: pass });
    showToast('✅ ' + i18n.t('toast.saved') + ' ' + name);
  } else {
    if (!pass) { showToast('⚠️ ' + i18n.t('toast.fillall')); return; }
    POS_DB.users.add({ name, username: uname, password: pass, role, status });
    showToast('✅ ' + i18n.t('toast.added') + ' ' + name);
  }
  closeModal('userModal');
  renderUsersPage();
}

function deleteUser(id) {
  const u = DB.users.find(x => x.id === id);
  if (!u || !confirm(i18n.t('toast.deleteconfirm') + ' ' + u.name + '?')) return;
  POS_DB.users.delete(id);
  renderUsersPage();
  showToast('🗑️ ' + i18n.t('toast.deleted') + ' ' + u.name);
}

// ════════════════════════════════
// 13. SETTINGS UTILS
// ════════════════════════════════
function confirmReset() {
  if (confirm('⚠️ ' + i18n.t('toast.resetconfirm'))) {
    POS_DB.reset(); showToast('🗑️ ' + i18n.t('toast.resetdone'));
  }
}

// ════════════════════════════════
// 14. MODAL HELPERS
// ════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
  // มีข้อมูลใหม่เข้ามาระหว่างที่ modal เปิดอยู่ → ค่อยวาดตอนนี้
  if (pendingRerender) { pendingRerender = false; rerenderActivePage(); }
}
document.querySelectorAll?.('.modal-overlay')?.forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) el.classList.remove('show');
  });
});

// ════════════════════════════════
// 15. TOAST
// ════════════════════════════════
function showToast(msg, duration = 2500) {
  const stack = document.getElementById('toastStack');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateX(10px)';
    t.style.transition = 'all 0.3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ════════════════════════════════
// 16. REFRESH
// ════════════════════════════════
function refreshPage() {
  const active = document.querySelector('.page.active');
  if (!active) return;
  const page = active.id.replace('page-','');
  navTo(page, null);
  showToast('🔄 ' + i18n.t('toast.refreshed'));
}

// ════════════════════════════════
// 17. UTILS
// ════════════════════════════════
function fmt(n) {
  return Number(n).toLocaleString('th-TH');
}
function fmtK(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n/1000).toFixed(0) + 'K';
  return Math.round(n).toString();
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (!DB.currentUser) return;
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
  }
});

// Close modals on overlay click (after DOM ready)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) el.classList.remove('show');
    });
  });
});
