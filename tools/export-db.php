<?php
/* ============================================================
   tools/export-db.php — ເອົາ "ຂໍ້ມູນຈິງທີ່ໃຊ້ຢູ່" ອອກເປັນ database.sql
   ------------------------------------------------------------
   ບັນຫາທີ່ແກ້:
   ຮູບ ແລະ ເມນູທີ່ແກ້ຜ່ານໜ້າ admin ຢູ່ 2 ບ່ອນ ເຊິ່ງບໍ່ມີບ່ອນໃດຂຶ້ນ git ເລີຍ:
     • ຂໍ້ມູນ (ຊື່/ລາຄາ/ເສັ້ນທາງຮູບ) ຢູ່ໃນ MySQL
     • ໄຟລ໌ຮູບ ຢູ່ໃນໂຟນເດີ images/menu/ ຂອງ "ຊຸດທີ່ Apache ເປີດ"
   ສ່ວນ database.sql ເປັນໄຟລ໌ຄົງທີ່ທີ່ຂຽນໄວ້ຄັ້ງດຽວ — ຄົນທີ່ໂຫຼດໂປຣເຈັກ
   ໄປຈຶ່ງໄດ້ເມນູ/ຮູບ "ຊຸດທຳອິດ" ສະເໝີ ບໍ່ແມ່ນຂອງທີ່ເຮົາແກ້ລ້າສຸດ.

   ສະຄິບນີ້ເຮັດ 2 ຢ່າງ:
     1. ຂຽນສ່ວນ master data ຂອງ database.sql ໃໝ່ ຈາກ MySQL ທີ່ໃຊ້ຢູ່ຈິງ
        (ໂຄງສ້າງ CREATE TABLE ຂ້າງເທິງຄົງໄວ້ຄືເກົ່າທຸກຕົວອັກສອນ)
     2. ກ໋ອບປີ້ໄຟລ໌ຮູບທີ່ເມນູອ້າງເຖິງ ຈາກຊຸດທີ່ Apache ເປີດ ມາໃສ່ຊຸດ git

   ວິທີໃຊ້ (ຢູ່ໂຟນເດີໂປຣເຈັກ):
     php tools/export-db.php
     php tools/export-db.php --from="C:\xampp\htdocs\POS-SST-main"

   ຕາຕະລາງທຸລະກຳ (ບິນຂາຍ/ສັ່ງຊື້/ນຳເຂົ້າ/log) ບໍ່ຖືກ export ໂດຍຕັ້ງໃຈ —
   ຄົນທີ່ຮັບໄປຄວນເລີ່ມຈາກ 0 ບໍ່ແມ່ນໄດ້ບິນຂອງຮ້ານເຮົາຕິດໄປນຳ.
   ============================================================ */

if (PHP_SAPI !== 'cli') {
  http_response_code(403);
  exit("ສະຄິບນີ້ໃຊ້ຜ່ານ command line ເທົ່ານັ້ນ (php tools/export-db.php)\n");
}

$ROOT = dirname(__DIR__);
require $ROOT . '/api/config.php';

/* ຊຸດຕົ້ນທາງຂອງໄຟລ໌ຮູບ — ຄ່າເລີ່ມຕົ້ນເດົາຈາກ htdocs ຊື່ໂຟນເດີດຽວກັນ
   ຖ້າໂປຣເຈັກຢູ່ຊຸດດຽວ (ບໍ່ໄດ້ແຍກ Downloads/htdocs) ຂໍ້ນີ້ຈະບໍ່ພົບຫຍັງ
   ໃຫ້ກ໋ອບປີ້ ເຊິ່ງກໍ່ຖືກຕ້ອງແລ້ວ ບໍ່ມີຫຍັງເສຍຫາຍ */
$from = 'C:\\xampp\\htdocs\\' . basename($ROOT);
foreach (array_slice($argv, 1) as $a) {
  if (strpos($a, '--from=') === 0) $from = trim(substr($a, 7), '"');
}

$pdo = db();
$q   = fn($v) => $v === null ? 'NULL' : $pdo->quote((string)$v);
$n   = fn($v) => $v === null ? 'NULL' : (string)(0 + $v);

// ── 1. ສ້າງສ່ວນ master data ໃໝ່ ─────────────────────────────
$MARK = '-- ============================================================
-- ຂໍ້ມູນຕັ້ງຕົ້ນ (master data)';

