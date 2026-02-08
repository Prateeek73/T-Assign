// UPS DTO Types - All types in this file represent the raw data structures used for communication with the UPS API.

// UPS OAuth Token Response DTO
export type UPSTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  issued_at: string;
  status: string;
};

// UPS Error Response DTO
export type UPSErrorResponse = {
  response: {
    errors: Array<{
      code: string;
      message: string;
    }>;
  };
};
// UPS Rate Request DTO
export type UPSRateRequest = {
  RateRequest: {
    Request: {
      RequestOption: string;
      TransactionReference?: { CustomerContext?: string };
    };
    Shipment: {
      Shipper: { Name: string; ShipperNumber: string; Address: any };
      ShipTo: { Name: string; Address: any };
      ShipFrom: { Name: string; Address: any };
      Package: any[];
      ShipmentRatingOptions?: { NegotiatedRatesIndicator?: string };
    };
  };
};

// UPS Rate Response DTO
export type UPSRateResponse = {
  RateResponse: {
    Response?: {
      ResponseStatus: {
        Code: string;
        Description: string;
      };
      TransactionReference?: {
        CustomerContext?: string;
      };
      Alert?: UPSAlert[];
    };
    RatedShipment: UPSRatedShipment[];
  };
};

// UPS Rated Shipment DTO
export type UPSRatedShipment = {
  Service: {
    Code: string;
    Description?: string;
  };
  BillingWeight?: {
    UnitOfMeasurement: {
      Code: string;
      Description?: string;
    };
    Weight: string;
  };
  TransportationCharges?: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
  ServiceOptionsCharges?: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
  TotalCharges: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
  GuaranteedDelivery?: {
    BusinessDaysInTransit?: string;
    DeliveryByTime?: string;
  };
  RatedPackage?: UPSRatedPackage[];
  RatedShipmentAlert?: UPSAlert[];
  NegotiatedRateCharges?: {
    TotalCharge: {
      CurrencyCode: string;
      MonetaryValue: string;
    };
  };
};

// UPS Rated Package DTO
export type UPSRatedPackage = {
  Weight: string;
  BillingWeight?: {
    UnitOfMeasurement: {
      Code: string;
      Description?: string;
    };
    Weight: string;
  };
  TransportationCharges?: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
  TotalCharges?: {
    CurrencyCode: string;
    MonetaryValue: string;
  };
};

// UPS Alert DTO
export type UPSAlert = {
  Code: string;
  Description: string;
};
