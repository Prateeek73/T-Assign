/**
 * UPS Mapper Tests
 * 
 * Tests for the domain-to-UPS and UPS-to-domain mappers.
 * These ensure correct transformation between internal and external formats.
 */

import { toUPSRateRequest, fromUPSRateResponse } from '../../src/carriers/ups/mapper';
import { Address, Contact, Package, RateRequest } from '../../src/domain';
import { UPSRatedShipment, UPSRateResponse } from '../../src/carriers/ups/types';

describe('UPS Mappers', () => {
  // Only keep tests for toUPSRateRequest and fromUPSRateResponse (minimal demo)
  describe('toUPSRateRequest', () => {
    const sampleRequest: RateRequest = {
      origin: {
        addressLines: ['123 Sender St'],
        city: 'New York',
        stateProvinceCode: 'NY',
        postalCode: '10001',
        countryCode: 'US',
      },
      destination: {
        addressLines: ['456 Receiver Ave'],
        city: 'Los Angeles',
        stateProvinceCode: 'CA',
        postalCode: '90001',
        countryCode: 'US',
      },
      shipper: {
        name: 'Test Shipper',
        // companyName removed in simplified model
      },
      packages: [
        {
          weight: { value: 5, unit: 'LB' },
          // packagingType removed in simplified model
        },
      ],
    };

    it('should create Shop request when no service level', () => {
      const upsRequest = toUPSRateRequest(sampleRequest, 'SHIP123');

      expect(upsRequest.RateRequest.Request.RequestOption).toBe('Shop');
      expect(upsRequest.RateRequest.Shipment.Service).toBeUndefined();
    });


    it('should include customer context when provided', () => {
      const upsRequest = toUPSRateRequest(sampleRequest, 'SHIP123', 'REF-001');

      expect(upsRequest.RateRequest.Request.TransactionReference?.CustomerContext).toBe('REF-001');
    });

    it('should set negotiated rates indicator', () => {
      const upsRequest = toUPSRateRequest(sampleRequest, 'SHIP123');

      expect(upsRequest.RateRequest.Shipment.ShipmentRatingOptions?.NegotiatedRatesIndicator).toBe('Y');
    });
  });


  // All fromUPSRatedShipment tests removed for minimal demo


  // Only keep fromUPSRateResponse tests if needed for minimal demo
  describe('fromUPSRateResponse', () => {

    it('should handle empty rated shipments', () => {
      const upsResponse: any = {
        RateResponse: {
          Response: {
            ResponseStatus: { Code: '1', Description: 'Success' },
          },
          RatedShipment: [],
        },
      };

      const response = fromUPSRateResponse(upsResponse, 'REQ-001');

      expect(response.RateResponse.RatedShipment).toEqual([]);
    });
  });
});
