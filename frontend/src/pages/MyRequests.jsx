import { Link } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { RequisitionList } from '../components/RequisitionViews';

export default function MyRequests() {
  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="คำขอเบิกของฉัน"
        description="ติดตามสถานะคำขอเบิกวัสดุที่คุณส่ง"
        actions={
          <Link to="/requisition/new" className="btn-primary">
            <Plus className="h-4 w-4" /> สร้างคำขอใหม่
          </Link>
        }
      />
      <RequisitionList mode="mine" />
    </div>
  );
}
