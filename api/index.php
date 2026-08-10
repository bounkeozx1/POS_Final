<?php
/* ============================================================
   api/index.php — POS Data API (PHP + MySQL)
   ------------------------------------------------------------
   GET  api/            → ດຶງຂໍ້ມູນທັງໝົດ (ຮູບແບບດຽວກັບ POS_DB)
   POST api/  body {key, value}        → ບັນທຶກ store ນັ້ນລົງ MySQL ຈິງ
   POST api/  body {action:'reset'}    → ລ້າງສະເພາະຂໍ້ມູນທຸລະກຳ (ບິນ/ສັ່ງຊື້/ນຳເຂົ້າ/log)
                                         ຂໍ້ມູນຫຼັກ (ເມນູ, ຜູ້ໃຊ້, ໂຕະ...) ຍັງຢູ່ຄົບ

   ຂໍ້ມູນຕັ້ງຕົ້ນທັງໝົດມາຈາກ database.sql — ບໍ່ມີການ seed ຈາກຝັ່ງ JavaScript ອີກແລ້ວ
   ============================================================ */

require __DIR__ . '/config.php';
require __DIR__ . '/store.php';   // ຊັ້ນອ່ານຂໍ້ມູນ + ຕົວນັບ revision (ໃຊ້ຮ່ວມກັບ events.php)

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail($msg, $code = 500) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

/* ---- helpers ---------------------------------------------- */

/* ---- write helpers ----------------------------------------
   ບໍ່ໃຊ້ "DELETE ໝົດຕາຕະລາງ ແລ້ວ INSERT ໃໝ່" ອີກຕໍ່ໄປ ເພາະ
   (1) ມັນທຳລາຍຄວາມສຳພັນ FOREIGN KEY ຂອງແຖວທີ່ຍັງຖືກອ້າງອີງຢູ່
   (2) ເລກ AUTO_INCREMENT ແລະ ປະຫວັດຈະຖືກຂຽນທັບທຸກຄັ້ງ
   ແທນທີ່ດ້ວຍ UPSERT (INSERT ... ON DUPLICATE KEY UPDATE) + prune. */
// ລຶບແຖວທີ່ບໍ່ມີໃນຂໍ້ມູນທີ່ສົ່ງມາ — ຕ້ອງເອີ້ນ "ກ່ອນ" UPSERT ເພື່ອວ່າແຖວເກົ່າ
// ທີ່ກຳລັງຈະຖືກລຶບຢູ່ແລ້ວ ຈະບໍ່ໄປຕີກັບຄ່າ UNIQUE ຂອງແຖວໃໝ່
/* ── "ຕາຕະລາງທຸລະກຳບໍ່ prune" ────────────────────────────────
   ທຸກຄັ້ງທີ່ບັນທຶກ ຝັ່ງແອັບຈະສົ່ງ "ອາເລທັງກ້ອນ" ຂຶ້ນມາ ແລ້ວ prune ຈະລຶບ
   ແຖວທີ່ບໍ່ຢູ່ໃນອາເລນັ້ນ. ກັບຂໍ້ມູນຫຼັກ (ເມນູ/ໝວດ/ໂຕະ/ຜູ້ໃຊ້) ຖືກຕ້ອງ
   ເພາະໜ້າ admin ມີປຸ່ມລຶບຈິງ.

   ແຕ່ກັບ ບິນຂາຍ / ສັ່ງຊື້ / ນຳເຂົ້າ / log ສະຕັອກ ມັນເປັນອັນຕະລາຍ:
   ບໍ່ມີບ່ອນໃດໃນແອັບລຶບແຖວເຫຼົ່ານີ້ເລີຍ (ຍົກເລີກ = ປ່ຽນ status ເປັນ cancel)
   ແລະ ແຕ່ລະເຄື່ອງ sync ກັນທຸກ 5 ວິນາທີ → ຖ້າແອດມິນກົດປ່ຽນສະຖານະ
   ພາຍໃນຊ່ວງ 5 ວິນາທີນັ້ນ ອາເລຂອງແອດມິນຍັງບໍ່ທັນມີບິນໃໝ່ຂອງລູກຄ້າ
   ບິນນັ້ນຈະຖືກລຶບຖິ້ມທັນທີ. ຈຶ່ງໃຫ້ຕາຕະລາງທຸລະກຳ "ເພີ່ມ/ອັບເດດ" ຢ່າງດຽວ
   — ຢາກລ້າງແທ້ ໃຫ້ໃຊ້ POST {action:'reset'} ເຊິ່ງລຶບຢ່າງຈົງໃຈ. */
