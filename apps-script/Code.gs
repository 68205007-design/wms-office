/**
 * ระบบบันทึกการเบิก‑จ่ายวัสดุสำนักงาน (WMS) — Backend บน Google Apps Script
 * เก็บข้อมูลใน Google Sheets ใช้ API รูปแบบเดียวกับ Backend Express เดิม
 *
 * วิธีติดตั้ง (ทำครั้งเดียว):
 *  1) สร้าง Google Sheet ใหม่ → ส่วนขยาย → Apps Script → วางโค้ดนี้ทั้งหมดแทนโค้ดเดิม → บันทึก
 *  2) เลือกฟังก์ชัน setup แล้วกด "เรียกใช้" → อนุญาตสิทธิ์ → ดูรหัส admin ใน "บันทึกการดำเนินการ"
 *  3) การทำให้ใช้งานได้ → การทำให้ใช้งานได้รายการใหม่ → ประเภท "เว็บแอป"
 *     ดำเนินการในฐานะ: ฉัน / ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน → ทำให้ใช้งานได้ → คัดลอก URL
 */

/* =====================================================================
 * โครงสร้างตาราง
 * ===================================================================== */
var TABLES = {
  roles: ['id', 'name'],
  users: ['id', 'name', 'email', 'passwordHash', 'roleId', 'departmentId', 'active', 'createdAt', 'updatedAt'],
  categories: ['id', 'name', 'createdAt', 'updatedAt'],
  suppliers: ['id', 'name', 'contactPerson', 'phone', 'email', 'address', 'notes', 'createdAt', 'updatedAt'],
  departments: ['id', 'name', 'createdAt', 'updatedAt'],
  units: ['id', 'name', 'abbreviation', 'isActive', 'createdAt', 'updatedAt'],
  products: ['id', 'sku', 'barcode', 'name', 'description', 'categoryId', 'unit', 'unitCatalogId', 'costPrice', 'sellingPrice',
    'stockQuantity', 'minimumStock', 'imageUrl', 'createdAt', 'updatedAt'],
  requisitions: ['id', 'requestNumber', 'requesterId', 'departmentId', 'purpose', 'status', 'decisionNote', 'decidedById', 'decidedAt',
    'createdAt', 'updatedAt'],
  requisition_items: ['id', 'requisitionId', 'productId', 'quantity', 'createdAt'],
  notifications: ['id', 'userId', 'requisitionId', 'type', 'title', 'message', 'readAt', 'createdAt'],
  stock_movements: ['id', 'type', 'productId', 'quantity', 'unitCost', 'documentNumber', 'movementDate', 'supplierId', 'departmentId',
    'requesterName', 'purpose', 'notes', 'referenceKey', 'requisitionItemId', 'createdById', 'createdAt'],
  audit_logs: ['id', 'userId', 'username', 'action', 'module', 'recordId', 'previousValue', 'updatedValue', 'ipAddress', 'createdAt']
};
var NUMBER_FIELDS = ['id', 'roleId', 'departmentId', 'categoryId', 'unitCatalogId', 'costPrice', 'sellingPrice', 'stockQuantity',
  'minimumStock', 'requesterId', 'decidedById', 'requisitionId', 'productId', 'quantity', 'unitCost', 'supplierId',
  'requisitionItemId', 'createdById', 'userId'];
var BOOLEAN_FIELDS = ['active', 'isActive'];
var JSON_FIELDS = ['previousValue', 'updatedValue'];
var ROLE_NAMES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'WAREHOUSE_STAFF', 'USER'];
var DEFAULT_UNITS = ['ชิ้น', 'กล่อง', 'แพ็ค', 'กิโลกรัม', 'ลิตร'];
var ADMINS = ['SUPER_ADMIN', 'ADMIN'];
var WAREHOUSE = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'WAREHOUSE_STAFF'];
var TOKEN_HOURS = 8;

/* =====================================================================
 * ชั้นข้อมูล (Google Sheets)
 * ===================================================================== */
var DB = {
  _ss: null,
  _cache: {},
  ss: function () {
    if (!this._ss) {
      var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (!id) throw httpError(500, 'ระบบยังไม่ได้ติดตั้ง กรุณารันฟังก์ชัน setup ใน Apps Script ก่อน');
      this._ss = SpreadsheetApp.openById(id);
    }
    return this._ss;
  },
  sheet: function (table) {
    var sheet = this.ss().getSheetByName(table);
    if (!sheet) throw httpError(500, 'ไม่พบชีต ' + table + ' กรุณารัน setup อีกครั้ง');
    return sheet;
  },
  all: function (table) {
    if (this._cache[table]) return this._cache[table];
    var sheet = this.sheet(table);
    var columns = TABLES[table];
    var lastRow = sheet.getLastRow();
    var rows = [];
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
      for (var r = 0; r < values.length; r++) {
        if (values[r][0] === '' || values[r][0] === null) continue;
        var obj = {};
        for (var c = 0; c < columns.length; c++) obj[columns[c]] = decodeCell(columns[c], values[r][c]);
        obj.__row = r + 2;
        rows.push(obj);
      }
    }
    this._cache[table] = rows;
    return rows;
  },
  find: function (table, id) {
    id = Number(id);
    var rows = this.all(table);
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  },
  findOrThrow: function (table, id, message) {
    var row = this.find(table, id);
    if (!row) throw httpError(404, message || 'ไม่พบข้อมูล');
    return row;
  },
  insert: function (table, data) {
    var rows = this.all(table);
    var maxId = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].id > maxId) maxId = rows[i].id;
    var now = new Date().toISOString();
    var record = {};
    var columns = TABLES[table];
    for (var c = 0; c < columns.length; c++) record[columns[c]] = data[columns[c]] === undefined ? null : data[columns[c]];
    record.id = maxId + 1;
    if (columns.indexOf('createdAt') >= 0 && !record.createdAt) record.createdAt = now;
    if (columns.indexOf('updatedAt') >= 0) record.updatedAt = now;
    var sheet = this.sheet(table);
    var row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, columns.length).setValues([encodeRow(table, record)]);
    record.__row = row;
    rows.push(record);
    return clean(record);
  },
  update: function (table, id, patch) {
    var record = this.findOrThrow(table, id);
    var columns = TABLES[table];
    for (var key in patch) if (columns.indexOf(key) >= 0 && patch[key] !== undefined && key !== 'id') record[key] = patch[key];
    if (columns.indexOf('updatedAt') >= 0) record.updatedAt = new Date().toISOString();
    this.sheet(table).getRange(record.__row, 1, 1, columns.length).setValues([encodeRow(table, record)]);
    return clean(record);
  },
  remove: function (table, id) {
    var record = this.findOrThrow(table, id);
    this.sheet(table).deleteRow(record.__row);
    delete this._cache[table];
  },
  reset: function () { this._cache = {}; }
};

function decodeCell(column, value) {
  if (value === '' || value === null || value === undefined) {
    return BOOLEAN_FIELDS.indexOf(column) >= 0 ? false : null;
  }
  if (value instanceof Date) return value.toISOString();
  if (NUMBER_FIELDS.indexOf(column) >= 0) return Number(value);
  if (BOOLEAN_FIELDS.indexOf(column) >= 0) return value === true || String(value).toUpperCase() === 'TRUE';
  if (JSON_FIELDS.indexOf(column) >= 0) { try { return JSON.parse(value); } catch (e) { return value; } }
  return String(value);
}
function encodeRow(table, record) {
  return TABLES[table].map(function (column) {
    var value = record[column];
    if (value === null || value === undefined) return '';
    if (JSON_FIELDS.indexOf(column) >= 0) return JSON.stringify(value).slice(0, 45000);
    if (BOOLEAN_FIELDS.indexOf(column) >= 0) return value ? 'TRUE' : 'FALSE';
    return String(value);
  });
}
function clean(record) {
  if (!record) return record;
  var out = {};
  for (var key in record) if (key !== '__row') out[key] = record[key];
  return out;
}
function pick(record, keys) {
  var out = {};
  keys.forEach(function (k) { out[k] = record ? record[k] : null; });
  return out;
}

/* =====================================================================
 * Utilities: errors, validation, security
 * ===================================================================== */
