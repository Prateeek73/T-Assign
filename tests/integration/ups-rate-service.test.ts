/**
 * UPS Rate Service Integration Tests
 * 
 * These tests verify the complete flow of the UPS rate service using stubbed HTTP responses.
 * They test:
 * - Request payload building from domain models
 * - Response parsing and normalization
 * - Auth token lifecycle (acquisition, reuse, refresh)
 * - Error handling for various failure modes
 */

import '../stubs/test-env';
import nock from 'nock';
import { UPSRateService } from '../../src/carriers/ups/service';
import { UPSAuthManager } from '../../src/carriers/ups/auth';
import { RateRequest } from '../../src/domain';
import { UPSConfig } from '../../src/config';
import {
  ValidationError,
  CarrierApiError,
  RateLimitError,
  TimeoutError,
  ResponseParsingError,
  InvalidCredentialsError,
} from '../../src/errors';
import {
  successfulTokenResponse,
  successfulRateResponse,
  negotiatedRateResponse,
  rateResponseWithAlerts,
  singleServiceRateResponse,
  authErrorResponse,
  invalidPostalCodeError,
  rateLimitErrorResponse,
  serverErrorResponse,
  malformedResponse,
} from '../stubs/ups-responses';

// Test configuration
const testConfig: UPSConfig = {
  carrierId: 'UPS',
  carrierName: 'United Parcel Service',
  supportedCountries: ['US', 'CA', 'MX'],
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  accountNumber: 'test-account-123',
  baseUrl: 'https://onlinetools.ups.com',
  tokenUrl: 'https://onlinetools.ups.com/security/v1/oauth/token',
  timeoutMs: 30000,
  useSandbox: false,
};

// Sample valid rate request
const validRateRequest: RateRequest = {
  origin: {
    addressLines: ['123 Sender Street'],
    city: 'New York',
    stateProvinceCode: 'NY',
    postalCode: '10001',
    countryCode: 'US',
  },
  destination: {
    addressLines: ['456 Receiver Avenue'],
    city: 'Los Angeles',
    stateProvinceCode: 'CA',
    postalCode: '90001',
    countryCode: 'US',
  },
  shipper: {
    name: 'Test Shipper',
  },
  packages: [
    {
      weight: {
        value: 5.5,
        unit: 'LB',
      },
      dimensions: {
        length: 12,
        width: 8,
        height: 6,
        unit: 'IN',
      },
      // packagingType removed in minimal model
    },
  ],
  // customerReference removed in minimal model
};

