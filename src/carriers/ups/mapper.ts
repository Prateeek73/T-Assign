import { RateResponse, RateQuote, RateRequest } from '../../domain/models';


// Map domain RateRequest to UPS DTO
export function toUPSRateRequest(
  request: RateRequest,
  shipperNumber: string,
  customerContext?: string,
): any {
  return {
    RateRequest: {
      Request: {
        RequestOption: request.serviceLevel ? 'Rate' : 'Shop',
        TransactionReference: customerContext
          ? { CustomerContext: customerContext }
          : undefined,
      },
      Shipment: {
        Shipper: {
          Name: request.shipper.name,
          ShipperNumber: shipperNumber,
          Address: request.origin,
        },
        ShipTo: { Name: 'Recipient', Address: request.destination },
        ShipFrom: { Name: request.shipper.name, Address: request.origin },
        Package: request.packages.map((pkg) => ({
          PackagingType: { Code: '02', Description: 'YOUR_PACKAGING' },
          PackageWeight: {
            UnitOfMeasurement: { Code: pkg.weight.unit },
            Weight: pkg.weight.value.toFixed(1),
          },
          Dimensions: pkg.dimensions
            ? {
                UnitOfMeasurement: { Code: pkg.dimensions.unit },
                Length: pkg.dimensions.length.toString(),
                Width: pkg.dimensions.width.toString(),
                Height: pkg.dimensions.height.toString(),
              }
            : undefined,
        })),
        ShipmentRatingOptions: { NegotiatedRatesIndicator: 'Y' },
      },
    },
  };
}


// Map UPS DTO response to normalized RateResponse
export function fromUPSRateResponse(
  upsResponse: any,
  requestId: string,
  originalRequest?: any,
): RateResponse {
  const ratedShipments = upsResponse.RateResponse.RatedShipment;
  const rates: RateQuote[] = ratedShipments.map((rated: any) => ({
    serviceLevel: rated.Service.Description || 'STANDARD',
    serviceName: rated.Service.Description || 'UPS Service',
    carrierServiceCode: rated.Service.Code,
    totalCost: {
      amount: parseFloat(rated.TotalCharges.MonetaryValue),
      currency: rated.TotalCharges.CurrencyCode,
    },
    transportationCost: rated.TransportationCharges
      ? {
          amount: parseFloat(rated.TransportationCharges.MonetaryValue),
          currency: rated.TransportationCharges.CurrencyCode,
        }
      : undefined,
    serviceOptionsCost: rated.ServiceOptionsCharges
      ? {
          amount: parseFloat(rated.ServiceOptionsCharges.MonetaryValue),
          currency: rated.ServiceOptionsCharges.CurrencyCode,
        }
      : undefined,
    billingWeight: rated.BillingWeight
      ? {
          value: parseFloat(rated.BillingWeight.Weight),
          unit: rated.BillingWeight.UnitOfMeasurement.Code,
        }
      : undefined,
    businessDaysInTransit:
      rated.GuaranteedDelivery?.BusinessDaysInTransit &&
      !isNaN(Number(rated.GuaranteedDelivery.BusinessDaysInTransit))
        ? parseInt(rated.GuaranteedDelivery.BusinessDaysInTransit, 10)
        : undefined,
    warnings: rated.RatedShipmentAlert?.map((a: any) => a.Description),
  }));
  return {
    RateResponse: {
      Response: {
        ResponseStatus: {
          Code: '1',
          Description: 'Success',
        },
        // Optionally add TransactionReference, Alert, etc. if needed
      },
      RatedShipment: rates,
    },
  };
}
