import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Field, Modal } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../api/client';

export function ChangePasswordForm({ onDone }) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) return setError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
      return setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรภาษาอังกฤษและตัวเลข');
    }
    setSaving(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      toast.success('เปลี่ยนรหัสผ่านเรียบร้อย');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const type = show ? 'text' : 'password';
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Field label="รหัสผ่านปัจจุบัน" required>
        <input type={type} className="input" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required autoComplete="current-password" />
      </Field>
      <Field label="รหัสผ่านใหม่" required hint="อย่างน้อย 8 ตัว มีตัวอักษรภาษาอังกฤษและตัวเลข">
        <div className="relative">
          <input type={type} className="input pr-10" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required autoComplete="new-password" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <Field label="ยืนยันรหัสผ่านใหม่" required>
        <input type={type} className="input" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required autoComplete="new-password" />
      </Field>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึกรหัสผ่านใหม่
        </button>
      </div>
    </form>
  );
}

export default function ChangePasswordModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="เปลี่ยนรหัสผ่าน" subtitle="อุปกรณ์อื่นที่เข้าสู่ระบบอยู่จะถูกออกจากระบบ" size="sm">
      <ChangePasswordForm onDone={onClose} />
    </Modal>
  );
}
