import prisma from '../config/database';
import { circle } from '../config/circle';
import { generateIdempotencyKey } from '../utils/idempotency';
import { 
  CreatePaymentRequest, 
  CreatePaymentResponse, 
  PaymentStatus, 
  TransactionType,
  TransactionStatus 
} from '../types';

export class PaymentService {
  async initiatePayment(request: CreatePaymentRequest, providedIdempotencyKey?: string): Promise<CreatePaymentResponse> {
    const idempotencyKey = providedIdempotencyKey || generateIdempotencyKey();
    
    try {
      // Check if payment already exists with this idempotency key
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey }
      });
      
      if (existingPayment) {
        return {
          paymentId: existingPayment.id,
          status: existingPayment.status,
          amountSgd: existingPayment.amountSgd.toNumber(),
          estimatedAmountUsd: existingPayment.amountUsd?.toNumber(),
          expectedSettlementTime: existingPayment.expectedSettlementTime || undefined,
          idempotencyKey: existingPayment.idempotencyKey
        };
      }

      // Validate vendor exists and is active
      const vendor = await prisma.vendor.findFirst({
        where: { 
          id: request.vendorId,
          status: 'ACTIVE'
        },
        include: { bankAccount: true }
      });

      if (!vendor) {
        throw new Error('Vendor not found or inactive');
      }

      if (!vendor.bankAccount) {
        throw new Error('Vendor bank account not configured');
      }

      // Get current exchange rates (mock for now, will use Circle API later)
      const sgdToUsdcRate = await this.getExchangeRate('SGD', 'USDC');
      const usdcToUsdRate = await this.getExchangeRate('USDC', 'USD');
      const combinedRate = sgdToUsdcRate * usdcToUsdRate;
      
      const estimatedAmountUsd = request.amountSgd * combinedRate;
      const expectedSettlementTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          idempotencyKey,
          vendorId: request.vendorId,
          amountSgd: request.amountSgd,
          amountUsd: estimatedAmountUsd,
          exchangeRate: combinedRate,
          status: PaymentStatus.PENDING,
          customerReference: request.customerReference,
          description: request.description,
          expectedSettlementTime
        }
      });

      // Start the payment flow asynchronously
      this.processPaymentFlow(payment.id).catch(error => {
        console.error(`Payment flow error for payment ${payment.id}:`, error);
        this.updatePaymentStatus(payment.id, PaymentStatus.FAILED);
      });

      return {
        paymentId: payment.id,
        status: payment.status,
        amountSgd: payment.amountSgd.toNumber(),
        estimatedAmountUsd: payment.amountUsd?.toNumber(),
        expectedSettlementTime: payment.expectedSettlementTime || undefined,
        idempotencyKey: payment.idempotencyKey
      };

    } catch (error) {
      console.error('Payment initiation error:', error);
      throw new Error(`Payment initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processPaymentFlow(paymentId: string): Promise<void> {
    try {
      await this.updatePaymentStatus(paymentId, PaymentStatus.PROCESSING);

      // Step 1: Create Circle payment intent for SGD input
      const sgdPaymentIntent = await this.createCirclePaymentIntent(paymentId);
      
      // Step 2: Wait for SGD payment confirmation (simulated)
      await this.simulatePaymentConfirmation(paymentId, sgdPaymentIntent.id);
      
      // Step 3: Exchange SGD to USDC
      await this.exchangeSgdToUsdc(paymentId);
      
      // Step 4: Exchange USDC to USD
      await this.exchangeUsdcToUsd(paymentId);
      
      // Step 5: Payout USD to vendor
      await this.payoutToVendor(paymentId);
      
      await this.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED);

    } catch (error) {
      console.error(`Payment flow error for ${paymentId}:`, error);
      await this.updatePaymentStatus(paymentId, PaymentStatus.FAILED);
      throw error;
    }
  }

  private async createCirclePaymentIntent(paymentId: string): Promise<any> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment not found');

    try {
      // Create Circle payment intent for SGD
      const paymentIntentRequest = {
        amount: {
          amount: payment.amountSgd.toString(),
          currency: 'SGD'
        },
        settlementCurrency: 'USDC',
        paymentMethods: [
          {
            type: 'blockchain',
            chain: 'ETH'
          }
        ],
        idempotencyKey: `${payment.idempotencyKey}-payment-intent`
      };

      // For MVP, simulate Circle payment intent creation
      const response = {
        data: {
          data: {
            id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount: paymentIntentRequest.amount,
            currency: paymentIntentRequest.settlementCurrency,
            status: 'pending'
          }
        }
      };
      
      // Store Circle payment ID
      await prisma.payment.update({
        where: { id: paymentId },
        data: { circlePaymentId: response.data?.data?.id }
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          paymentId,
          type: TransactionType.PAYMENT_IN,
          status: TransactionStatus.PENDING,
          amount: payment.amountSgd,
          currency: 'SGD',
          circleTransactionId: response.data?.data?.id,
          metadata: response.data?.data
        }
      });

      return response.data?.data;

    } catch (error) {
      console.error('Circle payment intent creation error:', error);
      throw new Error(`Failed to create Circle payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async simulatePaymentConfirmation(paymentId: string, circlePaymentId: string): Promise<void> {
    // In production, this would be handled by Circle webhooks
    // For MVP, we'll simulate confirmation after a short delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await prisma.transaction.updateMany({
      where: {
        paymentId,
        type: TransactionType.PAYMENT_IN,
        circleTransactionId: circlePaymentId
      },
      data: {
        status: TransactionStatus.CONFIRMED,
        blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`
      }
    });
  }

  private async exchangeSgdToUsdc(paymentId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment not found');

    const rate = await this.getExchangeRate('SGD', 'USDC');
    const usdcAmount = payment.amountSgd.toNumber() * rate;

    // Simulate Circle exchange
    await prisma.transaction.create({
      data: {
        paymentId,
        type: TransactionType.EXCHANGE_SGD_TO_USDC,
        status: TransactionStatus.CONFIRMED,
        amount: usdcAmount,
        currency: 'USDC',
        circleTransactionId: `exchange-sgd-usdc-${Date.now()}`,
        fees: usdcAmount * 0.001, // 0.1% fee
        feeCurrency: 'USDC'
      }
    });
  }

  private async exchangeUsdcToUsd(paymentId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({ 
      where: { id: paymentId },
      include: { 
        transactions: {
          where: { type: TransactionType.EXCHANGE_SGD_TO_USDC }
        }
      }
    });
    
    if (!payment) throw new Error('Payment not found');
    
    const usdcTransaction = payment.transactions[0];
    if (!usdcTransaction) throw new Error('USDC transaction not found');

    const rate = await this.getExchangeRate('USDC', 'USD');
    const usdAmount = usdcTransaction.amount.toNumber() * rate;

    await prisma.transaction.create({
      data: {
        paymentId,
        type: TransactionType.EXCHANGE_USDC_TO_USD,
        status: TransactionStatus.CONFIRMED,
        amount: usdAmount,
        currency: 'USD',
        circleTransactionId: `exchange-usdc-usd-${Date.now()}`,
        fees: usdAmount * 0.001, // 0.1% fee
        feeCurrency: 'USD'
      }
    });

    // Update final USD amount
    await prisma.payment.update({
      where: { id: paymentId },
      data: { amountUsd: usdAmount }
    });
  }

  private async payoutToVendor(paymentId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        vendor: { include: { bankAccount: true } },
        transactions: { 
          where: { type: TransactionType.EXCHANGE_USDC_TO_USD }
        }
      }
    });

    if (!payment) throw new Error('Payment not found');
    if (!payment.vendor.bankAccount) throw new Error('Vendor bank account not found');

    const usdTransaction = payment.transactions[0];
    if (!usdTransaction) throw new Error('USD transaction not found');

    // Create Circle payout
    const payoutRequest = {
      source: {
        type: 'wallet',
        id: 'master-wallet-id' // This would be your Circle master wallet
      },
      destination: {
        type: 'wire',
        id: payment.vendor.bankAccount.circleAccountId || 'bank-account-id'
      },
      amount: {
        amount: usdTransaction.amount.toString(),
        currency: 'USD'
      },
      idempotencyKey: `${payment.idempotencyKey}-payout`
    };

    try {
      // For MVP, simulate the payout
      const simulatedPayoutId = `payout-${Date.now()}`;
      
      await prisma.transaction.create({
        data: {
          paymentId,
          type: TransactionType.PAYOUT,
          status: TransactionStatus.CONFIRMED,
          amount: usdTransaction.amount,
          currency: 'USD',
          circleTransactionId: simulatedPayoutId,
          fees: usdTransaction.amount.toNumber() * 0.002, // 0.2% payout fee
          feeCurrency: 'USD'
        }
      });

      // Update settlement time
      await prisma.payment.update({
        where: { id: paymentId },
        data: { actualSettlementTime: new Date() }
      });

    } catch (error) {
      console.error('Payout error:', error);
      throw new Error(`Payout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<void> {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status }
    });
  }

  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // For MVP, return mock rates. In production, use Circle's rate API
    const mockRates: Record<string, number> = {
      'SGD-USDC': 0.74,
      'USDC-USD': 1.0,
      'SGD-USD': 0.74
    };
    
    const key = `${fromCurrency}-${toCurrency}`;
    return mockRates[key] || 1.0;
  }

  async getPaymentStatus(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        vendor: true,
        transactions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      amountSgd: payment.amountSgd.toNumber(),
      amountUsd: payment.amountUsd?.toNumber(),
      exchangeRate: payment.exchangeRate?.toNumber(),
      vendor: {
        id: payment.vendor.id,
        name: payment.vendor.name,
        email: payment.vendor.email
      },
      transactions: payment.transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount.toNumber(),
        currency: tx.currency,
        fees: tx.fees?.toNumber(),
        blockchainTxHash: tx.blockchainTxHash,
        createdAt: tx.createdAt
      })),
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      expectedSettlementTime: payment.expectedSettlementTime,
      actualSettlementTime: payment.actualSettlementTime
    };
  }
}