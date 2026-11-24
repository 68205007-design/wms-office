import prisma from '../lib/prisma.js';

export const DEFAULT_SETTINGS = {
  'org.name': 'สำนักงานตัวอย่าง',
  'org.shortName': 'WMS',
  'org.address': '',
  'org.phone': '',
  'org.email': '',
  'stock.defaultMinQuantity': 10,
  'notify.lowStock': true,
  'notify.outOfStock': true,
  'notify.newRequest': true,
  'notify.requestResult': true,
};

export async function getSettings(client = prisma) {
  const rows = await client.setting.findMany();
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result;
}

export async function saveSettings(values, client = prisma) {
  const keys = Object.keys(values).filter((k) => k in DEFAULT_SETTINGS);
  for (const key of keys) {
    const value = JSON.stringify(values[key]);
    await client.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  return getSettings(client);
}