function httpError(status, message) {
  var error = new Error(message);
  error.status = status;
  return error;
}
function str(value, opts) {
  opts = opts || {};
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: กรุณากรอก ' + (opts.label || opts.field || 'ข้อมูล'));
    return opts.nullable === false ? '' : null;
  }
  var s = String(value);
  if (opts.trim !== false) s = s.trim();
  if (opts.required && !s) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: กรุณากรอก ' + (opts.label || opts.field || 'ข้อมูล'));
  if (opts.max && s.length > opts.max) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: ' + (opts.label || opts.field || 'ข้อความ') + ' ยาวเกินไป');
  return s;
}
function int(value, opts) {
  opts = opts || {};
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: กรุณาระบุ ' + (opts.label || 'ตัวเลข'));
    return null;
  }
  var n = Number(value);
  if (!isFinite(n) || Math.floor(n) !== n) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: ' + (opts.label || 'ตัวเลข') + ' ต้องเป็นจำนวนเต็ม');
  if (opts.min !== undefined && n < opts.min) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: ' + (opts.label || 'ตัวเลข') + ' ต่ำเกินไป');
  return n;
}
function num(value, opts) {
  opts = opts || {};
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: กรุณาระบุ ' + (opts.label || 'ตัวเลข'));
    return null;
  }
  var n = Number(value);
  if (!isFinite(n)) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: ' + (opts.label || 'ตัวเลข'));
  if (opts.min !== undefined && n < opts.min) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: ' + (opts.label || 'ตัวเลข') + ' ต่ำเกินไป');
  return Math.round(n * 100) / 100;
}
function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function contains(value, search) { return value != null && String(value).toLowerCase().indexOf(search.toLowerCase()) >= 0; }

