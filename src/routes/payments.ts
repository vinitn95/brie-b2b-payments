import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { validateAmount } from '../utils/validation';
import { generateIdempotencyKey, validateIdempotencyKey } from '../utils/idempotency';

const router = Router();
const paymentService = new PaymentService();

// POST /payments - Initiate a new payment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { vendorId, amountSgd, customerReference, description } = req.body;
    const providedIdempotencyKey = req.headers['idempotency-key'] as string;

    // Validation
    if (!vendorId) {
      return res.status(400).json({ error: 'vendorId is required' });
    }

    if (!amountSgd || !validateAmount(amountSgd)) {
      return res.status(400).json({ error: 'Valid amountSgd is required (must be > 0 and <= 1,000,000)' });
    }

    if (providedIdempotencyKey && !validateIdempotencyKey(providedIdempotencyKey)) {
      return res.status(400).json({ error: 'Invalid idempotency key format (must be UUID)' });
    }

    const payment = await paymentService.initiatePayment({
      vendorId,
      amountSgd: parseFloat(amountSgd),
      customerReference,
      description
    }, providedIdempotencyKey);

    res.status(201).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment initiation failed'
    });
  }
});

// GET /payments/:paymentId - Get payment status
router.get('/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }

    const payment = await paymentService.getPaymentStatus(paymentId);

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    
    if (error instanceof Error && error.message === 'Payment not found') {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment status'
    });
  }
});

// POST /payments/generate-idempotency-key - Generate a new idempotency key
router.post('/generate-idempotency-key', (req: Request, res: Response) => {
  const idempotencyKey = generateIdempotencyKey();
  
  res.json({
    success: true,
    data: { idempotencyKey }
  });
});

export default router;