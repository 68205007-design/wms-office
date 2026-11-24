import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Package, Search } from 'lucide-react';
import { imageSrc } from '../api/client';
import { MaterialStatusBadge } from './ui';
import { fmtNumber } from '../utils/format';

/** dropdown ค้นหาวัสดุ แสดงรหัส ชื่อ คงเหลือ */
export default function MaterialPicker({ materials, value, onChange, excludeIds = [], placeholder = 'ค้นหาและเลือกวัสดุ...', disableOut = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const selected = materials.find((m) => m.id === value);

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return materials
      .filter((m) => !excludeIds.includes(m.id) || m.id === value)
      .filter((m) => !s || m.name.toLowerCase().includes(s) || m.code.toLowerCase().includes(s))
      .slice(0, 80);
  }, [materials, q, excludeIds, value]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="input flex items-center gap-2 text-left">
        {selected ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">{selected.code}</span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift animate-scale-in">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์รหัสหรือชื่อวัสดุ" />
          </div>
          <div className="scroll-thin max-h-72 overflow-y-auto py-1">
            {list.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">ไม่พบวัสดุ</p>}
            {list.map((m) => {
              const disabled = disableOut && m.quantity <= 0;
              return (
                <button
                  type="button"
                  key={m.id}
                  disabled={disabled}
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 ${m.id === value ? 'bg-blue-50' : ''}`}
                >
                  {m.imageUrl ? (
                    <img src={imageSrc(m.imageUrl)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <Package className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{m.name}</span>
                    <span className="block text-xs text-slate-400">
                      {m.code} · คงเหลือ {fmtNumber(m.quantity)} {m.unit?.name}
                    </span>
                  </span>
                  <MaterialStatusBadge status={m.status} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