function bytesToBase64Url(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
function getSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('JWT_SECRET');
  if (!secret) { secret = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('JWT_SECRET', secret); }
  return secret;
}
function hashPassword(password, salt) {
  salt = salt || Utilities.getUuid();
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password, Utilities.Charset.UTF_8);
  for (var i = 0; i < 2000; i++) bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return 'sha256$2000$' + salt + '$' + Utilities.base64Encode(bytes);
}
function verifyPassword(password, stored) {
  if (!stored) return false;
  var parts = String(stored).split('$');
  if (parts.length !== 4) return false;
  return safeEqual(hashPassword(password, parts[2]), stored);
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function signToken(payload) {
  var body = bytesToBase64Url(Utilities.newBlob(JSON.stringify(payload)).getBytes());
  var sig = bytesToBase64Url(Utilities.computeHmacSha256Signature(body, getSecret()));
  return body + '.' + sig;
}
function verifyToken(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  var parts = String(token).split('.');
  var expected = bytesToBase64Url(Utilities.computeHmacSha256Signature(parts[0], getSecret()));
  if (!safeEqual(expected, parts[1])) return null;
  try {
    var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) { return null; }
}
function randomPassword() {
  return 'Wms-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12) + '9A';
}

/* =====================================================================
 * Auth context & helpers
 * ===================================================================== */
function roleName(roleId) {
  var role = DB.find('roles', roleId);
  return role ? role.name : null;
}
function authenticate(ctx) {
  var payload = verifyToken(ctx.token);
  if (!payload) throw httpError(401, ctx.token ? 'เซสชันหมดอายุหรือไม่ถูกต้อง' : 'ไม่ได้รับอนุญาต');
  var user = DB.find('users', payload.id);
  if (!user || !user.active) throw httpError(401, 'บัญชีนี้ถูกปิดใช้งาน');
  ctx.user = { id: user.id, name: user.name, role: roleName(user.roleId) };
  return ctx.user;
}
function authorize(ctx, roles) {
  if (!ctx.user || roles.indexOf(ctx.user.role) < 0) throw httpError(403, 'ไม่มีสิทธิ์เข้าถึง');
}
function writeAudit(ctx, values) {
  DB.insert('audit_logs', {
    userId: ctx.user ? ctx.user.id : null,
    username: ctx.user ? ctx.user.name : null,
    action: values.action,
    module: values.module,
    recordId: values.recordId == null ? null : String(values.recordId),
    previousValue: values.previousValue === undefined ? null : values.previousValue,
    updatedValue: values.updatedValue === undefined ? null : values.updatedValue,
    ipAddress: 'apps-script'
  });
}
function pageParams(query) {
  var limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  var page = Math.max(1, Number(query.page) || 1);
  return { page: page, limit: limit, skip: (page - 1) * limit };
}
function paginate(rows, p) { return rows.slice(p.skip, p.skip + p.limit); }
function byName(a, b) { return String(a.name).localeCompare(String(b.name), 'th'); }
function desc(field) { return function (a, b) { return String(b[field]).localeCompare(String(a[field])); }; }
function notifyUsers(userIds, data) {
  var seen = {};
  userIds.forEach(function (userId) {
    if (seen[userId]) return;
    seen[userId] = true;
    DB.insert('notifications', {
      userId: userId, requisitionId: data.requisitionId || null, type: data.type, title: data.title, message: data.message, readAt: null
    });
  });
}
function activeUsersWithRoles(roles) {
  return DB.all('users').filter(function (u) { return u.active && roles.indexOf(roleName(u.roleId)) >= 0; });
}

/* =====================================================================
 * Serializers (ให้รูปแบบข้อมูลเหมือน Prisma include เดิม)
 * ===================================================================== */
function productOut(p) {
  if (!p) return null;
  var out = clean(p);
  out.category = clean(DB.find('categories', p.categoryId));
  out.catalogUnit = p.unitCatalogId ? clean(DB.find('units', p.unitCatalogId)) : null;
  return out;
}
function userRef(id, withEmail) {
  var u = DB.find('users', id);
  if (!u) return null;
  return withEmail ? { id: u.id, name: u.name, email: u.email } : { id: u.id, name: u.name };
}
function movementOut(m) {
  var out = clean(m);
  out.product = clean(DB.find('products', m.productId));
  out.supplier = m.supplierId ? clean(DB.find('suppliers', m.supplierId)) : null;
  out.department = m.departmentId ? clean(DB.find('departments', m.departmentId)) : null;
  out.createdBy = userRef(m.createdById);
  return out;
}
function requisitionOut(r) {
  var out = clean(r);
  out.requester = userRef(r.requesterId, true);
  out.department = clean(DB.find('departments', r.departmentId));
  out.decidedBy = r.decidedById ? userRef(r.decidedById) : null;
  var movements = DB.all('stock_movements');
  out.items = DB.all('requisition_items').filter(function (i) { return i.requisitionId === r.id; }).map(function (i) {
    var item = clean(i);
    item.product = productOut(DB.find('products', i.productId));
    var mv = null;
    for (var k = 0; k < movements.length; k++) if (movements[k].requisitionItemId === i.id) { mv = clean(movements[k]); break; }
    item.movement = mv;
    return item;
  });
  return out;
}
function userOut(u) {
  return {
    id: u.id, name: u.name, email: u.email, active: u.active, createdAt: u.createdAt,
    role: clean(DB.find('roles', u.roleId)), department: u.departmentId ? clean(DB.find('departments', u.departmentId)) : null
  };
}

/* =====================================================================
 * Routes
 * ===================================================================== */
var ROUTES = [];
function route(method, pattern, handler, opts) {
  var keys = [];
  var regex = new RegExp('^' + pattern.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '/?$');
  ROUTES.push({ method: method, regex: regex, keys: keys, handler: handler, opts: opts || {} });
}

/* ---------- health ---------- */
route('GET', '/health', function () {
  DB.all('roles');
  return { body: { success: true, data: { status: 'ok', database: 'connected' } } };
}, { public: true });

/* ---------- auth ---------- */
route('POST', '/auth/login', function (ctx) {
  var email = str(ctx.body.email, { required: true, label: 'อีเมล' }).toLowerCase();
  var password = String(ctx.body.password || '');
  if (!isEmail(email) || password.length < 8) throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  var cache = CacheService.getScriptCache();
  var key = 'login:' + email;
  var attempts = Number(cache.get(key) || 0);
  if (attempts >= 10) throw httpError(429, 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่');
  var user = DB.all('users').filter(function (u) { return u.email === email; })[0];
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    cache.put(key, String(attempts + 1), 15 * 60);
    writeAudit(ctx, { action: 'LOGIN_FAILED', module: 'AUTH', recordId: email });
    throw httpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
  cache.remove(key);
  var principal = { id: user.id, name: user.name, role: roleName(user.roleId) };
  ctx.user = principal;
  writeAudit(ctx, { action: 'LOGIN', module: 'AUTH', recordId: user.id });
  var token = signToken({ id: user.id, name: user.name, role: principal.role, exp: Date.now() + TOKEN_HOURS * 3600 * 1000 });
  return {
    body: {
      success: true,
      data: {
        token: token,
        user: { id: user.id, name: user.name, role: principal.role, email: user.email,
          department: user.departmentId ? clean(DB.find('departments', user.departmentId)) : null }
      }
    }
  };
}, { public: true, write: true });

route('POST', '/auth/logout', function (ctx) {
  writeAudit(ctx, { action: 'LOGOUT', module: 'AUTH', recordId: ctx.user.id });
  return { body: { success: true, message: 'ออกจากระบบแล้ว' } };
}, { write: true });

route('GET', '/auth/me', function (ctx) {
  var u = DB.findOrThrow('users', ctx.user.id, 'ไม่พบผู้ใช้');
  return { body: { success: true, data: { id: u.id, name: u.name, email: u.email, role: roleName(u.roleId),
    department: u.departmentId ? clean(DB.find('departments', u.departmentId)) : null } } };
});

route('PUT', '/auth/change-password', function (ctx) {
  var current = String(ctx.body.currentPassword || '');
  var next = String(ctx.body.newPassword || '');
  if (current.length < 8 || next.length < 10 || !/[A-Z]/.test(next) || !/[0-9]/.test(next)) {
    throw httpError(400, 'ข้อมูลไม่ถูกต้อง: รหัสผ่านใหม่ต้องมีอย่างน้อย 10 ตัว มีตัวพิมพ์ใหญ่และตัวเลข');
  }
  var user = DB.findOrThrow('users', ctx.user.id);
  if (!verifyPassword(current, user.passwordHash)) throw httpError(400, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
  DB.update('users', user.id, { passwordHash: hashPassword(next) });
  writeAudit(ctx, { action: 'CHANGE_PASSWORD', module: 'AUTH', recordId: user.id });
  return { body: { success: true, message: 'เปลี่ยนรหัสผ่านแล้ว' } };
}, { write: true });

/* ---------- master data ---------- */
function listSimple(table, fields, ctx, extra) {
  var p = pageParams(ctx.query);
  var search = String(ctx.query.search || '').trim();
  var rows = DB.all(table).filter(function (r) {
    return !search || fields.some(function (f) { return contains(r[f], search); });
  }).sort(byName);
  var data = paginate(rows, p).map(function (r) { var o = clean(r); if (extra) extra(o); return o; });
  return { body: { success: true, data: data, pagination: { total: rows.length } } };
}
function assertUnique(table, field, value, exceptId, message) {
  if (value == null || value === '') return;
  var dup = DB.all(table).some(function (r) { return r.id !== exceptId && String(r[field]).toLowerCase() === String(value).toLowerCase(); });
  if (dup) throw httpError(409, message || 'ข้อมูลซ้ำกับรายการที่มีอยู่แล้ว');
}

route('GET', '/categories', function (ctx) {
  var products = DB.all('products');
  return listSimple('categories', ['name'], ctx, function (o) {
    o._count = { products: products.filter(function (p) { return p.categoryId === o.id; }).length };
  });
});
route('POST', '/categories', function (ctx) {
  authorize(ctx, ADMINS);
  var data = { name: str(ctx.body.name, { required: true, max: 100, label: 'ชื่อหมวดหมู่' }) };
  assertUnique('categories', 'name', data.name);
  var result = DB.insert('categories', data);
  writeAudit(ctx, { action: 'CREATE', module: 'CATEGORY', recordId: result.id, updatedValue: data });
  return { status: 201, body: { success: true, data: result } };
}, { write: true });
route('PUT', '/categories/:id', function (ctx) {
  authorize(ctx, ADMINS);
  var data = { name: str(ctx.body.name, { required: true, max: 100, label: 'ชื่อหมวดหมู่' }) };
  var previous = clean(DB.findOrThrow('categories', ctx.params.id));
  assertUnique('categories', 'name', data.name, previous.id);
  var result = DB.update('categories', previous.id, data);
  writeAudit(ctx, { action: 'UPDATE', module: 'CATEGORY', recordId: previous.id, previousValue: previous, updatedValue: data });
  return { body: { success: true, data: result } };
}, { write: true });
route('DELETE', '/categories/:id', function (ctx) {
  authorize(ctx, ADMINS);
  var category = clean(DB.findOrThrow('categories', ctx.params.id));
  if (DB.all('products').some(function (p) { return p.categoryId === category.id; })) {
    throw httpError(409, 'ไม่สามารถลบหมวดหมู่ที่มีสินค้าใช้งานอยู่');
  }
  DB.remove('categories', category.id);
  writeAudit(ctx, { action: 'DELETE', module: 'CATEGORY', recordId: category.id, previousValue: category });
  return { body: { success: true } };
}, { write: true });

var SIMPLE = {
  suppliers: {
    fields: ['name', 'contactPerson', 'email'],
    parse: function (b) {
      var email = str(b.email, { max: 254 });
      if (email && !isEmail(email)) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: อีเมลไม่ถูกต้อง');
      return {
        name: str(b.name, { required: true, max: 150, label: 'ชื่อผู้จำหน่าย' }), contactPerson: str(b.contactPerson, { max: 120 }),
        phone: str(b.phone, { max: 40 }), email: email, address: str(b.address, { max: 500 }), notes: str(b.notes, { max: 2000 })
      };
    },
    used: function (id) { return DB.all('stock_movements').some(function (m) { return m.supplierId === id; }); }
  },
  departments: {
    fields: ['name'],
    unique: 'name',
    parse: function (b) { return { name: str(b.name, { required: true, max: 100, label: 'ชื่อแผนก' }) }; },
    used: function (id) {
      return DB.all('users').some(function (u) { return u.departmentId === id; })
        || DB.all('requisitions').some(function (r) { return r.departmentId === id; })
        || DB.all('stock_movements').some(function (m) { return m.departmentId === id; });
    }
  },
  units: {
    fields: ['name', 'abbreviation'],
    unique: 'name',
    parse: function (b) {
      var out = { name: str(b.name, { required: true, max: 60, label: 'ชื่อหน่วยนับ' }), abbreviation: str(b.abbreviation, { max: 20 }) };
      if (b.isActive !== undefined) out.isActive = Boolean(b.isActive);
      return out;
    },
    used: function (id) { return DB.all('products').some(function (p) { return p.unitCatalogId === id; }); }
  }
};
Object.keys(SIMPLE).forEach(function (table) {
  var cfg = SIMPLE[table];
  var module = table.toUpperCase();
  route('GET', '/' + table, function (ctx) { return listSimple(table, cfg.fields, ctx); });
  route('POST', '/' + table, function (ctx) {
    authorize(ctx, ADMINS);
    var data = cfg.parse(ctx.body);
    if (table === 'units' && data.isActive === undefined) data.isActive = true;
    if (cfg.unique) assertUnique(table, cfg.unique, data[cfg.unique]);
    var result = DB.insert(table, data);
    writeAudit(ctx, { action: 'CREATE', module: module, recordId: result.id, updatedValue: data });
    return { status: 201, body: { success: true, data: result } };
  }, { write: true });
  route('PUT', '/' + table + '/:id', function (ctx) {
    authorize(ctx, ADMINS);
    var data = cfg.parse(ctx.body);
    var previous = clean(DB.findOrThrow(table, ctx.params.id));
    if (cfg.unique) assertUnique(table, cfg.unique, data[cfg.unique], previous.id);
    var result = DB.update(table, previous.id, data);
    writeAudit(ctx, { action: 'UPDATE', module: module, recordId: previous.id, previousValue: previous, updatedValue: data });
    return { body: { success: true, data: result } };
  }, { write: true });
  route('DELETE', '/' + table + '/:id', function (ctx) {
    authorize(ctx, ADMINS);
    var previous = clean(DB.findOrThrow(table, ctx.params.id));
    if (cfg.used(previous.id)) throw httpError(409, 'รายการนี้ถูกใช้งานอยู่ จึงไม่สามารถลบได้');
    DB.remove(table, previous.id);
    writeAudit(ctx, { action: 'DELETE', module: module, recordId: previous.id, previousValue: previous });
    return { body: { success: true } };
  }, { write: true });
});

/* ---------- products ---------- */
function parseProduct(b, partial) {
  var out = {};
  function has(k) { return !partial || b[k] !== undefined; }
  if (has('sku')) out.sku = str(b.sku, { required: true, max: 80, label: 'SKU' });
  if (has('barcode')) out.barcode = str(b.barcode, { max: 100 }) || null;
  if (has('name')) out.name = str(b.name, { required: true, max: 200, label: 'ชื่อสินค้า' });
  if (has('description')) out.description = str(b.description, { max: 4000, trim: false });
  if (has('categoryId')) out.categoryId = int(b.categoryId, { required: true, min: 1, label: 'หมวดหมู่' });
  if (has('unit')) out.unit = str(b.unit, { max: 30 }) || 'ชิ้น';
  if (has('unitCatalogId')) out.unitCatalogId = int(b.unitCatalogId, { min: 1 });
  if (has('costPrice')) out.costPrice = num(b.costPrice, { required: true, min: 0, label: 'ราคาทุน' });
  if (has('sellingPrice')) out.sellingPrice = num(b.sellingPrice, { required: true, min: 0, label: 'ราคาขาย' });
  if (b.stockQuantity !== undefined && b.stockQuantity !== null && b.stockQuantity !== '') out.stockQuantity = int(b.stockQuantity, { min: 0, label: 'จำนวนคงเหลือ' });
  if (has('minimumStock')) out.minimumStock = int(b.minimumStock, { required: true, min: 0, label: 'จำนวนขั้นต่ำ' });
  if (has('imageUrl')) out.imageUrl = str(b.imageUrl, { max: 500 });
  return out;
}
function filterProducts(query) {
  var search = String(query.search || '').trim();
  var categoryId = query.categoryId ? Number(query.categoryId) : null;
  return DB.all('products').filter(function (p) {
    if (search && !['sku', 'barcode', 'name'].some(function (f) { return contains(p[f], search); })) return false;
    if (categoryId && p.categoryId !== categoryId) return false;
    if (query.stock === 'out' && p.stockQuantity !== 0) return false;
    if (query.stock === 'low' && !(p.stockQuantity > 0 && p.minimumStock > 0 && p.stockQuantity <= p.minimumStock)) return false;
    return true;
  });
}
route('GET', '/products', function (ctx) {
  var p = pageParams(ctx.query);
  var rows = filterProducts(ctx.query).sort(desc('updatedAt'));
  return { body: { success: true, data: paginate(rows, p).map(productOut), pagination: { total: rows.length, page: p.page, limit: p.limit } } };
});
route('GET', '/products/:id', function (ctx) {
  var product = DB.find('products', ctx.params.id);
  if (!product) throw httpError(404, 'ไม่พบสินค้า');
  var out = productOut(product);
  out.movements = DB.all('stock_movements').filter(function (m) { return m.productId === product.id; })
    .sort(desc('movementDate')).slice(0, 20).map(function (m) {
      var o = clean(m); var u = DB.find('users', m.createdById); o.createdBy = { name: u ? u.name : null }; return o;
    });
  return { body: { success: true, data: out } };
});
function applyUnit(data) {
  if (data.unitCatalogId) {
    var unit = DB.findOrThrow('units', data.unitCatalogId, 'ไม่พบหน่วยนับ');
    if (!unit.isActive) throw httpError(400, 'หน่วยนับนี้ถูกปิดใช้งาน');
    data.unit = unit.name;
  }
}
route('POST', '/products', function (ctx) {
  authorize(ctx, WAREHOUSE);
  var data = parseProduct(ctx.body, false);
  DB.findOrThrow('categories', data.categoryId, 'ไม่พบหมวดหมู่');
  applyUnit(data);
  assertUnique('products', 'sku', data.sku);
  assertUnique('products', 'barcode', data.barcode);
  if (data.stockQuantity == null) data.stockQuantity = 0;
  var result = DB.insert('products', data);
  writeAudit(ctx, { action: 'CREATE', module: 'PRODUCT', recordId: result.id, updatedValue: result });
  return { status: 201, body: { success: true, data: result } };
}, { write: true });
route('PUT', '/products/:id', function (ctx) {
  authorize(ctx, WAREHOUSE);
  var previous = clean(DB.findOrThrow('products', ctx.params.id, 'ไม่พบสินค้า'));
  var body = {};
  for (var k in ctx.body) body[k] = ctx.body[k];
  // ฟอร์มแก้ไขส่งข้อมูลสินค้าทั้งก้อนกลับมา: ไม่อนุญาตให้เปลี่ยนยอดคงเหลือตรงนี้
  if (body.stockQuantity !== undefined && Number(body.stockQuantity) !== previous.stockQuantity) {
    throw httpError(400, 'แก้ไขจำนวนคงเหลือผ่านรายการรับเข้าหรือเบิกออกเท่านั้น');
  }
  delete body.stockQuantity;
  var data = parseProduct(body, true);
  if (data.categoryId) DB.findOrThrow('categories', data.categoryId, 'ไม่พบหมวดหมู่');
  applyUnit(data);
  if (data.sku) assertUnique('products', 'sku', data.sku, previous.id);
  if (data.barcode) assertUnique('products', 'barcode', data.barcode, previous.id);
  if (body.barcode !== undefined && !data.barcode) data.barcode = '';
  var result = DB.update('products', previous.id, data);
  if (result.barcode === '') result.barcode = null;
  writeAudit(ctx, { action: 'UPDATE', module: 'PRODUCT', recordId: previous.id, previousValue: previous, updatedValue: result });
  return { body: { success: true, data: result } };
}, { write: true });
route('DELETE', '/products/:id', function (ctx) {
  authorize(ctx, WAREHOUSE);
  var product = clean(DB.findOrThrow('products', ctx.params.id, 'ไม่พบสินค้า'));
  if (product.stockQuantity !== 0) throw httpError(409, 'ลบสินค้าได้เมื่อยอดคงเหลือเป็นศูนย์เท่านั้น');
  var used = DB.all('stock_movements').some(function (m) { return m.productId === product.id; })
    || DB.all('requisition_items').some(function (i) { return i.productId === product.id; });
  if (used) throw httpError(409, 'สินค้ามีประวัติการเคลื่อนไหว ไม่สามารถลบได้');
  DB.remove('products', product.id);
  writeAudit(ctx, { action: 'DELETE', module: 'PRODUCT', recordId: product.id, previousValue: product });
  return { body: { success: true } };
}, { write: true });

/* ---------- uploads (เก็บรูปใน Google Drive) ---------- */
route('POST', '/uploads/product-image', function (ctx) {
  authorize(ctx, WAREHOUSE);
  var file = ctx.body && ctx.body.file;
  if (!file || !file.base64) throw httpError(400, 'กรุณาเลือกไฟล์ภาพ');
  var bytes = Utilities.base64Decode(file.base64);
  if (bytes.length > 5 * 1024 * 1024) throw httpError(400, 'ไฟล์มีขนาดใหญ่หรือจำนวนฟิลด์เกินกำหนด');
  var b = function (i) { return (bytes[i] + 256) % 256; };
  var mime = null, ext = null;
  if (b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF) { mime = 'image/jpeg'; ext = 'jpg'; }
  else if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4E && b(3) === 0x47) { mime = 'image/png'; ext = 'png'; }
  else if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) { mime = 'image/webp'; ext = 'webp'; }
  if (!mime) throw httpError(400, 'เนื้อหาไฟล์ไม่ใช่ภาพ JPG, PNG หรือ WEBP ที่รองรับ');
  var folder = getImageFolder();
  var created = folder.createFile(Utilities.newBlob(bytes, mime, Utilities.getUuid() + '.' + ext));
  created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { status: 201, body: { success: true, data: { imageUrl: 'https://drive.google.com/thumbnail?id=' + created.getId() + '&sz=w400' } } };
}, { write: true });
function getImageFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('IMAGE_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* สร้างใหม่ */ } }
  var folder = DriveApp.createFolder('WMS - รูปสินค้า');
  props.setProperty('IMAGE_FOLDER_ID', folder.getId());
  return folder;
}

/* ---------- users ---------- */
var ASSIGNABLE_ROLES = ['ADMIN', 'STAFF', 'WAREHOUSE_STAFF', 'USER'];
function roleIdOf(name) {
  var role = DB.all('roles').filter(function (r) { return r.name === name; })[0];
  if (!role) throw httpError(400, 'ไม่พบสิทธิ์ ' + name);
  return role.id;
}
route('GET', '/users', function (ctx) {
  authorize(ctx, ADMINS);
  var p = pageParams(ctx.query);
  var search = String(ctx.query.search || '').trim();
  var rows = DB.all('users').filter(function (u) { return !search || contains(u.name, search) || contains(u.email, search); })
    .sort(desc('createdAt'));
  return { body: { success: true, data: paginate(rows, p).map(userOut), pagination: { total: rows.length } } };
});
route('POST', '/users', function (ctx) {
  authorize(ctx, ADMINS);
  var b = ctx.body;
  var name = str(b.name, { required: true, max: 120, label: 'ชื่อ' });
  var email = str(b.email, { required: true, max: 254, label: 'อีเมล' }).toLowerCase();
  if (!isEmail(email)) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: อีเมลไม่ถูกต้อง');
  var password = String(b.password || '');
  if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw httpError(400, 'ข้อมูลไม่ถูกต้อง: รหัสผ่านต้องมีอย่างน้อย 10 ตัว มีตัวพิมพ์ใหญ่และตัวเลข');
  }
  if (ASSIGNABLE_ROLES.indexOf(b.role) < 0) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: สิทธิ์ผู้ใช้');
  var departmentId = int(b.departmentId, { min: 1 });
  if (b.role === 'USER' && !departmentId) throw httpError(400, 'ผู้ใช้ต้องสังกัดแผนกเพื่อส่งคำขอเบิก');
  if (departmentId) DB.findOrThrow('departments', departmentId, 'ไม่พบแผนก');
  assertUnique('users', 'email', email);
  var user = DB.insert('users', { name: name, email: email, passwordHash: hashPassword(password), roleId: roleIdOf(b.role), departmentId: departmentId, active: true });
  var out = pick(user, ['id', 'name', 'email', 'active']);
  writeAudit(ctx, { action: 'CREATE', module: 'USER', recordId: user.id, updatedValue: out });
  return { status: 201, body: { success: true, data: out } };
}, { write: true });
route('PATCH', '/users/:id/status', function (ctx) {
  authorize(ctx, ADMINS);
  var id = Number(ctx.params.id);
  if (typeof ctx.body.active !== 'boolean') throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  var active = ctx.body.active;
  if (id === ctx.user.id && !active) throw httpError(400, 'ไม่สามารถปิดใช้งานบัญชีตัวเองได้');
  var target = DB.findOrThrow('users', id, 'ไม่พบผู้ใช้');
  if (roleName(target.roleId) === 'SUPER_ADMIN' && ctx.user.role !== 'SUPER_ADMIN') throw httpError(403, 'ไม่มีสิทธิ์เปลี่ยนสถานะบัญชี Super Admin');
  var updated = DB.update('users', id, { active: active });
  var out = pick(updated, ['id', 'name', 'active']);
  writeAudit(ctx, { action: active ? 'ACTIVATE' : 'DEACTIVATE', module: 'USER', recordId: id, updatedValue: out });
  return { body: { success: true, data: out } };
}, { write: true });
route('PUT', '/users/:id', function (ctx) {
  authorize(ctx, ADMINS);
  var id = Number(ctx.params.id);
  var b = ctx.body;
  var patch = {};
  if (b.name !== undefined) patch.name = str(b.name, { required: true, max: 120, label: 'ชื่อ' });
  if (b.email !== undefined) {
    patch.email = str(b.email, { required: true, max: 254 }).toLowerCase();
    if (!isEmail(patch.email)) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: อีเมลไม่ถูกต้อง');
  }
  if (b.role !== undefined && ASSIGNABLE_ROLES.indexOf(b.role) < 0) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: สิทธิ์ผู้ใช้');
  if (b.departmentId !== undefined) patch.departmentId = int(b.departmentId, { min: 1 });
  if (!Object.keys(patch).length && !b.role) throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  if (id === ctx.user.id && b.role) throw httpError(400, 'ไม่สามารถเปลี่ยนสิทธิ์บัญชีตัวเองได้');
  var target = DB.findOrThrow('users', id, 'ไม่พบผู้ใช้');
  if (roleName(target.roleId) === 'SUPER_ADMIN') throw httpError(403, 'ไม่สามารถแก้ไขบัญชี Super Admin ได้');
  var departmentId = b.departmentId !== undefined ? patch.departmentId : target.departmentId;
  var role = b.role || roleName(target.roleId);
  if (role === 'USER' && !departmentId) throw httpError(400, 'ผู้ใช้ต้องสังกัดแผนกเพื่อส่งคำขอเบิก');
  if (departmentId) DB.findOrThrow('departments', departmentId, 'ไม่พบแผนก');
  if (patch.email) assertUnique('users', 'email', patch.email, id);
  if (b.role) patch.roleId = roleIdOf(b.role);
  if (b.departmentId !== undefined && patch.departmentId === null) patch.departmentId = '';
  var previous = userOut(target);
  var updated = DB.update('users', id, patch);
  if (updated.departmentId === '') updated.departmentId = null;
  var out = userOut(DB.find('users', id));
  writeAudit(ctx, { action: 'UPDATE', module: 'USER', recordId: id, previousValue: previous, updatedValue: out });
  return { body: { success: true, data: out } };
}, { write: true });

