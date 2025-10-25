import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import prisma from './config/database';
import paymentsRouter from './routes/payments';
import vendorsRouter from './routes/vendors';
import webhooksRouter from './routes/webhooks';
import circleRouter from './routes/circle';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/payments', paymentsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/circle', circleRouter);

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Brie B2B Payment Platform',
    version: '1.0.0',
    description: 'Singapore-based B2B payment platform using Circle API for SGD→USDC→USD conversion',
    endpoints: {
      health: 'GET /health',
      payments: {
        create: 'POST /api/payments',
        getStatus: 'GET /api/payments/:paymentId',
        generateIdempotencyKey: 'POST /api/payments/generate-idempotency-key'
      },
      vendors: {
        create: 'POST /api/vendors',
        get: 'GET /api/vendors/:vendorId',
        list: 'GET /api/vendors',
        updateStatus: 'PATCH /api/vendors/:vendorId/status'
      },
      webhooks: {
        circle: 'POST /api/webhooks/circle'
      },
      circle: {
        listWallets: 'GET /api/circle/wallets',
        createWallet: 'POST /api/circle/wallets',
        getWallet: 'GET /api/circle/wallets/:walletId',
        getExchangeRates: 'GET /api/circle/exchange-rates',
        createBankAccount: 'POST /api/circle/bank-accounts',
        testPaymentIntent: 'POST /api/circle/test-payment-intent',
        getPaymentIntent: 'GET /api/circle/payment-intent/:paymentIntentId'
      }
    },
    documentation: {
      paymentFlow: 'Customer pays SGD → Convert to USDC → Convert to USD → Vendor receives USD',
      targetSettlement: '30 minutes vs 3-5 days SWIFT',
      features: [
        'UUID-based idempotency',
        'Circle webhook handling',
        'Automatic currency conversion',
        'Bank account management',
        'Payment status tracking',
        'Full error handling'
      ]
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/payments',
      'GET /api/payments/:paymentId',
      'POST /api/vendors',
      'GET /api/vendors/:vendorId',
      'GET /api/vendors',
      'POST /api/webhooks/circle'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Brie B2B Payment Platform running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Circle API: ${process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com'}`);
});

export default app;