import { fail } from "../utils/response.js";

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, "无权访问该接口");
    }
    next();
  };
}
