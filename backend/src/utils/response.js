export function ok(res, data, message = "ok", status = 200) {
  res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function fail(res, status, error) {
  res.status(status).json({
    success: false,
    error,
  });
}
