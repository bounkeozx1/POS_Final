'use strict';
/* script.js — User Self-Order Page
   Requires: i18n.js → db.js → script.js  */

let cart = [], currentCat = 'all', searchQuery = '';
const UI_FONT_KEY = 'pos-sst-font-scale';
const UI_FONT_STEPS = [1, 1.12, 1.24, 1.36, 1.5];
const UI_FONT_DEFAULT = 1.12;
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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f7f3ec' : '#0f0f13');
}

function toggleThemeMode() {
  const next = getThemeMode() === 'light' ? 'dark' : 'light';
  localStorage.setItem(UI_THEME_KEY, next);
  applyThemeMode(next);
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
}

function resetUiFontSize() {
  localStorage.removeItem(UI_FONT_KEY);
  applyUiFontScale(UI_FONT_DEFAULT);
}

/* ── Multilingual helpers ──────────────────────────────────
   Menu items store name/desc as { lo, th, en, zh } objects.
   Falls back to string if stored as plain string (old data).
   ────────────────────────────────────────────────────────── */
function localName(item) {
  if (!item) return '';
  if (typeof item.name === 'object') {
    return item.name[i18n.getLang()] || item.name.lo || item.name.en || '';
  }
  return item.name || '';
}
function localDesc(item) {
  if (!item) return '';
  if (typeof item.desc === 'object') {
    return item.desc[i18n.getLang()] || item.desc.lo || item.desc.en || '';
  }
  return item.desc || '';
}
const catKeys = { all:'cat.all', rice:'cat.rice', noodle:'cat.noodle', grill:'cat.grill', drink:'cat.drink', dessert:'cat.dessert' };
const catIcons = { all:'🍽️ ', rice:'🍚 ', noodle:'🍜 ', grill:'🔥 ', drink:'🥤 ', dessert:'🍮 ' };

/* ── Init ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyThemeMode(getThemeMode());
  applyUiFontScale(getUiFontScale());
  // 1. Language switcher — always mount in header
  i18n.buildSwitcher(document.getElementById('langMount'));

  // 2. When language changes: re-render all dynamic UI
  window.addEventListener('langchange', () => {
    // Refresh cart item displayNames to new language
    const allProducts = POS_DB.products.getAll();
    cart.forEach(c => {
      const p = allProducts.find(p => p.id === c.id);
      if (p) c.displayName = localName(p);
    });
    renderCatPills();
    renderMenu();
    renderSheet();
    renderTracking();
    updateCartBar();
    // Update static data-i18n nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = i18n.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = i18n.t(el.dataset.i18nPh);
    });
  });

  // 2.5 บันทึกลง MySQL ไม่สำเร็จ → ต้องเห็นบนจอ
  // ของเดิมเงียบสนิท ลูกค้าจึงเห็นหน้าต่าง "สั่งสำเร็จ" ทั้งที่บิลไม่เคยลงฐานข้อมูล
  // (Db.js จะดึงข้อมูลจริงกลับมาทับ ทำให้ออเดอร์หายไปเองในไม่กี่วินาที)
  window.addEventListener('posdb:error', e => {
    showToast('⛔ ບັນທຶກລົງຖານຂໍ້ມູນບໍ່ສຳເລັດ: ' + e.detail, 6000);
  });

  // 3. React to admin changes (menu edits, order status updates)
  POS_DB.onExternalChange(key => {
    if (key === POS_DB.KEY.products) renderMenu();
    if (key === POS_DB.KEY.orders)   { renderTracking(); updateHeaderPill(); }
  });

  // 4. Load store name from settings
  const s = POS_DB.settings.get();
  const storeNameEl = document.getElementById('headerStoreName');
  const mapNameEl   = document.getElementById('mapStoreName');
  if (storeNameEl) storeNameEl.textContent = s.storeName || i18n.t('app.name');
  if (mapNameEl)   mapNameEl.textContent   = (s.storeName || i18n.t('app.name'));

  // 5. Initial renders
  renderCatPills();
  renderMenu();
  setupSheetSwipe();

  // 6. Poll order status every 8s
  setInterval(() => { renderTracking(); updateHeaderPill(); }, 8000);
});

/* ── Helpers ──────────────────────────────────────────── */
function getTableCode() {
  return new URLSearchParams(window.location.search).get('table')
      || document.getElementById('tableCode')?.textContent
      || 'T01';
}
// tbl_sale.table_id เป็น BIGINT + FOREIGN KEY → ต้องเป็น "ตัวเลขของโต๊ะที่มีจริง"
// ของเดิมคืนข้อความ 'table_default' เมื่อ URL ไม่มี ?tableId= ทำให้ MySQL
// (โหมด STRICT) ปฏิเสธทั้ง transaction → บิลไม่ถูกบันทึก และหน้า admin ไม่เห็นออเดอร์เลย
// ตอนนี้: ใช้ค่าจาก URL ถ้าเป็นตัวเลข ไม่งั้นหาจากชื่อโต๊ะ (T01...) และคืน null ถ้าไม่พบ
function getTableId() {
  const raw = new URLSearchParams(window.location.search).get('tableId');
  if (raw && /^\d+$/.test(raw.trim())) return parseInt(raw, 10);
  const t = POS_DB.tables.getAll().find(x => x.name === getTableCode());
  return t ? t.id : null;
}