function prune($pdo, $table, $pkCol, $ids) {
  if (!$ids) { $pdo->exec("DELETE FROM $table"); return; }
  $ph = implode(',', array_fill(0, count($ids), '?'));
  $pdo->prepare("DELETE FROM $table WHERE $pkCol NOT IN ($ph)")->execute($ids);
}
// ສ້າງທ່ອນ "col=VALUES(col)" ສຳລັບ ON DUPLICATE KEY UPDATE
function onDup(array $cols) {
  return implode(', ', array_map(fn($c) => "$c=VALUES($c)", $cols));
}
/* ກວດຄ່າຄໍລຳ UNIQUE ກ່ອນຂຽນ.
   ສຳຄັນ: ON DUPLICATE KEY UPDATE ຈະເຮັດວຽກກັບ UNIQUE ທຸກຕົວ ບໍ່ແມ່ນແຕ່ PRIMARY KEY
   → ຖ້າສົ່ງ username ຊ້ຳມາ ມັນຈະ "ທັບ" ບັນຊີເກົ່າແບບງຽບໆ ແທນທີ່ຈະແຈ້ງຜິດພາດ.
   ຈຶ່ງຕ້ອງກວດເອງ ແລ້ວໂຍນ error ອອກໄປໃຫ້ໜ້າຈໍເຫັນ. */
function assertUnique(array $pairs, $label) {
  $seen = [];
  foreach ($pairs as [$id, $val]) {
    if ($val === null || $val === '') continue;
    $k = mb_strtolower((string)$val);
    if (isset($seen[$k]) && $seen[$k] != $id) throw new Exception("$label \"$val\" ຊ້ຳກັນ");
    $seen[$k] = $id;
  }
}

/* ---- ຄ່າຕົວເລກທີ່ປອດໄພສຳລັບຄໍລຳ BIGINT --------------------
   ຝັ່ງໜ້າຈໍອາດສົ່ງ "ຂໍ້ຄວາມ" ມາໃສ່ຄໍລຳຕົວເລກ (ຕົວຢ່າງຈິງ: tableId ເປັນ
   'table_default' ເມື່ອເປີດ index.html ໂດຍບໍ່ມີ ?tableId= ໃນ URL).
   ດ້ວຍ STRICT_TRANS_TABLES ຄ່າແບບນັ້ນຈະໂຍນ error ແລ້ວ rollback ທັງ
   transaction → ບິນທັງໃບບໍ່ຖືກບັນທຶກ ແລະ ໜ້າ admin ບໍ່ເຫັນອໍເດີເລີຍ. */
function intOrNull($v) {
  if ($v === null || $v === '' || is_bool($v) || is_array($v)) return null;
  if (is_int($v))   return $v;
  if (is_float($v)) return (int)$v;
  $s = trim((string)$v);
  return preg_match('/^-?\d+$/', $s) ? (int)$s : null;
}

