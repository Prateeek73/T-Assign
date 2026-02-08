import axios, { AxiosError, AxiosInstance } from 'axios';
import { RateRequest, RateResponse, validateRateRequest } from '../../domain';
import { ICarrierRateService, CarrierId } from '../common';
import { UPSConfig } from '../../config';
import { UPSAuthManager } from './auth';
import { toUPSRateRequest, fromUPSRateResponse } from './mapper';
import { UPSRateResponse } from './types';
import {
  ValidationError,
  CarrierApiError,
  NetworkError,
  TimeoutError,
  ResponseParsingError,
  RateLimitError,
} from '../../errors';
import { overwrite, ZodError } from 'zod';


export class UPSRateService implements ICarrierRateService {
  readonly carrierId: CarrierId;
  readonly carrierName: string;

  private readonly config: UPSConfig;
  private readonly authManager: UPSAuthManager;
  private readonly httpClient: AxiosInstance;

  constructor(config: UPSConfig, httpClient?: AxiosInstance, authManager?: UPSAuthManager) {
    this.config = config;
    this.carrierId = config.carrierId || 'UPS';
    this.carrierName = config.carrierName || 'United Parcel Service';
    this.httpClient = httpClient ?? axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
    });
    this.authManager = authManager ?? new UPSAuthManager(config, this.httpClient);
  }

  // rates
  async getRates(request: RateRequest): Promise<RateResponse> {
    const requestId = this.generateRequestId();
    const validatedRequest = this.validateRequest(request);
    const accessToken = await this.authManager.getAccessToken();

    // Prepare UPS DTO request
    const simpleRequest = {
      origin: {
        city: validatedRequest.origin.city,
        stateProvinceCode: validatedRequest.origin.stateProvinceCode,
        postalCode: validatedRequest.origin.postalCode,
        countryCode: validatedRequest.origin.countryCode,
        addressLines: validatedRequest.origin.addressLines,
      },
      destination: {
        city: validatedRequest.destination.city,
        stateProvinceCode: validatedRequest.destination.stateProvinceCode,
        postalCode: validatedRequest.destination.postalCode,
        countryCode: validatedRequest.destination.countryCode,
        addressLines: validatedRequest.destination.addressLines,
      },
      shipper: { name: validatedRequest.shipper.name },
      packages: validatedRequest.packages.map(pkg => ({
        weight: { value: pkg.weight.value, unit: pkg.weight.unit },
        dimensions: pkg.dimensions
          ? {
              length: pkg.dimensions.length,
              width: pkg.dimensions.width,
              height: pkg.dimensions.height,
              unit: pkg.dimensions.unit,
            }
          : undefined,
      })),
      // customerReference removed in simplified model
      serviceLevel: validatedRequest.serviceLevel,
    };

    const upsRequest = toUPSRateRequest(
      simpleRequest,
      this.config.accountNumber,
      undefined // customerReference removed in simplified model
    );

    // Call UPS API
    let upsResponse: UPSRateResponse;
    try {
      upsResponse = await this.callRatingApi(upsRequest, accessToken, requestId);
    } catch (error) {
      if (this.isAuthError(error)) {
        const freshToken = await this.authManager.forceRefresh();
        upsResponse = await this.callRatingApi(upsRequest, freshToken, requestId);
      } else {
        throw error;
      }
    }

    // Map to normalized RateResponse (hide all UPS details)
    return fromUPSRateResponse(upsResponse, requestId, validatedRequest);
  }

  // route
  supportsRoute(originCountry: string, destinationCountry: string): boolean {
    const supported = this.config.supportedCountries || [];
    return (
      supported.includes(originCountry.toUpperCase()) &&
      supported.includes(destinationCountry.toUpperCase())
    );
  }

  // health
  async healthCheck(): Promise<boolean> {
    try {
      await this.authManager.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  // validate
  private validateRequest(request: RateRequest): RateRequest {
    try {
      return validateRateRequest(request);
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        throw new ValidationError('Invalid rate request', issues, { carrier: 'UPS' });
      }
      throw error;
    }
  }

  // api
  private async callRatingApi(
    request: unknown,
    accessToken: string,
    requestId: string
  ): Promise<UPSRateResponse> {
    const url = '/api/rating/v1/Rate';

    try {
      const response = await this.httpClient.post<UPSRateResponse>(url, request, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'transId': requestId,
          'transactionSrc': 'carrier-integration-service',
        },
      });
      // check
      if (!response.data?.RateResponse?.RatedShipment) {
        throw new ResponseParsingError('Invalid response structure from UPS Rating API', {
          carrier: 'UPS',
          requestId,
          responseBody: response.data,
        });
      }

      return response.data;
    } catch (error) {
      if (error instanceof ResponseParsingError) throw error;
      if (axios.isAxiosError(error)) throw this.handleAxiosError(error, requestId);
      throw new NetworkError('Unexpected error calling UPS Rating API', {
        carrier: 'UPS',
        originalError: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  // error
  private handleAxiosError(error: AxiosError, requestId: string): never {
    // timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new TimeoutError('Request timed out', this.config.timeoutMs, {
        carrier: this.config.carrierId,
        requestId,
      });
    }
    // network
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      throw new NetworkError('Could not connect to API', {
        carrier: this.config.carrierId,
        originalError: error,
      });
    }
    // http
    if (error.response) {
      const status = error.response.status;
      if (status === 429) {
        throw new RateLimitError(this.config.carrierId, {
          retryAfterSeconds: error.response.headers['retry-after'] ? parseInt(error.response.headers['retry-after'], 10) : undefined,
          requestId,
        });
      }
      // just throw generic error
      throw new CarrierApiError(
        `API error ${status}`,
        status,
        { carrier: this.config.carrierId, requestId, originalError: error }
      );
    }
    // fallback
    throw new NetworkError('Network error', {
      carrier: this.config.carrierId,
      originalError: error,
    });
  }

  // auth
  private isAuthError(error: unknown): boolean {
    return error instanceof CarrierApiError && (error.httpStatus === 401 || error.httpStatus === 403);
  }

  // type
  // removed isUPSErrorResponse (not needed)

  // id
  private generateRequestId(): string {
    // Always use fallback string generator for UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
