/* ============================================================
   i18n.js — Language System (ລາວ | ไทย | English | 中文)
   v4 — FULL Admin + Customer support, all aliases included
   ============================================================ */
const i18n = (() => {
  const LANGS = [
    { code:'lo', label:'ລາວ', flag:'🇱🇦' },
    { code:'th', label:'ไทย', flag:'🇹🇭' },
    { code:'en', label:'EN',  flag:'🇬🇧' },
    { code:'zh', label:'中文',flag:'🇨🇳' },
  ];

  const T = {
    /* ── Common ── */
    'app.name':          { lo:'ຮ້ານອາຫານລາວ',    th:'ร้านอาหารลาว',      en:'Lao Restaurant',    zh:'老挝餐厅'   },
    'btn.save':          { lo:'ບັນທຶກ',            th:'บันทึก',             en:'Save',              zh:'保存'       },
    'btn.cancel':        { lo:'ຍົກເລີກ',           th:'ยกเลิก',             en:'Cancel',            zh:'取消'       },
    'btn.delete':        { lo:'ລຶບ',               th:'ลบ',                 en:'Delete',            zh:'删除'       },
    'btn.edit':          { lo:'ແກ້ໄຂ',             th:'แก้ไข',              en:'Edit',              zh:'编辑'       },
    'btn.close':         { lo:'ປິດ',               th:'ปิด',                en:'Close',             zh:'关闭'       },
    'btn.confirm':       { lo:'ຢືນຢັນ',            th:'ยืนยัน',             en:'Confirm',           zh:'确认'       },
    'btn.add':           { lo:'ເພີ່ມ',              th:'เพิ่ม',              en:'Add',               zh:'添加'       },
    'btn.refresh':       { lo:'ໂຫຼດໃໝ່',           th:'รีเฟรช',             en:'Refresh',           zh:'刷新'       },
    'currency':          { lo:'ກີບ',               th:'ກີບ',                en:'LAK',               zh:'基普'       },
    'vat.label':         { lo:'VAT 7%',            th:'VAT 7%',             en:'VAT 7%',            zh:'增值税7%'   },

    /* ── Status ── */
    'status.pending':    { lo:'ລໍຖ້າ',             th:'รอดำเนินการ',        en:'Pending',           zh:'待处理'     },
    'status.cooking':    { lo:'ກຳລັງປຸງ',          th:'กำลังปรุง',          en:'Cooking',           zh:'烹饪中'     },
    'status.done':       { lo:'ສຳເລັດ',            th:'สำเร็จ',             en:'Done',              zh:'完成'       },
    'status.cancel':     { lo:'ຍົກເລີກ',           th:'ยกเลิก',             en:'Cancelled',         zh:'已取消'     },

    /* ── Categories (with emoji for <option>) ── */
    'cat.all':           { lo:'🍽️ ທັງໝົດ',        th:'🍽️ ทั้งหมด',        en:'🍽️ All',            zh:'🍽️ 全部'       },
    'cat.rice':          { lo:'🍚 ຂ້າວ',           th:'🍚 ข้าว',            en:'🍚 Rice',           zh:'🍚 米饭'       },
    'cat.noodle':        { lo:'🍜 ເຝີ/ກ໋ວຍ',       th:'🍜 เฝอ/ก๋วย',        en:'🍜 Noodles',        zh:'🍜 面条'       },
    'cat.grill':         { lo:'🔥 ປີ້ງ',            th:'🔥 ปิ้ง',            en:'🔥 Grilled',        zh:'🔥 烤制'       },
    'cat.drink':         { lo:'🥤 ດື່ມ',            th:'🥤 ดื่ม',            en:'🥤 Drinks',         zh:'🥤 饮品'       },
    'cat.dessert':       { lo:'🍮 ຂອງຫວານ',        th:'🍮 ของหวาน',         en:'🍮 Dessert',        zh:'🍮 甜点'       },

    /* ── Order page (customer) ── */
    'order.search.ph':   { lo:'ຄົ້ນຫາເມນູ...',    th:'ค้นหาเมนู...',       en:'Search menu...',    zh:'搜索菜单...' },
    'order.soldout':     { lo:'ໝົດ',               th:'หมด',                en:'Sold Out',          zh:'售罄'       },
    'order.notfound':    { lo:'ບໍ່ພົບເມນູ',        th:'ไม่พบเมนู',          en:'No menu found',     zh:'未找到菜单'  },
    'order.location':    { lo:'ທີ່ຕັ້ງຮ້ານ',       th:'ที่ตั้งร้าน',         en:'Location',          zh:'位置'       },

    /* ── Nav ── */
    'nav.order':         { lo:'ສັ່ງ',              th:'สั่ง',               en:'Order',             zh:'点餐'       },
    'nav.myorders':      { lo:'ອໍ້ເດີຂ້ອຍ',        th:'ออร์เดอร์ของฉัน',    en:'My Orders',         zh:'我的订单'   },

    /* ── Cart ── */
    'cart.title':        { lo:'ລາຍການສັ່ງ',        th:'รายการสั่ง',         en:'Your Order',        zh:'订单'       },
    'cart.empty':        { lo:'ຍັງບໍ່ມີລາຍການ',   th:'ยังไม่มีรายการ',     en:'Cart is empty',     zh:'购物车为空'  },
    'cart.empty.sub':    { lo:'ກາລຸນາເລືອກ',      th:'กรุณาเลือกอาหาร',    en:'Please select items',zh:'请选择菜品'  },
    'cart.subtotal':     { lo:'ລາຄາ',              th:'ราคา',               en:'Subtotal',          zh:'小计'       },
    'cart.total':        { lo:'ລວມທັງໝົດ',         th:'รวมทั้งหมด',         en:'Total',             zh:'合计'       },
    'cart.view':         { lo:'ເບິ່ງລາຍການສັ່ງ',   th:'ดูรายการสั่ง',       en:'View Order',        zh:'查看订单'   },
    'cart.confirm':      { lo:'ຢືນຢັນການສັ່ງ',     th:'ยืนยันการสั่ง',      en:'Place Order',       zh:'确认下单'   },
    'cart.clear':        { lo:'ລຶບທັງໝົດ',         th:'ลบทั้งหมด',          en:'Clear All',         zh:'清空'       },

    /* ── Modal ── */
    'modal.success':     { lo:'ສັ່ງສຳເລັດ!',       th:'สั่งสำเร็จ!',        en:'Order Placed!',     zh:'下单成功！'  },
    'modal.wait':        { lo:'ກາລຸນາລໍຖ້າ...',   th:'กรุณารอ...',         en:'Please wait...',    zh:'请稍候...'  },
    'modal.track':       { lo:'ຕິດຕາມອໍ້ເດີ →',   th:'ติดตามออร์เดอร์ →',  en:'Track Order →',     zh:'追踪订单 →' },

    /* ── Track ── */
    'track.title':       { lo:'ອໍ້ເດີຂ້ອຍ',        th:'ออร์เดอร์ของฉัน',    en:'My Orders',         zh:'我的订单'   },
    'track.empty':       { lo:'ຍັງບໍ່ມີອໍ້ເດີ',    th:'ยังไม่มีออร์เดอร์',  en:'No orders yet',     zh:'暂无订单'   },
    'track.empty.sub':   { lo:'ກົດ "ສັ່ງ" ເພື່ອເລີ່ມ', th:'กด "สั่ง" เพื่อเริ่ม', en:'Tap "Order" to start', zh:'点击点餐开始' },
    'track.session':     { lo:'ລວມທີ່ສັ່ງ',        th:'รวมที่สั่ง',          en:'Session Total',     zh:'本次合计'   },
    'track.bill':        { lo:'ເບິ່ງບິນ',          th:'ดูบิล',              en:'View Bill',         zh:'查看账单'   },
    'track.step.rcv':    { lo:'ຮັບ',               th:'รับ',                en:'Received',          zh:'已接单'     },
    'track.step.cook':   { lo:'ປຸງ',               th:'ปรุง',               en:'Cooking',           zh:'烹饪'       },
    'track.step.done':   { lo:'ສຳເລັດ',            th:'เสร็จ',              en:'Ready',             zh:'完成'       },

    /* ── Bill ── */
    'bill.title':        { lo:'ໃບບິນ',             th:'ใบบิล',              en:'Bill',              zh:'账单'       },
    'bill.subtotal':     { lo:'ລາຄາສິນຄ້າ',        th:'ราคาสินค้า',         en:'Subtotal',          zh:'小计'       },
    'bill.total':        { lo:'ລວມທັງໝົດ',         th:'รวมทั้งหมด',         en:'Total',             zh:'合计'       },
    'bill.pay.title':    { lo:'ວິທີຊຳລະ',          th:'วิธีชำระ',           en:'Payment Method',    zh:'支付方式'   },
    'bill.pay.cash':     { lo:'ເງິນສົດ',            th:'เงินสด',             en:'Cash',              zh:'现金'       },
    'bill.pay.qr':       { lo:'QR Code',           th:'QR Code',            en:'QR Code',           zh:'二维码'     },
    'bill.pay.transfer': { lo:'ໂອນ',               th:'โอน',                en:'Transfer',          zh:'转账'       },
    'bill.paid':         { lo:'ຊຳລະແລ້ວ',          th:'ชำระแล้ว',           en:'Paid',              zh:'已付款'     },
    'bill.qr.scan':      { lo:'ສະແກນຊຳລະ',        th:'สแกนเพื่อชำระ',      en:'Scan to Pay',       zh:'扫码支付'   },
    'bill.footer':       { lo:'ຂໍຂອບໃຈ 🙏',        th:'ขอบคุณ 🙏',          en:'Thank you 🙏',      zh:'感谢惠顾 🙏' },

    /* ── Admin Navigation ── */
    'admin.dashboard':   { lo:'ໜ້າຫຼັກ',           th:'หน้าหลัก',           en:'Dashboard',         zh:'仪表盘'     },
    'admin.orders':      { lo:'ຄຳສັ່ງຊື້',          th:'คำสั่งซื้อ',          en:'Orders',            zh:'订单管理'   },
    'admin.products':    { lo:'ສິນຄ້າ / ເມນູ',     th:'สินค้า / เมนู',      en:'Products',          zh:'商品管理'   },
    'admin.inventory':   { lo:'ສ໊ຕ໊ອກ',            th:'สต็อกสินค้า',        en:'Inventory',         zh:'库存'       },
    'admin.reports':     { lo:'ລາຍງານ',            th:'รายงาน',             en:'Reports',           zh:'报表'       },
    'admin.users':       { lo:'ຜູ້ໃຊ້',             th:'ผู้ใช้งาน',           en:'Users',             zh:'用户管理'   },
    'admin.settings':    { lo:'ຕັ້ງຄ່າ',           th:'ตั้งค่า',            en:'Settings',          zh:'设置'       },
    'admin.logout':      { lo:'ອອກ',               th:'ออก',                en:'Logout',            zh:'退出'       },
    'admin.panel':       { lo:'Admin Panel',       th:'Admin Panel',        en:'Admin Panel',       zh:'管理面板'   },

    /* ── Menu sections ── */
    'menu.main':         { lo:'ເມນູຫຼັກ',           th:'เมนูหลัก',           en:'Main Menu',         zh:'主菜单'     },
    'menu.system':       { lo:'ລະບົບ',             th:'ระบบ',               en:'System',            zh:'系统'       },

    /* ── Tooltips ── */
    'tooltip.collapse':  { lo:'ຫຍໍ້/ຂະຫຍາຍ',       th:'ย่อ/ขยาย',           en:'Collapse/Expand',   zh:'收起/展开'  },
    'tooltip.logout':    { lo:'ອອກຈາກລະບົບ',       th:'ออกจากระบบ',         en:'Logout',            zh:'退出登录'   },
    'tooltip.refresh':   { lo:'ໂຫຼດໃໝ່',           th:'รีเฟรช',             en:'Refresh',           zh:'刷新'       },

    /* ── Dashboard ── */
    'dash.today.rev':    { lo:'ລາຍຮັບວັນນີ້',       th:'รายได้วันนี้',        en:"Today's Revenue",   zh:'今日营收'   },
    'dash.total.orders': { lo:'ຄຳສັ່ງທັງໝົດ',      th:'คำสั่งทั้งหมด',      en:'Total Orders',      zh:'总订单'     },
    'dash.orders':       { lo:'ຄຳສັ່ງຊື້',          th:'คำสั่งซื้อ',          en:'Orders',            zh:'订单'       },
    'dash.products':     { lo:'ສິນຄ້າທີ່ຂາຍ',      th:'สินค้าที่ขาย',       en:'Active Products',   zh:'在售商品'   },
    'dash.tables':       { lo:'ໂຕ Online',         th:'โต๊ะ Online',        en:'Tables Online',     zh:'在线桌号'   },
    'dash.recent':       { lo:'ຄຳສັ່ງລ່າສຸດ',      th:'คำสั่งล่าสุด',       en:'Recent Orders',     zh:'最近订单'   },
    'dash.viewall':      { lo:'ເບິ່ງທັງໝົດ →',     th:'ดูทั้งหมด →',        en:'View All →',        zh:'查看全部 →' },
    'dash.sales':        { lo:'ຍອດຂາຍ 7 ວັນ',     th:'ยอดขาย 7 วัน',      en:'Sales 7 Days',      zh:'7天销售额'  },
    'dash.top':          { lo:'ເມນູຂາຍດີ',         th:'เมนูขายดี',          en:'Top Items',         zh:'热销商品'   },
    'dash.week':         { lo:'ອາທິດ',             th:'สัปดาห์',            en:'Week',              zh:'本周'       },
    'dash.month':        { lo:'ເດືອນ',             th:'เดือน',              en:'Month',             zh:'本月'       },

    /* ── Filters ── */
    'filter.all':        { lo:'ທຸກສະຖານະ',         th:'ทุกสถานะ',           en:'All Status',        zh:'所有状态'   },
    'orders.empty':      { lo:'ບໍ່ມີຄຳສັ່ງຊື້',     th:'ไม่มีคำสั่งซื้อ',     en:'No orders',         zh:'暂无订单'   },
    'search.product':    { lo:'ຄົ້ນຫາສິນຄ້າ...',   th:'ค้นหาสินค้า...',     en:'Search products...',zh:'搜索商品...' },

    /* ── Table headers ── */
    'tbl.order':         { lo:'Order #',          th:'Order #',            en:'Order #',           zh:'订单号'     },
    'tbl.table':         { lo:'ໂຕ',               th:'โต๊ะ',               en:'Table',             zh:'桌号'       },
    'tbl.items':         { lo:'ລາຍການ',           th:'รายการ',             en:'Items',             zh:'商品'       },
    'tbl.total':         { lo:'ລວມ',              th:'รวม',                en:'Total',             zh:'金额'       },
    'tbl.time':          { lo:'ເວລາ',             th:'เวลา',               en:'Time',              zh:'时间'       },
    'tbl.status':        { lo:'ສະຖານະ',           th:'สถานะ',              en:'Status',            zh:'状态'       },
    'tbl.actions':       { lo:'ຈັດການ',            th:'จัดการ',             en:'Actions',           zh:'操作'       },
    'tbl.view':          { lo:'ເບິ່ງ',             th:'ดู',                 en:'View',              zh:'查看'       },
    'tbl.nodata':        { lo:'ບໍ່ມີຂໍ້ມູນ',       th:'ไม่มีข้อมูล',        en:'No data',           zh:'暂无数据'   },

    /* ── Products ── */
    'prod.add':          { lo:'+ ເພີ່ມສິນຄ້າ',     th:'+ เพิ่มสินค้า',      en:'+ Add Product',     zh:'+ 添加商品'   },
    'prod.name':         { lo:'ຊື່ສິນຄ້າ',         th:'ชื่อสินค้า',         en:'Product Name',      zh:'商品名称'   },
    'prod.price':        { lo:'ລາຄາ',             th:'ราคา',               en:'Price',             zh:'价格'       },
    'prod.cat':          { lo:'ໝວດໝູ່',            th:'หมวดหมู่',           en:'Category',          zh:'分类'       },
    'prod.stock':        { lo:'ສ໊ຕ໊ອກ',           th:'สต็อก',              en:'Stock',             zh:'库存'       },
    'prod.status':       { lo:'ສະຖານະ',           th:'สถานะ',              en:'Status',            zh:'状态'       },
    'prod.active':       { lo:'ຂາຍຢູ່',           th:'ขายอยู่',             en:'Active',            zh:'在售'       },
    'prod.soldout':      { lo:'ໝົດ',              th:'หมด',                en:'Sold Out',          zh:'售罄'       },
    'prod.hidden':       { lo:'ຊ່ອນ',             th:'ซ่อน',               en:'Hidden',            zh:'隐藏'       },

    /* ── Inventory ── */
    'inv.adjust':        { lo:'ປັບສ໊ຕ໊ອກ',        th:'ปรับสต็อก',          en:'Adjust Stock',      zh:'调整库存'   },
    'inv.in':            { lo:'ເຂົ້າ (+)',         th:'เข้า (+)',            en:'Stock In',          zh:'入库'       },
    'inv.out':           { lo:'ອອກ (−)',           th:'ออก (−)',            en:'Stock Out',         zh:'出库'       },
    'inv.set':           { lo:'ຕັ້ງຄ່າໃໝ່',        th:'ตั้งค่าใหม่',        en:'Set Value',         zh:'设定值'     },
    'inv.qty':           { lo:'ຈຳນວນ',             th:'จำนวน',              en:'Quantity',          zh:'数量'       },
    'inv.note':          { lo:'ໝາຍເຫດ',            th:'หมายเหตุ',           en:'Note',              zh:'备注'       },
    'inv.history':       { lo:'ປະຫວັດການປັບສ໊ຕ໊ອກ', th:'ประวัติการปรับสต็อก', en:'Stock History',     zh:'库存记录'   },
    'inv.lowstock':      { lo:'ສ໊ຕ໊ອກໃກ້ໝົດ:',    th:'สต็อกใกล้หมด:',     en:'Low stock:',        zh:'库存不足:'  },

    /* ── Reports ── */
    'rep.title':         { lo:'ລາຍງານຍອດຂາຍ',      th:'รายงานยอดขาย',       en:'Sales Report',      zh:'销售报表'   },
    'rep.7days':         { lo:'7 ວັນ',             th:'7 วัน',              en:'7 Days',            zh:'7天'        },
    'rep.30days':        { lo:'30 ວັນ',            th:'30 วัน',             en:'30 Days',           zh:'30天'       },
    'rep.90days':        { lo:'90 ວັນ',            th:'90 วัน',             en:'90 Days',           zh:'90天'       },
    'rep.daily':         { lo:'ຍອດຂາຍລາຍວັນ',      th:'ยอดขายรายวัน',       en:'Daily Sales',       zh:'每日销售'   },
    'rep.category':      { lo:'ສັດສ່ວນໝວດໝູ່',    th:'สัดส่วนหมวดหมู่',     en:'Category Share',    zh:'分类占比'   },
    'rep.all':           { lo:'ລາຍການຂາຍທັງໝົດ',   th:'รายการขายทั้งหมด',   en:'All Sales',         zh:'所有销售'   },
    'rep.revenue':       { lo:'ລາຍຮັບລວມ',         th:'รายได้รวม',          en:'Total Revenue',     zh:'总营收'     },
    'rep.completed':     { lo:'ອໍ້ເດີສຳເລັດ',       th:'ออร์เดอร์สำเร็จ',   en:'Completed Orders',  zh:'完成订单'   },
    'rep.avg':           { lo:'ສະເລ່ຍ/ອໍ້ເດີ',      th:'เฉลี่ย/ออร์เดอร์',  en:'Avg per Order',     zh:'均单价'     },
    'rep.export':        { lo:'⬇ ສົ່ງອອກ CSV',      th:'⬇ Export CSV',       en:'⬇ Export CSV',      zh:'⬇ 导出CSV'  },
    'rep.top':           { lo:'ສິນຄ້າຂາຍດີ',        th:'สินค้าขายดี',        en:'Top Seller',        zh:'热销商品'   },
    'rep.times':         { lo:'ຄັ້ງ',              th:'ครั้ง',              en:'times',             zh:'次'         },

    /* ── Users ── */
    'user.add':          { lo:'+ ເພີ່ມຜູ້ໃຊ້',      th:'+ เพิ่มผู้ใช้',       en:'+ Add User',        zh:'+ 添加用户'   },
    'user.role':         { lo:'ສິດທິ',              th:'บทบาท',              en:'Role',              zh:'角色'       },
    'user.role.admin':   { lo:'⚡ ຜູ້ບໍລິຫານ',       th:'⚡ ผู้ดูแลระบบ',      en:'⚡ Super Admin',     zh:'⚡ 超级管理员' },
    'user.role.mgr':     { lo:'👔 ຜູ້ຈັດການ',        th:'👔 ผู้จัดการ',        en:'👔 Manager',         zh:'👔 经理'     },
    'user.role.cash':    { lo:'🏪 ພະນັກງານ',        th:'🏪 พนักงาน',         en:'🏪 Cashier',         zh:'🏪 收银员'   },
    'user.lastlogin':    { lo:'ເຂົ້າລ່າສຸດ',        th:'เข้าล่าสุด',         en:'Last Login',        zh:'最近登录'   },
    'user.active':       { lo:'ໃຊ້ງານ',            th:'ใช้งาน',             en:'Active',            zh:'启用'       },
    'user.inactive':     { lo:'ລະງັບ',             th:'ระงับ',              en:'Inactive',          zh:'停用'       },

    /* ── Login ── */
    'login.title':       { lo:'ເຂົ້າສູ່ລະບົບ',     th:'เข้าสู่ระบบ',        en:'Sign In',           zh:'登录'       },
    'login.username':    { lo:'ຊື່ຜູ້ໃຊ້',          th:'ชื่อผู้ใช้',          en:'Username',          zh:'用户名'     },
    'login.password':    { lo:'ລະຫັດຜ່ານ',          th:'รหัสผ่าน',           en:'Password',          zh:'密码'       },
    'login.btn':         { lo:'ເຂົ້າສູ່ລະບົບ',     th:'เข้าสู่ระบบ',        en:'Sign In',           zh:'登录'       },
    'login.error':       { lo:'ຊື່ຜູ້ໃຊ້/ລະຫັດ ບໍ່ຖືກ', th:'Username/Password ผิด', en:'Invalid credentials', zh:'用户名或密码错误' },
    'login.hint':        { lo:'ໃຊ້: admin / 1234', th:'ใช้: admin / 1234',  en:'Use: admin / 1234', zh:'账号: admin / 1234' },

    /* ── Settings ── */
    'set.store':         { lo:'🏪 ຂໍ້ມູນຮ້ານ',       th:'🏪 ข้อมูลร้าน',       en:'🏪 Store Info',     zh:'🏪 店铺信息'  },
    'set.tax':           { lo:'💰 ພາສີ',            th:'💰 ภาษี',            en:'💰 Tax',            zh:'💰 税率'      },
    'set.receipt':       { lo:'🖨️ ໃບບິນ',          th:'🖨️ ใบเสร็จ',         en:'🖨️ Receipt',        zh:'🖨️ 收据'      },
    'set.security':      { lo:'🔐 ຄວາມປອດໄພ',       th:'🔐 ความปลอดภัย',     en:'🔐 Security',       zh:'🔐 安全'      },
    'set.danger':        { lo:'⚠️ Zone ອັນຕະລາຍ',  th:'⚠️ Zone อันตราย',   en:'⚠️ Danger Zone',    zh:'⚠️ 危险操作'  },
    'set.backup':        { lo:'💾 ສຳຮອງຂໍ້ມູນ',     th:'💾 สำรองข้อมูล',      en:'💾 Backup',         zh:'💾 备份'      },
    'set.reset':         { lo:'🗑️ ລຶບຂໍ້ມູນທັງໝົດ',  th:'🗑️ รีเซ็ตทั้งหมด',   en:'🗑️ Reset All',      zh:'🗑️ 重置数据'  },
    'set.password':      { lo:'🔐 ປ່ຽນລະຫັດຜ່ານ',   th:'🔐 เปลี่ยนรหัสผ่าน',   en:'🔐 Change Password',zh:'🔐 修改密码'  },
    'set.change':        { lo:'🔐 ປ່ຽນລະຫັດຜ່ານ',   th:'🔐 เปลี่ยนรหัสผ่าน',   en:'🔐 Change Password',zh:'🔐 修改密码'  },

    'settings.storename':{ lo:'ຊື່ຮ້ານ',            th:'ชื่อร้าน',            en:'Store Name',        zh:'店铺名称'   },
    'settings.phone':    { lo:'ໂທລະສັບ',            th:'โทรศัพท์',           en:'Phone',             zh:'电话'       },
    'settings.address':  { lo:'ທີ່ຢູ່',              th:'ที่อยู่',             en:'Address',           zh:'地址'       },
    'settings.hours':    { lo:'ເວລາເປີດ-ປິດ',       th:'เวลาเปิด-ปิด',       en:'Open Hours',        zh:'营业时间'   },
    'settings.vat':      { lo:'VAT (%)',           th:'VAT (%)',            en:'VAT (%)',           zh:'增值税 (%)'  },
    'settings.discount': { lo:'ສ່ວນຫຼຸດສູງສຸດ (%)', th:'ส่วนลดสูงสุด (%)',   en:'Max Discount (%)',  zh:'最大折扣 (%)' },
    'settings.currency': { lo:'ສະກຸນເງິນ',          th:'สกุลเงิน',           en:'Currency',          zh:'货币'       },
    'settings.receiptheader': { lo:'ຫົວໃບບິນ',      th:'หัวใบเสร็จ',         en:'Receipt Header',    zh:'收据抬头'   },
    'settings.receiptfooter': { lo:'ຂໍ້ຄວາມທ້າຍ',    th:'ข้อความท้าย',        en:'Footer Text',       zh:'底部文字'   },
    'settings.showvat':  { lo:'ສະແດງ VAT',         th:'แสดง VAT',           en:'Show VAT',          zh:'显示增值税'  },
    'settings.show':     { lo:'ສະແດງ',             th:'แสดง',               en:'Show',              zh:'显示'       },
    'settings.hide':     { lo:'ຊ່ອນ',              th:'ซ่อน',               en:'Hide',              zh:'隐藏'       },
    'settings.currentpw':{ lo:'ລະຫັດປັດຈຸບັນ',      th:'รหัสปัจจุบัน',       en:'Current Password',  zh:'当前密码'   },
    'settings.newpw':    { lo:'ລະຫັດໃໝ່',          th:'รหัสใหม่',           en:'New Password',      zh:'新密码'     },
    'settings.confirmpw':{ lo:'ຢືນຢັນລະຫັດໃໝ່',    th:'ยืนยันรหัสใหม่',     en:'Confirm Password',  zh:'确认密码'   },

    /* ── Modals ── */
    'modal.addproduct':  { lo:'ເພີ່ມສິນຄ້າ',        th:'เพิ่มสินค้า',        en:'Add Product',       zh:'添加商品'   },
    'modal.editproduct': { lo:'ແກ້ໄຂສິນຄ້າ',        th:'แก้ไขสินค้า',        en:'Edit Product',      zh:'编辑商品'   },
    'modal.productname': { lo:'ຊື່ສິນຄ້າ',          th:'ชื่อสินค้า',         en:'Product Name',      zh:'商品名称'   },
    'modal.price':       { lo:'ລາຄາ (ກີບ)',         th:'ราคา (ກີບ)',         en:'Price (LAK)',       zh:'价格 (基普)' },
    'modal.desc':        { lo:'ຄຳອະທິບາຍ',         th:'คำอธิบาย',           en:'Description',       zh:'描述'       },
    'modal.cat':         { lo:'ໝວດໝູ່',             th:'หมวดหมู่',           en:'Category',          zh:'分类'       },
    'modal.stock':       { lo:'ສ໊ຕ໊ອກເລີ່ມຕົ້ນ',    th:'สต็อกเริ่มต้น',      en:'Initial Stock',     zh:'初始库存'   },
    'modal.status':      { lo:'ສະຖານະ',            th:'สถานะ',              en:'Status',            zh:'状态'       },
    'modal.active':      { lo:'✅ ຂາຍຢູ່',          th:'✅ ขายอยู่',          en:'✅ Active',         zh:'✅ 在售'     },
    'modal.soldout':     { lo:'❌ ໝົດ',             th:'❌ หมด',              en:'❌ Sold Out',       zh:'❌ 售罄'     },
    'modal.hidden':      { lo:'🚫 ຊ່ອນ',            th:'🚫 ซ่อน',             en:'🚫 Hidden',         zh:'🚫 隐藏'     },
    'modal.cancel':      { lo:'ຍົກເລີກ',            th:'ยกเลิก',             en:'Cancel',            zh:'取消'       },
    'modal.save':        { lo:'💾 ບັນທຶກ',          th:'💾 บันทึก',           en:'💾 Save',           zh:'💾 保存'     },
    'modal.adjuststock': { lo:'ປັບສ໊ຕ໊ອກສິນຄ້າ',    th:'ปรับสต็อกสินค้า',    en:'Adjust Stock',      zh:'调整库存'   },
    'modal.product':     { lo:'ສິນຄ້າ',             th:'สินค้า',             en:'Product',           zh:'商品'       },
    'modal.type':        { lo:'ປະເພດ',              th:'ประเภท',             en:'Type',              zh:'类型'       },
    'modal.in':          { lo:'ເຂົ້າ (+)',          th:'เข้า (+)',            en:'In (+)',            zh:'入库 (+)'   },
    'modal.out':         { lo:'ອອກ (−)',            th:'ออก (−)',            en:'Out (−)',           zh:'出库 (−)'   },
    'modal.set':         { lo:'ຕັ້ງຄ່າໃໝ່',         th:'ตั้งค่าใหม่',        en:'Set New',           zh:'设定新值'   },
    'modal.qty':         { lo:'ຈຳນວນ',              th:'จำนวน',              en:'Quantity',          zh:'数量'       },
    'modal.note':        { lo:'ໝາຍເຫດ',             th:'หมายเหตุ',           en:'Note',              zh:'备注'       },
    'modal.confirm':     { lo:'✅ ຢືນຢັນ',          th:'✅ ยืนยัน',           en:'✅ Confirm',        zh:'✅ 确认'     },
    'modal.adduser':     { lo:'ເພີ່ມຜູ້ໃຊ້',         th:'เพิ่มผู้ใช้',        en:'Add User',          zh:'添加用户'   },
    'modal.edituser':    { lo:'ແກ້ໄຂຜູ້ໃຊ້',        th:'แก้ไขผู้ใช้',        en:'Edit User',         zh:'编辑用户'   },
    'modal.fullname':    { lo:'ຊື່ເຕັມ',            th:'ชื่อเต็ม',            en:'Full Name',         zh:'全名'       },
    'modal.password':    { lo:'ລະຫັດຜ່ານ',          th:'รหัสผ่าน',           en:'Password',          zh:'密码'       },
    'modal.role':        { lo:'ສິດທິ',              th:'บทบาท',              en:'Role',              zh:'角色'       },
    'modal.useractive':  { lo:'✅ ໃຊ້ງານ',          th:'✅ ใช้งาน',           en:'✅ Active',         zh:'✅ 启用'     },
    'modal.userinactive':{ lo:'🚫 ລະງັບ',           th:'🚫 ระงับ',            en:'🚫 Inactive',       zh:'🚫 停用'     },
    'modal.orderdetail': { lo:'ລາຍລະອຽດອໍ້ເດີ',    th:'รายละเอียดออร์เดอร์', en:'Order Details',     zh:'订单详情'   },
    'modal.close':       { lo:'ປິດ',               th:'ปิด',                en:'Close',             zh:'关闭'       },
    'modal.print':       { lo:'🖨️ ພິມໃບບິນ',       th:'🖨️ พิมพ์ใบเสร็จ',    en:'🖨️ Print Receipt',  zh:'🖨️ 打印收据' },

    /* ── Order detail labels ── */
    'order.subtotal':    { lo:'ລາຄາ',              th:'ราคา',               en:'Subtotal',          zh:'小计'       },
    'order.grandtotal':  { lo:'ລວມທັງໝົດ',         th:'รวมทั้งหมด',         en:'Grand Total',       zh:'合计'       },

    /* ── Toast messages ── */
    'toast.wrongcred':   { lo:'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກ', th:'Username หรือ Password ไม่ถูกต้อง', en:'Invalid username or password', zh:'用户名或密码错误' },
    'toast.logoutconfirm':{ lo:'ອອກຈາກລະບົບ?',    th:'ออกจากระบบ?',       en:'Logout?',           zh:'退出登录?'  },
    'toast.orderdone':   { lo:'ຢືນຢັນ Order',      th:'ยืนยัน Order',       en:'Order completed',   zh:'订单已完成'  },
    'toast.ordercancel': { lo:'ຍົກເລີກ Order',     th:'ยกเลิก Order',       en:'Order cancelled',   zh:'订单已取消'  },
    'toast.cancelconfirm':{ lo:'ຍົກເລີກ',          th:'ยกเลิก',             en:'Cancel',            zh:'取消'       },
    'toast.fillall':     { lo:'ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບ', th:'กรอกข้อมูลให้ครบ', en:'Please fill in all fields', zh:'请填写完整信息' },
    'toast.saved':       { lo:'ບັນທຶກ',            th:'บันทึก',             en:'Saved',             zh:'已保存'     },
    'toast.added':       { lo:'ເພີ່ມ',              th:'เพิ่ม',              en:'Added',             zh:'已添加'     },
    'toast.deleted':     { lo:'ລຶບ',               th:'ลบ',                 en:'Deleted',           zh:'已删除'     },
    'toast.deleteconfirm':{ lo:'ລຶບ',              th:'ลบ',                 en:'Delete',            zh:'删除'       },
    'toast.stockadjusted':{ lo:'ປັບສ໊ຕ໊ອກ',        th:'ปรับสต็อก',          en:'Stock adjusted',    zh:'库存已调整'  },
    'toast.printsent':   { lo:'ກຳລັງສົ່ງໄປຍັງເຄື່ອງພິມ...', th:'กำลังส่งไปยังเครื่องพิมพ์...', en:'Sending to printer...', zh:'正在发送至打印机...' },
    'toast.refreshed':   { lo:'ໂຫຼດໃໝ່ແລ້ວ',      th:'รีเฟรชแล้ว',         en:'Refreshed',         zh:'已刷新'     },
    'toast.resetconfirm':{ lo:'ລຶບຂໍ້ມູນທັງໝົດ? ບໍ່ສາມາດຍ້ອນກັບໄດ້', th:'รีเซ็ตข้อมูลทั้งหมด? ไม่สามารถย้อนกลับได้', en:'Reset all data? This cannot be undone.', zh:'重置所有数据？此操作无法撤销。' },
    'toast.resetdone':   { lo:'ລຶບຂໍ້ມູນແລ້ວ',      th:'รีเซ็ตข้อมูลแล้ว',   en:'Data reset',        zh:'数据已重置'  },
    'toast.exportdone':  { lo:'ສົ່ງອອກ CSV ແລ້ວ',  th:'Export CSV แล้ว',   en:'CSV exported',      zh:'CSV已导出'  },

    /* ── Version ── */
    'version.info':      { lo:'POS-SST Admin v1.0.0 · Build 2025', th:'POS-SST Admin v1.0.0 · Build 2025', en:'POS-SST Admin v1.0.0 · Build 2025', zh:'POS-SST Admin v1.0.0 · Build 2025' },

    /* ═══════════════════════════════════════════════════════
       ALIASES — used by admin-script.js
       ═══════════════════════════════════════════════════════ */
    'products.status':   { lo:'ສະຖານະ',            th:'สถานะ',              en:'Status',            zh:'状态'       },
    'products.name':     { lo:'ຊື່ສິນຄ້າ',          th:'ชื่อสินค้า',         en:'Product Name',      zh:'商品名称'   },
    'products.cat':      { lo:'ໝວດໝູ່',             th:'หมวดหมู่',           en:'Category',          zh:'分类'       },
    'products.price':    { lo:'ລາຄາ',              th:'ราคา',               en:'Price',             zh:'价格'       },
    'products.stock':    { lo:'ສ໊ຕ໊ອກ',             th:'สต็อก',              en:'Stock',             zh:'库存'       },
    'products.active':   { lo:'ຂາຍຢູ່',            th:'ขายอยู่',             en:'Active',            zh:'在售'       },
    'products.soldout':  { lo:'ໝົດ',               th:'หมด',                en:'Sold Out',          zh:'售罄'       },
    'products.hidden':   { lo:'ຊ່ອນ',              th:'ซ่อน',               en:'Hidden',            zh:'隐藏'       },
    'orders.manage':     { lo:'ຈັດການ',             th:'จัดการ',             en:'Manage',            zh:'操作'       },
    'users.username':    { lo:'ຊື່ຜູ້ໃຊ້',          th:'ชื่อผู้ใช้',          en:'Username',          zh:'用户名'     },
    'users.role':        { lo:'ສິດທິ',              th:'บทบาท',              en:'Role',              zh:'角色'       },
    'users.last.login':  { lo:'ເຂົ້າລ່າສຸດ',        th:'เข้าล่าสุด',         en:'Last Login',        zh:'最近登录'   },
    'users.active':      { lo:'ໃຊ້ງານ',            th:'ใช้งาน',             en:'Active',            zh:'启用'       },
    'users.inactive':    { lo:'ລະງັບ',             th:'ระงับ',              en:'Inactive',          zh:'停用'       },
  };

  const STORAGE_KEY = 'pos_lang';
  let cur = localStorage.getItem(STORAGE_KEY) || 'th';
  let _instanceCount = 0;

  function t(key) {
    const e = T[key];
    if (!e) return key;
    return e[cur] || e['en'] || key;
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.documentElement.lang = cur;
  }

  function setLang(code) {
    cur = code;
    localStorage.setItem(STORAGE_KEY, code);

    const lg = LANGS.find(l => l.code === code);
    document.querySelectorAll('.ls-flag-span').forEach(el => {
      if (lg) el.textContent = lg.flag;
    });
    document.querySelectorAll('.ls-label-span').forEach(el => {
      if (lg) el.textContent = lg.label;
    });
    document.querySelectorAll('.lo-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.code === code);
    });
    document.querySelectorAll('.lang-dropdown').forEach(dd => {
      dd.classList.remove('open');
    });

    document.documentElement.lang = code;
    apply();
    window.dispatchEvent(new CustomEvent('langchange', { detail: code }));
  }

  function getLang() { return cur; }

  function buildSwitcher(mountEl) {
    if (!mountEl) return;
    _instanceCount++;
    const uid = 'ls' + _instanceCount;
    const lg  = LANGS.find(l => l.code === cur) || LANGS[0];

    const wrap = document.createElement('div');
    wrap.className = 'lang-switcher';
    wrap.dataset.uid = uid;

    wrap.innerHTML = `
      <button class="lang-trigger" id="lsTrigger_${uid}" type="button" aria-label="Select language">
        <span class="ls-flag-span" style="font-size:1.1rem;line-height:1;flex-shrink:0">${lg.flag}</span>
        <span class="ls-label-span" style="font-size:.76rem;font-weight:600;letter-spacing:.03em">${lg.label}</span>
        <span style="font-size:.55rem;color:var(--muted,#888);margin-left:2px;line-height:1">▾</span>
      </button>
      <div class="lang-dropdown" id="lsDrop_${uid}">
        ${LANGS.map(l => `
          <button class="lo-opt${l.code === cur ? ' active' : ''}" data-code="${l.code}" type="button">
            <span style="font-size:1.1rem">${l.flag}</span>
            <span style="font-size:.83rem;font-weight:600;color:var(--text2,#c4b89a)">${l.label}</span>
          </button>`).join('')}
      </div>`;

    mountEl.appendChild(wrap);

    const trigger = wrap.querySelector(`#lsTrigger_${uid}`);
    const drop    = wrap.querySelector(`#lsDrop_${uid}`);

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.lang-dropdown').forEach(d => {
        if (d !== drop) d.classList.remove('open');
      });
      drop.classList.toggle('open');
    });

    wrap.querySelectorAll('.lo-opt').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        setLang(btn.dataset.code);
      });
    });

    document.addEventListener('click', () => {
      drop.classList.remove('open');
    });
  }

  document.addEventListener('DOMContentLoaded', () => apply());

  return { t, apply, setLang, getLang, buildSwitcher, LANGS };
})();
window.i18n = i18n;