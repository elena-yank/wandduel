import type { Response, RequestHandler } from "express";

export function jsonOk<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function jsonError(res: Response, message: string, status = 400) {
  return res.status(status).json({ ok: false, error: { message } });
}

export function asyncHandler<T extends RequestHandler>(fn: T): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}