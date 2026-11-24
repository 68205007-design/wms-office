export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new AppError(400, msg, details);
export const unauthorized = (msg = 'กรุณาเข้าสู่ระบบ') => new AppError(401, msg);
export const forbidden = (msg = 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้') => new AppError(403, msg);
export const notFound = (msg = 'ไม่พบข้อมูล') => new AppError(404, msg);
export const conflict = (msg) => new AppError(409, msg);

/** ห่อ async handler ให้ส่ง error ไปที่ error middleware */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
