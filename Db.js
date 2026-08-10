/* ============================================================
   Db.js — Shared Data Layer (MySQL only)
   ใช้ร่วมกันระหว่าง:
     • index.html  (Self-Ordering หน้าลูกค้า)
     • admin.html  (Admin Dashboard)

   ข้อมูลทั้งหมดอยู่ใน MySQL ผ่าน api/index.php เท่านั้น
   ไม่มีโหมด localStorage สำรอง และไม่มีข้อมูลตัวอย่างฝังในไฟล์นี้อีกแล้ว
   → ต้องเปิดผ่าน Apache ของ XAMPP:  http://localhost/POS-SST-main/
     ถ้าเปิดไฟล์ตรง ๆ (file://) หรือผ่าน static server อื่น จะขึ้น error
     ไม่ใช่แอบทำงานต่อด้วยข้อมูลในเบราว์เซอร์เหมือนเวอร์ชันก่อน

   วิธีใช้: เพิ่ม <script src="Db.js"></script> ก่อน script หลักในทั้งสองหน้า
   ============================================================ */

const POS_DB = (() => {

  // ── Keys (ตรงกับ Data Dictionary บทที่ 3.5) ──────────────
  const KEY = {
    products:   'posdb_products',    // tbl_product  (D4, D5, D13)
    categories: 'posdb_categories',  // tbl_category (D2, D3)
    materials:  'posdb_materials',   // วัตถุดิบ (ส่วนหนึ่งของ tbl_product / D13)
    purchases:  'posdb_purchases',   // tbl_purchase + tbl_purchase_detail (D6, D7)
    imports:    'posdb_imports',     // tbl_import   (D8, D9)
    tables:     'posdb_tables',      // tbl_table    (D10)
    orders:     'posdb_orders',      // tbl_sale + tbl_sale_detail (D11, D12)
    stockLog:   'posdb_stockLog',
    users:      'posdb_users',       // tbl_user (D1)
    settings:   'posdb_settings',
    orderNum:   'posdb_orderNum',
  };

  /* ── Password hashing (tbl_user.password = "Encrypted") ───────────────
     ของเดิมใช้ DJB2 ซึ่ง "ไม่ใช่" การเข้ารหัส: กว้างแค่ 32 บิต ย้อนกลับได้
     ด้วยการไล่สุ่ม และไม่มี salt → ผู้ใช้ที่รหัสผ่านเหมือนกันจะได้ค่าเดียวกันเป๊ะ
     (เห็นได้ในตาราง: admin กับ cashier ได้ h7c540741 เท่ากัน)

     ของใหม่: SHA-256 + salt เฉพาะคน + วนซ้ำ (key stretching)
       รูปแบบที่เก็บ →  s1$<salt hex>$<hash hex>
     รองรับรูปแบบนี้อย่างเดียว — ค่าใน database.sql ก็เป็นรูปแบบนี้แล้ว

     ข้อจำกัดที่ต้องรู้: ระบบนี้ตรวจรหัสผ่านฝั่งเบราว์เซอร์ การแฮชจึงกัน
     "คนเปิดตาราง DB แล้วเห็นรหัสผ่านตรง ๆ" ได้ แต่กันคนที่แก้ไฟล์ JS เองไม่ได้
     ─────────────────────────────────────────────────────────────────── */
  const PW_ITER = 1000;   // จำนวนรอบ stretching (ถ่วงให้เดารหัสช้าลง)

  const SHA_K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    const esc = unescape(encodeURIComponent(str));           // fallback เบราว์เซอร์เก่า
    const out = new Uint8Array(esc.length);
    for (let i = 0; i < esc.length; i++) out[i] = esc.charCodeAt(i);
    return out;
  }

  // SHA-256 แบบ synchronous (crypto.subtle เป็น async + ต้องใช้ https/localhost
  // จึงเขียนเองเพื่อให้ใช้ได้ทุกกรณีโดยไม่ต้องรื้อโค้ดส่วนอื่นให้เป็น async)
  function sha256Hex(str) {
    const bytes = utf8Bytes(str), len = bytes.length, bitLen = len * 8;
    const padded = new Uint8Array(((((len + 8) >> 6) + 1) << 6));
    padded.set(bytes);
    padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(bitLen / 4294967296));
    dv.setUint32(padded.length - 4, bitLen >>> 0);

    let h0=0x6a09e667, h1=0xbb67ae85, h2=0x3c6ef372, h3=0xa54ff53a,
        h4=0x510e527f, h5=0x9b05688c, h6=0x1f83d9ab, h7=0x5be0cd19;
    const w = new Uint32Array(64);
    for (let i = 0; i < padded.length; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const x = w[t-15], y = w[t-2];
        const s0 = rotr(x,7)  ^ rotr(x,18) ^ (x >>> 3);
        const s1 = rotr(y,17) ^ rotr(y,19) ^ (y >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
      }
      let a=h0, b=h1, c=h2, d=h3, e=h4, f=h5, g=h6, h=h7;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + SHA_K[t] + w[t]) >>> 0;
        const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h=g; g=f; f=e; e=(d + t1) >>> 0; d=c; c=b; b=a; a=(t1 + t2) >>> 0;
      }
      h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0;
      h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+h)>>>0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map(x => x.toString(16).padStart(8, '0')).join('');
  }

  function randomHex(bytes) {
    const a = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }

  function hashPassword(plain, salt) {
    salt = salt || randomHex(16);
    let h = sha256Hex(salt + '|' + String(plain));
    for (let i = 0; i < PW_ITER; i++) h = sha256Hex(h + salt);
    return 's1$' + salt + '$' + h;
  }

  // รูปแบบเดียวที่รองรับคือ s1$<salt>$<hash> — ตรงกับที่ database.sql ใส่ไว้
  function verifyPassword(plain, stored) {
    const parts = String(stored || '').split('$');
    if (parts.length !== 3 || parts[0] !== 's1') return false;
    return hashPassword(plain, parts[1]) === stored;
  }

  // ── Backend: MySQL ผ่าน api/index.php — โหมดเดียว ไม่มี fallback ──
  //   ต่อ MySQL ไม่ได้ = ขึ้น error เต็มจอ ไม่ใช่แอบทำงานต่อด้วยข้อมูลปลอม
  const API_URL = 'api/index.php';
  const SSE_URL = 'api/events.php';         // ช่องทาง realtime (เซิร์ฟเวอร์ push มาเอง)
  let   API_ON  = false;                    // true ต่อเมื่อต่อ MySQL ได้จริงเท่านั้น
  const cache   = {};                       // in-memory mirror (keyed by KEY.* value)
  const POLL_MS = 5000;                     // ทางสำรอง: ใช้เมื่อ SSE ต่อไม่ได้เท่านั้น
  let   revs    = {};                       // ลุ่นของแต่ละ store ที่หน้าจอนี้มีอยู่
  // KEY value (posdb_products) → store name (products) ที่ฝั่ง PHP รู้จัก
  const STORE_OF = {};
  Object.keys(KEY).forEach(name => { STORE_OF[KEY[name]] = name; });

  // นับจำนวนการเขียนที่ยังค้างอยู่ + เวลาที่เขียนล่าสุด
  // ใช้กันไม่ให้ผลของ poll ที่ยิงไป "ก่อน" การบันทึก มาทับ cache ที่เพิ่งอัปเดต
  // (ถ้าปล่อยให้ทับ ครั้งต่อไปที่ save จะส่งข้อมูลเก่าขึ้นไป = ข้อมูลใหม่หายจริง)
  let pendingWrites = 0;
  let lastWriteAt   = 0;

  function apiGetAllSync() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', API_URL + '?t=' + Date.now(), false);   // sync เฉพาะตอน bootstrap
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);            // ถ้าเซิร์ฟไม่ใช่ PHP จะ parse ไม่ผ่าน
        if (data && data.meta) return data;
      }
    } catch (e) { /* ต่อ backend ไม่ได้ */ }
    return null;
  }

  // เวอร์ชัน async — ใช้กับ polling เพื่อไม่ให้ค้างหน้าจอทุก 5 วินาที
  function apiGetAllAsync(cb) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '?t=' + Date.now(), true);
    xhr.onload  = () => {
      if (xhr.status < 200 || xhr.status >= 300) return cb(null);
      try {
        const data = JSON.parse(xhr.responseText);
        cb(data && data.meta ? data : null);
      } catch { cb(null); }
    };
    xhr.onerror = () => cb(null);
    xhr.send(null);
  }

  // แจ้งเตือนเมื่อเขียนลง MySQL ไม่สำเร็จ — ไม่กลืน error เงียบ ๆ
  // ถ้าไม่แจ้ง หน้าจอจะโชว์ว่า "บันทึกแล้ว" ทั้งที่ฐานข้อมูลไม่ได้รับข้อมูล
  function reportSyncError(msg) {
    console.error('POS_DB: ບັນທຶກລົງ MySQL ບໍ່ສຳເລັດ —', msg);
    window.dispatchEvent(new CustomEvent('posdb:error', { detail: msg }));
    resync();   // ดึงสถานะจริงจากเซิร์ฟเวอร์กลับมา เพื่อไม่ให้หน้าจอโชว์ข้อมูลผี
  }

  /* ── คิวการเขียน: ส่งทีละคำขอ ห้ามซ้อนกัน ─────────────────
     การสั่งอาหาร 1 ครั้ง (orders.create) เขียนถึง 4 store พร้อมกัน
     คือ orders, orderNum, products (ตัดสต็อก), tables (เปิดโต๊ะ)
     ถ้ายิงพร้อมกัน 4 transaction จะแย่งล็อกแถวเดียวกันใน MySQL:
     tbl_sale มี FOREIGN KEY ไปหา tbl_table → saveOrders จับล็อกแถวโต๊ะ
     ขณะที่ saveTables กำลังแก้แถวเดียวกันนั้นพอดี
     ผลคือ "Lock wait timeout" ค้างยาว ๆ (เจอจริงตอนทดสอบ: ค้าง 13 นาที
     จน MySQL ตอบใครไม่ได้เลย) ส่งทีละอันจึงหมดปัญหานี้ทั้งหมด */
  const writeQ = [];
  let   sending = false;

  function apiPost(payload, sync) {
    pendingWrites++;
    lastWriteAt = Date.now();
    if (sync) { sendNow(payload, true); return; }   // reset ต้องรอผลจริง ไม่เข้าคิว
    writeQ.push(payload);
    pumpQueue();
  }

  function pumpQueue() {
    if (sending || !writeQ.length) return;
    sending = true;
    sendNow(writeQ.shift(), false, () => {
      sending = false;
      pumpQueue();
    });
  }

  function sendNow(payload, sync, next) {
    const done = () => {
      pendingWrites--;
      lastWriteAt = Date.now();
      if (next) next();
    };
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_URL, !sync);
      xhr.setRequestHeader('Content-Type', 'application/json');
      const check = () => {
        done();
        if (xhr.status >= 200 && xhr.status < 300) return;
        let msg = 'HTTP ' + xhr.status;
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
        reportSyncError(msg);
      };
      if (sync) { xhr.send(JSON.stringify(payload)); check(); return; }
      xhr.onload  = check;
      xhr.onerror = () => { done(); reportSyncError('ຕິດຕໍ່ເຊີບເວີບໍ່ໄດ້'); };
      xhr.send(JSON.stringify(payload));
    } catch (e) { done(); reportSyncError(String(e)); }
  }

  // ลายเซ็นของข้อมูลแต่ละ store ที่ได้จากเซิร์ฟเวอร์ครั้งล่าสุด
  // ใช้ตรวจว่า "อะไรเปลี่ยนบ้าง" เพื่อไม่ให้ poll ทุก 5 วิ สั่งวาดหน้าจอใหม่ทั้งหน้า
  // ทั้งที่ข้อมูลเหมือนเดิม (จะกวนผู้ใช้ที่กำลังกรอกฟอร์มอยู่)
  const sig = {};

  // เอาข้อมูลจากเซิร์ฟเวอร์ใส่ cache — คืนรายชื่อ key ที่เปลี่ยนจริง
  function applyServerData(api) {
    const changed = [];
    Object.keys(KEY).forEach(name => {
      if (!(name in api)) return;
      const s = JSON.stringify(api[name]);
      if (sig[name] === s) return;
      sig[name] = s;
      cache[KEY[name]] = api[name];
      changed.push(KEY[name]);
    });
    if (api && api.revs) revs = { ...revs, ...api.revs };
    if (changed.length) hydrateDates();
    return changed;
  }

  // แจ้งหน้าจอว่าข้อมูลเปลี่ยน — ไม่ยิงถ้าไม่มีอะไรเปลี่ยน
  function announce(changed) {
    if (!changed.length) return;
    window.dispatchEvent(new CustomEvent('posdb:resynced', { detail: changed }));
  }

  // ดึงข้อมูลล่าสุดจาก MySQL แบบ blocking — ใช้ตอน error เท่านั้น
  let resyncing = false;
  function resync() {
    if (!API_ON || resyncing) return;
    resyncing = true;
    try {
      const api = apiGetAllSync();
      if (api) announce(applyServerData(api));
    } finally { resyncing = false; }
  }

  // ── ซิงก์ข้ามเครื่อง/ข้ามแท็บ ─────────────────────────────
  // ของเดิมอาศัย event 'storage' ของ localStorage ซึ่งทำงานเฉพาะแท็บใน
  // เบราว์เซอร์เดียวกันเครื่องเดียวกัน → มือถือลูกค้ากับคอมแอดมินมองไม่เห็นกัน
  // และพอแอดมินบันทึกอะไร มันจะส่ง "อาเรย์เก่า" ทับ MySQL = ออเดอร์ลูกค้าหายจริง
  // เปลี่ยนมาถามเซิร์ฟเวอร์เป็นรอบแทน จึงเห็นตรงกันทุกเครื่อง
  // ── Realtime: เซิร์ฟเวอร์ push มาเอง (Server-Sent Events) ──
  // ของเดิมถาม MySQL ทุก 5 วินาที และ "หยุดถามเมื่อแท็บอยู่เบื้องหลัง"
  // → หน้าจออีกฝั่งไม่ขยับจนกว่าจะกด F5 เอง
  // ของใหม่ค้างสายไว้กับ api/events.php ข้อมูลเปลี่ยนปุ๊บมาถึงปั๊บ (~0.4 วินาที)
  // และทำงานต่อแม้แท็บจะอยู่เบื้องหลัง
  let sse = null, sseAlive = false, pollTimer = null;

  // ระหว่างที่เรากำลังเขียนอยู่ ข้อมูลที่ push มาจะเก่ากว่าในเครื่อง
  // → พักไว้ก่อน แล้วค่อยดึงของจริงมาทับหลังเขียนเสร็จ
  let deferred = false;
  function applyOrDefer(fn) {
    if (pendingWrites > 0 || Date.now() - lastWriteAt < 800) {
      if (deferred) return;
      deferred = true;
      setTimeout(() => { deferred = false; resyncAsync(); }, 900);
      return;
    }
    fn();
  }

  function resyncAsync() {
    apiGetAllAsync(api => { if (api) announce(applyServerData(api)); });
  }

  function startRealtime() {
    if (typeof EventSource === 'undefined') { startPolling(); return; }
    connectSSE();
    // ตาข่ายนิรภัย: ถ้า SSE เงียบไปนานผิดปกติ (เซิร์ฟเวอร์ restart, proxy ตัดสาย)
    // ให้ดึงข้อมูลเองสักรอบ จะได้ไม่ค้างอยู่กับข้อมูลเก่าแบบเงียบ ๆ
    setInterval(() => { if (!sseAlive) resyncAsync(); }, POLL_MS * 3);
  }

  function connectSSE() {
    try {
      const q = encodeURIComponent(JSON.stringify(revs || {}));
      sse = new EventSource(SSE_URL + '?revs=' + q);
    } catch (e) { startPolling(); return; }

    sse.addEventListener('open',  () => { sseAlive = true; });
    sse.addEventListener('ping',  () => { sseAlive = true; });

    sse.addEventListener('sync', e => {
      sseAlive = true;
      let msg = null;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (!msg || !msg.stores) return;
      applyOrDefer(() => {
        // ห่อให้เป็นรูปแบบเดียวกับที่ GET คืนมา จะได้ใช้ตัวเทียบชุดเดิม
        announce(applyServerData({ ...msg.stores, revs: msg.revs }));
      });
    });

    // เซิร์ฟเวอร์หมุนสายทุก ~50 วินาที (bye) หรือสายหลุดเอง
    // EventSource ต่อใหม่ให้เองอยู่แล้ว แต่ต้องสร้างสายใหม่เพื่อส่ง revs ล่าสุดไปด้วย
    const reconnect = () => {
      sseAlive = false;
      if (sse) { sse.close(); sse = null; }
      setTimeout(connectSSE, 400);
    };
    sse.addEventListener('bye', reconnect);
    sse.onerror = () => { sseAlive = false; if (sse && sse.readyState === 2) reconnect(); };
  }

  // ทางสำรองแบบเดิม — ใช้เมื่อเบราว์เซอร์ไม่รองรับ EventSource เท่านั้น
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (pendingWrites > 0) return;               // มีการเขียนค้าง — ผลที่ได้จะเก่ากว่า cache
      apiGetAllAsync(api => {
        if (!api) return;
        // ระหว่างรอผลลัพธ์ อาจมีการบันทึกแทรกเข้ามา → ทิ้งผลนี้ไป
        if (pendingWrites > 0 || Date.now() - lastWriteAt < 1500) return;
        announce(applyServerData(api));
      });
    }, POLL_MS);
  }

  // ── Storage Helpers (MySQL อย่างเดียว) ────────────────────
  function load(key) {
    return (key in cache) ? cache[key] : null;
  }

  function save(key, value) {
    cache[key] = value;
    const store = STORE_OF[key];
    if (store) apiPost({ key: store, value });     // เขียนกลับ MySQL (async)
  }

  // แปลง timestamp (ISO) → ข้อความอ่านง่ายสำหรับแสดงผล
  // รองรับข้อมูลเก่าที่เป็นข้อความอยู่แล้ว และค่าว่าง → '-'
  function fmtDateTime(v) {
    if (v === null || v === undefined || v === '' || v === '-') return '-';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString('lo-LA');
  }

  // เติม field วันที่ที่ MySQL ไม่ได้เก็บ (คำนวณจาก timestamp ISO)
  function hydrateDates() {
    const ords = cache[KEY.orders];
    if (Array.isArray(ords)) ords.forEach(o => {
      if (!o || !o.createdAt) return;
      const d = new Date(o.createdAt);
      o.dateKey = d.toLocaleDateString('en-CA');
      o.date    = d.toLocaleDateString('lo-LA');
      o.time    = d.toLocaleString('lo-LA');
    });
    const pur = cache[KEY.purchases];
    if (Array.isArray(pur)) pur.forEach(p => { if (p && p.pur_date) p.date = fmtDateTime(p.pur_date); });
    const imp = cache[KEY.imports];
    if (Array.isArray(imp)) imp.forEach(i => { if (i && i.imp_date) i.date = fmtDateTime(i.imp_date); });
  }

  // ── หน้าจอ error เมื่อต่อฐานข้อมูลไม่ได้ ───────────────────
  // ตั้งใจให้ "พังให้เห็น" แทนที่จะทำงานต่อด้วยข้อมูลในเบราว์เซอร์
  // เพราะโหมดปลอมแบบเดิมทำให้เข้าใจผิดว่าบันทึกลงฐานข้อมูลแล้ว
  function showFatal() {
    const wrap = document.createElement('div');
    wrap.setAttribute('style',
      'position:fixed;inset:0;z-index:99999;background:#1b1b1f;color:#fff;' +
      'display:flex;align-items:center;justify-content:center;padding:24px;' +
      'font-family:system-ui,sans-serif;line-height:1.7');
    wrap.innerHTML =
      '<div style="max-width:560px">' +
      '<div style="font-size:44px;margin-bottom:8px">🔌</div>' +
      '<h1 style="font-size:22px;margin:0 0 12px">ຕໍ່ຖານຂໍ້ມູນ MySQL ບໍ່ໄດ້</h1>' +
      '<p style="margin:0 0 16px;opacity:.85">ລະບົບນີ້ອ່ານ/ຂຽນຂໍ້ມູນຈາກ MySQL ເທົ່ານັ້ນ ' +
      'ຈຶ່ງບໍ່ສະແດງຂໍ້ມູນຫຍັງເລີຍເມື່ອຕໍ່ບໍ່ໄດ້</p>' +
      '<ol style="margin:0;padding-left:20px;opacity:.85">' +
      '<li>ເປີດ XAMPP Control Panel → Start ທັງ <b>Apache</b> ແລະ <b>MySQL</b></li>' +
      '<li>ຕ້ອງເປີດຜ່ານ <b>http://localhost/POS-SST-main/</b> ' +
      '(ເປີດໄຟລ໌ຊື່ ໆ ແບບ file:// ໃຊ້ບໍ່ໄດ້)</li>' +
      '<li>import <b>database.sql</b> ໃນ phpMyAdmin ໃຫ້ໄດ້ຖານ <b>pos_ground_camp</b></li>' +
      '<li>ກວດ port ໃນ <b>api/config.php</b> ໃຫ້ຕົງກັບ MySQL ຂອງ XAMPP</li>' +
      '</ol></div>';
    const put = () => document.body && document.body.appendChild(wrap);
    if (document.body) put();
    else document.addEventListener('DOMContentLoaded', put);
  }

  // Initialise — ต่อ MySQL ให้ได้ก่อน ไม่ได้ก็หยุดตรงนี้
  function bootstrap() {
    const api = apiGetAllSync();
    if (!api) { showFatal(); return; }
    API_ON = true;
    applyServerData(api);
    startRealtime();
  }

  // ── Products ──────────────────────────────────────────────
  const products = {
    getAll()   { return load(KEY.products) || []; },
    getActive(){ return this.getAll().filter(p => p.status === 'active'); },
    get(id)    { return this.getAll().find(p => p.id === id) || null; },
    save(arr)  { save(KEY.products, arr); },

    add(item) {
      const arr = this.getAll();
      item.id   = Date.now();
      arr.push(item);
      this.save(arr);
      return item;
    },

    update(id, patch) {
      const arr = this.getAll();
      const idx = arr.findIndex(p => p.id === id);
      if (idx < 0) return null;
      arr[idx] = { ...arr[idx], ...patch };
      this.save(arr);
      return arr[idx];
    },

    delete(id) {
      const arr = this.getAll().filter(p => p.id !== id);
      this.save(arr);
    },

    decreaseStock(id, qty = 1) {
      const p = this.get(id);
      if (!p) return;
      p.stock = Math.max(0, p.stock - qty);
      if (p.stock === 0) p.status = 'soldout';
      this.update(id, p);
    },
  };

  // ── Orders ────────────────────────────────────────────────
  const orders = {
    getAll()  { return load(KEY.orders) || []; },
    get(id)   { return this.getAll().find(o => o.id === id) || null; },
    save(arr) { save(KEY.orders, arr); },

    // Create a new order from cart items
    create({ tableCode, tableId, items, paymentMethod = 'cash' }) {
      const num      = load(KEY.orderNum) || 1001;
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const vatAmt   = Math.round(subtotal * ((load(KEY.settings)?.vatPct || 7) / 100));
      const total    = subtotal + vatAmt;
      const now      = new Date();

      const order = {
        id:            num,
        num:           String(num),
        tableCode,
        tableId,
        items,          // [{id, name, price, qty, emoji}]
        subtotal,
        vatAmt,
        total,
        paymentMethod,
        status:        'pending',
        createdAt:     now.toISOString(),
        dateKey:       now.toLocaleDateString('en-CA'),   // YYYY-MM-DD
        date:          now.toLocaleDateString('lo-LA'),
        time:          now.toLocaleString('lo-LA'),
        source:        'self-order',   // 'self-order' | 'pos'
      };

      const arr = this.getAll();
      arr.unshift(order);
      this.save(arr);
      save(KEY.orderNum, num + 1);

      // Decrease stock for each item
      items.forEach(i => products.decreaseStock(i.id, i.qty));

      // เปิดโตະ: ตั้งสถานะโต๊ะเป็น "ไม่ว่าง" (tbl_table.status)
      tables.setStatusByName(tableCode, 'busy');

      return order;
    },

    updateStatus(id, status) {
      const arr = this.getAll();
      const idx = arr.findIndex(o => o.id === id);
      if (idx < 0) return;
      arr[idx].status = status;
      arr[idx].updatedAt = new Date().toISOString();
      this.save(arr);
      // ปิดโต๊ะเมื่อออเดอร์จบ และไม่มีออเดอร์ค้างที่โต๊ะเดิม
      if (status === 'done' || status === 'cancel') {
        const code = arr[idx].tableCode;
        const stillActive = arr.some(o =>
          o.tableCode === code && (o.status === 'pending' || o.status === 'cooking'));
        if (!stillActive) tables.setStatusByName(code, 'free');
      }
      return arr[idx];
    },

    getPending() { return this.getAll().filter(o => o.status === 'pending'); },
    getDone()    { return this.getAll().filter(o => o.status === 'done');    },
  };

  // ── Stock Log ─────────────────────────────────────────────
  const stockLog = {
    getAll()  { return load(KEY.stockLog) || []; },
    save(arr) { save(KEY.stockLog, arr); },

    // kind: 'product' (tbl_product) | 'material' (tbl_material)
    // ต้องระบุให้ถูก เพราะฐานข้อมูลผูก FOREIGN KEY แยกกันคนละตาราง
    add({ productId, productName, type, qty, note, kind = 'product' }) {
      const arr = this.getAll();
      arr.unshift({
        id:          Date.now(),
        kind, productId, productName, type, qty,
        note:        note || '',
        date:        new Date().toISOString(),   // ISO — เก็บลง DATETIME ได้ / เรียงลำดับได้
      });
      this.save(arr);
    },
  };

  // ── Users ─────────────────────────────────────────────────
  const users = {
    getAll()            { return load(KEY.users) || []; },
    get(id)             { return this.getAll().find(u => u.id === id) || null; },
    save(arr)           { save(KEY.users, arr); },
    authenticate(u, p) {
      return this.getAll().find(x =>
        x.username === u && x.status === 'active' && verifyPassword(p, x.password)) || null;
    },

    add(user) {
      const arr  = this.getAll();
      user.id    = Date.now();
      user.lastLogin = '-';
      if (user.password) user.password = hashPassword(user.password);
      arr.push(user);
      this.save(arr);
      return user;
    },

    update(id, patch) {
      const arr = this.getAll();
      const idx = arr.findIndex(u => u.id === id);
      if (idx < 0) return null;
      if (patch.password) patch = { ...patch, password: hashPassword(patch.password) };
      arr[idx] = { ...arr[idx], ...patch };
      this.save(arr);
      return arr[idx];
    },

    delete(id) {
      this.save(this.getAll().filter(u => u.id !== id));
    },

    touchLogin(id) {
      this.update(id, { lastLogin: new Date().toISOString() });
    },
  };

  // ── Categories (tbl_category / D2, D3) ────────────────────
  const categories = {
    getAll()  { return load(KEY.categories) || []; },
    get(id)   { return this.getAll().find(c => c.id === id) || null; },
    save(arr) { save(KEY.categories, arr); },
    // cat  = cat_key ในฐานข้อมูล (NOT NULL + UNIQUE) — หน้าจอ admin ไม่ได้กรอกค่านี้
    // จึงต้องสร้างให้เอง ไม่งั้น INSERT จะพังทุกครั้งที่เพิ่มประเภทใหม่
    add(c)    { const arr = this.getAll(); c.id = Date.now(); if (!c.cat) c.cat = 'cat' + c.id; arr.push(c); this.save(arr); return c; },
    update(id, patch) {
      const arr = this.getAll();
      const idx = arr.findIndex(c => c.id === id);
      if (idx < 0) return null;
      arr[idx] = { ...arr[idx], ...patch };
      this.save(arr);
      return arr[idx];
    },
    delete(id) { this.save(this.getAll().filter(c => c.id !== id)); },
  };

  // ── Materials (วัตถุดิบ / D13) ────────────────────────────
  const materials = {
    getAll()  { return load(KEY.materials) || []; },
    get(id)   { return this.getAll().find(m => m.id === id) || null; },
    save(arr) { save(KEY.materials, arr); },
    add(m)    { const arr = this.getAll(); m.id = Date.now(); arr.push(m); this.save(arr); return m; },
    update(id, patch) {
      const arr = this.getAll();
      const idx = arr.findIndex(m => m.id === id);
      if (idx < 0) return null;
      arr[idx] = { ...arr[idx], ...patch };
      this.save(arr);
      return arr[idx];
    },
    delete(id) { this.save(this.getAll().filter(m => m.id !== id)); },
    increaseStock(id, qty) {
      const m = this.get(id);
      if (m) this.update(id, { stock: (m.stock || 0) + qty });
    },
  };

  // ── Purchases (tbl_purchase + tbl_purchase_detail / D6, D7) ──
  const purchases = {
    getAll()  { return load(KEY.purchases) || []; },
    get(id)   { return this.getAll().find(p => p.id === id) || null; },
    save(arr) { save(KEY.purchases, arr); },
    getPending() { return this.getAll().filter(p => p.status === 'pending'); },

    // items: [{ kind:'drink'|'material', refId, name, qty, price }]
    create({ items, userId, userName }) {
      const now = new Date();
      const po = {
        id:        Date.now(),
        pur_date:  now.toISOString(),
        date:      now.toLocaleString('lo-LA'),
        items,
        total:     items.reduce((s, i) => s + i.qty * i.price, 0),
        userId, userName,
        status:    'pending',   // pending → imported
      };
      const arr = this.getAll();
      arr.unshift(po);
      this.save(arr);
      return po;
    },

    updateStatus(id, status) {
      const arr = this.getAll();
      const idx = arr.findIndex(p => p.id === id);
      if (idx < 0) return;
      arr[idx].status = status;
      this.save(arr);
      return arr[idx];
    },
  };

  // ── Imports (tbl_import / D8, D9) ─────────────────────────
  const imports = {
    getAll()  { return load(KEY.imports) || []; },
    save(arr) { save(KEY.imports, arr); },

    // นำเข้าตามใบสั่งซื้อ: บวกสต็อกสินค้า/วัตถุดิบ แล้วปิดใบสั่งซื้อ
    createFromPurchase(purId, { userId, userName }) {
      const po = purchases.get(purId);
      if (!po || po.status !== 'pending') return null;
      const now = new Date();
      const imp = {
        id:       Date.now(),
        imp_date: now.toISOString(),
        date:     now.toLocaleString('lo-LA'),
        purId:    po.id,
        items:    po.items,
        total:    po.total,
        userId, userName,
      };
      // บวกสต็อก
      po.items.forEach(i => {
        if (i.kind === 'material') {
          materials.increaseStock(i.refId, i.qty);
        } else {
          const p = products.get(i.refId);
          if (p) products.update(i.refId, {
            stock:  (p.stock || 0) + i.qty,
            status: p.status === 'soldout' ? 'active' : p.status,
          });
        }
        stockLog.add({ kind: i.kind === 'material' ? 'material' : 'product',
                       productId: i.refId, productName: i.name, type: 'in', qty: i.qty,
                       note: 'ນຳເຂົ້າຕາມໃບສັ່ງຊື້ #' + po.id });
      });
      const arr = this.getAll();
      arr.unshift(imp);
      this.save(arr);
      purchases.updateStatus(purId, 'imported');
      return imp;
    },
  };

  // ── Tables (tbl_table / D10) ──────────────────────────────
  const tables = {
    getAll()  { return load(KEY.tables) || []; },
    get(id)   { return this.getAll().find(t => t.id === id) || null; },
    save(arr) { save(KEY.tables, arr); },
    add(t)    { const arr = this.getAll(); t.id = Date.now(); t.status = t.status || 'free'; arr.push(t); this.save(arr); return t; },
    update(id, patch) {
      const arr = this.getAll();
      const idx = arr.findIndex(t => t.id === id);
      if (idx < 0) return null;
      arr[idx] = { ...arr[idx], ...patch };
      this.save(arr);
      return arr[idx];
    },
    delete(id) { this.save(this.getAll().filter(t => t.id !== id)); },
    setStatus(id, status)  { this.update(id, { status }); },
    setStatusByName(name, status) {
      const t = this.getAll().find(x => x.name === name);
      if (t) this.update(t.id, { status });
    },
  };

  // ── Settings ──────────────────────────────────────────────
  // ค่าจริงมาจาก tbl_setting — ที่เหลือเป็นแค่กันหน้าจอพังตอน DB ยังว่าง
  const SETTINGS_MIN = { vatPct: 7, currency: 'LAK' };
  const settings = {
    get()         { return load(KEY.settings) || SETTINGS_MIN; },
    set(patch)    { save(KEY.settings, { ...this.get(), ...patch }); },
    getVat()      { return this.get().vatPct || 7; },
    getStoreName(){ return this.get().storeName || 'POS-SST'; },
  };

  // ── ฟังการเปลี่ยนแปลงจากเครื่อง/แท็บอื่น ──────────────────
  // ตัวข้อมูลมาจาก polling ฝั่งเซิร์ฟเวอร์ (ดู startPolling) จึงเห็นตรงกัน
  // ทุกเครื่อง ไม่ใช่แค่แท็บในเบราว์เซอร์เดียวกันเหมือน event 'storage' เดิม
  function onExternalChange(callback) {
    window.addEventListener('posdb:resynced', e => {
      (e.detail || []).forEach(k => callback(k, cache[k] ?? null));
    });
  }

  // ── Reset ─────────────────────────────────────────────────
  // ล้างเฉพาะ "ข้อมูลธุรกรรม" (บิลขาย, สั่งซื้อ, นำเข้า, log สต็อก)
  // ข้อมูลหลัก (เมนู, ผู้ใช้, โต๊ะ, ประเภท, วัตถุดิบ, ตั้งค่าร้าน) ยังอยู่ครบ
  // — ถ้าอยากล้างทั้งหมดจริง ๆ ให้ import database.sql ซ้ำใน phpMyAdmin
  function reset() {
    if (!API_ON) return;
    apiPost({ action: 'reset' }, true);
    resync();
  }

  // ── Init ──────────────────────────────────────────────────
  bootstrap();

  // Public API
  return { products, categories, materials, purchases, imports, tables, orders, stockLog, users, settings,
           hashPassword, verifyPassword, onExternalChange, fmtDateTime, resync, reset, KEY,
           isMySQL: () => API_ON };

})();

// Make globally available
window.POS_DB = POS_DB;