$sqlPath = $ROOT . '/database.sql';
$old     = file_get_contents($sqlPath);
$cut     = strpos($old, $MARK);
if ($cut === false) exit("ຫາຈຸດເລີ່ມ master data ໃນ database.sql ບໍ່ພົບ — ຢຸດໄວ້ ບໍ່ຂຽນທັບ\n");
$schema  = substr($old, 0, $cut);

$out  = $MARK . " — export ຈາກ MySQL ທີ່ໃຊ້ຢູ່ຈິງ\n";
$out .= "-- ສ້າງໂດຍ tools/export-db.php ເມື່ອ " . date('Y-m-d H:i') . "\n";
$out .= "-- ຢ່າແກ້ດ້ວຍມື — ແກ້ຜ່ານໜ້າ admin ແລ້ວລັນສະຄິບໃໝ່\n";
$out .= "-- ລຳດັບສຳຄັນ: ຕາຕະລາງແມ່ກ່ອນ ຕາຕະລາງລູກ (ຕິດ FOREIGN KEY)\n";
$out .= "-- ============================================================\n\n";

// ຕັ້ງຄ່າຮ້ານ — order_num ກັບເປັນ 1001 ເພາະບິນບໍ່ໄດ້ຕິດໄປນຳ
$s = $pdo->query("SELECT * FROM tbl_setting WHERE setting_id = 1")->fetch();
$out .= "-- ຕັ້ງຄ່າຮ້ານ ------------------------------------------------\n";
$out .= "INSERT INTO tbl_setting\n  (setting_id, store_name, phone, address, vat_pct, currency, receipt_header, receipt_footer, order_num)\nVALUES\n  (1, "
      . $q($s['store_name']) . ", " . $q($s['phone']) . ", " . $q($s['address']) . ", "
      . $n($s['vat_pct']) . ", " . $q($s['currency']) . ", "
      . $q($s['receipt_header']) . ", " . $q($s['receipt_footer']) . ", 1001);\n\n";

$rows = [];
foreach ($pdo->query("SELECT * FROM tbl_category ORDER BY cate_id") as $r)
  $rows[] = "  (" . $n($r['cate_id']) . ", " . $q($r['cate_name']) . ", " . $q($r['type']) . ", "
          . $q($r['cat_key']) . ", " . $q($r['name_lo']) . ", " . $q($r['name_th']) . ", "
          . $q($r['name_en']) . ", " . $q($r['name_zh']) . ")";
$out .= "-- ໝວດສິນຄ້າ (tbl_category) ----------------------------------\n"
      . "INSERT INTO tbl_category (cate_id, cate_name, type, cat_key, name_lo, name_th, name_en, name_zh) VALUES\n"
      . implode(",\n", $rows) . ";\n\n";

// ໂຕະ — status ບັງຄັບເປັນ free ເພາະບິນທີ່ເປີດໂຕະຄ້າງໄວ້ບໍ່ໄດ້ຕິດໄປນຳ
$rows = [];
foreach ($pdo->query("SELECT * FROM tbl_table ORDER BY table_id") as $r)
  $rows[] = "(" . $n($r['table_id']) . ", " . $q($r['table_name']) . ", 'free')";
$out .= "-- ໂຕະ (tbl_table) -------------------------------------------\n"
      . "INSERT INTO tbl_table (table_id, table_name, status) VALUES\n  "
      . implode(", ", $rows) . ";\n\n";

// ຜູ້ໃຊ້ — last_login ລ້າງ ບໍ່ໃຫ້ຕິດເວລາລ໋ອກອິນຂອງເຮົາໄປນຳ
$rows = [];
foreach ($pdo->query("SELECT * FROM tbl_user ORDER BY user_id") as $r)
  $rows[] = "  (" . $n($r['user_id']) . ", " . $q($r['username']) . ",\n      " . $q($r['password'])
          . ",\n      " . $q($r['full_name']) . ", " . $q($r['role']) . ", " . $q($r['status']) . ", NULL)";
$out .= "-- ຜູ້ໃຊ້ (tbl_user) -----------------------------------------\n"
      . "-- password = SHA-256 + salt ສະເພາະຄົນ + ວົນຊ້ຳ 1,000 ຮອບ  →  s1\$<salt>\$<hash>\n"
      . "INSERT INTO tbl_user (user_id, username, password, full_name, role, status, last_login) VALUES\n"
      . implode(",\n", $rows) . ";\n\n";

