<?php
/* ============================================================
   api/config.php — ຕັ້ງຄ່າການເຊື່ອມຕໍ່ MySQL (XAMPP)
   ------------------------------------------------------------
   ຄ່າ default ຂອງ XAMPP:  user = root, ບໍ່ມີ password.
   ຖ້າ MySQL ຂອງເຈົ້າຕັ້ງ password ໄວ້ ໃຫ້ໃສ່ໃນ DB_PASS.
   ============================================================ */

define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3307');   // XAMPP MySQL ຍ້າຍມາ 3307 (ຫຼີກ MySQL97 ທີ່ຢູ່ 3306)
define('DB_NAME', 'pos_ground_camp');
define('DB_USER', 'root');
define('DB_PASS', '');

// ເຂດເວລາຂອງຮ້ານ — ຄໍລຳ DATETIME ທັງໝົດເກັບເປັນເວລານີ້
// (ບຣາວເຊີສົ່ງມາເປັນ ISO/UTC → PHP ແປງໃຫ້ ແລະ ແປງກັບຕອນອ່ານ)
define('APP_TZ', 'Asia/Vientiane');

function db() {
  static $pdo = null;
  if ($pdo === null) {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    // STRICT_TRANS_TABLES: ຄ່າເລີ່ມຕົ້ນຂອງ XAMPP ຈະ "ຕັດຂໍ້ມູນຖິ້ມແບບງຽບໆ" ເມື່ອ
    // ຂໍ້ຄວາມຍາວເກີນຄໍລຳ (ເຊັ່ນ ຮູບ base64) — ເປີດໂໝດເຂັ້ມໃຫ້ມັນແຈ້ງ error ອອກມາ
    // ແທນ ເພື່ອບໍ່ໃຫ້ຂໍ້ມູນເສຍໂດຍທີ່ຜູ້ໃຊ້ບໍ່ຮູ້ຕົວ
    $pdo->exec("SET SESSION sql_mode = CONCAT_WS(',', @@sql_mode, 'STRICT_TRANS_TABLES')");
    // ຄ່າເລີ່ມຕົ້ນ 50 ວິນາທີ ຍາວເກີນໄປສຳລັບແອັບໜ້າຮ້ານ: ຖ້າມີ transaction
    // ຄ້າງ ຄຳຂໍອື່ນຈະຄ້າງຕາມ ແລ້ວ thread ຂອງ Apache ກໍ່ໝົດ → ທັງລະບົບຄ້າງ
    // ຕັດໃຫ້ສັ້ນ ເພື່ອໃຫ້ "ລົ້ມໄວ ແລ້ວແຈ້ງເຕືອນ" ແທນທີ່ຈະຄ້າງງຽບ ໆ
    $pdo->exec("SET SESSION innodb_lock_wait_timeout = 5");
  }
  return $pdo;
}
