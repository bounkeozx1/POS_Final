-- ============================================================
-- POS The Ground Camp — Database Schema (MySQL / MariaDB / phpMyAdmin)
-- ໃຊ້ກັບ XAMPP:  ເປີດ phpMyAdmin → Import → ເລືອກໄຟລ໌ນີ້
--
-- ໄຟລ໌ນີ້ມີທັງ "ໂຄງສ້າງຕາຕະລາງ" ແລະ "ຂໍ້ມູນຕັ້ງຕົ້ນ" (master data:
-- ໝວດ, ໂຕະ, ຜູ້ໃຊ້, ວັດຖຸດິບ, ເມນູ) — ຢູ່ໃນ SQL ບ່ອນດຽວ.
-- ຝັ່ງ JavaScript ບໍ່ມີຂໍ້ມູນເມນູ/ຜູ້ໃຊ້ ຝັງໄວ້ອີກຕໍ່ໄປ ແລະ ບໍ່ seed ໃຫ້ເອງ.
-- ຕາຕະລາງທຸລະກຳ (ບິນຂາຍ, ສັ່ງຊື້, ນຳເຂົ້າ, log ສະຕັອກ) ເລີ່ມຕົ້ນ "ວ່າງ"
-- — ຂໍ້ມູນຈະເກີດຈາກການໃຊ້ງານຈິງເທົ່ານັ້ນ ບໍ່ມີບິນປອມ/ຂໍ້ມູນສຸ່ມ.
--
-- ຫຼັກການອອກແບບ (Referential Integrity):
--   • ຕາຕະລາງລາຍລະອຽດ (detail) ໃຊ້ ON DELETE CASCADE — ລຶບໃບ = ລຶບລາຍການ
--   • ຄີນອກທີ່ອ້າງອີງ master ໃຊ້ ON DELETE SET NULL ເພາະຕາຕະລາງທຸລະກຳ
--     ເກັບ "snapshot" ຊື່/ລາຄາ ໄວ້ແລ້ວ (name_json, table_code, product_name)
--     → ລຶບເມນູ/ໂຕະ/ຜູ້ໃຊ້ ບໍ່ເຮັດໃຫ້ບິນເກົ່າຫາຍ
--   • ວັນ-ເວລາ ເກັບເປັນ DATETIME ຕາມເວລາທ້ອງຖິ່ນຂອງຮ້ານ (Asia/Vientiane)
--     → ລາຍງານ SQL (GROUP BY DATE(created_at)) ຕົງກັບໃບບິນທີ່ລູກຄ້າໄດ້ຮັບ
-- ============================================================

CREATE DATABASE IF NOT EXISTS pos_ground_camp
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pos_ground_camp;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS tbl_sale_detail;
DROP TABLE IF EXISTS tbl_sale;
DROP TABLE IF EXISTS tbl_purchase_detail;
DROP TABLE IF EXISTS tbl_purchase;
DROP TABLE IF EXISTS tbl_import_detail;
DROP TABLE IF EXISTS tbl_import;
DROP TABLE IF EXISTS tbl_stock_log;
DROP TABLE IF EXISTS tbl_product;
DROP TABLE IF EXISTS tbl_material;
DROP TABLE IF EXISTS tbl_category;
DROP TABLE IF EXISTS tbl_table;
DROP TABLE IF EXISTS tbl_user;
DROP TABLE IF EXISTS tbl_setting;
SET FOREIGN_KEY_CHECKS = 1;

