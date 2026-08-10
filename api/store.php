<?php
/* ============================================================
   api/store.php — ຊັ້ນ "ອ່ານຂໍ້ມູນ" + ຕົວນັບ revision
   ------------------------------------------------------------
   ແຍກອອກມາຈາກ index.php ເພື່ອໃຫ້ api/events.php (SSE realtime)
   ໃຊ້ຟັງຊັນອ່ານຊຸດດຽວກັນໄດ້ ໂດຍບໍ່ຕ້ອງຂຽນຊ້ຳ ຫຼື include index.php
   (ເຊິ່ງຈະ run ໂຄດ HTTP ຂອງມັນທັນທີ).
   ============================================================ */

require_once __DIR__ . "/config.php";

/* ---- helpers ---------------------------------------------- */
function nmeach($obj, $k) { return isset($obj[$k]) ? $obj[$k] : null; }
function langObj($row, $prefix) {
  return [
    'lo' => $row[$prefix.'_lo'], 'th' => $row[$prefix.'_th'],
    'en' => $row[$prefix.'_en'], 'zh' => $row[$prefix.'_zh'],
  ];
}
function L($nameObj, $k) { // read a language value out of a JS name/desc object
  if (!is_array($nameObj)) return null;
  return isset($nameObj[$k]) ? $nameObj[$k] : null;
}

/* ---- date conversion (JS ISO/UTC  ⇄  MySQL DATETIME) -------
   ເກັບລົງ DB ເປັນເວລາທ້ອງຖິ່ນຂອງຮ້ານ (APP_TZ) ເພື່ອໃຫ້ລາຍງານ SQL
   ເຊັ່ນ GROUP BY DATE(created_at) ຕົງກັບໃບບິນ; ຕອນອ່ານແປງກັບເປັນ ISO/UTC
   ໃຫ້ຝັ່ງ JavaScript ໃຊ້ຄືເກົ່າ. -------------------------------- */
function toDbDate($v) {
  if ($v === null || $v === '' || $v === '-') return null;
  try {
    $d = new DateTime($v);                       // ISO ມີ 'Z' → ຮູ້ເຂດເວລາເອງ
  } catch (Throwable $e) { return null; }        // ຂໍ້ມູນເກົ່າທີ່ແປງບໍ່ໄດ້ → NULL
  $d->setTimezone(new DateTimeZone(APP_TZ));
  return $d->format('Y-m-d H:i:s');
}
function toIsoDate($v) {
  if ($v === null || $v === '') return null;
  try {
    $d = new DateTime($v, new DateTimeZone(APP_TZ));
  } catch (Throwable $e) { return null; }
  $d->setTimezone(new DateTimeZone('UTC'));
  return $d->format('Y-m-d\TH:i:s.v\Z');
}

/* ============================================================
   REVISION — ຕົວນັບ "ຂໍ້ມູນປ່ຽນແລ້ວ" ສຳລັບ realtime (SSE)
   ------------------------------------------------------------
   ຂອງເກົ່າ: ທຸກໜ້າຈໍດຶງຂໍ້ມູນທັງໝົດຈາກ MySQL ທຸກ 5 ວິນາທີ ແລ້ວມາທຽບເອງ
   ວ່າມີຫຍັງປ່ຽນ — ຊ້າ, ໜັກ, ແລະ ຢຸດເຮັດວຽກເມື່ອແທັບຢູ່ເບື້ອງຫຼັງ.

   ຂອງໃໝ່: ທຸກຄັ້ງທີ່ບັນທຶກສຳເລັດ ຈະ +1 ໃສ່ຕົວນັບຂອງ store ນັ້ນ.
   ຝັ່ງ SSE ພຽງແຕ່ອ່ານຕາຕະລາງນ້ອຍ ໆ ນີ້ (11 ແຖວ) ທຸກ ~0.4 ວິນາທີ
   — ຖ້າເລກບໍ່ປ່ຽນ ກໍ່ບໍ່ຕ້ອງແຕະຕາຕະລາງໃຫຍ່ເລີຍ. ຖ້າປ່ຽນ ຈຶ່ງອ່ານ
   ສະເພາະ store ນັ້ນ ແລ້ວ push ລົງໄປຫາທຸກໜ້າຈໍທັນທີ.
   ============================================================ */
const STORE_NAMES = ['users','categories','products','materials','tables',
                     'orders','purchases','imports','stockLog','settings','orderNum'];

// ສ້າງຕາຕະລາງໃຫ້ເອງ ຖ້າຍັງບໍ່ມີ — ຖານຂໍ້ມູນທີ່ import ໄວ້ກ່ອນໜ້ານີ້
// ຈຶ່ງບໍ່ຕ້ອງ import database.sql ໃໝ່
function ensureRevisionTable($pdo) {
  static $done = false;
  if ($done) return;
  $pdo->exec("CREATE TABLE IF NOT EXISTS tbl_revision (
                store VARCHAR(30) NOT NULL PRIMARY KEY,
                rev   BIGINT      NOT NULL DEFAULT 1
              ) ENGINE=InnoDB");
  $done = true;
}

