import type { ConfigIssue } from '@easy-cookie/core/shared';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Thrown by handlers; rendered as `{ error: { code, message, issues? } }`. */
export class ApiError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
    public issues?: ConfigIssue[],
  ) {
    super(message);
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.issues ? { issues: this.issues } : {}) } };
  }
}

export const badRequest = (message: string, code = 'bad_request') => new ApiError(400, code, message);
export const notFound = (message = 'Not found') => new ApiError(404, 'not_found', message);
export const unauthorized = (message = 'Unauthorized') => new ApiError(401, 'unauthorized', message);
export const forbidden = (message: string, code = 'forbidden') => new ApiError(403, code, message);
