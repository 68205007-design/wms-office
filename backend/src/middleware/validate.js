/** ตรวจสอบ req.body / req.query ด้วย zod schema แล้วแทนที่ด้วยค่าที่ผ่านการ parse */
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