/* ---------- stock movements ---------- */
route('GET', '/movements', function (ctx) {
  var p = pageParams(ctx.query);
  var q = ctx.query;
  var from = q.from ? new Date(q.from).toISOString() : null;
  var to = q.to ? new Date(q.to).toISOString() : null;
  var rows = DB.all('stock_movements').filter(function (m) {
    if (q.type && m.type !== q.type) return false;
    if (q.productId && m.productId !== Number(q.productId)) return false;
    if (from && m.movementDate < from) return false;
    if (to && m.movementDate > to) return false;
    if (ctx.user.role === 'STAFF' && m.createdById !== ctx.user.id) return false;
    return true;
  }).sort(desc('movementDate'));
  return { body: { success: true, data: paginate(rows, p).map(movementOut), pagination: { total: rows.length, page: p.page, limit: p.limit } } };
});
route('POST', '/movements/:type', function (ctx) {
  authorize(ctx, WAREHOUSE);
  var t = ctx.params.type;
  if (t !== 'in' && t !== 'out') throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  if (t === 'out') throw httpError(409, 'การจ่ายวัสดุต้องดำเนินการจากคำขอเบิกที่ได้รับอนุมัติแล้ว');
  var b = ctx.body;
  var body = {
    productId: int(b.productId, { required: true, min: 1, label: 'สินค้า' }),
    quantity: int(b.quantity, { required: true, min: 1, label: 'จำนวน' }),
    unitCost: num(b.unitCost, { min: 0 }),
    movementDate: b.movementDate ? new Date(b.movementDate) : new Date(),
    documentNumber: str(b.documentNumber, { max: 100 }),
    supplierId: int(b.supplierId, { min: 1 }),
    departmentId: int(b.departmentId, { min: 1 }),
    requesterName: str(b.requesterName, { max: 120 }),
    purpose: str(b.purpose, { max: 500 }),
    notes: str(b.notes, { max: 2000 }),
    referenceKey: str(b.referenceKey, { required: true, max: 120, label: 'referenceKey' })
  };
  if (isNaN(body.movementDate.getTime())) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: วันที่');
  if (body.referenceKey.length < 8) throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  if (!body.supplierId) throw httpError(400, 'กรุณาระบุผู้จำหน่าย');
  DB.findOrThrow('suppliers', body.supplierId, 'ไม่พบผู้จำหน่าย');
  if (DB.all('stock_movements').some(function (m) { return m.referenceKey === body.referenceKey; })) throw httpError(409, 'รายการซ้ำ');
  var product = DB.find('products', body.productId);
  if (!product) throw httpError(404, 'ไม่พบสินค้า');
  var productPatch = { stockQuantity: product.stockQuantity + body.quantity };
  if (body.unitCost != null) productPatch.costPrice = body.unitCost;
  DB.update('products', product.id, productPatch);
  body.movementDate = body.movementDate.toISOString();
  body.type = 'STOCK_IN';
  body.createdById = ctx.user.id;
  var result = DB.insert('stock_movements', body);
  result.product = clean(DB.find('products', product.id));
  writeAudit(ctx, { action: 'STOCK_IN', module: 'STOCK_MOVEMENT', recordId: result.id, updatedValue: result });
  return { status: 201, body: { success: true, data: result } };
}, { write: true });