function readRevs($pdo) {
  ensureRevisionTable($pdo);
  $out = [];
  foreach ($pdo->query("SELECT store, rev FROM tbl_revision") as $r) {
    $out[$r['store']] = (int)$r['rev'];
  }
  return $out;
}

function bumpRev($pdo, $store) {
  ensureRevisionTable($pdo);
  $pdo->prepare("INSERT INTO tbl_revision (store, rev) VALUES (?, 1)
                 ON DUPLICATE KEY UPDATE rev = rev + 1")->execute([$store]);
}

/* ອ່ານ store ດຽວ — ໃຊ້ໂດຍ SSE ເພື່ອສົ່ງສະເພາະສ່ວນທີ່ປ່ຽນ
   (ບໍ່ຕ້ອງສົ່ງເມນູທັງໝົດ ເມື່ອມີແຕ່ອໍເດີໃໝ່ໃບດຽວ) */
function readStore($pdo, $name) {
  switch ($name) {
    case 'users':      return readUsers($pdo);
    case 'categories': return readCategories($pdo);
    case 'products':   return readProducts($pdo);
    case 'materials':  return readMaterials($pdo);
    case 'tables':     return readTables($pdo);
    case 'orders':     return readOrders($pdo);
    case 'purchases':  return readPurchases($pdo);
    case 'imports':    return readImports($pdo);
    case 'stockLog':   return readStockLog($pdo);
    case 'settings':   return readSettings($pdo);
    case 'orderNum':   return readOrderNum($pdo);
    default:           return null;
  }
}

/* ============================================================
   READ — build the exact shape POS_DB expects
   ============================================================ */
function readAll($pdo) {
  return [
    'users'      => readUsers($pdo),
    'categories' => readCategories($pdo),
    'products'   => readProducts($pdo),
    'materials'  => readMaterials($pdo),
    'tables'     => readTables($pdo),
    'orders'     => readOrders($pdo),
    'purchases'  => readPurchases($pdo),
    'imports'    => readImports($pdo),
    'stockLog'   => readStockLog($pdo),
    'settings'   => readSettings($pdo),
    'orderNum'   => readOrderNum($pdo),
    // ລຸ້ນຂອງແຕ່ລະ store ຕອນອ່ານ — ຝັ່ງໜ້າຈໍເອົາໄປບອກ events.php
    // ວ່າ "ຂ້ອຍມີເຖິງລຸ້ນນີ້ແລ້ວ" ຈຶ່ງບໍ່ຖືກສົ່ງຂໍ້ມູນຊ້ຳຕອນຕໍ່ສາຍ SSE
    'revs'       => readRevs($pdo),
    // ຝັ່ງ JavaScript ໃຊ້ການມີຢູ່ຂອງ meta ເປັນຕົວກວດວ່າ "ຕໍ່ PHP+MySQL ໄດ້ຈິງ"
    'meta'       => ['ok' => true],
  ];
}

function readUsers($pdo) {
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_user ORDER BY user_id") as $r) {
    $out[] = [
      'id' => (int)$r['user_id'], 'name' => $r['full_name'],
      'username' => $r['username'], 'password' => $r['password'],
      'role' => $r['role'], 'status' => $r['status'],
      'lastLogin' => toIsoDate($r['last_login']),
    ];
  }
  return $out;
}

function readCategories($pdo) {
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_category ORDER BY cate_id") as $r) {
    $out[] = [
      'id' => (int)$r['cate_id'], 'cate_name' => $r['cate_name'],
      'type' => $r['type'], 'cat' => $r['cat_key'],
      'name' => langObj($r, 'name'),
    ];
  }
  return $out;
}

function readProducts($pdo) {
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_product ORDER BY prod_id") as $r) {
    $out[] = [
      'id' => (int)$r['prod_id'],
      'name' => langObj($r, 'name'),
      'desc' => langObj($r, 'desc'),
      'price' => (float)$r['price'],
      'cat' => $r['cat_key'],
      'emoji' => $r['emoji'],
      'img' => $r['img'],
      'stock' => (int)$r['qty_stock'],
      'status' => $r['status'],
    ];
  }
  return $out;
}

function readMaterials($pdo) {
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_material ORDER BY mat_id") as $r) {
    $out[] = [
      'id' => (int)$r['mat_id'], 'name' => langObj($r, 'name'),
      'unit' => $r['unit'], 'stock' => (int)$r['qty_stock'], 'min' => (int)$r['min_stock'],
    ];
  }
  return $out;
}

