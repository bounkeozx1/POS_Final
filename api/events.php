<?php
/* ============================================================
   api/events.php — Realtime push (Server-Sent Events)
   ------------------------------------------------------------
   ຂອງເກົ່າ: ທຸກໜ້າຈໍ "ຖາມ" ເຊີບເວີທຸກ 5 ວິນາທີ ວ່າມີຫຍັງໃໝ່ບໍ່
     • ຊ້າ — ກົດແລ້ວອີກຈໍຕ້ອງລໍເຖິງ 5 ວິນາທີ
     • ຢຸດເຮັດວຽກເມື່ອແທັບຢູ່ເບື້ອງຫຼັງ (document.hidden) → ຕ້ອງກົດ F5 ເອງ
     • ໜັກ — ດຶງຂໍ້ມູນທັງໝົດທຸກຮອບ ເຖິງແມ່ນບໍ່ມີຫຍັງປ່ຽນ

   ຂອງໃໝ່: ເຊີບເວີ "ບອກ" ໜ້າຈໍເອງທັນທີທີ່ຂໍ້ມູນປ່ຽນ
     ວົນກວດຕາຕະລາງ tbl_revision (11 ແຖວ) ທຸກ 400ms — ເບົາຫຼາຍ
     ປ່ຽນເມື່ອໃດ ຈຶ່ງອ່ານສະເພາະ store ນັ້ນ ແລ້ວສົ່ງລົງໄປ

   ຂໍ້ຄວາມທີ່ສົ່ງ:
     event: sync   data: {"stores":{"orders":[...]},"revs":{...}}
     event: ping   data: {"t":...}          ← ກັນ proxy/ເບຣົາເຊີຕັດສາຍ

   ພາລາມິເຕີ: ?revs={"orders":12,...}  ບອກວ່າໜ້າຈໍມີຂໍ້ມູນລຸ້ນໃດຢູ່ແລ້ວ
   (Db.js ສົ່ງມາໃຫ້ຫຼັງ bootstrap → ບໍ່ຕ້ອງສົ່ງຂໍ້ມູນຊ້ຳຕອນຕໍ່ສາຍ)
   ============================================================ */

require __DIR__ . '/config.php';
require __DIR__ . '/store.php';

/* ---- ຢ່າໃຫ້ຫຍັງມາ buffer ຫຼື ບີບອັດ stream ນີ້ --------------
   ຖ້າ output ຖືກເກັບໄວ້ໃນ buffer ຂໍ້ຄວາມຈະບໍ່ອອກໄປຫາເບຣົາເຊີ
   ຈົນກວ່າຈະຈົບ request — ຊຶ່ງເທົ່າກັບ realtime ໃຊ້ບໍ່ໄດ້ເລີຍ */
@ini_set('zlib.output_compression', '0');
@ini_set('output_buffering', '0');
@ini_set('implicit_flush', '1');
if (function_exists('apache_setenv')) { @apache_setenv('no-gzip', '1'); }
while (ob_get_level() > 0) ob_end_clean();
ignore_user_abort(true);   // ຮູ້ເອງວ່າສາຍຂາດ ດ້ວຍ connection_aborted()
@set_time_limit(0);

header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Accel-Buffering: no');            // ກັນ nginx/proxy buffer
header('Connection: keep-alive');

/* ອາຍຸສາຍສູງສຸດ — ຕັດແລ້ວໃຫ້ເບຣົາເຊີຕໍ່ໃໝ່ເອງ (EventSource ຕໍ່ອັດຕະໂນມັດ)
   ເຫດຜົນ: Apache ຝັ່ງ Windows ໃຊ້ 1 thread ຕໍ່ 1 ສາຍ — ບໍ່ປ່ອຍໃຫ້ຄ້າງຕະຫຼອດ */
const MAX_LIFETIME = 50;     // ວິນາທີ
const TICK_US      = 400000; // 0.4 ວິນາທີ
const PING_EVERY   = 15;     // ວິນາທີ

function send($event, $payload) {
  echo "event: $event\n";
  echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n\n";
  @ob_flush();
  flush();
}

// ບອກເບຣົາເຊີວ່າ ຖ້າສາຍຂາດ ໃຫ້ລໍ 1 ວິນາທີແລ້ວຕໍ່ໃໝ່
echo "retry: 1000\n\n";
@ob_flush(); flush();

try {
  $pdo = db();

  // ໜ້າຈໍບອກມາວ່າມີລຸ້ນໃດຢູ່ແລ້ວ — ບໍ່ຮູ້ກໍ່ຖືວ່າຍັງບໍ່ມີຫຍັງເລີຍ
  $known = [];
  if (isset($_GET['revs'])) {
    $tmp = json_decode($_GET['revs'], true);
    if (is_array($tmp)) foreach ($tmp as $k => $v) $known[$k] = (int)$v;
  }

  $started  = time();
  $lastPing = time();

  while (true) {
    if (connection_aborted()) break;
    if (time() - $started >= MAX_LIFETIME) break;

    $revs    = readRevs($pdo);
    $changed = [];
    foreach ($revs as $store => $rev) {
      if (!isset($known[$store]) || $known[$store] !== $rev) $changed[] = $store;
    }

    if ($changed) {
      $stores = [];
      foreach ($changed as $s) $stores[$s] = readStore($pdo, $s);
      foreach ($changed as $s) $known[$s] = $revs[$s];
      send('sync', ['stores' => $stores, 'revs' => $known]);
      $lastPing = time();
    } elseif (time() - $lastPing >= PING_EVERY) {
      send('ping', ['t' => time()]);
      $lastPing = time();
    }

    usleep(TICK_US);
  }
} catch (Throwable $e) {
  send('fail', ['error' => $e->getMessage()]);
}

// ຈົບແບບສຸພາບ — ເບຣົາເຊີຈະຕໍ່ສາຍໃໝ່ເອງພາຍໃນ 1 ວິນາທີ
send('bye', ['reason' => 'rotate']);
