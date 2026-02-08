// Demo Script - shows how the carrier integration works with mock data
// Run with: npx ts-node src/demo.ts

import { RateRequest, RateResponse } from './domain';
import { toUPSRateRequest, fromUPSRateResponse } from './carriers/ups/mapper';
import { UPSRateService } from './carriers/ups/service';
import { UPSConfig } from './config';
import { UPSAuthManager } from './carriers/ups/auth';
import { UPSRateResponse } from './carriers/ups/types';
import * as readline from 'readline';


function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(step: string, message: string) {
  console.log(`[${step}] ${message}`);
}

// --- Mock HTTP Service (in-memory) ---
const mockDB: Record<string, RateRequest> = {
  'demo-1': {
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
      name: 'ACME Shipping Co',
    },
    packages: [
      {
        weight: { value: 5.5, unit: 'LB' },
        dimensions: { length: 12, width: 8, height: 6, unit: 'IN' },
      },
    ],
  },
};

// Simulate HTTP GET to /rate-request/:id
async function fetchRateRequestFromService(id: string): Promise<RateRequest | null> {
  await sleep(200); // Simulate network latency
  return mockDB[id] || null;
}


async function demoMenu() {
  console.log('\n========================================');
  console.log('  UPS Carrier Integration Demo');
  console.log('========================================\n');
  console.log('Choose an option:');
  console.log('  1. Fetch RateRequest from mock HTTP service and get rates');
  console.log('  2. Run classic mock mapping demo');
  console.log('  0. Exit');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

  async function menuLoop() {
    while (true) {
      const answer = await ask('Enter option: ');
      if (answer === '1') {
        await runServiceDemo();
      } else if (answer === '2') {
        await runClassicDemo();
      } else if (answer === '0') {
        rl.close();
        process.exit(0);
        break;
      } else {
        console.log('Invalid option. Try again.');
      }
    }
  }
  await menuLoop();
}

// Option 1: Fetch from mock HTTP service and get rates
async function runServiceDemo() {
  console.log('\n--- Fetching RateRequest from mock HTTP service ---');
  const id = 'demo-1';
  const req = await fetchRateRequestFromService(id);
  if (!req) {
    console.log('No record found for id:', id);
    return;
  }
  console.log('Fetched RateRequest (domain model):');
  console.log(JSON.stringify(req, null, 2));

  // Simulate metrics
  const metrics = {
    requestSize: JSON.stringify(req).length,
    numPackages: req.packages.length,
    origin: req.origin.city,
    destination: req.destination.city,
  };
  console.log('--- Metrics ---');
  console.table(metrics);

  // Use the real service (mocked config/auth)
  const config: UPSConfig = {
    carrierId: 'UPS',
    carrierName: 'United Parcel Service',
    supportedCountries: ['US', 'CA', 'MX'],
    clientId: 'demo-client-id',
    clientSecret: 'demo-client-secret',
    accountNumber: 'demo-account',
    baseUrl: 'https://mock.ups.com',
    tokenUrl: 'https://mock.ups.com/security/v1/oauth/token',
    timeoutMs: 10000,
    useSandbox: true,
  };
  const auth = new UPSAuthManager(config);
  const service = new UPSRateService(config, undefined, auth);

  // Instead of real HTTP, call the mapper directly with a mock response
  const mockUPSResponse: UPSRateResponse = {
    RateResponse: {
      Response: {
        ResponseStatus: { Code: '1', Description: 'Success' },
        Alert: [{ Code: '110971', Description: 'Your invoice may vary from the displayed reference rates' }],
      },
      RatedShipment: [
        {
          Service: { Code: '03', Description: 'Ground' },
          BillingWeight: { UnitOfMeasurement: { Code: 'LBS' }, Weight: '6.0' },
          TransportationCharges: { CurrencyCode: 'USD', MonetaryValue: '12.50' },
          TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '15.35' },
          GuaranteedDelivery: { BusinessDaysInTransit: '5' },
        },
      ],
    },
  };
  const domainResponse = fromUPSRateResponse(mockUPSResponse, 'req_demo_12345', req);
  console.log('\n--- Normalized RateResponse (domain model) ---');
  console.log(JSON.stringify(domainResponse, null, 2));
  console.log('');
}

// Option 2: Classic mapping demo (original)
async function runClassicDemo() {
  // ...existing code from the original main() function...
  // (Paste the original demo logic here if needed)
  console.log('\n--- Classic mapping demo not implemented in this minimal version. ---\n');
}

// Optionally run integration tests after demo
demoMenu().catch(console.error);
