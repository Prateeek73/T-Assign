/**
 * UPS API Response Stubs
 * 
 * These stubs are based on the UPS Rating API documentation.
 * They represent realistic responses that the UPS API would return.
 */

import { UPSRateResponse, UPSTokenResponse, UPSErrorResponse } from '../../src/carriers/ups/types';

/**
 * Successful OAuth token response
 */
export const successfulTokenResponse: UPSTokenResponse = {
  access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlVQUyBUZXN0IiwiaWF0IjoxNTE2MjM5MDIyfQ',
  token_type: 'Bearer',
  expires_in: 14400, // 4 hours
  issued_at: '2024-01-15T10:00:00Z',
  status: 'approved',
};

/**
 * Token response with short expiry (for testing refresh)
 */
export const shortLivedTokenResponse: UPSTokenResponse = {
  access_token: 'short-lived-token-12345',
  token_type: 'Bearer',
  expires_in: 60, // 1 minute
  issued_at: '2024-01-15T10:00:00Z',
  status: 'approved',
};

/**
 * Successful rate response with multiple services (Shop request)
 */
export const successfulRateResponse: UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
        Description: 'Success',
      },
      TransactionReference: {
        CustomerContext: 'test-reference',
      },
    },
    RatedShipment: [
      {
        Service: {
          Code: '03',
          Description: 'UPS Ground',
        },
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
            Description: 'Pounds',
          },
          Weight: '5.5',
        },
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '12.50',
        },
        ServiceOptionsCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '0.00',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '12.50',
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '5',
        },
        RatedPackage: [
          {
            Weight: '5.5',
            BillingWeight: {
              UnitOfMeasurement: {
                Code: 'LBS',
              },
              Weight: '5.5',
            },
            TransportationCharges: {
              CurrencyCode: 'USD',
              MonetaryValue: '12.50',
            },
            TotalCharges: {
              CurrencyCode: 'USD',
              MonetaryValue: '12.50',
            },
          },
        ],
      },
      {
        Service: {
          Code: '02',
          Description: 'UPS 2nd Day Air',
        },
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
            Description: 'Pounds',
          },
          Weight: '5.5',
        },
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '35.75',
        },
        ServiceOptionsCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '0.00',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '35.75',
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '2',
        },
        RatedPackage: [
          {
            Weight: '5.5',
            BillingWeight: {
              UnitOfMeasurement: {
                Code: 'LBS',
              },
              Weight: '5.5',
            },
          },
        ],
      },
      {
        Service: {
          Code: '01',
          Description: 'UPS Next Day Air',
        },
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
            Description: 'Pounds',
          },
          Weight: '5.5',
        },
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '58.25',
        },
        ServiceOptionsCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '0.00',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '58.25',
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '1',
          DeliveryByTime: '10:30 AM',
        },
        RatedPackage: [
          {
            Weight: '5.5',
            BillingWeight: {
              UnitOfMeasurement: {
                Code: 'LBS',
              },
              Weight: '5.5',
            },
          },
        ],
      },
    ],
  },
};

/**
 * Rate response with negotiated rates
 */
export const negotiatedRateResponse: UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
        Description: 'Success',
      },
    },
    RatedShipment: [
      {
        Service: {
          Code: '03',
          Description: 'UPS Ground',
        },
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
          },
          Weight: '5.5',
        },
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '15.00',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '15.00',
        },
        NegotiatedRateCharges: {
          TotalCharge: {
            CurrencyCode: 'USD',
            MonetaryValue: '12.00', // Negotiated rate is lower
          },
        },
      },
    ],
  },
};

/**
 * Rate response with alerts/warnings
 */
export const rateResponseWithAlerts: UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
        Description: 'Success',
      },
      Alert: [
        {
          Code: '110971',
          Description: 'Your invoice may vary from the displayed reference rates',
        },
      ],
    },
    RatedShipment: [
      {
        Service: {
          Code: '03',
          Description: 'UPS Ground',
        },
        RatedShipmentAlert: [
          {
            Code: '110971',
            Description: 'Your invoice may vary from the displayed reference rates',
          },
        ],
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
          },
          Weight: '5.5',
        },
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '12.50',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '12.50',
        },
      },
    ],
  },
};

/**
 * Single service rate response (Rate request, not Shop)
 */
export const singleServiceRateResponse: UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
        Description: 'Success',
      },
    },
    RatedShipment: [
      {
        Service: {
          Code: '03',
          Description: 'UPS Ground',
        },
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
          },
          Weight: '5.5',
        },
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '12.50',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '12.50',
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '5',
        },
      },
    ],
  },
};

/**
 * Authentication error response
 */
export const authErrorResponse: UPSErrorResponse = {
  response: {
    errors: [
      {
        code: '250003',
        message: 'Invalid Authentication Information.',
      },
    ],
  },
};

/**
 * Invalid postal code error
 */
export const invalidPostalCodeError: UPSErrorResponse = {
  response: {
    errors: [
      {
        code: '111285',
        message: 'The postal code 99999 is invalid for US.',
      },
    ],
  },
};

/**
 * Invalid shipper number error
 */
export const invalidShipperNumberError: UPSErrorResponse = {
  response: {
    errors: [
      {
        code: '111210',
        message: 'The shipper number is invalid.',
      },
    ],
  },
};

/**
 * Rate limit error response
 */
export const rateLimitErrorResponse: UPSErrorResponse = {
  response: {
    errors: [
      {
        code: '429',
        message: 'Rate limit exceeded. Please try again later.',
      },
    ],
  },
};

/**
 * Server error response
 */
export const serverErrorResponse: UPSErrorResponse = {
  response: {
    errors: [
      {
        code: '500',
        message: 'Internal server error. Please try again later.',
      },
    ],
  },
};

/**
 * Malformed response (missing required fields)
 */
export const malformedResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
      },
    },
    // Missing RatedShipment array
  },
};