/* ---------- requisitions ---------- */
route('GET', '/requisitions/notifications', function (ctx) {
  var limit = Math.min(50, Math.max(1, Number(ctx.query.limit) || 20));
  var mine = DB.all('notifications').filter(function (n) { return n.userId === ctx.user.id; });
  var data = mine.slice().sort(desc('createdAt')).slice(0, limit).map(clean);
  var unread = mine.filter(function (n) { return !n.readAt; }).length;
  return { body: { success: true, data: data, unreadCount: unread } };
});
route('PATCH', '/requisitions/notifications/read-all', function (ctx) {
  var now = new Date().toISOString();
  var count = 0;
  DB.all('notifications').forEach(function (n) {
    if (n.userId === ctx.user.id && !n.readAt) { DB.update('notifications', n.id, { readAt: now }); count++; }
  });
  return { body: { success: true, data: { updated: count } } };
}, { write: true });
route('PATCH', '/requisitions/notifications/:id/read', function (ctx) {
  var n = DB.find('notifications', ctx.params.id);
  var count = 0;
  if (n && n.userId === ctx.user.id && !n.readAt) { DB.update('notifications', n.id, { readAt: new Date().toISOString() }); count = 1; }
  return { body: { success: true, data: { updated: count } } };
}, { write: true });

