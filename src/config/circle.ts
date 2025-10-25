import dotenv from 'dotenv';

dotenv.config();

if (!process.env.CIRCLE_API_KEY) {
  throw new Error('CIRCLE_API_KEY environment variable is required');
}

export const circleApiKey = process.env.CIRCLE_API_KEY;
export const circleBaseUrl = process.env.CIRCLE_BASE_URL || 'https://api.circle.com';

// Circle Web3 Services configuration
export const circleConfig = {
  apiKey: circleApiKey,
  baseUrl: circleBaseUrl,
  w3sApiUrl: `${circleBaseUrl}/v1/w3s`,
  webhookSecret: process.env.WEBHOOK_SECRET,
  webhookEndpointSecret: process.env.WEBHOOK_ENDPOINT_SECRET,
  appId: '9031d2f3-4851-59d9-9162-ef2af366ac79', // From entity config
};