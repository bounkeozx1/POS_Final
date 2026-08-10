<?php
/* ============================================================
   api/config.php — ຕັ້ງຄ່າການເຊື່ອມຕໍ່ MySQL (XAMPP)
   ------------------------------------------------------------
   ຄ່າ default ຂອງ XAMPP:  user = root, ບໍ່ມີ password.
   ຖ້າ MySQL ຂອງເຈົ້າຕັ້ງ password ໄວ້ ໃຫ້ໃສ່ໃນ DB_PASS.

   ພອດບໍ່ໄດ້ຖືກ hardcode ໄວ້ຕົວດຽວອີກແລ້ວ — DB_PORTS ເປັນ "ລາຍການ"
   ທີ່ຈະລອງຕາມລຳດັບ ແລ້ວໃຊ້ຕົວທຳອິດທີ່ຕໍ່ຕິດ. ເປັນເພາະແຕ່ລະເຄື່ອງ
   ວາງ XAMPP ຄົນລະພອດ (ເຄື່ອງນີ້ 3307, ເຄື່ອງທົ່ວໄປ 3306) ແລ້ວ
   ຄ່າຕາຍຕົວເຮັດໃຫ້ຜູ້ອື່ນເປີດແອັບບໍ່ໄດ້ເລີຍ.

   ສຳຄັນ: ການທົດລອງຕໍ່ແມ່ນລວມ dbname + user/pass ນຳ ຈຶ່ງ "ປອດໄພ" —
   ຖ້າພອດນັ້ນເປັນ MySQL ຄົນລະໂຕ (ບໍ່ມີຖານ pos_ground_camp ຫຼື
   ລະຫັດຜ່ານຄົນລະອັນ) ມັນຈະລົ້ມແລ້ວຂ້າມໄປພອດຕໍ່ໄປ ບໍ່ແມ່ນເອົາ
   ຖານຜິດມາໃຊ້.

   ຢາກລັອກຄ່າສະເພາະເຄື່ອງໂຕເອງ (ບໍ່ຖືກ push ຂຶ້ນ git) — ສ້າງໄຟລ໌
   api/config.local.php ແລ້ວ define ຄ່າທີ່ຢາກທັບ ເຊັ່ນ:
       <?php define('DB_PORTS', '3306'); define('DB_PASS', 'xxxx');
   ============================================================ */

// ຄ່າສະເພາະເຄື່ອງ (ຖ້າມີ) — ຕ້ອງໂຫຼດກ່ອນ ເພາະ define() ຄັ້ງທຳອິດຊະນະ
if (is_file(__DIR__ . '/config.local.php')) require_once __DIR__ . '/config.local.php';

if (!defined('DB_HOST'))  define('DB_HOST',  '127.0.0.1');
if (!defined('DB_PORTS')) define('DB_PORTS', '3307,3306');  // ລອງຊ້າຍ→ຂວາ
if (!defined('DB_NAME'))  define('DB_NAME',  'pos_ground_camp');
if (!defined('DB_USER'))  define('DB_USER',  'root');
if (!defined('DB_PASS'))  define('DB_PASS',  '');

// ເຂດເວລາຂອງຮ້ານ — ຄໍລຳ DATETIME ທັງໝົດເກັບເປັນເວລານີ້
// (ບຣາວເຊີສົ່ງມາເປັນ ISO/UTC → PHP ແປງໃຫ້ ແລະ ແປງກັບຕອນອ່ານ)
if (!defined('APP_TZ'))   define('APP_TZ',   'Asia/Vientiane');

function db() {
  static $pdo = null;
  if ($pdo !== null) return $pdo;

  $tried = [];
  foreach (array_filter(array_map('trim', explode(',', DB_PORTS)), 'strlen') as $port) {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . $port . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    try {
      $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        // ພອດທີ່ບໍ່ມີໃຜຟັງຢູ່ຕ້ອງລົ້ມໄວ ບໍ່ແມ່ນຄ້າງລໍ — ຍ້ອນເຮົາລອງຫຼາຍພອດ
        PDO::ATTR_TIMEOUT            => 3,
      ]);
    } catch (PDOException $e) {
      $tried[] = 'port ' . $port . ' → ' . $e->getMessage();
      $pdo = null;
      continue;
    }

    // STRICT_TRANS_TABLES: ຄ່າເລີ່ມຕົ້ນຂອງ XAMPP ຈະ "ຕັດຂໍ້ມູນຖິ້ມແບບງຽບໆ" ເມື່ອ
    // ຂໍ້ຄວາມຍາວເກີນຄໍລຳ (ເຊັ່ນ ຮູບ base64) — ເປີດໂໝດເຂັ້ມໃຫ້ມັນແຈ້ງ error ອອກມາ
    // ແທນ ເພື່ອບໍ່ໃຫ້ຂໍ້ມູນເສຍໂດຍທີ່ຜູ້ໃຊ້ບໍ່ຮູ້ຕົວ
    $pdo->exec("SET SESSION sql_mode = CONCAT_WS(',', @@sql_mode, 'STRICT_TRANS_TABLES')");
    // ຄ່າເລີ່ມຕົ້ນ 50 ວິນາທີ ຍາວເກີນໄປສຳລັບແອັບໜ້າຮ້ານ: ຖ້າມີ transaction
    // ຄ້າງ ຄຳຂໍອື່ນຈະຄ້າງຕາມ ແລ້ວ thread ຂອງ Apache ກໍ່ໝົດ → ທັງລະບົບຄ້າງ
    // ຕັດໃຫ້ສັ້ນ ເພື່ອໃຫ້ "ລົ້ມໄວ ແລ້ວແຈ້ງເຕືອນ" ແທນທີ່ຈະຄ້າງງຽບ ໆ
    $pdo->exec("SET SESSION innodb_lock_wait_timeout = 5");
    return $pdo;
  }

  // ລົ້ມທຸກພອດ — ບອກໃຫ້ຊັດວ່າລອງຫຍັງໄປແດ່ ຈຶ່ງແກ້ໄດ້ຖືກຈຸດ
  throw new RuntimeException(
    "ຕໍ່ MySQL ບໍ່ໄດ້ (ຖານ '" . DB_NAME . "' ຜູ້ໃຊ້ '" . DB_USER . "')\n" .
    implode("\n", $tried) .
    "\n— ກວດ: XAMPP Start MySQL ແລ້ວບໍ? import database.sql ແລ້ວບໍ? " .
    "ຖ້າພອດ/ລະຫັດຜ່ານຄົນລະອັນ ໃຫ້ສ້າງ api/config.local.php ທັບຄ່າ"
  );
}