route('GET', '/requisitions', function (ctx) {
  var page = Math.max(1, Number(ctx.query.page) || 1);
  var limit = Math.min(100, Math.max(1, Number(ctx.query.limit) || 20));
  var status = ctx.query.status;
  if (status && ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'].indexOf(status) < 0) throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  var search = String(ctx.query.search || '').trim();
  var rows = DB.all('requisitions').filter(function (r) {
    if (ctx.user.role === 'USER' && r.requesterId !== ctx.user.id) return false;
    if (status && r.status !== status) return false;
    if (search && !contains(r.requestNumber, search)) return false;
    return true;
  }).sort(desc('createdAt'));
  var data = rows.slice((page - 1) * limit, page * limit).map(requisitionOut);
  return { body: { success: true, data: data, pagination: { total: rows.length, page: page, limit: limit } } };
});
route('POST', '/requisitions', function (ctx) {
  authorize(ctx, ['USER']);
  var b = ctx.body;
  var departmentId = int(b.departmentId, { required: true, min: 1, label: 'แผนก' });
  var purpose = str(b.purpose, { required: true, max: 500, label: 'วัตถุประสงค์' });
  var items = Array.isArray(b.items) ? b.items : [];
  if (!items.length || items.length > 30) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: รายการวัสดุ');
  var seen = {};
  items = items.map(function (i) {
    var item = { productId: int(i.productId, { required: true, min: 1 }), quantity: int(i.quantity, { required: true, min: 1, label: 'จำนวน' }) };
    if (seen[item.productId]) throw httpError(400, 'ห้ามเลือกวัสดุซ้ำในคำขอเดียว');
    seen[item.productId] = true;
    DB.findOrThrow('products', item.productId, 'ไม่พบสินค้า');
    return item;
  });
  var requester = DB.find('users', ctx.user.id);
  if (!requester || !requester.departmentId || requester.departmentId !== departmentId) {
    throw httpError(403, 'คำขอเบิกต้องใช้แผนกที่กำหนดให้บัญชีของคุณ');
  }
  var requestNumber = 'REQ-' + Date.now() + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  var requisition = DB.insert('requisitions', { requestNumber: requestNumber, requesterId: ctx.user.id, departmentId: departmentId, purpose: purpose, status: 'PENDING' });
  items.forEach(function (i) { DB.insert('requisition_items', { requisitionId: requisition.id, productId: i.productId, quantity: i.quantity }); });
  var out = requisitionOut(DB.find('requisitions', requisition.id));
  notifyUsers(activeUsersWithRoles(ADMINS).map(function (u) { return u.id; }), {
    requisitionId: requisition.id, type: 'REQUISITION_CREATED', title: 'มีคำขอเบิกรอพิจารณา', message: requestNumber + ' จาก ' + ctx.user.name
  });
  writeAudit(ctx, { action: 'CREATE', module: 'REQUISITION', recordId: requisition.id, updatedValue: out });
  return { status: 201, body: { success: true, data: out } };
}, { write: true });
route('PATCH', '/requisitions/:id/decision', function (ctx) {
  authorize(ctx, ADMINS);
  var decision = ctx.body.decision;
  if (decision !== 'APPROVED' && decision !== 'REJECTED') throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  var note = str(ctx.body.decisionNote, { max: 500 });
  if (decision === 'REJECTED' && !note) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: กรุณาระบุเหตุผลในการปฏิเสธ');
  var existing = DB.find('requisitions', ctx.params.id);
  if (!existing) throw httpError(404, 'ไม่พบคำขอเบิก');
  if (existing.status !== 'PENDING') throw httpError(409, 'คำขอนี้ได้รับการพิจารณาแล้ว');
  var previous = requisitionOut(existing);
  if (decision === 'APPROVED') {
    // ยอดที่ถูกจองไว้แล้ว = คำขอที่อนุมัติแต่ยังไม่จ่าย
    var approvedIds = {};
    DB.all('requisitions').forEach(function (r) { if (r.status === 'APPROVED') approvedIds[r.id] = true; });
    var reserved = {};
    DB.all('requisition_items').forEach(function (i) {
      if (approvedIds[i.requisitionId]) reserved[i.productId] = (reserved[i.productId] || 0) + i.quantity;
    });
    previous.items.forEach(function (item) {
      var product = DB.find('products', item.productId);
      if (!product || product.stockQuantity - (reserved[item.productId] || 0) < item.quantity) {
        throw httpError(409, 'สต็อกที่พร้อมจ่ายไม่เพียงพอสำหรับ ' + (product ? product.name : 'วัสดุ'));
      }
    });
  }
  DB.update('requisitions', existing.id, { status: decision, decisionNote: note || null, decidedById: ctx.user.id, decidedAt: new Date().toISOString() });
  notifyUsers([existing.requesterId], {
    requisitionId: existing.id,
    type: decision === 'APPROVED' ? 'REQUISITION_APPROVED' : 'REQUISITION_REJECTED',
    title: decision === 'APPROVED' ? 'คำขอเบิกได้รับอนุมัติ' : 'คำขอเบิกถูกปฏิเสธ',
    message: existing.requestNumber + (note ? ' · ' + note : '')
  });
  if (decision === 'APPROVED') {
    notifyUsers(activeUsersWithRoles(['STAFF', 'WAREHOUSE_STAFF']).map(function (u) { return u.id; }), {
      requisitionId: existing.id, type: 'REQUISITION_APPROVED', title: 'คำขอเบิกพร้อมจ่าย',
      message: existing.requestNumber + ' รอเจ้าหน้าที่คลังดำเนินการ'
    });
  }
  var updated = requisitionOut(DB.find('requisitions', existing.id));
  writeAudit(ctx, { action: decision, module: 'REQUISITION', recordId: existing.id, previousValue: { status: previous.status }, updatedValue: { status: updated.status, decisionNote: updated.decisionNote } });
  return { body: { success: true, data: updated } };
}, { write: true });
route('POST', '/requisitions/:id/fulfill', function (ctx) {
  authorize(ctx, WAREHOUSE);
  var requisition = DB.find('requisitions', ctx.params.id);
  if (!requisition) throw httpError(404, 'ไม่พบคำขอเบิก');
  if (requisition.status !== 'APPROVED') throw httpError(409, 'จ่ายได้เฉพาะคำขอที่ได้รับอนุมัติ');
  var full = requisitionOut(requisition);
  // ตรวจทุกรายการก่อน แล้วจึงตัดสต็อก (ทั้งหมดอยู่ใน script lock จึงไม่มีการตัดซ้ำ)
  full.items.forEach(function (item) {
    var product = DB.find('products', item.productId);
    if (!product || product.stockQuantity < item.quantity) throw httpError(409, 'สต็อกของ ' + (product ? product.name : 'วัสดุ') + ' ไม่เพียงพอ');
    if (DB.all('stock_movements').some(function (m) { return m.requisitionItemId === item.id; })) throw httpError(409, 'รายการนี้ถูกจ่ายไปแล้ว');
  });
  var now = new Date().toISOString();
  full.items.forEach(function (item) {
    var product = DB.find('products', item.productId);
    DB.update('products', product.id, { stockQuantity: product.stockQuantity - item.quantity });
    DB.insert('stock_movements', {
      type: 'STOCK_OUT', productId: item.productId, quantity: item.quantity, movementDate: now, departmentId: requisition.departmentId,
      requesterName: full.requester ? full.requester.name : null, purpose: requisition.purpose, documentNumber: requisition.requestNumber,
      referenceKey: 'requisition-item-' + item.id, requisitionItemId: item.id, createdById: ctx.user.id
    });
  });
  DB.update('requisitions', requisition.id, { status: 'FULFILLED' });
  notifyUsers([requisition.requesterId], {
    requisitionId: requisition.id, type: 'REQUISITION_FULFILLED', title: 'จ่ายวัสดุตามคำขอแล้ว',
    message: requisition.requestNumber + ' ดำเนินการจ่ายวัสดุเรียบร้อย'
  });
  var updated = requisitionOut(DB.find('requisitions', requisition.id));
  writeAudit(ctx, { action: 'FULFILL', module: 'REQUISITION', recordId: requisition.id, previousValue: { status: 'APPROVED' }, updatedValue: { status: 'FULFILLED' } });
  return { body: { success: true, data: updated } };
}, { write: true });

/* ---------- dashboard ---------- */
route('GET', '/dashboard', function (ctx) {
  var now = Date.now();
  var currentStart = new Date(now - 30 * 86400000).toISOString();
  var previousStart = new Date(now - 60 * 86400000).toISOString();
  var nowIso = new Date(now).toISOString();
  var products = DB.all('products');
  var movements = DB.all('stock_movements');
  var requisitions = DB.all('requisitions');
  function countIn(rows, field, from, to, extra) {
    return rows.filter(function (r) { return r[field] >= from && r[field] < to && (!extra || extra(r)); }).length;
  }
  var isIn = function (m) { return m.type === 'STOCK_IN'; };
  var isOut = function (m) { return m.type === 'STOCK_OUT'; };
  var currentIn = countIn(movements, 'movementDate', currentStart, nowIso + 'z', isIn);
  var previousIn = countIn(movements, 'movementDate', previousStart, currentStart, isIn);
  var currentOut = countIn(movements, 'movementDate', currentStart, nowIso + 'z', isOut);
  var previousOut = countIn(movements, 'movementDate', previousStart, currentStart, isOut);
  var productsCurrent = countIn(products, 'createdAt', currentStart, nowIso + 'z');
  var productsPrevious = countIn(products, 'createdAt', previousStart, currentStart);
  var requestsCurrent = countIn(requisitions, 'createdAt', currentStart, nowIso + 'z');
  var requestsPrevious = countIn(requisitions, 'createdAt', previousStart, currentStart);
  var lowList = products.filter(function (p) { return p.stockQuantity > 0 && p.stockQuantity <= p.minimumStock; });
  var outOfStock = products.filter(function (p) { return p.stockQuantity === 0; }).length;
  var percentage = function (c, p) { return p === 0 ? (c === 0 ? 0 : null) : Math.round(((c - p) / p) * 100); };
  var chartMap = {};
  var start = new Date(); start.setDate(1); start.setMonth(start.getMonth() - 11); start.setHours(0, 0, 0, 0);
  movements.forEach(function (m) {
    var d = new Date(m.movementDate);
    if (d < start) return;
    var key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!chartMap[key]) chartMap[key] = { month: key, stockIn: 0, stockOut: 0 };
    chartMap[key][m.type === 'STOCK_IN' ? 'stockIn' : 'stockOut'] += m.quantity;
  });
  var recentRows = movements.filter(function (m) { return ctx.user.role !== 'STAFF' || m.createdById === ctx.user.id; })
    .sort(desc('createdAt')).slice(0, 8).map(function (m) {
      var o = clean(m); var p = DB.find('products', m.productId); var u = DB.find('users', m.createdById);
      o.product = p ? { name: p.name, sku: p.sku } : null; o.createdBy = { name: u ? u.name : null }; return o;
    });
  return {
    body: {
      success: true,
      data: {
        cards: {
          totalProducts: products.length,
          totalStock: products.reduce(function (s, p) { return s + (p.stockQuantity || 0); }, 0),
          lowStock: lowList.length,
          outOfStock: outOfStock,
          monthlyRequests: requestsCurrent,
          inventoryValue: products.reduce(function (s, p) { return s + (p.costPrice || 0) * (p.stockQuantity || 0); }, 0),
          stockIn: movements.filter(isIn).length,
          stockOut: movements.filter(isOut).length
        },
        trends: {
          productsAdded: { current: productsCurrent, previous: productsPrevious, percent: percentage(productsCurrent, productsPrevious) },
          stockIn: { current: currentIn, previous: previousIn, percent: percentage(currentIn, previousIn) },
          stockOut: { current: currentOut, previous: previousOut, percent: percentage(currentOut, previousOut) },
          requests: { current: requestsCurrent, previous: requestsPrevious, percent: percentage(requestsCurrent, requestsPrevious) }
        },
        stockStatus: [
          { name: 'ปกติ', value: products.filter(function (p) { return p.stockQuantity > p.minimumStock; }).length, color: '#16A36A' },
          { name: 'ใกล้หมด', value: lowList.length, color: '#F59E0B' },
          { name: 'หมด', value: outOfStock, color: '#EF4444' }
        ],
        lowStockItems: lowList.sort(function (a, b) { return a.stockQuantity - b.stockQuantity; }).slice(0, 5)
          .map(function (p) { return pick(p, ['id', 'name', 'sku', 'unit', 'stockQuantity', 'minimumStock']); }),
        chart: Object.keys(chartMap).sort().map(function (k) { return chartMap[k]; }),
        recent: recentRows
      }
    }
  };
});

