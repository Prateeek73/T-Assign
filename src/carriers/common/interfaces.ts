// Common interfaces and types for all carriers (eg. UPS, FedEx, DHL, etc)
import { RateRequest, RateResponse } from '../../domain';

export type CarrierId = 'UPS' | 'FEDEX';


// Each operation (e.g. rate, track, label) gets its own interface
export interface ICarrierRateService {
  readonly carrierId: CarrierId;
  readonly carrierName: string;
  getRates(request: RateRequest): Promise<RateResponse>;
  supportsRoute(originCountry: string, destinationCountry: string): boolean;
  healthCheck(): Promise<boolean>;
}

// Generic carrier service interface for any operation
export interface ICarrierService {
  readonly carrierId: CarrierId;
  readonly carrierName: string;
  // Operation registry: operation name -> handler
  operations: Record<string, (...args: any[]) => Promise<any>>;
}

export interface CarrierServiceConfig {
  timeoutMs: number;
  maxRetries?: number;
  debug?: boolean;
}


// How to add a new carrier or operation:
// 1. Add new carrier to CarrierId type above (e.g. 'FEDEX')
// 2. Create a new folder (e.g. fedex/) and implement service(s) for each operation (rate, track, etc)
// 3. Add config for the carrier in config/index.ts
// 4. Export your new service(s) from carriers/index.ts
// 5. Register the service(s) in your application using the ICarrierService or ICarrierRateService interface