/* ---- ຄີນອກທີ່ຊີ້ໄປຫາແຖວທີ່ບໍ່ມີຢູ່ແລ້ວ ----------------------
   ເຊັ່ນ ບິນເກົ່າອ້າງເມນູທີ່ຖືກລຶບໄປແລ້ວ — INSERT ຈະຕິດ FOREIGN KEY
   ແລ້ວລົ້ມທັງ transaction. ຕາຕະລາງທຸລະກຳເກັບ snapshot ຊື່ໄວ້ແລ້ວ
   ຈຶ່ງໃສ່ NULL ແທນໄດ້ໂດຍບໍ່ເສຍຂໍ້ມູນທີ່ຜູ້ໃຊ້ເຫັນ. */
function fkOrNull($pdo, $table, $col, $v) {
  static $sets = [];
  if (!isset($sets[$table])) {
    $sets[$table] = [];
    foreach ($pdo->query("SELECT $col FROM $table") as $r) $sets[$table][(int)$r[$col]] = true;
  }
  $n = intOrNull($v);
  return ($n !== null && isset($sets[$table][$n])) ? $n : null;
}

/* ---- ຫາລະຫັດໂຕະ: ເອົາ id ກ່ອນ ບໍ່ໄດ້ຈຶ່ງຫາຈາກຊື່ໂຕະ (T01...) --- */
function resolveTableId($pdo, $rawId, $code) {
  static $byName = null;
  if ($byName === null) {
    $byName = [];
    foreach ($pdo->query("SELECT table_id, table_name FROM tbl_table") as $t)
      $byName[mb_strtolower($t['table_name'])] = (int)$t['table_id'];
  }
  $n = fkOrNull($pdo, 'tbl_table', 'table_id', $rawId);
  if ($n !== null) return $n;
  $k = mb_strtolower((string)$code);
  return isset($byName[$k]) ? $byName[$k] : null;
}

try {
  $pdo    = db();
  $method = $_SERVER['REQUEST_METHOD'];

  /* ======================= READ ============================ */
  if ($method === 'GET') {
    echo json_encode(readAll($pdo), JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ======================= WRITE =========================== */
  if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) fail('invalid JSON body', 400);

    $action = nmeach($body, 'action');

    if ($action === 'reset') {
      resetTransactions($pdo);
      echo json_encode(['ok' => true]); exit;
    }

    $key = nmeach($body, 'key');
    if ($key === null || !array_key_exists('value', $body)) fail('missing key/value', 400);

    saveStore($pdo, $key, $body['value']);
    echo json_encode(['ok' => true]); exit;
  }

  fail('method not allowed', 405);

} catch (Throwable $e) {
  fail(friendlyError($e));
}

/* แปลงข้อความ error ของ MySQL เป็นภาษาที่ผู้ใช้หน้าร้านอ่านรู้เรื่อง
   (ของดิบเป็นแบบ "SQLSTATE[22001]: ... Data too long for column 'desc_lo'") */
function friendlyError(Throwable $e) {
  $m = $e->getMessage();
  // ชื่อช่องในฐานข้อมูล → ชื่อที่ผู้ใช้เข้าใจ
  $label = function ($col) {
    $map = ['desc' => 'ຄຳອະທິບາຍ', 'name' => 'ຊື່', 'note' => 'ໝາຍເຫດ', 'img' => 'ຮູບພາບ',
            'address' => 'ທີ່ຢູ່', 'receipt' => 'ຂໍ້ຄວາມໃບບິນ', 'item_name' => 'ຊື່ລາຍການ',
            'product_name' => 'ຊື່ສິນຄ້າ', 'store_name' => 'ຊື່ຮ້ານ', 'username' => 'ຊື່ຜູ້ໃຊ້'];
    foreach ($map as $k => $v) if (strpos($col, $k) === 0) return $v;
    return $col;
  };
  if (strpos($m, '1406') !== false || stripos($m, 'Data too long') !== false) {
    $col = preg_match("/column '([^']+)'/", $m, $mm) ? $label($mm[1]) : 'ບາງຊ່ອງ';
    return "ຂໍ້ຄວາມໃນຊ່ອງ \"$col\" ຍາວເກີນທີ່ຮັບໄດ້ — ກະລຸນາພິມສັ້ນລົງ";
  }
  if (stripos($m, 'foreign key') !== false) {
    return 'ຂໍ້ມູນອ້າງອີງບໍ່ຖືກຕ້ອງ (ເຊັ່ນ ໝວດ/ໂຕະ/ຜູ້ໃຊ້ ທີ່ເລືອກຖືກລຶບໄປແລ້ວ)';
  }
  if (stripos($m, 'Duplicate entry') !== false) {
    return 'ຂໍ້ມູນຊ້ຳກັບທີ່ມີຢູ່ແລ້ວ';
  }
  if (stripos($m, 'Lock wait timeout') !== false || strpos($m, '1205') !== false) {
    return 'ຖານຂໍ້ມູນກຳລັງຖືກໃຊ້ຢູ່ ບັນທຶກບໍ່ທັນ — ກະລຸນາລອງໃໝ່ອີກຄັ້ງ';
  }
  if (stripos($m, 'Deadlock') !== false) {
    return 'ມີການບັນທຶກພ້ອມກັນຫຼາຍລາຍການ — ກະລຸນາລອງໃໝ່ອີກຄັ້ງ';
  }
  return $m;
}

