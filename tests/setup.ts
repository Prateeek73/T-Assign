import * as dotenv from 'dotenv';
import nock from 'nock';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Disable real HTTP connections during tests
beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
});
