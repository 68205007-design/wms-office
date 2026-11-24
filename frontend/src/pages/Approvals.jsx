import { useSearchParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { RequisitionList } from '../components/RequisitionViews';

export default function Approvals() {
  const [params] = useSearchParams();
  return (
    <div>
      <PageHeader icon={CheckSquare} title="อนุมัติรายการ" description="ตรวจสอบและอนุมัติคำขอเบิกวัสดุ — เมื่ออนุมัติ ระบบจะตัดสต็อกอัตโนมัติ" />
      <RequisitionList mode="approve" defaultStatus={params.get('id') ? '' : 'PENDING'} />
    </div>
  );
}
