// Primitives & Enums
import { z } from 'zod';

export const WeightUnitSchema = z.enum(['LB', 'KG']);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

export const DimensionUnitSchema = z.enum(['IN', 'CM']);
export type DimensionUnit = z.infer<typeof DimensionUnitSchema>;

export const PackagingTypeSchema = z.enum(['YOUR_PACKAGING']);
export type PackagingType = z.infer<typeof PackagingTypeSchema>;

export const ServiceLevelSchema = z.enum(['GROUND', 'EXPRESS', 'STANDARD']);
export type ServiceLevel = z.infer<typeof ServiceLevelSchema>;

// Value Objects
export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof MoneySchema>;

export const WeightSchema = z.object({
  value: z.number().positive().max(150),
  unit: WeightUnitSchema,
});
export type Weight = z.infer<typeof WeightSchema>;

export const DimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: DimensionUnitSchema,
});
export type Dimensions = z.infer<typeof DimensionsSchema>;


// Core Entities
export const AddressSchema = z.object({
  addressLines: z.array(z.string()).min(1).max(2),
  city: z.string(),
  stateProvinceCode: z.string(),
  postalCode: z.string(),
  countryCode: z.string().length(2),
});
export type Address = z.infer<typeof AddressSchema>;

export const ContactSchema = z.object({
  name: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const PackageSchema = z.object({
  weight: WeightSchema,
  dimensions: DimensionsSchema.optional(),
});
export type Package = z.infer<typeof PackageSchema>;

// Requests & Responses
export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  shipper: ContactSchema,
  packages: z.array(PackageSchema).min(1),
  serviceLevel: ServiceLevelSchema.optional(),
});
export type RateRequest = z.infer<typeof RateRequestSchema>;

export const RateQuoteSchema = z.object({
  serviceLevel: ServiceLevelSchema,
  carrierServiceCode: z.string(),
  totalCost: MoneySchema,
  transportationCost: MoneySchema.optional(),
  billingWeight: z.object({ value: z.number(), unit: WeightUnitSchema }).optional(),
  businessDaysInTransit: z.number().optional(),
  warnings: z.array(z.string()).optional(),
});
export type RateQuote = z.infer<typeof RateQuoteSchema>;

export const RateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string(),
        Description: z.string(),
      }),
    }),
    RatedShipment: z.array(RateQuoteSchema),
  }),
});
export type RateResponse = z.infer<typeof RateResponseSchema>;

// Validation Helpers
export function validateRateRequest(data: unknown): RateRequest {
  return RateRequestSchema.parse(data);
}
export function safeValidateRateRequest(data: unknown) {
  return RateRequestSchema.safeParse(data);
}

