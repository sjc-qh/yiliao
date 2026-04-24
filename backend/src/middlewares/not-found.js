import { fail } from "../utils/response.js";

export function notFoundHandler(_req, res) {
  return fail(res, 404, "接口不存在");
}
