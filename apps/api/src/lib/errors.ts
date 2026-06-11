export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (msg: string, details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', msg, details);

export const Unauthorized = (msg = 'Tidak terautentikasi') =>
  new HttpError(401, 'UNAUTHORIZED', msg);

export const Forbidden = (msg = 'Akses ditolak') =>
  new HttpError(403, 'FORBIDDEN', msg);

export const NotFound = (msg = 'Tidak ditemukan') =>
  new HttpError(404, 'NOT_FOUND', msg);

export const Conflict = (msg: string) =>
  new HttpError(409, 'CONFLICT', msg);
