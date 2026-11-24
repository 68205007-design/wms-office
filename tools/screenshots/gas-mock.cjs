// จำลองบริการ Google Apps Script เพื่อทดสอบ Code.gs ด้วย Node
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

function makeSheet(name) {
  const data = []; // 2D array of strings
  const sheet = {
    name,
    data,
    getName: () => name,
    setName(n) { sheet.name = n; return sheet; },
    getLastRow: () => {
      for (let i = data.length - 1; i >= 0; i--) if (data[i] && data[i].some((v) => v !== '' && v != null)) return i + 1;
      return 0;
    },
    getMaxRows: () => 1000,
    setFrozenRows: () => sheet,
    deleteRow(r) { data.splice(r - 1, 1); },
    autoResizeColumns: () => sheet,
    getRange(r, c, nr = 1, nc = 1) {
      const range = {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) row.push((data[r - 1 + i] || [])[c - 1 + j] ?? '');
            out.push(row);
          }
          return out;
        },
        setValues(vals) {
          if (vals.length !== nr || vals[0].length !== nc) throw new Error(`setValues size mismatch ${vals.length}x${vals[0].length} vs ${nr}x${nc}`);
          for (let i = 0; i < nr; i++) {
            data[r - 1 + i] = data[r - 1 + i] || [];
            for (let j = 0; j < nc; j++) {
              const v = vals[i][j];
              if (typeof v !== 'string' && v !== '' && typeof v !== 'number') throw new Error('non-string cell ' + typeof v);
              data[r - 1 + i][c - 1 + j] = v;
            }
          }
          return range;
        },
        setValue(v) { return range.setValues([[v]]); },
        setFontWeight: () => range, setBackground: () => range, setNumberFormat: () => range, setFontSize: () => range, setFontColor: () => range
      };
      return range;
    }
  };
  return sheet;
}
function makeSpreadsheet() {
  const sheets = [makeSheet('Sheet1')];
  const ss = {
    getId: () => 'SS1', getUrl: () => 'https://docs.google.com/ss1',
    getSheetByName: (n) => sheets.find((s) => s.name === n) || null,
    insertSheet: (n) => { const s = makeSheet(n); sheets.push(s); return s; },
    getSheets: () => sheets,
    deleteSheet: (s) => sheets.splice(sheets.indexOf(s), 1)
  };
  return ss;
}
const SS = makeSpreadsheet();
const props = {};
const cache = {};
const logs = [];
const toBytes = (buf) => Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
const fromBytes = (arr) => Buffer.from(arr.map((b) => (b + 256) % 256));
const asBuf = (x) => (typeof x === 'string' ? Buffer.from(x, 'utf8') : fromBytes(x));

const context = {
  console,
  SpreadsheetApp: { openById: () => SS, getActiveSpreadsheet: () => SS, create: () => SS, flush: () => {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  Session: { getScriptTimeZone: () => 'Asia/Bangkok' },
  Logger: { log: (m) => logs.push(m) },
  ContentService: { createTextOutput: (s) => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, input) => toBytes(crypto.createHash('sha256').update(asBuf(input)).digest()),
    computeHmacSha256Signature: (value, key) => toBytes(crypto.createHmac('sha256', key).update(asBuf(value)).digest()),
    base64Encode: (x) => asBuf(x).toString('base64'),
    base64EncodeWebSafe: (x) => asBuf(x).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64DecodeWebSafe: (s) => toBytes(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    base64Decode: (s) => toBytes(Buffer.from(s, 'base64')),
    newBlob: (data) => ({ getBytes: () => toBytes(asBuf(data)), getDataAsString: () => asBuf(data).toString('utf8') }),
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, fmt) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 7)
  },
  DriveApp: {}
};
vm.createContext(context);
context.UrlFetchApp = {}; context.ScriptApp = {};
module.exports = { context, SS, logs, load(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context); } };
