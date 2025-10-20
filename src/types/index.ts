import { PaymentStatus, TransactionType, TransactionStatus, VendorStatus } from '@prisma/client';

export interface CreatePaymentRequest {
  vendorId: string;
  amountSgd: number;
  customerReference?: string;
  description?: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  amountSgd: number;
  estimatedAmountUsd?: number;
  expectedSettlementTime?: Date;
  idempotencyKey: string;
}

export interface CreateVendorRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  bankAccount: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    accountHolder: string;
  };
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  amountSgd: number;
  amountUsd?: number;
  exchangeRate?: number;
  transactions: TransactionSummary[];
  createdAt: Date;
  updatedAt: Date;
  expectedSettlementTime?: Date;
  actualSettlementTime?: Date;
}

export interface TransactionSummary {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  fees?: number;
  blockchainTxHash?: string;
  createdAt: Date;
}

export interface CircleWebhookPayload {
  Type: string;
  Id: string;
  Data: any;
}

export interface CirclePaymentIntentRequest {
  amount: {
    amount: string;
    currency: string;
  };
  settlementCurrency: string;
  paymentMethods: Array<{
    type: string;
    chain?: string;
  }>;
  idempotencyKey: string;
}

export interface CircleTransferRequest {
  source: {
    type: string;
    id: string;
  };
  destination: {
    type: string;
    address: string;
    chain: string;
  };
  amount: {
    amount: string;
    currency: string;
  };
  idempotencyKey: string;
}

export interface ExchangeRateResponse {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  timestamp: Date;
}

export { PaymentStatus, TransactionType, TransactionStatus, VendorStatus };