/* ============================================================
   WRITE — replace a whole store (transactional)
   ============================================================ */
function saveStore($pdo, $key, $value) {
  // ຕ້ອງເຮັດ "ກ່ອນ" ເປີດ transaction — ALTER TABLE ເຮັດໃຫ້ MySQL commit ໂດຍອັດຕະໂນມັດ
  if ($key === 'products') {
    foreach ((array)$value as $p) {
      if (strlen((string)nmeach($p,'img')) > 255) { ensureImgColumnWide($pdo); break; }
    }
  }
  ensureRevisionTable($pdo);   // CREATE TABLE ກໍ່ commit ອັດຕະໂນມັດ — ຕ້ອງຢູ່ນອກ transaction
  $pdo->beginTransaction();
  try {
    switch ($key) {
      case 'users':      saveUsers($pdo, $value); break;
      case 'categories': saveCategories($pdo, $value); break;
      case 'products':   saveProducts($pdo, $value); break;
      case 'materials':  saveMaterials($pdo, $value); break;
      case 'tables':     saveTables($pdo, $value); break;
      case 'orders':     saveOrders($pdo, $value); break;
      case 'purchases':  savePurchases($pdo, $value); break;
      case 'imports':    saveImports($pdo, $value); break;
      case 'stockLog':   saveStockLog($pdo, $value); break;
      case 'settings':   saveSettings($pdo, $value); break;
      case 'orderNum':   saveOrderNum($pdo, $value); break;
      default: throw new Exception("unknown store: $key");
    }
    // +1 ຢູ່ໃນ transaction ດຽວກັນ: ຖ້າບັນທຶກລົ້ມ ຕົວນັບກໍ່ບໍ່ຂຶ້ນ
    // → ໜ້າຈໍອື່ນຈະບໍ່ຖືກປຸກໃຫ້ດຶງຂໍ້ມູນທີ່ບໍ່ໄດ້ປ່ຽນ
    bumpRev($pdo, $key);
    // saveCategories ຜູກ tbl_product.cate_id ຄືນ (relinkProducts) → ເມນູກໍ່ປ່ຽນນຳ
    if ($key === 'categories') bumpRev($pdo, 'products');
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
}

function saveUsers($pdo, $rows) {
  $rows = (array)$rows;
  assertUnique(array_map(fn($u) => [$u['id'], nmeach($u,'username')], $rows), 'ຊື່ຜູ້ໃຊ້');
  prune($pdo, 'tbl_user', 'user_id', array_column($rows, 'id'));
  $cols = ['username','password','full_name','role','status','last_login'];
  $s = $pdo->prepare("INSERT INTO tbl_user (user_id, " . implode(',', $cols) . ")
                      VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  foreach ($rows as $u) {
    $s->execute([
      $u['id'], nmeach($u,'username'), nmeach($u,'password'), nmeach($u,'name'),
      nmeach($u,'role') ?: 'cashier', nmeach($u,'status') ?: 'active',
      toDbDate(nmeach($u,'lastLogin')),
    ]);
  }
}

function saveCategories($pdo, $rows) {
  $rows = (array)$rows;
  // cat_key ເປັນ NOT NULL — ຖ້າຝັ່ງແອັບບໍ່ສົ່ງມາ ໃຫ້ສ້າງຈາກ id ໃຫ້ເອງ
  $keyOf = fn($c) => (nmeach($c,'cat') === null || nmeach($c,'cat') === '') ? 'cat' . $c['id'] : $c['cat'];
  assertUnique(array_map(fn($c) => [$c['id'], $keyOf($c)], $rows), 'ລະຫັດໝວດ');
  prune($pdo, 'tbl_category', 'cate_id', array_column($rows, 'id'));
  $cols = ['cate_name','type','cat_key','name_lo','name_th','name_en','name_zh'];
  $s = $pdo->prepare("INSERT INTO tbl_category (cate_id, " . implode(',', $cols) . ")
                      VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  foreach ($rows as $c) {
    $n = nmeach($c,'name');
    $s->execute([
      $c['id'], nmeach($c,'cate_name'), nmeach($c,'type') ?: 'food', $keyOf($c),
      L($n,'lo'), L($n,'th'), L($n,'en'), L($n,'zh'),
    ]);
  }
  relinkProducts($pdo);   // ປະເພດປ່ຽນ → ຜູກ tbl_product.cate_id ຄືນ
}

// ຜູກຄີນອກ tbl_product.cate_id ຈາກ cat_key — ເອີ້ນຫຼັງບັນທຶກ product ຫຼື category
// ເພື່ອບໍ່ໃຫ້ຂຶ້ນກັບລຳດັບການ seed (ບັນຫາເກົ່າ: seed product ກ່ອນ category → cate_id ເປັນ NULL ໝົດ)
function relinkProducts($pdo) {
  $pdo->exec("UPDATE tbl_product p
              LEFT JOIN tbl_category c ON c.cat_key = p.cat_key
              SET p.cate_id = c.cate_id");
}

/* ຖານຂໍ້ມູນທີ່ import ຈາກ database.sql ລຸ້ນເກົ່າ ມີ img ເປັນ VARCHAR(255)
   ເຊິ່ງສັ້ນເກີນສຳລັບຮູບ data URL (base64) — ຂຽນລົງບໍ່ໄດ້ ແລ້ວທັງ
   transaction ຖືກ rollback → ເມນູໃໝ່ບໍ່ຖືກບັນທຶກເລີຍ.
   ຂະຫຍາຍໃຫ້ອັດຕະໂນມັດ ສະເພາະຕອນທີ່ຮູບຍາວກວ່າ 255 ຕົວຈິງ ໆ. */
function ensureImgColumnWide($pdo) {
  $c = $pdo->query("SHOW COLUMNS FROM tbl_product LIKE 'img'")->fetch();
  if ($c && stripos($c['Type'], 'text') === false) {
    $pdo->exec("ALTER TABLE tbl_product MODIFY img MEDIUMTEXT NULL");
  }
}

function saveProducts($pdo, $rows) {
  $rows = (array)$rows;
  prune($pdo, 'tbl_product', 'prod_id', array_column($rows, 'id'));
  $cols = ['name_lo','name_th','name_en','name_zh','desc_lo','desc_th','desc_en','desc_zh',
           'cat_key','price','qty_stock','emoji','img','status'];
  $s = $pdo->prepare("INSERT INTO tbl_product (prod_id, " . implode(',', $cols) . ")
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  foreach ($rows as $p) {
    $n = nmeach($p,'name'); $d = nmeach($p,'desc');
    $s->execute([
      $p['id'], L($n,'lo'), L($n,'th'), L($n,'en'), L($n,'zh'),
      L($d,'lo'), L($d,'th'), L($d,'en'), L($d,'zh'),
      nmeach($p,'cat'),
      nmeach($p,'price') ?: 0, nmeach($p,'stock') ?: 0,
      nmeach($p,'emoji'), nmeach($p,'img'), nmeach($p,'status') ?: 'active',
    ]);
  }
  relinkProducts($pdo);
}

function saveMaterials($pdo, $rows) {
  $rows = (array)$rows;
  prune($pdo, 'tbl_material', 'mat_id', array_column($rows, 'id'));
  $cols = ['name_lo','name_th','name_en','name_zh','unit','qty_stock','min_stock'];
  $s = $pdo->prepare("INSERT INTO tbl_material (mat_id, " . implode(',', $cols) . ")
                      VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  foreach ($rows as $m) {
    $n = nmeach($m,'name');
    $s->execute([
      $m['id'], L($n,'lo'), L($n,'th'), L($n,'en'), L($n,'zh'),
      nmeach($m,'unit'), nmeach($m,'stock') ?: 0, nmeach($m,'min') ?: 0,
    ]);
  }
}

function saveTables($pdo, $rows) {
  $rows = (array)$rows;
  prune($pdo, 'tbl_table', 'table_id', array_column($rows, 'id'));
  $cols = ['table_name','status'];
  $s = $pdo->prepare("INSERT INTO tbl_table (table_id, " . implode(',', $cols) . ")
                      VALUES (?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  foreach ($rows as $t) {
    $s->execute([$t['id'], nmeach($t,'name'), nmeach($t,'status') ?: 'free']);
  }
}

function saveOrders($pdo, $rows) {
  $rows = (array)$rows;
  // ບໍ່ prune ບິນຂາຍ (ເບິ່ງ "ຕາຕະລາງທຸລະກຳບໍ່ prune" ຢູ່ຂ້າງເທິງ)

  $cols = ['order_num','table_id','table_code','subtotal','vat_amt','total_amount',
           'payment_method','status','source','user_id','created_at','updated_at'];
  $h = $pdo->prepare("INSERT INTO tbl_sale (sale_id, " . implode(',', $cols) . ")
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  // ລາຍລະອຽດບໍ່ມີ id ຖາວອນຈາກຝັ່ງແອັບ → ຂຽນທັບສະເພາະບິນນັ້ນ (ບໍ່ແມ່ນທັງຕາຕະລາງ)
  $wipe = $pdo->prepare("DELETE FROM tbl_sale_detail WHERE sale_id = ?");
  $d = $pdo->prepare("INSERT INTO tbl_sale_detail (sale_id, prod_id, name_json, emoji, qty, price)
                      VALUES (?,?,?,?,?,?)");
  foreach ($rows as $o) {
    $h->execute([
      $o['id'], nmeach($o,'num'),
      resolveTableId($pdo, nmeach($o,'tableId'), nmeach($o,'tableCode')),
      nmeach($o,'tableCode'),
      nmeach($o,'subtotal') ?: 0, nmeach($o,'vatAmt') ?: 0, nmeach($o,'total') ?: 0,
      nmeach($o,'paymentMethod'), nmeach($o,'status') ?: 'pending', nmeach($o,'source'),
      fkOrNull($pdo, 'tbl_user', 'user_id', nmeach($o,'userId')),
      toDbDate(nmeach($o,'createdAt')), toDbDate(nmeach($o,'updatedAt')),
    ]);
    $wipe->execute([$o['id']]);
    foreach ((array)nmeach($o,'items') as $it) {
      $nm = nmeach($it,'name');
      $d->execute([
        $o['id'], fkOrNull($pdo, 'tbl_product', 'prod_id', nmeach($it,'id')),
        $nm === null ? null : json_encode($nm, JSON_UNESCAPED_UNICODE),
        nmeach($it,'emoji'), nmeach($it,'qty') ?: 0, nmeach($it,'price') ?: 0,
      ]);
    }
  }
}

function savePurchases($pdo, $rows) {
  $rows = (array)$rows;
  // ບໍ່ prune (ເບິ່ງ "ຕາຕະລາງທຸລະກຳບໍ່ prune" ຢູ່ຂ້າງເທິງ)
  $cols = ['pur_date','total_bill','user_id','user_name','status'];
  $h = $pdo->prepare("INSERT INTO tbl_purchase (pur_id, " . implode(',', $cols) . ")
                      VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  $wipe = $pdo->prepare("DELETE FROM tbl_purchase_detail WHERE pur_id = ?");
  $d = $pdo->prepare("INSERT INTO tbl_purchase_detail (pur_id, kind, ref_id, item_name, qty, price)
                      VALUES (?,?,?,?,?,?)");
  foreach ($rows as $p) {
    $h->execute([
      $p['id'], toDbDate(nmeach($p,'pur_date')), nmeach($p,'total') ?: 0,
      fkOrNull($pdo, 'tbl_user', 'user_id', nmeach($p,'userId')),
      nmeach($p,'userName'), nmeach($p,'status') ?: 'pending',
    ]);
    $wipe->execute([$p['id']]);
    foreach ((array)nmeach($p,'items') as $it) {
      $d->execute([$p['id'], nmeach($it,'kind'), nmeach($it,'refId'), nmeach($it,'name'),
                   nmeach($it,'qty') ?: 0, nmeach($it,'price') ?: 0]);
    }
  }
}

function saveImports($pdo, $rows) {
  $rows = (array)$rows;
  // ບໍ່ prune (ເບິ່ງ "ຕາຕະລາງທຸລະກຳບໍ່ prune" ຢູ່ຂ້າງເທິງ)
  $cols = ['imp_date','pur_id','total','user_id','user_name'];
  $h = $pdo->prepare("INSERT INTO tbl_import (imp_id, " . implode(',', $cols) . ")
                      VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  $wipe = $pdo->prepare("DELETE FROM tbl_import_detail WHERE imp_id = ?");
  $d = $pdo->prepare("INSERT INTO tbl_import_detail (imp_id, kind, ref_id, item_name, qty, price)
                      VALUES (?,?,?,?,?,?)");
  foreach ($rows as $im) {
    $h->execute([
      $im['id'], toDbDate(nmeach($im,'imp_date')),
      fkOrNull($pdo, 'tbl_purchase', 'pur_id', nmeach($im,'purId')),
      nmeach($im,'total') ?: 0,
      fkOrNull($pdo, 'tbl_user', 'user_id', nmeach($im,'userId')), nmeach($im,'userName'),
    ]);
    $wipe->execute([$im['id']]);
    foreach ((array)nmeach($im,'items') as $it) {
      $d->execute([$im['id'], nmeach($it,'kind'), nmeach($it,'refId'), nmeach($it,'name'),
                   nmeach($it,'qty') ?: 0, nmeach($it,'price') ?: 0]);
    }
  }
}

function saveStockLog($pdo, $rows) {
  $rows = (array)$rows;
  // ບໍ່ prune (ເບິ່ງ "ຕາຕະລາງທຸລະກຳບໍ່ prune" ຢູ່ຂ້າງເທິງ)
  $cols = ['product_id','mat_id','product_name','type','qty','note','log_date'];
  $s = $pdo->prepare("INSERT INTO tbl_stock_log (log_id, " . implode(',', $cols) . ")
                      VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  foreach ($rows as $l) {
    $ref  = nmeach($l,'productId');
    $isMat = nmeach($l,'kind') === 'material';
    $s->execute([$l['id'],
                 $isMat ? null : fkOrNull($pdo, 'tbl_product',  'prod_id', $ref),
                 $isMat ? fkOrNull($pdo, 'tbl_material', 'mat_id', $ref) : null,
                 nmeach($l,'productName'),
                 nmeach($l,'type'), nmeach($l,'qty') ?: 0, nmeach($l,'note'),
                 toDbDate(nmeach($l,'date'))]);
  }
}

function saveSettings($pdo, $v) {
  // UPSERT ເພື່ອກັນກໍລະນີແຖວ setting_id=1 ຖືກລຶບໄປ (ເມື່ອກ່ອນ UPDATE ຈະບໍ່ເຮັດຫຍັງເລີຍ)
  $cols = ['store_name','phone','address','vat_pct','currency','receipt_header','receipt_footer'];
  $s = $pdo->prepare("INSERT INTO tbl_setting (setting_id, " . implode(',', $cols) . ")
                      VALUES (1,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE " . onDup($cols));
  $s->execute([
    nmeach($v,'storeName'), nmeach($v,'phone'), nmeach($v,'address'), nmeach($v,'vatPct') ?: 7,
    nmeach($v,'currency'), nmeach($v,'receiptHeader'), nmeach($v,'receiptFooter'),
  ]);
}

function saveOrderNum($pdo, $v) {
  $s = $pdo->prepare("INSERT INTO tbl_setting (setting_id, order_num) VALUES (1,?)
                      ON DUPLICATE KEY UPDATE order_num=VALUES(order_num)");
  $s->execute([(int)$v]);
}

/* ============================================================
   RESET — ລ້າງສະເພາະ "ຂໍ້ມູນທຸລະກຳ"
   ------------------------------------------------------------
   ຂໍ້ມູນຫຼັກ (ເມນູ, ໝວດ, ວັດຖຸດິບ, ໂຕະ, ຜູ້ໃຊ້, ຕັ້ງຄ່າຮ້ານ) ບໍ່ຖືກລຶບ
   ເພາະມັນມາຈາກ database.sql ແລະ ບໍ່ມີໃຜ seed ກັບຄືນໃຫ້ອີກແລ້ວ
   → ຢາກລ້າງທັງໝົດແທ້ ໃຫ້ import database.sql ຄືນໃນ phpMyAdmin
   ============================================================ */
function resetTransactions($pdo) {
  ensureRevisionTable($pdo);            // DDL — ຕ້ອງຢູ່ນອກ transaction
  // ຫຸ້ມດ້ວຍ transaction: ເມື່ອກ່ອນແຕ່ລະ DELETE commit ແຍກກັນ ຖ້າພັງກາງທາງ
  // (ເຄີຍເຈີຈິງ: ຕິດ lock ຕອນ UPDATE tbl_table) ຈະໄດ້ "ລ້າງເຄິ່ງດຽວ"
  // ຄື ບິນຫາຍໝົດແຕ່ໂຕະຍັງຄ້າງເປັນ busy ແລະ ຕົວນັບບໍ່ຖືກຣີເຊັດ
  $pdo->beginTransaction();
  try {
    // ລຳດັບ: ຕາຕະລາງລູກ (child) ກ່ອນ ຕາຕະລາງແມ່ (parent) — ບໍ່ໃຫ້ຕິດ FOREIGN KEY
    foreach (['tbl_sale_detail','tbl_sale','tbl_import_detail','tbl_import',
              'tbl_purchase_detail','tbl_purchase','tbl_stock_log'] as $t) {
      $pdo->exec("DELETE FROM $t");
    }
    $pdo->exec("UPDATE tbl_table SET status = 'free'");
    $pdo->exec("UPDATE tbl_setting SET order_num = 1001 WHERE setting_id = 1");
    // ປຸກທຸກໜ້າຈໍໃຫ້ດຶງໃໝ່ — ລ້າງແລ້ວກະທົບຫຼາຍ store ພ້ອມກັນ
    foreach (STORE_NAMES as $s) bumpRev($pdo, $s);
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
}
