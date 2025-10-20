# Brie B2B Payment Platform MVP

A Singapore-based B2B payment platform that replaces slow SWIFT payments with stablecoin rails using Circle API.

## 🎯 Overview

**Payment Flow**: Customer pays SGD → Convert to USDC → Convert to USD → Vendor receives USD  
**Target Settlement**: 30 minutes vs 3-5 days SWIFT  
**Technology**: Node.js, TypeScript, Express, PostgreSQL, Prisma, Circle API

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Circle API sandbox account

### Setup

1. **Clone and install dependencies**
```bash
cd brie
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```env
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_BASE_URL=https://api-sandbox.circle.com
DATABASE_URL="postgresql://username:password@localhost:5432/brie_db?schema=public"
PORT=3000
NODE_ENV=development
WEBHOOK_SECRET=your_webhook_secret_here
```

3. **Set up database**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

4. **Start the server**
```bash
# Development with hot reload
npm run dev

# Or build and start
npm run build
npm start
```

## 📚 API Documentation

Base URL: `http://localhost:3000`

### Authentication
Currently, no authentication is required for this MVP. In production, implement API keys or JWT tokens.

### Core Endpoints

#### 1. Create Vendor
```bash
POST /api/vendors
Content-Type: application/json

{
  "name": "Tech Solutions Inc",
  "email": "payments@techsolutions.com",
  "phone": "+1-555-0123",
  "address": "123 Business Ave, San Francisco, CA",
  "bankAccount": {
    "accountNumber": "1234567890",
    "routingNumber": "021000021",
    "bankName": "Chase Bank",
    "accountHolder": "Tech Solutions Inc"
  }
}
```

#### 2. Initiate Payment
```bash
POST /api/payments
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
  "vendorId": "vendor-uuid-here",
  "amountSgd": 1000.00,
  "customerReference": "INV-2024-001",
  "description": "Payment for Q1 services"
}
```

#### 3. Check Payment Status
```bash
GET /api/payments/{paymentId}
```

#### 4. Generate Idempotency Key
```bash
POST /api/payments/generate-idempotency-key
```

### Example API Calls

**Create a vendor:**
```bash
curl -X POST http://localhost:3000/api/vendors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Global Trading Co",
    "email": "finance@globaltrading.com",
    "bankAccount": {
      "accountNumber": "9876543210",
      "routingNumber": "021000021", 
      "bankName": "Bank of America",
      "accountHolder": "Global Trading Co"
    }
  }'
```

**Initiate a payment:**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "vendorId": "vendor-id-from-above",
    "amountSgd": 5000.00,
    "customerReference": "PO-2024-042",
    "description": "Q4 consulting services"
  }'
```

**Check payment status:**
```bash
curl http://localhost:3000/api/payments/{payment-id}
```

## 🔄 Payment Flow Details

1. **Payment Initiation**: Customer creates payment with SGD amount and vendor details
2. **Circle Payment Intent**: Creates Circle payment intent for SGD input
3. **SGD Reception**: Customer pays SGD (simulated in MVP)
4. **SGD→USDC Exchange**: Automatic conversion using Circle's exchange
5. **USDC→USD Exchange**: Convert USDC to USD for final payout
6. **Bank Payout**: Transfer USD to vendor's bank account
7. **Settlement Complete**: Payment marked as completed (target: 30 minutes)

## 🎛️ Database Schema

Key models:
- **Vendor**: Business receiving payments with bank account details
- **Payment**: Main payment record with SGD input and USD output
- **Transaction**: Individual steps in the payment flow (payment, exchanges, payout)
- **WebhookEvent**: Circle webhook events for status updates
- **BankAccount**: Vendor USD bank account for final payout

## 🔧 Development

**Database operations:**
```bash
# View database in browser
npm run db:studio

# Reset database
npm run db:push --force-reset

# Create new migration
npm run db:migrate
```

**Useful commands:**
```bash
# Generate idempotency key
curl -X POST http://localhost:3000/api/payments/generate-idempotency-key

# Health check
curl http://localhost:3000/health

# List all vendors
curl http://localhost:3000/api/vendors
```

## 🎯 Testing the MVP

1. **Start the server**: `npm run dev`
2. **Create a vendor** using the API
3. **Initiate a payment** with the vendor ID
4. **Monitor payment status** - should complete in ~30 seconds (simulated)
5. **Check transaction details** to see the full SGD→USDC→USD flow

## 🔍 Key Features

- ✅ **UUID Idempotency**: Prevents duplicate payments
- ✅ **Circle Integration**: Real Circle SDK for payments and exchanges  
- ✅ **Webhook Handling**: Processes Circle webhook events with signature verification
- ✅ **Multi-step Conversion**: Automatic SGD→USDC→USD conversion flow
- ✅ **Bank Account Management**: Vendor USD bank accounts for payouts
- ✅ **Payment Tracking**: Real-time status updates throughout the flow
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **TypeScript**: Full type safety throughout the application

## 🚧 Production Considerations

For production deployment, consider:

1. **Authentication**: Implement API keys or JWT authentication
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Monitoring**: Set up logging, metrics, and alerting
4. **Database**: Use connection pooling and read replicas
5. **Security**: Input validation, SQL injection protection
6. **Compliance**: KYC/AML checks for vendors and payments
7. **Circle Production**: Switch to Circle production API
8. **High Availability**: Multi-region deployment with failover

## 📝 Environment Setup

The MVP uses Circle's sandbox environment. For production:

1. Get Circle production API keys
2. Update `CIRCLE_BASE_URL` to `https://api.circle.com`
3. Configure production webhook endpoints
4. Set up proper KYC/compliance workflows

## 💡 Next Steps

1. **Frontend Dashboard**: Build admin dashboard for payment monitoring
2. **Customer Portal**: Customer-facing payment initiation interface  
3. **Reporting**: Payment analytics and settlement reports
4. **Multi-currency**: Support additional currency pairs
5. **Advanced Features**: Scheduled payments, batch processing, refunds