/* ---------- reports ---------- */
function stockRows(q) {
  return filterProducts(q).sort(byName).map(function (p) {
    var o = productOut(p); o.inventoryValue = (p.costPrice || 0) * (p.stockQuantity || 0); return o;
  });
}
function movementRows(q) {
  var dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if ((q.from && !dateRe.test(q.from)) || (q.to && !dateRe.test(q.to))) throw httpError(400, 'ข้อมูลไม่ถูกต้อง: วันที่');
  var from = q.from ? q.from + 'T00:00:00.000Z' : null;
  var to = q.to ? q.to + 'T23:59:59.999Z' : null;
  if (from && to && from > to) throw httpError(400, 'วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด');
  var search = String(q.search || '').trim();
  return DB.all('stock_movements').filter(function (m) {
    if (q.type && m.type !== q.type) return false;
    if (q.productId && m.productId !== Number(q.productId)) return false;
    if (from && m.movementDate < from) return false;
    if (to && m.movementDate > to) return false;
    if (search) {
      var p = DB.find('products', m.productId);
      if (!p || !['sku', 'barcode', 'name'].some(function (f) { return contains(p[f], search); })) return false;
    }
    return true;
  }).sort(desc('movementDate')).slice(0, 5000).map(function (m) {
    var o = movementOut(m);
    o.product = productOut(DB.find('products', m.productId));
    return o;
  });
}
route('GET', '/reports/stock', function (ctx) { return { body: { success: true, data: stockRows(ctx.query) } }; });
route('GET', '/reports/movements', function (ctx) {
  var rows = movementRows(ctx.query).filter(function (m) { return ctx.user.role !== 'STAFF' || m.createdById === ctx.user.id; });
  return { body: { success: true, data: rows } };
});
route('GET', '/reports/audit-logs', function (ctx) {
  authorize(ctx, ADMINS);
  var limit = Math.min(200, Math.max(1, Number(ctx.query.limit) || 50));
  var data = DB.all('audit_logs').slice().sort(function (a, b) { return b.id - a.id; }).slice(0, limit).map(function (l) {
    var o = clean(l); var u = l.userId ? DB.find('users', l.userId) : null;
    o.user = u ? { name: u.name, email: u.email } : null; return o;
  });
  return { body: { success: true, data: data } };
});
route('GET', '/reports/export/:format', function (ctx) {
  authorize(ctx, ADMINS);
  var format = ctx.params.format;
  if (['xlsx', 'pdf', 'csv'].indexOf(format) < 0) throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  var report = String(ctx.query.report || ctx.query.type || 'stock');
  if (report !== 'stock' && report !== 'movements') throw httpError(400, 'ข้อมูลไม่ถูกต้อง');
  var q = {}; for (var k in ctx.query) q[k] = ctx.query[k];
  q.type = ctx.query.movementType;
  var rows;
  if (report === 'stock') {
    rows = [['SKU', 'สินค้า', 'หมวดหมู่', 'คงเหลือ', 'ขั้นต่ำ', 'ราคาทุน', 'มูลค่าคงคลัง']].concat(stockRows(q).map(function (p) {
      return [p.sku, p.name, p.category ? p.category.name : '', p.stockQuantity, p.minimumStock, p.costPrice, p.inventoryValue];
    }));
  } else {
    rows = [['วันที่', 'ประเภท', 'SKU', 'สินค้า', 'จำนวน', 'ราคาทุนต่อหน่วย', 'เอกสาร', 'ผู้ทำรายการ']].concat(movementRows(q).map(function (m) {
      return [m.movementDate, m.type === 'STOCK_IN' ? 'รับเข้า' : 'เบิกออก', m.product ? m.product.sku : '', m.product ? m.product.name : '',
        m.quantity, m.unitCost == null ? '' : m.unitCost, m.documentNumber || '', m.createdBy ? m.createdBy.name : ''];
    }));
  }
  var filename = 'wms-' + report + '-' + new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    var csv = '﻿' + rows.map(function (row) {
      return row.map(function (v) {
        var text = v == null ? '' : String(v);
        if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\r\n');
    return { file: { base64: Utilities.base64Encode(csv, Utilities.Charset.UTF_8), mimeType: 'text/csv;charset=utf-8', filename: filename + '.csv' } };
  }
  return { file: exportViaSheets(rows, report === 'stock' ? 'รายงานสินค้าคงคลัง' : 'รายงานความเคลื่อนไหว', format, filename) };
});
function exportViaSheets(rows, title, format, filename) {
  var temp = SpreadsheetApp.create(filename);
  try {
    var sheet = temp.getSheets()[0];
    sheet.setName(title.slice(0, 90));
    sheet.getRange(1, 1, 1, 1).setValue(title).setFontSize(14).setFontWeight('bold').setFontColor('#153A5B');
    var range = sheet.getRange(3, 1, rows.length, rows[0].length);
    range.setValues(rows.map(function (r) { return r.map(function (v) { return v == null ? '' : v; }); }));
    sheet.getRange(3, 1, 1, rows[0].length).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#153A5B');
    sheet.autoResizeColumns(1, rows[0].length);
    SpreadsheetApp.flush();
    var url = 'https://docs.google.com/spreadsheets/d/' + temp.getId() + '/export?format=' + format +
      (format === 'pdf' ? '&size=A4&portrait=false&fitw=true&gridlines=false&sheetnames=false&printtitle=false' : '');
    var response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) throw httpError(500, 'ส่งออกไฟล์ไม่สำเร็จ');
    var mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return { base64: Utilities.base64Encode(response.getBlob().getBytes()), mimeType: mime, filename: filename + '.' + format };
  } finally {
    DriveApp.getFileById(temp.getId()).setTrashed(true);
  }
}

/* =====================================================================
 * Request handling
 * ===================================================================== */
function handle(request) {
  DB.reset();
  var method = String(request.method || 'GET').toUpperCase();
  var fullPath = String(request.path || '/').split('?')[0].replace(/^\/api/, '') || '/';
  var query = request.query || {};
  for (var k in query) if (query[k] === undefined || query[k] === null) delete query[k];
  var ctx = { method: method, path: fullPath, query: query, body: request.body || {}, token: request.token || null, params: {} };
  var matched = null;
  for (var i = 0; i < ROUTES.length; i++) {
    var r = ROUTES[i];
    if (r.method !== method) continue;
    var m = r.regex.exec(fullPath);
    if (m) { matched = r; r.keys.forEach(function (key, idx) { ctx.params[key] = decodeURIComponent(m[idx + 1]); }); break; }
  }
  if (!matched) return { status: 404, body: { success: false, message: 'ไม่พบ API ที่ร้องขอ' } };
  var lock = null;
  try {
    if (matched.opts.write) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(25000)) throw httpError(503, 'ระบบกำลังทำงานหนัก กรุณาลองใหม่อีกครั้ง');
      DB.reset();
    }
    if (!matched.opts.public) authenticate(ctx);
    var result = matched.handler(ctx) || {};
    if (result.file) return { status: 200, file: result.file };
    return { status: result.status || 200, body: result.body };
  } catch (error) {
    if (error && error.status) return { status: error.status, body: { success: false, message: error.message } };
    console.error(error && error.stack ? error.stack : error);
    return { status: 500, body: { success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' } };
  } finally {
    if (lock) { SpreadsheetApp.flush(); lock.releaseLock(); }
  }
}

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  var request;
  try { request = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOutput({ status: 400, body: { success: false, message: 'JSON ไม่ถูกต้อง' } }); }
  return jsonOutput(handle(request));
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.path) return jsonOutput(handle({ method: 'GET', path: p.path, query: p, token: p.token }));
  return jsonOutput(handle({ method: 'GET', path: '/health' }));
}