$rows = [];
foreach ($pdo->query("SELECT * FROM tbl_material ORDER BY mat_id") as $r)
  $rows[] = "  (" . $n($r['mat_id']) . ", " . $q($r['name_lo']) . ", " . $q($r['name_th']) . ", "
          . $q($r['name_en']) . ", " . $q($r['name_zh']) . ", " . $q($r['unit']) . ", "
          . $n($r['qty_stock']) . ", " . $n($r['min_stock']) . ")";
$out .= "-- ວັດຖຸດິບ (tbl_material) -----------------------------------\n"
      . "INSERT INTO tbl_material (mat_id, name_lo, name_th, name_en, name_zh, unit, qty_stock, min_stock) VALUES\n"
      . implode(",\n", $rows) . ";\n\n";

$rows = []; $imgs = [];
foreach ($pdo->query("SELECT * FROM tbl_product ORDER BY prod_id") as $r) {
  if ($r['img'] && strpos($r['img'], 'data:') !== 0) $imgs[] = $r['img'];
  $rows[] = "  (" . $n($r['prod_id']) . ", " . $q($r['name_lo']) . ", " . $q($r['name_th']) . ", "
          . $q($r['name_en']) . ", " . $q($r['name_zh']) . ",\n   "
          . $q($r['desc_lo']) . ", " . $q($r['desc_th']) . ", " . $q($r['desc_en']) . ", " . $q($r['desc_zh']) . ",\n   "
          . $q($r['cat_key']) . ", " . $n($r['price']) . ", " . $n($r['qty_stock']) . ", "
          . $q($r['emoji']) . ", " . $q($r['img']) . ", " . $q($r['status']) . ")";
}
$out .= "-- ເມນູ (tbl_product) ----------------------------------------\n"
      . "-- img: ເສັ້ນທາງຮູບໃນໂຟນເດີ images/menu/ — ບໍ່ມີຮູບໃສ່ NULL (ໜ້າຈໍຈະສະແດງ emoji ແທນ)\n"
      . "INSERT INTO tbl_product\n  (prod_id, name_lo, name_th, name_en, name_zh,\n"
      . "   desc_lo, desc_th, desc_en, desc_zh, cat_key, price, qty_stock, emoji, img, status) VALUES\n"
      . implode(",\n", $rows) . ";\n\n";

$out .= "-- ຜູກຄີນອກ tbl_product.cate_id ຈາກ cat_key (ຄືກັບທີ່ api/index.php ເຮັດ)\n"
      . "UPDATE tbl_product p\n  LEFT JOIN tbl_category c ON c.cat_key = p.cat_key\n"
      . "  SET p.cate_id = c.cate_id;\n\n"
      . "-- ຕາຕະລາງທຸລະກຳ (tbl_sale, tbl_purchase, tbl_import, tbl_stock_log)\n"
      . "-- ຕັ້ງໃຈປ່ອຍໃຫ້ວ່າງ — ຂໍ້ມູນຕ້ອງມາຈາກການໃຊ້ງານຈິງເທົ່ານັ້ນ\n";

file_put_contents($sqlPath, $schema . $out);
echo "✔ ຂຽນ database.sql ໃໝ່ແລ້ວ\n";

// ── 2. ກ໋ອບປີ້ໄຟລ໌ຮູບທີ່ເມນູອ້າງເຖິງ ເຂົ້າມາໃນຊຸດ git ────────
$copied = $missing = 0;
foreach (array_unique($imgs) as $rel) {
  $rel  = str_replace('/', DIRECTORY_SEPARATOR, ltrim($rel, '/'));
  $dest = $ROOT . DIRECTORY_SEPARATOR . $rel;
  if (is_file($dest)) continue;                       // ມີຢູ່ແລ້ວ
  $src = rtrim($from, '\\/') . DIRECTORY_SEPARATOR . $rel;
  if (!is_file($src)) { echo "  ⚠ ຫາໄຟລ໌ບໍ່ພົບ: $rel\n"; $missing++; continue; }
  if (!is_dir(dirname($dest))) @mkdir(dirname($dest), 0777, true);
  if (@copy($src, $dest)) { echo "  + ກ໋ອບປີ້ $rel\n"; $copied++; }
  else { echo "  ⚠ ກ໋ອບປີ້ບໍ່ໄດ້: $rel\n"; $missing++; }
}
echo "✔ ຮູບ: ກ໋ອບປີ້ $copied ໄຟລ໌" . ($missing ? ", ຂາດ $missing ໄຟລ໌" : "") . "\n";
echo "\nຕໍ່ໄປ:  git add -A && git commit -m \"Update menu data and images\" && git push\n";
