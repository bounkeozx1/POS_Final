<?php
/* ============================================================
   api/upload.php — ຮັບຮູບເມນູຈາກໜ້າ admin
   ------------------------------------------------------------
   ຂອງເກົ່າ: ໜ້າ admin ຝັງຮູບເປັນ data URL (base64) ໃສ່ໃນ JSON ຂອງ
   ເມນູທັງໝົດ ແລ້ວ POST ຂຶ້ນມາທຸກຄັ້ງທີ່ບັນທຶກ — ພໍມີຮູບຫຼາຍໆອັນ
   ຂໍ້ມູນຈະໃຫຍ່ຈົນເກີນ post_max_size ຂອງ PHP ຫຼື ຍາວເກີນຄໍລຳ img
   → ບັນທຶກລົ້ມທັງກ້ອນ ແລະ ຮູບບໍ່ເຄີຍລົງຖານຂໍ້ມູນຈິງ.

   ຂອງໃໝ່: ອັບໂຫຼດເປັນ "ໄຟລ໌" ໄປໄວ້ images/menu/ ແລ້ວເກັບແຕ່
   "ເສັ້ນທາງ" ສັ້ນ ໆ ລົງ tbl_product.img → ຢູ່ຄົງທົນ ເປີດຈາກເຄື່ອງໃດກໍ່ເຫັນ.

   POST multipart/form-data  field: image
   ຕອບ  {ok:true, path:"images/menu/xxx.jpg"}  ຫຼື  {ok:false, error:"..."}

   ໝາຍເຫດຄວາມປອດໄພ: ລະບົບນີ້ກວດສິດຜູ້ໃຊ້ຢູ່ຝັ່ງເບຣົາເຊີ (ບໍ່ມີ session
   ຝັ່ງເຊີບເວີ) ຈຶ່ງບໍ່ມີການກວດສິດຢູ່ຈຸດນີ້ໄດ້ — ໃຫ້ໃຊ້ພາຍໃນເຄືອຂ່າຍຮ້ານ
   ເທົ່ານັ້ນ. ສິ່ງທີ່ກວດໄດ້ ແລະ ກວດແລ້ວ: ຕ້ອງເປັນຮູບຈິງ, ນາມສະກຸນທີ່ອະນຸຍາດ,
   ຊື່ໄຟລ໌ຕັ້ງໂດຍເຊີບເວີ (ບໍ່ເຊື່ອຊື່ທີ່ສົ່ງມາ), ແລະ ຈຳກັດຂະໜາດ.
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const MAX_BYTES = 4194304;   // 4 MB — ຮູບທີ່ຜ່ານການຫຍໍ້ຈາກໜ້າ admin ນ້ອຍກວ່ານີ້ຫຼາຍ

function out($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}
function bad($msg, $code = 400) { out(['ok' => false, 'error' => $msg], $code); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') bad('ຕ້ອງເປັນ POST', 405);

// ໄຟລ໌ໃຫຍ່ກວ່າ post_max_size → PHP ຖິ້ມ body ຖິ້ມໝົດ ($_FILES ວ່າງເປົ່າ)
if (empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
  bad('ໄຟລ໌ໃຫຍ່ເກີນທີ່ເຊີບເວີຮັບໄດ້ (post_max_size = ' . ini_get('post_max_size') . ')', 413);
}
if (!isset($_FILES['image'])) bad('ບໍ່ພົບໄຟລ໌ຮູບ (field: image)');

$f = $_FILES['image'];
if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE) {
  bad('ໄຟລ໌ໃຫຍ່ເກີນ (upload_max_filesize = ' . ini_get('upload_max_filesize') . ')', 413);
}
if ($f['error'] !== UPLOAD_ERR_OK) bad('ອັບໂຫຼດບໍ່ສຳເລັດ (code ' . $f['error'] . ')');
if ($f['size'] <= 0)              bad('ໄຟລ໌ວ່າງເປົ່າ');
if ($f['size'] > MAX_BYTES)       bad('ຮູບໃຫຍ່ເກີນ 4 MB', 413);
if (!is_uploaded_file($f['tmp_name'])) bad('ໄຟລ໌ບໍ່ຖືກຕ້ອງ');

// ເຊື່ອ "ເນື້ອໃນ" ຂອງໄຟລ໌ ບໍ່ແມ່ນ Content-Type ຫຼື ນາມສະກຸນທີ່ເບຣົາເຊີສົ່ງມາ
$info = @getimagesize($f['tmp_name']);
$extOf = [
  IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png',
  IMAGETYPE_GIF  => 'gif', IMAGETYPE_WEBP => 'webp',
];
if (!$info || !isset($extOf[$info[2]])) bad('ໄຟລ໌ນີ້ບໍ່ແມ່ນຮູບພາບ (ຮັບ jpg / png / gif / webp)');

$dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'menu';
if (!is_dir($dir) && !@mkdir($dir, 0777, true)) bad('ສ້າງໂຟນເດີ images/menu ບໍ່ໄດ້', 500);
if (!is_writable($dir)) bad('ໂຟນເດີ images/menu ຂຽນບໍ່ໄດ້ — ກວດສິດຂອງໂຟນເດີ', 500);

// ຊື່ໄຟລ໌ຕັ້ງເອງທັງໝົດ — ບໍ່ເອົາຊື່ຈາກຜູ້ໃຊ້ມາໃຊ້ ເພື່ອກັນເສັ້ນທາງແປກ ໆ
try { $rand = bin2hex(random_bytes(4)); }
catch (Throwable $e) { $rand = substr(md5(uniqid('', true)), 0, 8); }
$name = 'p' . date('Ymd_His') . '_' . $rand . '.' . $extOf[$info[2]];

if (!move_uploaded_file($f['tmp_name'], $dir . DIRECTORY_SEPARATOR . $name)) {
  bad('ບັນທຶກໄຟລ໌ລົງ images/menu ບໍ່ໄດ້', 500);
}

// ເສັ້ນທາງແບບ relative ຈາກ root ຂອງແອັບ — ໃຊ້ໄດ້ທັງ admin.html ແລະ index.html
out(['ok' => true, 'path' => 'images/menu/' . $name]);
