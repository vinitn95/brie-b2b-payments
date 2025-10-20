#!/bin/bash

# Brie B2B Payment Platform - API Testing Script
# Make sure the server is running: npm run dev

BASE_URL="http://localhost:3000"

echo "🚀 Testing Brie B2B Payment Platform API"
echo "========================================"

# 1. Health check
echo "1. Testing health check..."
curl -s "$BASE_URL/health" | jq .
echo ""

# 2. Generate idempotency key
echo "2. Generating idempotency key..."
IDEMPOTENCY_KEY=$(curl -s -X POST "$BASE_URL/api/payments/generate-idempotency-key" | jq -r .data.idempotencyKey)
echo "Generated key: $IDEMPOTENCY_KEY"
echo ""

# 3. Create vendor
echo "3. Creating test vendor..."
VENDOR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/vendors" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vendor Co",
    "email": "test@vendor.com",
    "phone": "+1-555-0123",
    "address": "123 Test Street, Singapore",
    "bankAccount": {
      "accountNumber": "1234567890",
      "routingNumber": "021000021",
      "bankName": "Test Bank",
      "accountHolder": "Test Vendor Co"
    }
  }')

VENDOR_ID=$(echo "$VENDOR_RESPONSE" | jq -r .data.id)
echo "Created vendor with ID: $VENDOR_ID"
echo "$VENDOR_RESPONSE" | jq .
echo ""

# 4. Initiate payment
echo "4. Initiating payment..."
PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"vendorId\": \"$VENDOR_ID\",
    \"amountSgd\": 1000.00,
    \"customerReference\": \"TEST-$(date +%s)\",
    \"description\": \"Test payment from API script\"
  }")

PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r .data.paymentId)
echo "Created payment with ID: $PAYMENT_ID"
echo "$PAYMENT_RESPONSE" | jq .
echo ""

# 5. Check payment status
echo "5. Checking payment status..."
curl -s "$BASE_URL/api/payments/$PAYMENT_ID" | jq .
echo ""

# 6. Wait and check again
echo "6. Waiting 5 seconds and checking status again..."
sleep 5
curl -s "$BASE_URL/api/payments/$PAYMENT_ID" | jq .
echo ""

# 7. List vendors
echo "7. Listing all vendors..."
curl -s "$BASE_URL/api/vendors" | jq .
echo ""

echo "✅ API testing complete!"
echo ""
echo "💡 You can also test manually:"
echo "   - Open http://localhost:3000 for API documentation"
echo "   - Use Postman or similar tools with the examples above"
echo "   - Check the database with: npm run db:studio"