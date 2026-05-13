export class HttpError extends Error {
  status: number;
  expose: boolean;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.expose = status < 500;
    if (details !== undefined) this.details = details;
  }

  static badRequest(message = 'Bad request', details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }
  static unauthorized(message = 'Unauthorized'): HttpError {
    return new HttpError(401, message);
  }
  static forbidden(message = 'Forbidden'): HttpError {
    return new HttpError(403, message);
  }
  static notFound(message = 'Not found'): HttpError {
    return new HttpError(404, message);
  }
  static conflict(message = 'Conflict'): HttpError {
    return new HttpError(409, message);
  }
  static badGateway(message = 'Upstream service error'): HttpError {
    return new HttpError(502, message);
  }
}