/* ── Page navigation ──────────────────────────────────── */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'  + page)?.classList.add('active');
  document.getElementById('nav-'   + page)?.classList.add('active');
  document.getElementById('mainContent')?.scrollTo({ top:0, behavior:'smooth' });
  if (page === 'track') { renderTracking(); updateHeaderPill(); }
}

/* ── Category pills ───────────────────────────────────── */
function renderCatPills() {
  document.querySelectorAll('.cat-pill[data-cat]').forEach(pill => {
    const cat = pill.dataset.cat;
    pill.textContent = (catIcons[cat] || '') + i18n.t(catKeys[cat] || 'cat.all');
  });
  document.getElementById('sectionLabel').textContent = i18n.t(catKeys[currentCat] || 'cat.all');
}

function filterCat(cat, el) {
  currentCat = cat;
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderMenu();
  document.getElementById('sectionLabel').textContent = i18n.t(catKeys[cat] || 'cat.all');
}

function searchMenu(val) {
  searchQuery = val.toLowerCase().trim();
  document.getElementById('searchClear').style.display = val ? 'flex' : 'none';
  renderMenu();
}
function clearSearch() {
  document.getElementById('searchInput').value = '';
  searchMenu('');
}

/* ── Menu render ──────────────────────────────────────── */
function renderMenu() {
  const grid     = document.getElementById('menuGrid');
  const filtered = POS_DB.products.getAll().filter(item => {
    const mc = currentCat === 'all' || item.cat === currentCat;
    // Search across ALL language names so user can type in any language
    const nm = localName(item).toLowerCase();
    const dm = localDesc(item).toLowerCase();
    const fallbacks = typeof item.name === 'object'
      ? Object.values(item.name).join(' ').toLowerCase()
      : (item.name||'').toLowerCase();
    const ms = !searchQuery || nm.includes(searchQuery) || dm.includes(searchQuery) || fallbacks.includes(searchQuery);
    return mc && ms;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div>${i18n.t('order.notfound')}</div></div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const qty    = (cart.find(c => c.id === item.id) || {qty:0}).qty;
    const isSold = item.status !== 'active' || item.stock <= 0;
    return `
      <div class="menu-card${isSold?' sold-out-card':''}" id="card-${item.id}" onclick="${isSold?'':'tapCard('+item.id+')'}">
        ${isSold ? `<div class="sold-out-badge">${i18n.t('order.soldout')}</div>` : ''}
        <div class="card-qty-badge${qty>0?' show':''}" id="badge-${item.id}">${qty}</div>
        <div class="menu-emoji">
          <svg class="menu-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.1 2a.6.6 0 0 1 .6.6V9a2.4 2.4 0 0 1-1.8 2.33V21a1 1 0 1 1-2 0v-9.67A2.4 2.4 0 0 1 3.1 9V2.6a.6.6 0 0 1 1.2 0V8a.5.5 0 0 0 1 0V2.6a.6.6 0 0 1 1.2 0V8a.5.5 0 0 0 1 0V2.6a.6.6 0 0 1 .6-.6Zm7.4 0c1.9 0 3.4 2.4 3.4 5.6 0 2.5-.9 4.5-2.3 5.2V21a1 1 0 1 1-2 0v-8.2c-1.4-.7-2.3-2.7-2.3-5.2C12.3 4.4 13.8 2 15.5 2Z"/></svg>
          ${item.img ? `<img class="menu-img" src="${item.img}" alt="${localName(item)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="menu-body">
          <div class="menu-name">${localName(item)}</div>
          <div class="menu-desc">${localDesc(item)}</div>
          <div class="menu-footer">
            <div class="menu-price">${fmt(item.price)} <small>${i18n.t('currency')}</small></div>
            ${isSold
              ? `<span style="color:var(--red);font-size:.72rem">${i18n.t('order.soldout')}</span>`
              : `<button class="add-btn" onclick="event.stopPropagation();addToCart(${item.id})">+</button>`}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ── Cart ─────────────────────────────────────────────── */
function tapCard(id) {
  addToCart(id);
  const c = document.getElementById('card-' + id);
  if (c) { c.style.transition='transform .15s'; c.style.transform='scale(.94)'; setTimeout(()=>c.style.transform='scale(1)',150); }
}

function addToCart(id) {
  const item = POS_DB.products.get(id);
  if (!item || item.status !== 'active' || item.stock <= 0) return;
  const ex = cart.find(c => c.id === id);
  if (ex) {
    if (ex.qty >= item.stock) { showToast('⚠️ ' + i18n.t('order.soldout')); return; }
    ex.qty++;
    // Update display name if language changed since item was added
    ex.displayName = localName(item);
  } else {
    cart.push({
      id:    item.id,
      name:  item.name,          // keep raw (multilingual object) for re-renders
      displayName: localName(item), // current-language display string
      price: item.price,
      emoji: item.emoji,
      img:   item.img,           // รูปสินค้า (แสดงในตะกร้า)
      qty:   1
    });
  }
  updateCartBadge(id);
  updateCartBar();
  showToast('✅ ' + localName(item));
}

function changeQty(id, delta) {
  const idx = cart.findIndex(c => c.id === id);
  if (idx < 0) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartBadge(id);
  updateCartBar();
  renderSheet();
}

function clearCart() {
  // Save scroll position before any DOM changes
  const mc   = document.getElementById('mainContent');
  const savedScroll = mc ? mc.scrollTop : 0;

  cart.forEach(c => updateCartBadge(c.id, 0));
  cart = [];

  // Close the sheet first (avoids DOM-in-sheet causing scroll)
  closeCart();

  // Update after sheet starts closing (rAF = after paint)
  requestAnimationFrame(() => {
    updateCartBar();
    renderSheet();
    // Restore scroll position
    if (mc) mc.scrollTop = savedScroll;
  });
}

function updateCartBadge(id, fq = null) {
  const b = document.getElementById('badge-' + id);
  if (!b) return;
  const q = fq !== null ? fq : (cart.find(c => c.id === id)?.qty || 0);
  b.textContent = q;
  b.classList.toggle('show', q > 0);
}

function updateCartBar() {
  const bar = document.getElementById('cartBar');
  const qty = cart.reduce((s,c) => s+c.qty, 0);

  if (!qty) {
    // Hide: remove class so animation won't re-fire next time we show
    bar.classList.remove('cart-bar-show');
    bar.style.display = 'none';
    return;
  }

  // Only trigger display + animation once (first appearance)
  const wasHidden = bar.style.display === 'none' || bar.style.display === '';
  if (wasHidden) {
    bar.style.display = 'flex';
    // Force reflow so animation restarts cleanly from correct position
    void bar.offsetWidth;
    bar.classList.add('cart-bar-show');
  }

  // Always update text content (no layout change = no jump)
  document.getElementById('cartBarQty').textContent   = qty;
  document.getElementById('cartBarTotal').textContent = fmt(cartGrandTotal()) + ' ' + i18n.t('currency');
  document.getElementById('cartBarMid').textContent   = i18n.t('cart.view');
}

function openCart()  {
  document.getElementById('bottomSheet').classList.add('open');
  document.getElementById('sheetOverlay').classList.add('show');
  renderSheet();
}
function closeCart() {
  document.getElementById('bottomSheet').classList.remove('open');
  document.getElementById('sheetOverlay').classList.remove('show');
}

function renderSheet() {
  const body = document.getElementById('sheetBody');
  document.getElementById('sheetTitle').textContent = i18n.t('cart.title');
  document.getElementById('sumSubLabel').textContent  = i18n.t('cart.subtotal');
  document.getElementById('vatLabel').textContent     = i18n.t('vat.label');
  document.getElementById('sumTotalLabel').textContent= i18n.t('cart.total');
  document.getElementById('confirmOrderBtn').textContent = '✅ ' + i18n.t('cart.confirm');
  document.getElementById('clearCartBtn').textContent    = i18n.t('cart.clear');

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty-sheet"><div class="e-icon">🛒</div>${i18n.t('cart.empty')}<br><small style="color:var(--muted)">${i18n.t('cart.empty.sub')}</small></div>`;
    updateSheetSummary(0,0,0);
    return;
  }
  body.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="ci-thumb">
        <svg class="ci-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.1 2a.6.6 0 0 1 .6.6V9a2.4 2.4 0 0 1-1.8 2.33V21a1 1 0 1 1-2 0v-9.67A2.4 2.4 0 0 1 3.1 9V2.6a.6.6 0 0 1 1.2 0V8a.5.5 0 0 0 1 0V2.6a.6.6 0 0 1 1.2 0V8a.5.5 0 0 0 1 0V2.6a.6.6 0 0 1 .6-.6Zm7.4 0c1.9 0 3.4 2.4 3.4 5.6 0 2.5-.9 4.5-2.3 5.2V21a1 1 0 1 1-2 0v-8.2c-1.4-.7-2.3-2.7-2.3-5.2C12.3 4.4 13.8 2 15.5 2Z"/></svg>
        ${c.img ? `<img src="${c.img}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="ci-info">
        <div class="ci-name">${c.displayName || localName({name:c.name})}</div>
        <div class="ci-price">${fmt(c.price * c.qty)} ${i18n.t('currency')}</div>
      </div>
      <div class="ci-ctrl">
        <button class="ci-btn" onclick="changeQty(${c.id},-1)">−</button>
        <span class="ci-qty">${c.qty}</span>
        <button class="ci-btn" onclick="changeQty(${c.id},+1)">+</button>
      </div>
    </div>`).join('');
  const sub = cartSubtotal(), vat = Math.round(sub * (POS_DB.settings.getVat() / 100));
  updateSheetSummary(sub, vat, sub + vat);
}

function updateSheetSummary(s, v, t) {
  document.getElementById('sumSub').textContent   = fmt(s) + ' ' + i18n.t('currency');
  document.getElementById('sumVat').textContent   = fmt(v) + ' ' + i18n.t('currency');
  document.getElementById('sumTotal').textContent = fmt(t) + ' ' + i18n.t('currency');
}

/* ── Place Order ──────────────────────────────────────── */
function placeOrder() {
  if (!cart.length) { showToast('⚠️ ' + i18n.t('cart.empty.sub')); return; }
  const order = POS_DB.orders.create({
    tableCode:     getTableCode(),
    tableId:       getTableId(),
    // ไม่ใส่ img: รูปเป็น data URL ก้อนใหญ่ ฝั่ง PHP ก็ไม่ได้เก็บลง tbl_sale_detail อยู่แล้ว
    // แต่ถ้าติดไปด้วย ทุกครั้งที่บันทึกจะ POST บิลเก่าทั้งหมดพร้อมรูป จนเกิน post_max_size
    items:         cart.map(c => ({id:c.id,name:c.displayName||localName({name:c.name}),price:c.price,qty:c.qty,emoji:c.emoji})),
    paymentMethod: 'cash',
  });
  document.getElementById('modalNum').textContent   = '#' + order.num;
  document.getElementById('modalTable').textContent = order.tableCode;
  document.getElementById('modalSuccessTitle').textContent = i18n.t('modal.success');
  document.getElementById('modalSuccessSub').textContent   = i18n.t('modal.wait');
  document.getElementById('modalTrackBtn').textContent     = i18n.t('modal.track');
  document.getElementById('modal').classList.add('show');
  cart.forEach(c => updateCartBadge(c.id, 0));
  cart = [];
  updateCartBar();
  closeCart();
  renderMenu();
  renderTracking();
  updateHeaderPill();
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
  showPage('track');
}

/* ── Order Tracking ───────────────────────────────────── */
function renderTracking() {
  const myTable  = getTableCode();
  const myOrders = POS_DB.orders.getAll().filter(o => o.tableCode === myTable);

  const pending = myOrders.filter(o => o.status==='pending').length;
  const cooking = myOrders.filter(o => o.status==='cooking').length;
  const done    = myOrders.filter(o => o.status==='done').length;

  document.getElementById('tPendingNum').textContent = pending;
  document.getElementById('tCookingNum').textContent = cooking;
  document.getElementById('tDoneNum').textContent    = done;
  document.getElementById('trackPageTitle').textContent = i18n.t('track.title');
  document.getElementById('tPendingLbl').textContent = i18n.t('status.pending');
  document.getElementById('tCookingLbl').textContent = i18n.t('status.cooking');
  document.getElementById('tDoneLbl').textContent    = i18n.t('status.done');

  const active = pending + cooking;
  const navBadge = document.getElementById('navPendingBadge');
  navBadge.style.display = active > 0 ? 'flex' : 'none';
  navBadge.textContent   = active;

  document.getElementById('navOrderLabel').textContent   = i18n.t('nav.order');
  document.getElementById('navTrackLabel').textContent   = i18n.t('nav.myorders');

  const list = document.getElementById('trackOrders');
  if (!myOrders.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <div>${i18n.t('track.empty')}</div>
        <div style="font-size:.8rem;color:var(--muted);margin-top:6px">${i18n.t('track.empty.sub')}</div>
      </div>`;
    document.getElementById('sessionTotal').style.display = 'none';
    return;
  }

  const steps = [
    { key:'pending', label: i18n.t('track.step.rcv')  },
    { key:'cooking', label: i18n.t('track.step.cook') },
    { key:'done',    label: i18n.t('track.step.done') },
  ];
  const statusIdx = { pending:0, cooking:1, done:2, cancel:-1 };

  list.innerHTML = myOrders.map(o => {
    const curIdx = statusIdx[o.status] ?? 0;
    const stepHTML = steps.map((s, i) => {
      const isDone   = i < curIdx;
      const isActive = i === curIdx && o.status !== 'cancel';
      const dotCls   = isDone ? 'done-dot' : isActive ? 'active' : '';
      const lineCls  = i < steps.length-1 ? (isDone ? 'active':'') : '';
      return `<div class="step"><div class="step-dot ${dotCls}"></div><div class="step-lbl">${s.label}</div></div>
              ${i < steps.length-1 ? `<div class="step-line ${lineCls}"></div>` : ''}`;
    }).join('');

    const statusLabel = {
      pending: `⏳ ${i18n.t('status.pending')}`,
      cooking: `👨‍🍳 ${i18n.t('status.cooking')}`,
      done:    `✅ ${i18n.t('status.done')}`,
      cancel:  `❌ ${i18n.t('status.cancel')}`,
    }[o.status] || '';

    const itemsText = o.items.map(i => `${i.emoji||''} ${i.name} ×${i.qty}`).join(' · ');

    return `
      <div class="track-card status-${o.status}">
        <div class="track-card-header">
          <span class="track-order-num">#${o.num}</span>
          <span class="track-order-time">${o.time}</span>
        </div>
        <div class="track-items">${itemsText}</div>
        <div class="track-footer">
          <div class="track-stepper">${stepHTML}</div>
          <button class="bill-btn" onclick="openBill(${o.id})">🧾 ${i18n.t('track.bill')}</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 12px;border-top:1px solid var(--border)">
          <span style="font-size:.78rem;color:var(--muted)">${statusLabel}</span>
          <span style="font-weight:700;color:var(--accent2);font-size:.9rem">${fmt(o.total)} ${i18n.t('currency')}</span>
        </div>
      </div>`;
  }).join('');

  const grandTotal = myOrders.filter(o=>o.status!=='cancel').reduce((s,o)=>s+o.total,0);
  const stEl = document.getElementById('sessionTotal');
  stEl.style.display = 'block';
  document.getElementById('sessionTotalLabel').textContent = i18n.t('track.session');
  document.getElementById('stVal').textContent = fmt(grandTotal) + ' ' + i18n.t('currency');
}

/* ── Header pill ──────────────────────────────────────── */
function updateHeaderPill() {
  const myTable = getTableCode();
  const active  = POS_DB.orders.getAll().filter(o => o.tableCode===myTable && (o.status==='pending'||o.status==='cooking'));
  const pill    = document.getElementById('orderStatusPill');
  const txt     = document.getElementById('orderStatusText');
  if (active.length) {
    pill.style.display = 'flex';
    const cooking = active.filter(o=>o.status==='cooking').length;
    txt.textContent = cooking
      ? `${i18n.t('status.cooking')} ${cooking}`
      : `${i18n.t('status.pending')} ${active.length}`;
  } else {
    pill.style.display = 'none';
  }
}

/* ── Bill modal ───────────────────────────────────────── */
let _billOrderId   = null;
let _selectedPay   = 'cash';

function openBill(orderId) {
  const order = POS_DB.orders.get(orderId);
  if (!order) return;
  _billOrderId = orderId;
  const s = POS_DB.settings.get();

  document.getElementById('billModalTitle').textContent = i18n.t('bill.title');
  document.getElementById('billStoreName').textContent  = s.storeName || i18n.t('app.name');
  document.getElementById('billStoreMeta').textContent  = (s.address||'') + (s.phone ? ' · '+s.phone : '');
  document.getElementById('billTable').textContent     = order.tableCode;
  document.getElementById('billOrderNum').textContent  = '#' + order.num;
  document.getElementById('billTime').textContent      = order.time;
  document.getElementById('billSubLabel').textContent  = i18n.t('bill.subtotal');
  document.getElementById('billTotalLabel').textContent= i18n.t('bill.total');
  document.getElementById('billSub').textContent       = fmt(order.subtotal) + ' ' + i18n.t('currency');
  document.getElementById('billVat').textContent       = fmt(order.vatAmt)   + ' ' + i18n.t('currency');
  document.getElementById('billTotal').textContent     = fmt(order.total)    + ' ' + i18n.t('currency');
  document.getElementById('billFooterText').textContent= s.receiptFooter || i18n.t('bill.footer');

  document.getElementById('billBody').innerHTML = order.items.map(i => `
    <div class="bill-item">
      <div class="bill-item-left">
        <span class="bill-item-emoji">${i.emoji||'🍽️'}</span>
        <div>
          <div class="bill-item-name">${i.name}</div>
          <div class="bill-item-qty">× ${i.qty} @ ${fmt(i.price)} ${i18n.t('currency')}</div>
        </div>
      </div>
      <div class="bill-item-price">${fmt(i.price*i.qty)} ${i18n.t('currency')}</div>
    </div>`).join('');

  // Payment section labels
  document.getElementById('billPayTitle').textContent = i18n.t('bill.pay.title');
  document.getElementById('payOptCash').querySelector('span:last-child').textContent     = i18n.t('bill.pay.cash');
  document.getElementById('payOptQr').querySelector('span:last-child').textContent       = i18n.t('bill.pay.qr');
  document.getElementById('payOptTransfer').querySelector('span:last-child').textContent = i18n.t('bill.pay.transfer');
  document.getElementById('qrScanLabel').textContent = i18n.t('bill.qr.scan');

  const paySection = document.getElementById('billPaySection');
  const statusArea = document.getElementById('billStatusArea');

  if (order.status === 'done') {
    paySection.style.display = 'none';
    statusArea.innerHTML = `<div class="bill-status-tag">✅ ${i18n.t('bill.paid')} — ${payLabel(order.paymentMethod)}</div>`;
  } else if (order.status === 'cancel') {
    paySection.style.display = 'none';
    statusArea.innerHTML = `<div class="bill-status-tag" style="background:rgba(231,76,60,.12);color:var(--red)">❌ ${i18n.t('status.cancel')}</div>`;
  } else {
    paySection.style.display = 'block';
    statusArea.innerHTML = '';
    _selectedPay = order.paymentMethod || 'cash';
    document.querySelectorAll('.pay-opt').forEach(o => o.classList.toggle('selected', o.dataset.method===_selectedPay));
    document.getElementById('qrBlock').classList.toggle('show', _selectedPay==='qr');
  }

  document.getElementById('billOverlay').classList.add('show');
}

function closeBill() { document.getElementById('billOverlay').classList.remove('show'); }
function closeBillOnOverlay(e) { if(e.target===document.getElementById('billOverlay')) closeBill(); }

function selectPayment(method, el) {
  _selectedPay = method;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('qrBlock').classList.toggle('show', method==='qr');
  if (_billOrderId) {
    const all = POS_DB.orders.getAll();
    const o   = all.find(x => x.id === _billOrderId);
    if (o) { o.paymentMethod = method; POS_DB.orders.save(all); }
  }
}

function payLabel(m) {
  return { cash: i18n.t('bill.pay.cash'), qr: i18n.t('bill.pay.qr'), transfer: i18n.t('bill.pay.transfer') }[m] || i18n.t('bill.pay.cash');
}

/* ── Swipe sheet ──────────────────────────────────────── */
function setupSheetSwipe() {
  const sheet = document.getElementById('bottomSheet');
  let sy=0, st=0;
  sheet.addEventListener('touchstart', e=>{sy=e.touches[0].clientY;st=Date.now();},{passive:true});
  sheet.addEventListener('touchend',   e=>{if(e.changedTouches[0].clientY-sy>80&&Date.now()-st<400)closeCart();},{passive:true});
}

/* ── Utils ────────────────────────────────────────────── */
function cartSubtotal()   { return cart.reduce((s,c)=>s+c.price*c.qty,0); }
function cartGrandTotal() { const s=cartSubtotal(); return s+Math.round(s*(POS_DB.settings.getVat()/100)); }
function fmt(n) { return Number(n).toLocaleString('lo-LA'); }
function showToast(msg, dur=2200) {
  const w=document.getElementById('toastWrap'), t=document.createElement('div');
  t.className='toast'; t.textContent=msg; w.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),300); },dur);
}