-- ຕາຕະລາງ 3.3 ຜູ້ໃຊ້ (tbl_user / D1) --------------------------
CREATE TABLE tbl_user (
  user_id    BIGINT       NOT NULL PRIMARY KEY COMMENT 'ລະຫັດຜູ້ໃຊ້',
  username   VARCHAR(50)  NOT NULL UNIQUE       COMMENT 'ຊື່ຜູ້ໃຊ້ Login',
  password   VARCHAR(255) NOT NULL              COMMENT 'ລະຫັດຜ່ານ (Hash)',
  full_name  VARCHAR(100) NOT NULL              COMMENT 'ຊື່-ນາມສະກຸນ',
  role       VARCHAR(20)  NOT NULL DEFAULT 'cashier' COMMENT 'admin / cashier',
  status     VARCHAR(20)  NOT NULL DEFAULT 'active'  COMMENT 'active / inactive',
  last_login DATETIME     NULL                   COMMENT 'ເຂົ້າໃຊ້ຄັ້ງລ່າສຸດ'
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.4 ປະເພດ (tbl_category / D2, D3) -------------------
CREATE TABLE tbl_category (
  cate_id   BIGINT       NOT NULL PRIMARY KEY COMMENT 'ລະຫັດປະເພດ',
  cate_name VARCHAR(50)  NOT NULL             COMMENT 'ຊື່ປະເພດຫຼັກ (ອາຫານ/ເຄື່ອງດື່ມ)',
  type      VARCHAR(20)  NOT NULL DEFAULT 'food' COMMENT 'food / drink',
  -- UNIQUE: ໃຊ້ເປັນ natural key ໃນການເຊື່ອມ tbl_product.cate_id
  cat_key   VARCHAR(30)  NOT NULL UNIQUE      COMMENT 'ລະຫັດໝວດ (rice/noodle/grill/drink/dessert)',
  name_lo   VARCHAR(100) NULL,
  name_th   VARCHAR(100) NULL,
  name_en   VARCHAR(100) NULL,
  name_zh   VARCHAR(100) NULL
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.9 ໂຕະ (tbl_table / D10) --------------------------
CREATE TABLE tbl_table (
  table_id   BIGINT      NOT NULL PRIMARY KEY COMMENT 'ລະຫັດໂຕະ',
  table_name VARCHAR(50) NOT NULL             COMMENT 'ເລກໂຕະ (T01...)',
  status     VARCHAR(20) NOT NULL DEFAULT 'free' COMMENT 'free / busy'
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.5 ສິນຄ້າ/ເມນູ (tbl_product / D4, D5) -------------
CREATE TABLE tbl_product (
  prod_id   BIGINT        NOT NULL PRIMARY KEY COMMENT 'ລະຫັດສິນຄ້າ',
  name_lo   VARCHAR(150)  NULL,
  name_th   VARCHAR(150)  NULL,
  name_en   VARCHAR(150)  NULL,
  name_zh   VARCHAR(150)  NULL,
  desc_lo   VARCHAR(500)  NULL,
  desc_th   VARCHAR(500)  NULL,
  desc_en   VARCHAR(500)  NULL,
  desc_zh   VARCHAR(500)  NULL,
  cat_key   VARCHAR(30)   NULL              COMMENT 'ໝວດ (rice/noodle/...)',
  cate_id   BIGINT        NULL              COMMENT 'Link → tbl_category',
  price     DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'ລາຄາຂາຍ',
  qty_stock INT           NOT NULL DEFAULT 0 COMMENT 'ຈຳນວນຄົງເຫຼືອ',
  emoji     VARCHAR(16)   NULL,
  -- MEDIUMTEXT ບໍ່ແມ່ນ VARCHAR(255): ຮູບທີ່ອັບໂຫຼດຈາກໜ້າ admin ຖືກເກັບເປັນ
  -- data URL (base64) ຍາວຫຼາຍໝື່ນຕົວອັກສອນ — VARCHAR(255) ຈະຕັດຖິ້ມແບບງຽບໆ
  -- ເຮັດໃຫ້ຮູບເສຍ ເມື່ອເປີດຈາກເຄື່ອງອື່ນ ຫຼື ຫຼັງລ້າງ browser
  img       MEDIUMTEXT    NULL              COMMENT 'ເສັ້ນທາງຮູບ ຫຼື data URL (base64)',
  status    VARCHAR(20)   NOT NULL DEFAULT 'active' COMMENT 'active / soldout',
  INDEX idx_product_cat_key (cat_key),
  CONSTRAINT fk_product_category FOREIGN KEY (cate_id)
    REFERENCES tbl_category (cate_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ວັດຖຸດິບ (tbl_material / D13) -------------------------------
CREATE TABLE tbl_material (
  mat_id    BIGINT       NOT NULL PRIMARY KEY COMMENT 'ລະຫັດວັດຖຸດິບ',
  name_lo   VARCHAR(150) NULL,
  name_th   VARCHAR(150) NULL,
  name_en   VARCHAR(150) NULL,
  name_zh   VARCHAR(150) NULL,
  unit      VARCHAR(30)  NULL              COMMENT 'ໜ່ວຍ (kg, ຂວດ...)',
  qty_stock INT          NOT NULL DEFAULT 0,
  min_stock INT          NOT NULL DEFAULT 0 COMMENT 'ຈຳນວນຕ່ຳສຸດເຕືອນ'
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.10 ການຂາຍ (tbl_sale / D11) ----------------------
CREATE TABLE tbl_sale (
  sale_id        BIGINT        NOT NULL PRIMARY KEY COMMENT 'ລະຫັດການຂາຍ / ເລກບິນ',
  order_num      VARCHAR(30)   NULL              COMMENT 'ເລກອໍເດີ',
  table_id       BIGINT        NULL              COMMENT 'ລະຫັດໂຕະ',
  table_code     VARCHAR(20)   NULL              COMMENT 'ເລກໂຕະ (snapshot)',
  subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_amt        DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'ພາສີ VAT',
  total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'ຍອດລວມສຸດທິ',
  payment_method VARCHAR(20)   NULL              COMMENT 'cash / qr',
  status         VARCHAR(20)   NOT NULL DEFAULT 'pending' COMMENT 'pending/cooking/done/cancel',
  source         VARCHAR(20)   NULL              COMMENT 'self-order / pos',
  user_id        BIGINT        NULL,
  created_at     DATETIME      NULL              COMMENT 'ເວລາສ້າງບິນ (ເວລາທ້ອງຖິ່ນ)',
  updated_at     DATETIME      NULL,
  INDEX idx_sale_created (created_at),
  INDEX idx_sale_status  (status),
  CONSTRAINT fk_sale_table FOREIGN KEY (table_id)
    REFERENCES tbl_table (table_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sale_user FOREIGN KEY (user_id)
    REFERENCES tbl_user (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.11 ລາຍລະອຽດການຂາຍ (tbl_sale_detail / D12) -------
CREATE TABLE tbl_sale_detail (
  sd_id     BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sale_id   BIGINT        NOT NULL              COMMENT 'Link → tbl_sale',
  prod_id   BIGINT        NULL                  COMMENT 'ລະຫັດສິນຄ້າ',
  -- TEXT: ຊື່ 4 ພາສາ ພາສາລະ 150 ຕົວ ອາດເກີນ 500 ໄດ້ → ເຄີຍຖືກຕັດຖິ້ມ
  name_json TEXT          NULL                  COMMENT 'ຊື່ສິນຄ້າ 4 ພາສາ (JSON snapshot)',
  emoji     VARCHAR(16)   NULL,
  qty       INT           NOT NULL DEFAULT 1,
  price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX (sale_id),
  INDEX (prod_id),
  CONSTRAINT fk_sd_sale FOREIGN KEY (sale_id)
    REFERENCES tbl_sale (sale_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sd_product FOREIGN KEY (prod_id)
    REFERENCES tbl_product (prod_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.6 ການສັ່ງຊື້ (tbl_purchase / D6) -----------------
CREATE TABLE tbl_purchase (
  pur_id     BIGINT        NOT NULL PRIMARY KEY COMMENT 'ລະຫັດການສັ່ງຊື້',
  pur_date   DATETIME      NULL              COMMENT 'ວັນທີສັ່ງຊື້',
  total_bill DECIMAL(12,2) NOT NULL DEFAULT 0,
  user_id    BIGINT        NULL,
  user_name  VARCHAR(100)  NULL              COMMENT 'ຊື່ຜູ້ສັ່ງ (snapshot)',
  status     VARCHAR(20)   NOT NULL DEFAULT 'pending' COMMENT 'pending / imported',
  INDEX idx_purchase_date (pur_date),
  CONSTRAINT fk_purchase_user FOREIGN KEY (user_id)
    REFERENCES tbl_user (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.7 ລາຍລະອຽດການສັ່ງຊື້ (tbl_purchase_detail / D7) --
CREATE TABLE tbl_purchase_detail (
  pd_id     BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pur_id    BIGINT        NOT NULL              COMMENT 'Link → tbl_purchase',
  kind      VARCHAR(20)   NULL                  COMMENT 'drink / material',
  ref_id    BIGINT        NULL                  COMMENT 'ລະຫັດສິນຄ້າ/ວັດຖຸດິບ',
  item_name VARCHAR(200)  NULL,
  qty       INT           NOT NULL DEFAULT 1,
  price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX (pur_id),
  CONSTRAINT fk_pd_purchase FOREIGN KEY (pur_id)
    REFERENCES tbl_purchase (pur_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ຕາຕະລາງ 3.8 ການນຳເຂົ້າ (tbl_import / D8, D9) --------------
CREATE TABLE tbl_import (
  imp_id    BIGINT        NOT NULL PRIMARY KEY COMMENT 'ລະຫັດການນຳເຂົ້າ',
  imp_date  DATETIME      NULL              COMMENT 'ວັນທີນຳເຂົ້າ',
  pur_id    BIGINT        NULL              COMMENT 'ອ້າງອີງໃບສັ່ງຊື້',
  total     DECIMAL(12,2) NOT NULL DEFAULT 0,
  user_id   BIGINT        NULL,
  user_name VARCHAR(100)  NULL              COMMENT 'ຊື່ຜູ້ນຳເຂົ້າ (snapshot)',
  INDEX idx_import_date (imp_date),
  CONSTRAINT fk_import_purchase FOREIGN KEY (pur_id)
    REFERENCES tbl_purchase (pur_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_import_user FOREIGN KEY (user_id)
    REFERENCES tbl_user (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tbl_import_detail (
  id_       BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  imp_id    BIGINT        NOT NULL,
  kind      VARCHAR(20)   NULL,
  ref_id    BIGINT        NULL,
  item_name VARCHAR(200)  NULL,
  qty       INT           NOT NULL DEFAULT 1,
  price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX (imp_id),
  CONSTRAINT fk_id_import FOREIGN KEY (imp_id)
    REFERENCES tbl_import (imp_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ບັນທຶກສະຕັອກ (tbl_stock_log) -------------------------------
-- ລາຍການໜຶ່ງອາດເປັນ "ສິນຄ້າ" ຫຼື "ວັດຖຸດິບ" — ຈຶ່ງແຍກເປັນ 2 ຄໍລຳ
-- (ໃສ່ໄດ້ຄໍລຳດຽວ) ເພື່ອໃຫ້ຜູກ FOREIGN KEY ໄປຫາຕາຕະລາງທີ່ຖືກຕ້ອງໄດ້ຈິງ
CREATE TABLE tbl_stock_log (
  log_id       BIGINT       NOT NULL PRIMARY KEY,
  product_id   BIGINT       NULL COMMENT 'ອ້າງອີງ tbl_product (ຖ້າເປັນສິນຄ້າ)',
  mat_id       BIGINT       NULL COMMENT 'ອ້າງອີງ tbl_material (ຖ້າເປັນວັດຖຸດິບ)',
  product_name VARCHAR(200) NULL COMMENT 'ຊື່ລາຍການ (snapshot)',
  type         VARCHAR(20)  NULL COMMENT 'in / out / adjust',
  qty          INT          NOT NULL DEFAULT 0,
  note         VARCHAR(255) NULL,
  log_date     DATETIME     NULL,
  INDEX idx_stocklog_date (log_date),
  INDEX (product_id),
  INDEX (mat_id),
  CONSTRAINT fk_stocklog_product FOREIGN KEY (product_id)
    REFERENCES tbl_product (prod_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_stocklog_material FOREIGN KEY (mat_id)
    REFERENCES tbl_material (mat_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ຕົວນັບ revision ສຳລັບ realtime (tbl_revision) ---------------
-- ທຸກຄັ້ງທີ່ບັນທຶກສຳເລັດ api/index.php ຈະ +1 ໃສ່ແຖວຂອງ store ນັ້ນ
-- api/events.php (SSE) ເຝົ້າເບິ່ງຕາຕະລາງນີ້ ແລ້ວ push ຂໍ້ມູນໃໝ່ລົງໄປ
-- ຫາທຸກໜ້າຈໍທັນທີ — ບໍ່ຕ້ອງກົດ F5 ແລະ ບໍ່ຕ້ອງດຶງຂໍ້ມູນທັງໝົດທຸກ 5 ວິນາທີ
DROP TABLE IF EXISTS tbl_revision;
CREATE TABLE tbl_revision (
  store VARCHAR(30) NOT NULL PRIMARY KEY COMMENT 'ຊື່ store (products/orders/...)',
  rev   BIGINT      NOT NULL DEFAULT 1   COMMENT 'ເພີ່ມຂຶ້ນທຸກຄັ້ງທີ່ຂໍ້ມູນປ່ຽນ'
) ENGINE=InnoDB;

-- ຕັ້ງຄ່າຮ້ານ + counter (tbl_setting) ------------------------
CREATE TABLE tbl_setting (
  setting_id     INT          NOT NULL PRIMARY KEY DEFAULT 1,
  store_name     VARCHAR(100) NULL,
  phone          VARCHAR(50)  NULL,
  address        VARCHAR(255) NULL,
  vat_pct        INT          NOT NULL DEFAULT 7,
  currency       VARCHAR(10)  NULL,
  receipt_header VARCHAR(150) NULL,
  receipt_footer VARCHAR(150) NULL,
  order_num      INT          NOT NULL DEFAULT 1001 COMMENT 'ຕົວນັບເລກອໍເດີ'
) ENGINE=InnoDB;


-- ============================================================
-- ຂໍ້ມູນຕັ້ງຕົ້ນ (master data) — ຂອງຈິງຂອງຮ້ານ
-- ລຳດັບສຳຄັນ: ຕາຕະລາງແມ່ກ່ອນ ຕາຕະລາງລູກ (ຕິດ FOREIGN KEY)
-- ============================================================

-- ຕັ້ງຄ່າຮ້ານ ------------------------------------------------
INSERT INTO tbl_setting
  (setting_id, store_name, phone, address, vat_pct, currency, receipt_header, receipt_footer, order_num)
VALUES
  (1, 'The Ground Camp', '020 xxxx xxxx',
   'ບ້ານໂພນປາເປົ່າ, ເມືອງໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
   7, 'LAK', 'The Ground Camp', 'ຂອບໃຈທີ່ໃຊ້ບໍລິການ 🙏', 1001);

-- ໝວດສິນຄ້າ (tbl_category) ----------------------------------
INSERT INTO tbl_category (cate_id, cate_name, type, cat_key, name_lo, name_th, name_en, name_zh) VALUES
  (1, 'ອາຫານ',       'food',  'rice',    'ເຂົ້າ',       'ข้าว',        'Rice',    '米饭'),
  (2, 'ອາຫານ',       'food',  'noodle',  'ເຝີ/ກ໋ວຍ',    'เฝอ/ก๋วย',    'Noodles', '面条'),
  (3, 'ອາຫານ',       'food',  'grill',   'ປີ້ງ',        'ปิ้ง',        'Grilled', '烤制'),
  (4, 'ເຄື່ອງດື່ມ',  'drink', 'drink',   'ເຄື່ອງດື່ມ',  'เครื่องดื่ม', 'Drinks',  '饮品'),
  (5, 'ອາຫານ',       'food',  'dessert', 'ຂອງຫວານ',    'ของหวาน',     'Dessert', '甜点');

-- ໂຕະ (tbl_table) -------------------------------------------
INSERT INTO tbl_table (table_id, table_name, status) VALUES
  (1, 'T01', 'free'), (2, 'T02', 'free'), (3, 'T03', 'free'),
  (4, 'T04', 'free'), (5, 'T05', 'free'), (6, 'T06', 'free');

-- ຜູ້ໃຊ້ (tbl_user) -----------------------------------------
-- password = SHA-256 + salt ສະເພາະຄົນ + ວົນຊ້ຳ 1,000 ຮອບ  →  s1$<salt>$<hash>
-- ທັງສອງບັນຊີໃຊ້ລະຫັດ "1234" ແຕ່ຄ່າ hash ຕ່າງກັນ ເພາະ salt ຄົນລະອັນ
INSERT INTO tbl_user (user_id, username, password, full_name, role, status, last_login) VALUES
  (1, 'admin',
      's1$93f82fcacedc22c3d725f7229d3c35fe$4ffb1ba4caabcf6d04fb80f18b17934a5d6d3cb25f7748ab2711f994c64ca1f5',
      'Admin User', 'admin', 'active', NULL),
  (2, 'cashier',
      's1$2874a93f914842d2e3ad32d8bd57641d$320b765df1a6ab98d66c3a7e740f232fc22d680cf1b82b234b4b0075ab411608',
      'Cashier 1', 'cashier', 'active', NULL);

-- ວັດຖຸດິບ (tbl_material) -----------------------------------
INSERT INTO tbl_material (mat_id, name_lo, name_th, name_en, name_zh, unit, qty_stock, min_stock) VALUES
  (1, 'ຊີ້ນໝູ',      'เนื้อหมู',   'Pork',        '猪肉',   'kg',   20,  5),
  (2, 'ຊີ້ນໄກ່',     'เนื้อไก่',   'Chicken',     '鸡肉',   'kg',   15,  5),
  (3, 'ເຂົ້າສານ',    'ข้าวสาร',    'Rice grain',  '大米',   'kg',   50, 10),
  (4, 'ຜັກລວມ',      'ผักรวม',     'Vegetables',  '蔬菜',   'kg',   10,  3),
  (5, 'ນ້ຳມັນພືດ',   'น้ำมันพืช',  'Cooking oil', '食用油', 'ຂວດ',  12,  4);

-- ເມນູ (tbl_product) ----------------------------------------
-- img: ເສັ້ນທາງຮູບໃນໂຟນເດີ images/menu/ — ລາຍການທີ່ຍັງບໍ່ມີໄຟລ໌ຮູບ ໃສ່ NULL
--      ໜ້າຈໍຈະສະແດງ emoji ແທນ (ບໍ່ໃຫ້ຮູບແຕກ)
-- cate_id ບໍ່ຕ້ອງໃສ່ມື — ຜູກຈາກ cat_key ດ້ວຍ UPDATE ຂ້າງລຸ່ມ
INSERT INTO tbl_product
  (prod_id, name_lo, name_th, name_en, name_zh,
   desc_lo, desc_th, desc_en, desc_zh, cat_key, price, qty_stock, emoji, img, status) VALUES
  (1,  'ຂ້າວໜຽວ',   'ข้าวเหนียว', 'Sticky Rice',       '糯米饭',
       'ຂ້າວໜຽວຫຸງສຸກ',      'ข้าวเหนียวหุงสุก',   'Steamed sticky rice',           '蒸糯米饭',
       'rice',    5000,  99, '🍚', 'images/menu/01_sticky_rice.jpg',     'active'),
  (2,  'ຂ້າວຜັດ',    'ข้าวผัด',    'Fried Rice',        '炒饭',
       'ຜັດໄຂ່ ຜັກ ສົດ',     'ผัดไข่ ผัก สด',      'Egg & vegetable fried rice',    '鸡蛋蔬菜炒饭',
       'rice',   35000,  50, '🍳', 'images/menu/02_fried_rice.jpg',      'active'),
  (3,  'ຂ້າວໝູ',     'ข้าวหมู',    'Pork Rice',         '猪肉饭',
       'ຂ້າວໝູແດງ ຊອດ',      'ข้าวหมูแดง ซอส',     'BBQ pork over rice',            '叉烧饭配酱汁',
       'rice',   30000,  40, '🥩', 'images/menu/03_pork_rice.jpg',       'active'),
  (4,  'ລາບໝູ',      'ลาบหมู',     'Pork Laab',         '猪肉拉帕',
       'ດິບ / ສຸກ',           'ดิบ / สุก',          'Raw or cooked style',           '生/熟皆可',
       'rice',   40000,  30, '🥗', 'images/menu/04_pork_laab.jpg',       'active'),
  (5,  'ຕົ້ມຍຳ',     'ต้มยำ',      'Tom Yum',           '冬阴功',
       'ກຸ້ງ ເຜັດຮ້ອນ',       'กุ้ง เผ็ดร้อน',      'Spicy shrimp soup',             '辣虾汤',
       'rice',   50000,  25, '🦐', 'images/menu/05_tom_yum.jpg',         'active'),
  (6,  'ເຝີໄກ່',     'เฝอไก่',     'Chicken Pho',       '鸡肉河粉',
       'ນ້ຳສຸບໄກ່ ເສັ້ນໃຫຍ່', 'น้ำซุปไก่ เส้นใหญ่', 'Chicken broth noodle soup',     '鸡汤宽粉',
       'noodle', 25000,  35, '🍜', 'images/menu/06_chicken_pho.jpg',     'active'),
  (7,  'ກ໋ວຍຈັ໊ບ',   'ก๋วยจั๊บ',   'Kuay Jab',          '卷粉汤',
       'ເສັ້ນໃຫຍ່ ໝູ ໄຂ່',    'เส้นใหญ่ หมู ไข่',   'Wide noodle pork soup',         '宽粉猪肉汤',
       'noodle', 30000,   5, '🍲', 'images/menu/07_kuay_jab.jpg',        'active'),
  (8,  'ໄກ່ຍ່າງ',    'ไก่ย่าง',    'Grilled Chicken',   '烤鸡',
       'ໄກ່ຍ່າງຟືນ ຊອດ',      'ไก่ย่างฟืน ซอส',     'Wood-fired grilled chicken',    '柴火烤鸡配酱汁',
       'grill',  45000,  20, '🍗', 'images/menu/08_grilled_chicken.jpg', 'active'),
  (9,  'ປາຕົ້ມ',     'ปลาต้ม',     'Steamed Fish',      '清蒸鱼',
       'ເຄື່ອງຈ້ຳ ຫອມ',       'เครื่องจิ้ม หอม',    'Steamed fish with herbs',       '香草蒸鱼',
       'grill',  60000,   3, '🐟', 'images/menu/09_steamed_fish.jpg',    'soldout'),
  (10, 'ເບຍລາວ',     'เบียลาว',    'Beerlao',           '老挝啤酒',
       'ຂວດ 640ml ເຢັນ',      'ขวด 640ml เย็น',     '640ml bottle chilled',          '640ml冰镇瓶装',
       'drink',  20000,  80, '🍺', NULL,                                 'active'),
  (11, 'ນ້ຳໝາກໄມ້',  'น้ำผลไม้',   'Fruit Juice',       '果汁',
       'ສົ້ມ / ໝາກນາວ ເຢັນ',  'ส้ม / มะนาว เย็น',   'Orange / lime, chilled',        '橙汁/柠檬汁冰镇',
       'drink',  15000,  60, '🧃', 'images/menu/11_fruit_juice.jpg',     'active'),
  (12, 'ນ້ຳດ່ຽວ',    'น้ำดื่ม',    'Water',             '饮用水',
       'ນ້ຳເຢັນ 600ml',        'น้ำเย็น 600ml',      'Cold water 600ml',              '冰水600ml',
       'drink',   5000, 100, '💧', NULL,                                 'active'),
  (13, 'ຂ້າວໜົມ',    'ข้าวหนม',    'Rice Cake',         '米糕',
       'ຂ້າວໜົມຫໍ່ ງາ',       'ข้าวหนมห่อ งา',      'Wrapped rice cake, sesame',     '芝麻糯米糕',
       'dessert', 8000,  15, '🍡', 'images/menu/13_rice_cake.jpg',       'active'),
  (14, 'ຂ້າວຕົ້ມ',   'ข้าวต้ม',    'Rice Porridge',     '米粥',
       'ຂ້າວຕົ້ມ ໝາກພ້າວ',    'ข้าวต้ม มะพร้าว',    'Coconut rice porridge',         '椰汁米粥',
       'dessert', 12000,   0, '🧆', 'images/menu/14_rice_porridge.jpg',  'soldout');

-- ຜູກຄີນອກ tbl_product.cate_id ຈາກ cat_key (ຄືກັບທີ່ api/index.php ເຮັດ)
UPDATE tbl_product p
  LEFT JOIN tbl_category c ON c.cat_key = p.cat_key
  SET p.cate_id = c.cate_id;

-- ຕາຕະລາງທຸລະກຳ (tbl_sale, tbl_purchase, tbl_import, tbl_stock_log)
-- ຕັ້ງໃຈປ່ອຍໃຫ້ວ່າງ — ຂໍ້ມູນຕ້ອງມາຈາກການໃຊ້ງານຈິງເທົ່ານັ້ນ