function readTables($pdo) {
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_table ORDER BY table_id") as $r) {
    $out[] = ['id' => (int)$r['table_id'], 'name' => $r['table_name'], 'status' => $r['status']];
  }
  return $out;
}

function readOrders($pdo) {
  $details = [];
  foreach ($pdo->query("SELECT * FROM tbl_sale_detail ORDER BY sd_id") as $d) {
    $details[$d['sale_id']][] = [
      'id'    => $d['prod_id'] === null ? null : (int)$d['prod_id'],
      'name'  => $d['name_json'] ? json_decode($d['name_json'], true) : null,
      'emoji' => $d['emoji'],
      'qty'   => (int)$d['qty'],
      'price' => (float)$d['price'],
    ];
  }
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_sale ORDER BY sale_id DESC") as $r) {
    $out[] = [
      'id'            => (int)$r['sale_id'],
      'num'           => $r['order_num'],
      'tableCode'     => $r['table_code'],
      'tableId'       => $r['table_id'] === null ? null : (int)$r['table_id'],
      'items'         => isset($details[$r['sale_id']]) ? $details[$r['sale_id']] : [],
      'subtotal'      => (float)$r['subtotal'],
      'vatAmt'        => (float)$r['vat_amt'],
      'total'         => (float)$r['total_amount'],
      'paymentMethod' => $r['payment_method'],
      'status'        => $r['status'],
      'source'        => $r['source'],
      'createdAt'     => toIsoDate($r['created_at']),
      'updatedAt'     => toIsoDate($r['updated_at']),
    ];
  }
  return $out;
}

function readPurchases($pdo) {
  $details = [];
  foreach ($pdo->query("SELECT * FROM tbl_purchase_detail ORDER BY pd_id") as $d) {
    $details[$d['pur_id']][] = [
      'kind' => $d['kind'], 'refId' => $d['ref_id'] === null ? null : (int)$d['ref_id'],
      'name' => $d['item_name'], 'qty' => (int)$d['qty'], 'price' => (float)$d['price'],
    ];
  }
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_purchase ORDER BY pur_id DESC") as $r) {
    $out[] = [
      'id' => (int)$r['pur_id'], 'pur_date' => toIsoDate($r['pur_date']),
      'items' => isset($details[$r['pur_id']]) ? $details[$r['pur_id']] : [],
      'total' => (float)$r['total_bill'], 'userId' => $r['user_id'] === null ? null : (int)$r['user_id'],
      'userName' => $r['user_name'], 'status' => $r['status'],
    ];
  }
  return $out;
}

function readImports($pdo) {
  $details = [];
  foreach ($pdo->query("SELECT * FROM tbl_import_detail ORDER BY id_") as $d) {
    $details[$d['imp_id']][] = [
      'kind' => $d['kind'], 'refId' => $d['ref_id'] === null ? null : (int)$d['ref_id'],
      'name' => $d['item_name'], 'qty' => (int)$d['qty'], 'price' => (float)$d['price'],
    ];
  }
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_import ORDER BY imp_id DESC") as $r) {
    $out[] = [
      'id' => (int)$r['imp_id'], 'imp_date' => toIsoDate($r['imp_date']),
      'purId' => $r['pur_id'] === null ? null : (int)$r['pur_id'],
      'items' => isset($details[$r['imp_id']]) ? $details[$r['imp_id']] : [],
      'total' => (float)$r['total'], 'userId' => $r['user_id'] === null ? null : (int)$r['user_id'],
      'userName' => $r['user_name'],
    ];
  }
  return $out;
}

function readStockLog($pdo) {
  $out = [];
  foreach ($pdo->query("SELECT * FROM tbl_stock_log ORDER BY log_id DESC") as $r) {
    $out[] = [
      'id' => (int)$r['log_id'],
      'kind'      => $r['mat_id'] === null ? 'product' : 'material',
      'productId' => $r['mat_id'] !== null ? (int)$r['mat_id']
                     : ($r['product_id'] === null ? null : (int)$r['product_id']),
      'productName' => $r['product_name'], 'type' => $r['type'], 'qty' => (int)$r['qty'],
      'note' => $r['note'], 'date' => toIsoDate($r['log_date']),
    ];
  }
  return $out;
}

function readSettings($pdo) {
  $r = $pdo->query("SELECT * FROM tbl_setting WHERE setting_id = 1")->fetch();
  if (!$r) return null;
  return [
    'storeName' => $r['store_name'], 'phone' => $r['phone'], 'address' => $r['address'],
    'vatPct' => (int)$r['vat_pct'], 'currency' => $r['currency'],
    'receiptHeader' => $r['receipt_header'], 'receiptFooter' => $r['receipt_footer'],
  ];
}
function readOrderNum($pdo) {
  $r = $pdo->query("SELECT order_num FROM tbl_setting WHERE setting_id = 1")->fetch();
  return $r ? (int)$r['order_num'] : 1001;
}

