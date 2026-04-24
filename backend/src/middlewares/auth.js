import { fail } from "../utils/response.js";
import { verifyToken } from "../utils/jwt.js";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return fail(res, 401, "访问令牌缺失");
  }

  try {
    const payload = verifyToken(token);

    req.user = {
      ...payload,
      userId: payload.userId ?? payload.id,
      id: payload.id ?? payload.userId,
    };

    if (!req.user.userId) {
      return fail(res, 401, "无效的访问令牌");
    }

    next();
  } catch (_error) {
    return fail(res, 401, "无效的访问令牌");
  }
}
///xiamian
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "未认证" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "权限不足" });
    }
    next();
  };
}
