/** สิทธิ์การเข้าถึงแต่ละหน้า/ความสามารถ ตาม Role (ต้องตรงกับฝั่ง backend) */
export const PERMISSIONS = {
  dashboard: ['ADMIN', 'WAREHOUSE', 'USER', 'APPROVER'],
  materials: ['ADMIN', 'WAREHOUSE', 'USER', 'APPROVER'],
  manageMaterials: ['ADMIN', 'WAREHOUSE'],
  stockIn: ['ADMIN', 'WAREHOUSE'],
  requisition: ['ADMIN', 'WAREHOUSE', 'USER', 'APPROVER'],
  myRequests: ['ADMIN', 'WAREHOUSE', 'USER', 'APPROVER'],
  approvals: ['ADMIN', 'APPROVER'],
  history: ['ADMIN', 'WAREHOUSE', 'USER', 'APPROVER'],
  reports: ['ADMIN', 'WAREHOUSE', 'APPROVER'],
  settings: ['ADMIN', 'WAREHOUSE', 'USER', 'APPROVER'],
  manageUsers: ['ADMIN'],
  manageMasterData: ['ADMIN', 'WAREHOUSE'],
  manageDepartments: ['ADMIN'],
  manageSystem: ['ADMIN'],
};

export const can = (user, permission) => !!user && (PERMISSIONS[permission] || []).includes(user.role);