/* =====================================================================
 * ติดตั้งครั้งแรก — กดเรียกใช้ฟังก์ชันนี้หนึ่งครั้งใน Apps Script
 * ===================================================================== */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; } }
  if (!ss) ss = SpreadsheetApp.create('WMS ฐานข้อมูลระบบเบิก-จ่ายวัสดุ');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  getSecret();
  DB._ss = ss;

  Object.keys(TABLES).forEach(function (table) {
    var sheet = ss.getSheetByName(table) || ss.insertSheet(table);
    var columns = TABLES[table];
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]).setFontWeight('bold').setBackground('#E8EEF5');
    sheet.getRange(1, 1, sheet.getMaxRows(), columns.length).setNumberFormat('@');
    sheet.setFrozenRows(1);
  });
  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  DB.reset();

  ROLE_NAMES.forEach(function (name) {
    if (!DB.all('roles').some(function (r) { return r.name === name; })) DB.insert('roles', { name: name });
  });
  DEFAULT_UNITS.forEach(function (name) {
    if (!DB.all('units').some(function (u) { return u.name === name; })) DB.insert('units', { name: name, isActive: true });
  });

  var email = 'admin@wms.local';
  var existing = DB.all('users').filter(function (u) { return u.email === email; })[0];
  if (existing) {
    Logger.log('ติดตั้งเรียบร้อย (มีบัญชีผู้ดูแลอยู่แล้ว: ' + email + ')');
    return;
  }
  var password = randomPassword();
  DB.insert('users', { name: 'System Administrator', email: email, passwordHash: hashPassword(password), roleId: roleIdOf('SUPER_ADMIN'), active: true });
  Logger.log('===============================================');
  Logger.log('ติดตั้งเรียบร้อย ฐานข้อมูล: ' + ss.getUrl());
  Logger.log('บัญชีผู้ดูแลระบบ  อีเมล: ' + email + '   รหัสผ่าน: ' + password);
  Logger.log('กรุณาจดรหัสผ่านไว้ และเปลี่ยนรหัสหลังเข้าสู่ระบบครั้งแรก');
  Logger.log('===============================================');
}

/** ลืมรหัส admin: แก้อีเมลด้านล่างแล้วกดเรียกใช้ จะสุ่มรหัสใหม่ให้ใน log */
function resetAdminPassword() {
  var email = 'admin@wms.local';
  var user = DB.all('users').filter(function (u) { return u.email === email; })[0];
  if (!user) throw new Error('ไม่พบบัญชี ' + email);
  var password = randomPassword();
  DB.update('users', user.id, { passwordHash: hashPassword(password), active: true });
  Logger.log('รหัสผ่านใหม่ของ ' + email + ' คือ ' + password);
}
