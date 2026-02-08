
// =====================
// Base Error
// =====================
export abstract class CarrierServiceError extends Error {
  abstract readonly code: string;
  abstract readonly isRetryable: boolean;
  readonly timestamp: Date;
  readonly carrier?: string;
  readonly requestId?: string;
  readonly originalError?: Error;

  constructor(
    message: string,
    options?: {
      carrier?: string;
      requestId?: string;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.carrier = options?.carrier;
    this.requestId = options?.requestId;
    this.originalError = options?.originalError;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      carrier: this.carrier,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

// =====================
// Validation Errors
// =====================
export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

export class ValidationError extends CarrierServiceError {
  readonly code = 'VALIDATION_ERROR';
  readonly isRetryable = false;
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[], options?: { carrier?: string }) {
    super(message, options);
    this.issues = issues;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), issues: this.issues };
  }
}

// =====================
// Authentication Errors
// =====================
export class AuthenticationError extends CarrierServiceError {
  readonly code: string = 'AUTHENTICATION_ERROR';
  readonly isRetryable = false;
  readonly httpStatus?: number;

  constructor(
    message: string,
    options?: {
      carrier?: string;
      httpStatus?: number;
      originalError?: Error;
    }
  ) {
    super(message, options);
    this.httpStatus = options?.httpStatus;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), httpStatus: this.httpStatus };
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  override readonly code: string = 'INVALID_CREDENTIALS';

  constructor(carrier: string) {
    super(`Invalid or missing credentials for ${carrier}`, { carrier });
  }
}

// =====================
// Network Errors
// =====================
export class TimeoutError extends CarrierServiceError {
  readonly code = 'TIMEOUT_ERROR';
  readonly isRetryable = true;
  readonly timeoutMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    options?: { carrier?: string; requestId?: string }
  ) {
    super(message, options);
    this.timeoutMs = timeoutMs;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), timeoutMs: this.timeoutMs };
  }
}

export class NetworkError extends CarrierServiceError {
  readonly code = 'NETWORK_ERROR';
  readonly isRetryable = true;

  constructor(message: string, options?: { carrier?: string; originalError?: Error }) {
    super(message, options);
  }
}

// =====================
// API/HTTP Errors
// =====================
export class CarrierApiError extends CarrierServiceError {
  readonly code = 'CARRIER_API_ERROR';
  readonly isRetryable: boolean;
  readonly httpStatus: number;
  readonly carrierErrorCode?: string;
  readonly carrierErrorMessage?: string;

  constructor(
    message: string,
    httpStatus: number,
    options?: {
      carrier?: string;
      requestId?: string;
      carrierErrorCode?: string;
      carrierErrorMessage?: string;
      originalError?: Error;
    }
  ) {
    super(message, options);
    this.httpStatus = httpStatus;
    this.carrierErrorCode = options?.carrierErrorCode;
    this.carrierErrorMessage = options?.carrierErrorMessage;
    // only retry on server errors or rate limiting
    this.isRetryable = httpStatus >= 500 || httpStatus === 429;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      httpStatus: this.httpStatus,
      carrierErrorCode: this.carrierErrorCode,
      carrierErrorMessage: this.carrierErrorMessage,
    };
  }
}

export class RateLimitError extends CarrierServiceError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly isRetryable = true;
  readonly retryAfterSeconds?: number;

  constructor(carrier: string, options?: { retryAfterSeconds?: number; requestId?: string }) {
    super(`Rate limit exceeded for ${carrier}`, { carrier, requestId: options?.requestId });
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), retryAfterSeconds: this.retryAfterSeconds };
  }
}

// =====================
// Response/Parsing Errors
// =====================
export class ResponseParsingError extends CarrierServiceError {
  readonly code = 'RESPONSE_PARSING_ERROR';
  readonly isRetryable = false;
  readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      carrier?: string;
      requestId?: string;
      responseBody?: unknown;
      originalError?: Error;
    }
  ) {
    super(message, options);
    this.responseBody = options?.responseBody;
  }
}

// =====================
// Configuration Errors
// =====================
export class ConfigurationError extends CarrierServiceError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly isRetryable = false;
  readonly missingFields?: string[];

  constructor(message: string, options?: { carrier?: string; missingFields?: string[] }) {
    super(message, options);
    this.missingFields = options?.missingFields;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), missingFields: this.missingFields };
  }
}

// =====================
// Helpers
// =====================
export function isCarrierServiceError(error: unknown): error is CarrierServiceError {
  return error instanceof CarrierServiceError;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof CarrierServiceError) {
    return error.isRetryable;
  }
  return false;
}

export function createErrorFromHttpResponse(
  httpStatus: number,
  responseBody: unknown,
  carrier: string,
  requestId?: string
): CarrierServiceError {
  // rate limiting
  if (httpStatus === 429) {
    const retryAfter = typeof responseBody === 'object' && responseBody !== null
      ? (responseBody as Record<string, unknown>)['retryAfter']
      : undefined;
    return new RateLimitError(carrier, {
      retryAfterSeconds: typeof retryAfter === 'number' ? retryAfter : undefined,
      requestId,
    });
  }

  // auth errors
  if (httpStatus === 401 || httpStatus === 403) {
    return new AuthenticationError(`Authentication failed for ${carrier}`, { carrier, httpStatus });
  }

  // try to extract error details from response body
  let carrierErrorCode: string | undefined;
  let carrierErrorMessage: string | undefined;

  if (typeof responseBody === 'object' && responseBody !== null) {
    const body = responseBody as Record<string, unknown>;
    if (body['response'] && typeof body['response'] === 'object') {
      const response = body['response'] as Record<string, unknown>;
      if (Array.isArray(response['errors']) && response['errors'].length > 0) {
        const firstError = response['errors'][0] as Record<string, unknown>;
        carrierErrorCode = String(firstError['code'] ?? '');
        carrierErrorMessage = String(firstError['message'] ?? '');
      }
    }
  }

  return new CarrierApiError(
    carrierErrorMessage || `${carrier} API returned HTTP ${httpStatus}`,
    httpStatus,
    { carrier, requestId, carrierErrorCode, carrierErrorMessage }
  );
}
