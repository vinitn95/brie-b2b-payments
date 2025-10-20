import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { circleConfig } from '../config/circle';
import { TransactionStatus, PaymentStatus } from '../types';

const router = Router();

// Circle webhook signature verification
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.warn('Webhook secret not configured, skipping signature verification');
    return true; // For development/testing
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// POST /webhooks/circle - Handle Circle webhooks
router.post('/circle', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (circleConfig.webhookSecret && !verifyWebhookSignature(payload, signature, circleConfig.webhookSecret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhookData = req.body;
    const { Type: eventType, Id: eventId, Data: eventData } = webhookData;

    console.log(`Received Circle webhook: ${eventType} - ${eventId}`);

    // Check if we've already processed this event
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { circleEventId: eventId }
    });

    if (existingEvent && existingEvent.processed) {
      console.log(`Event ${eventId} already processed`);
      return res.status(200).json({ status: 'already_processed' });
    }

    // Store webhook event
    const webhookEvent = await prisma.webhookEvent.upsert({
      where: { circleEventId: eventId },
      update: { payload: webhookData },
      create: {
        circleEventId: eventId,
        eventType,
        payload: webhookData,
        processed: false
      }
    });

    // Process the webhook based on event type
    await processWebhookEvent(eventType, eventData, webhookEvent.id);

    // Mark event as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { 
        processed: true,
        processedAt: new Date()
      }
    });

    res.status(200).json({ status: 'processed' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function processWebhookEvent(eventType: string, eventData: any, webhookEventId: string): Promise<void> {
  try {
    switch (eventType) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(eventData, webhookEventId);
        break;
        
      case 'payment_intent.failed':
        await handlePaymentIntentFailed(eventData, webhookEventId);
        break;
        
      case 'transfer.completed':
        await handleTransferCompleted(eventData, webhookEventId);
        break;
        
      case 'transfer.failed':
        await handleTransferFailed(eventData, webhookEventId);
        break;
        
      case 'payout.completed':
        await handlePayoutCompleted(eventData, webhookEventId);
        break;
        
      case 'payout.failed':
        await handlePayoutFailed(eventData, webhookEventId);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${eventType}:`, error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(eventData: any, webhookEventId: string): Promise<void> {
  const circlePaymentId = eventData.id;
  
  // Find the payment by Circle payment ID
  const payment = await prisma.payment.findFirst({
    where: { circlePaymentId }
  });

  if (!payment) {
    console.error(`Payment not found for Circle payment ID: ${circlePaymentId}`);
    return;
  }

  // Update transaction status
  await prisma.transaction.updateMany({
    where: {
      paymentId: payment.id,
      circleTransactionId: circlePaymentId
    },
    data: {
      status: TransactionStatus.CONFIRMED,
      blockchainTxHash: eventData.transactionHash
    }
  });

  // Update webhook event with related payment
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { relatedPaymentId: payment.id }
  });

  console.log(`Payment intent succeeded for payment ${payment.id}`);
}

async function handlePaymentIntentFailed(eventData: any, webhookEventId: string): Promise<void> {
  const circlePaymentId = eventData.id;
  
  const payment = await prisma.payment.findFirst({
    where: { circlePaymentId }
  });

  if (!payment) {
    console.error(`Payment not found for Circle payment ID: ${circlePaymentId}`);
    return;
  }

  // Update transaction status
  await prisma.transaction.updateMany({
    where: {
      paymentId: payment.id,
      circleTransactionId: circlePaymentId
    },
    data: { status: TransactionStatus.FAILED }
  });

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.FAILED }
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { relatedPaymentId: payment.id }
  });

  console.log(`Payment intent failed for payment ${payment.id}`);
}

async function handleTransferCompleted(eventData: any, webhookEventId: string): Promise<void> {
  const circleTransferId = eventData.id;
  
  // Find transaction by Circle transfer ID
  const transaction = await prisma.transaction.findFirst({
    where: { circleTransactionId: circleTransferId }
  });

  if (!transaction) {
    console.error(`Transaction not found for Circle transfer ID: ${circleTransferId}`);
    return;
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: TransactionStatus.CONFIRMED,
      blockchainTxHash: eventData.transactionHash
    }
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { relatedTransactionId: transaction.id }
  });

  console.log(`Transfer completed for transaction ${transaction.id}`);
}

async function handleTransferFailed(eventData: any, webhookEventId: string): Promise<void> {
  const circleTransferId = eventData.id;
  
  const transaction = await prisma.transaction.findFirst({
    where: { circleTransactionId: circleTransferId }
  });

  if (!transaction) {
    console.error(`Transaction not found for Circle transfer ID: ${circleTransferId}`);
    return;
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: TransactionStatus.FAILED }
  });

  // If this was the final payout transaction, mark payment as failed
  if (transaction.type === 'PAYOUT') {
    await prisma.payment.update({
      where: { id: transaction.paymentId },
      data: { status: PaymentStatus.FAILED }
    });
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { relatedTransactionId: transaction.id }
  });

  console.log(`Transfer failed for transaction ${transaction.id}`);
}

async function handlePayoutCompleted(eventData: any, webhookEventId: string): Promise<void> {
  const circlePayoutId = eventData.id;
  
  const transaction = await prisma.transaction.findFirst({
    where: { circleTransactionId: circlePayoutId }
  });

  if (!transaction) {
    console.error(`Transaction not found for Circle payout ID: ${circlePayoutId}`);
    return;
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: TransactionStatus.CONFIRMED }
  });

  // Mark payment as completed
  await prisma.payment.update({
    where: { id: transaction.paymentId },
    data: { 
      status: PaymentStatus.COMPLETED,
      actualSettlementTime: new Date()
    }
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { relatedTransactionId: transaction.id }
  });

  console.log(`Payout completed for transaction ${transaction.id}`);
}

async function handlePayoutFailed(eventData: any, webhookEventId: string): Promise<void> {
  const circlePayoutId = eventData.id;
  
  const transaction = await prisma.transaction.findFirst({
    where: { circleTransactionId: circlePayoutId }
  });

  if (!transaction) {
    console.error(`Transaction not found for Circle payout ID: ${circlePayoutId}`);
    return;
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: TransactionStatus.FAILED }
  });

  await prisma.payment.update({
    where: { id: transaction.paymentId },
    data: { status: PaymentStatus.FAILED }
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { relatedTransactionId: transaction.id }
  });

  console.log(`Payout failed for transaction ${transaction.id}`);
}

export default router;