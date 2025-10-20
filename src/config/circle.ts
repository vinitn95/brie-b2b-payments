import { Circle } from '@circle-fin/circle-sdk';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.CIRCLE_API_KEY) {
  throw new Error('CIRCLE_API_KEY environment variable is required');
}

export const circleApiKey = process.env.CIRCLE_API_KEY;
export const circleBaseUrl = process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com';

export const circle = new Circle(
  circleApiKey,
  circleBaseUrl
);

export const circleConfig = {
  apiKey: circleApiKey,
  baseUrl: circleBaseUrl,
  webhookSecret: process.env.WEBHOOK_SECRET,
  webhookEndpointSecret: process.env.WEBHOOK_ENDPOINT_SECRET,
};