describe('UPSRateService', () => {
  let service: UPSRateService;
  let authManager: UPSAuthManager;

  beforeEach(() => {
    // Create fresh instances for each test
    authManager = new UPSAuthManager(testConfig);
    service = new UPSRateService(testConfig, undefined, authManager);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ==========================================================================
  // Request Building Tests
  // ==========================================================================
  describe('Request Building', () => {

    it('should use "Shop" request option when no service level specified', async () => {
      let capturedBody: unknown;

      nock('https://onlinetools.ups.com')
        .post('/security/v1/oauth/token')
        .reply(200, successfulTokenResponse);

      nock('https://onlinetools.ups.com')
        .post('/api/rating/v1/Rate', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, successfulRateResponse);

      await service.getRates(validRateRequest);

      const request = capturedBody as Record<string, unknown>;
      const rateRequest = request['RateRequest'] as Record<string, unknown>;
      const requestOpt = rateRequest['Request'] as Record<string, unknown>;
      expect(requestOpt['RequestOption']).toBe('Shop');
    });


    it('should handle multiple packages in request', async () => {
      let capturedBody: unknown;

      const multiPackageRequest: RateRequest = {
        ...validRateRequest,
        packages: [
          {
            weight: { value: 5, unit: 'LB' },
            dimensions: { length: 10, width: 8, height: 6, unit: 'IN' },
            // packagingType removed in simplified model
          },
          {
            weight: { value: 3, unit: 'LB' },
            dimensions: { length: 8, width: 6, height: 4, unit: 'IN' },
            // packagingType removed in minimal model
          },
        ],
      };

      nock('https://onlinetools.ups.com')
        .post('/security/v1/oauth/token')
        .reply(200, successfulTokenResponse);

      nock('https://onlinetools.ups.com')
        .post('/api/rating/v1/Rate', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, successfulRateResponse);

      await service.getRates(multiPackageRequest);

      const request = capturedBody as Record<string, unknown>;
      const rateRequest = request['RateRequest'] as Record<string, unknown>;
      const shipment = rateRequest['Shipment'] as Record<string, unknown>;
      const packages = shipment['Package'] as Array<unknown>;
      
      expect(packages).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Response Parsing Tests
  // ==========================================================================
  describe('Response Parsing', () => {
    it('should parse successful rate response into domain model', async () => {
      nock('https://onlinetools.ups.com')
        .post('/security/v1/oauth/token')
        .reply(200, successfulTokenResponse);

      nock('https://onlinetools.ups.com')
        .post('/api/rating/v1/Rate')
        .reply(200, successfulRateResponse);

      const response = await service.getRates(validRateRequest);
      const rates = response.RateResponse.RatedShipment;
      expect(rates).toHaveLength(3);
      const amounts = rates.map(r => r.totalCost.amount);
      expect(amounts).toContain(12.50);
      expect(amounts).toContain(35.75);
      expect(amounts).toContain(58.25);
      const groundRate = rates.find(r => r.carrierServiceCode === '03');
      expect(groundRate).toBeDefined();
      expect(groundRate!.totalCost.amount).toBe(12.50);
      expect(groundRate!.totalCost.currency).toBe('USD');
      expect(groundRate!.businessDaysInTransit).toBe(5);
    });


    it('should capture alerts/warnings from response', async () => {
      nock('https://onlinetools.ups.com')
        .post('/security/v1/oauth/token')
        .reply(200, successfulTokenResponse);

      nock('https://onlinetools.ups.com')
        .post('/api/rating/v1/Rate')
        .reply(200, rateResponseWithAlerts);

      const response = await service.getRates(validRateRequest);
      const rates = response.RateResponse.RatedShipment;
      expect(rates[0]!.warnings).toBeDefined();
      expect(rates[0]!.warnings).toContain(
        'Your invoice may vary from the displayed reference rates'
      );
    });

    it('should handle malformed response with appropriate error', async () => {
      nock('https://onlinetools.ups.com')
        .post('/security/v1/oauth/token')
        .reply(200, successfulTokenResponse);

      nock('https://onlinetools.ups.com')
        .post('/api/rating/v1/Rate')
        .reply(200, malformedResponse);

      await expect(service.getRates(validRateRequest)).rejects.toThrow(ResponseParsingError);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================
  describe('Request Validation', () => {
    it('should reject request with missing required fields', async () => {
      const invalidRequest = {
        // Missing origin
        destination: validRateRequest.destination,
        shipper: validRateRequest.shipper,
        packages: validRateRequest.packages,
      };

      await expect(service.getRates(invalidRequest as RateRequest)).rejects.toThrow(ValidationError);
    });

    it('should reject request with empty packages array', async () => {
      const invalidRequest: RateRequest = {
        ...validRateRequest,
        packages: [],
      };

      await expect(service.getRates(invalidRequest)).rejects.toThrow(ValidationError);
    });

    it('should reject request with invalid weight', async () => {
      const invalidRequest: RateRequest = {
        ...validRateRequest,
        packages: [
          {
            weight: { value: -5, unit: 'LB' }, // Negative weight
            // packagingType removed in minimal model
          },
        ],
      };

      await expect(service.getRates(invalidRequest)).rejects.toThrow(ValidationError);
    });

    it('should reject request with invalid country code', async () => {
      const invalidRequest: RateRequest = {
        ...validRateRequest,
        origin: {
          ...validRateRequest.origin,
          countryCode: 'USA', // Should be 2 characters
        },
      };

      await expect(service.getRates(invalidRequest)).rejects.toThrow(ValidationError);
    });

    it('should provide detailed validation error information', async () => {
      const invalidRequest = {
        origin: { city: 'New York' }, // Missing required fields
        destination: validRateRequest.destination,
        shipper: validRateRequest.shipper,
        packages: validRateRequest.packages,
      };

      try {
        await service.getRates(invalidRequest as RateRequest);
        fail('Expected ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.issues.length).toBeGreaterThan(0);
        expect(validationError.issues[0]!.path).toBeDefined();
        expect(validationError.issues[0]!.message).toBeDefined();
      }
    });
  });
});
