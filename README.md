# UPS Carrier Integration Demo

## Overview
This project provides a TypeScript-based framework for integrating shipping carriers (starting with UPS) for rate calculation, with a clean architecture, strong domain modeling, and robust error handling. Easily extendable to add new carriers (FedEx, USPS, etc.) without modifying existing carrier code.

---

## Project Structure

- **DTO / Domain Model**: All data transfer objects and domain models are defined in `src/domain/models.ts`. Models include `RateRequest`, `RateResponse`, `Address`, `Package`, etc. All models are carrier-agnostic and validated with Zod.
- **Test Cases**: Integration tests are grouped under `tests/integration/`:
  - `ups-rate-service.test.ts`: End-to-end tests for UPS rate service.
  - `ups-mapper.test.ts`: Tests for mapping logic.
  - `ups-error-handling.test.ts`: Tests for error scenarios.
  - `ups-auth.test.ts`: Tests for authentication lifecycle.
- **Auth Service**: Authentication logic is in `src/carriers/ups/auth.ts`.
  - `UPSAuthManager`: Handles OAuth token acquisition, caching, and refresh.
- **Config**: Carrier configuration is defined in `src/config/index.ts`.
  - Add new carrier configs here. Example blocks for FedEx, USPS, etc. provided.
- **Rate Service**: Main rate calculation logic is in `src/carriers/ups/service.ts`.
  - `UPSRateService`: Accepts config and auth, exposes `getRates()`.
- **Mapping**: Request/response mapping logic is in `src/carriers/ups/mapper.ts`.
  - `toUPSRateRequest`: Converts domain model to UPS API format.
  - `fromUPSRateResponse`: Converts UPS API response to domain model.
- **Validation**: Input validation is handled in domain models and service logic. Errors are thrown for invalid data.
- **Error Classes**: All error types are defined in `src/errors/` (e.g., `ValidationError`, `CarrierApiError`, `RateLimitError`).

---

## Test Cases (Grouped)
- **Integration**: All tests in `tests/integration/` use stubbed HTTP responses, no real API calls.
- **Mapper**: Validate domain-to-carrier and carrier-to-domain mapping.
- **Error Handling**: Simulate rate limiting, network errors, malformed responses, auth failures.
- **Auth**: Test token acquisition, caching, refresh, expiry.
- **Note**: Test cases are AI-generated and modeling is fine-tuned to keep them shorter and more compact for easier understanding and maintenance.

---

## Auth Service (Function Summary)
- `UPSAuthManager(config)`: Initialize with config.
- `getToken()`: Acquire or refresh OAuth token.
- `isTokenExpired()`: Check token expiry.
- `refreshToken()`: Refresh token if expired.

---

## Config (Setup Example)
- Add carrier config in `src/config/index.ts`:
```typescript
export const UPSConfig = { ... };
export const FedExConfig = { ... };
```
- To add a new rate service (e.g., FedEx):
  - Create `src/carriers/fedex/`.
  - Implement `FedExRateService`, `FedExAuthManager`, mappers, types.
  - Add config in `src/config/index.ts`.
  - Add tests in `tests/integration/fedex-rate-service.test.ts`.

---

## Architecture Diagram
```
+-------------------+      +-------------------+      +-------------------+
|   Domain Model    |<---->|     Mapper        |<---->|   Carrier Service |
+-------------------+      +-------------------+      +-------------------+
        ^                        ^                        ^
        |                        |                        |
+-------------------+      +-------------------+      +-------------------+
|   Validation      |      |   Auth Service    |      |   Config          |
+-------------------+      +-------------------+      +-------------------+
```

---

## Adding Another Carrier (FedEx Example)
1. Create `src/carriers/fedex/` with `service.ts`, `auth.ts`, `mapper.ts`, `types.ts`.
2. Implement `FedExRateService` (rate logic), `FedExAuthManager` (auth), mappers (request/response), DTOs.
3. Add config in `src/config/index.ts`.
4. Add tests in `tests/integration/fedex-rate-service.test.ts`.
5. Export from `src/carriers/index.ts`.

---

## Validation
- All domain models use Zod schemas for runtime validation.
- Service logic validates input and throws structured errors for invalid data.
- Error classes: `ValidationError`, `CarrierApiError`, `RateLimitError`, etc.

---

## Demo Script
- Run: `npx ts-node src/demo.ts`
- Interactive CLI menu:
  - Option 1: Fetch RateRequest from mock HTTP service, show domain model, metrics, normalized response.
  - Option 2: Classic mapping demo (placeholder).

---

## Running Tests
- Run: `npx jest`
- All tests are grouped and cover service, mapping, error handling, and auth.

---

## Extending & Maintaining
- All code, tests, and documentation are strictly aligned with the domain model and carrier integration requirements.
- To extend: add new carrier folder, implement service/auth/mappers/types, add config, add tests.
- Validate and test every new carrier integration.

---

## No sugar coating. This documentation is direct, technical, and covers all aspects needed for extension, validation, and maintenance. For any new carrier, follow the architecture, config, and test patterns above.
