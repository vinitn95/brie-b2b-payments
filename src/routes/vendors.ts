import { Router, Request, Response } from 'express';
import { VendorService } from '../services/vendorService';
import { VendorStatus } from '../types';

const router = Router();
const vendorService = new VendorService();

// POST /vendors - Create a new vendor
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, address, bankAccount } = req.body;

    // Validation
    if (!name || !email || !bankAccount) {
      return res.status(400).json({ 
        error: 'name, email, and bankAccount are required' 
      });
    }

    if (!bankAccount.accountNumber || !bankAccount.routingNumber || 
        !bankAccount.bankName || !bankAccount.accountHolder) {
      return res.status(400).json({ 
        error: 'Bank account must include accountNumber, routingNumber, bankName, and accountHolder' 
      });
    }

    const vendor = await vendorService.createVendor({
      name,
      email,
      phone,
      address,
      bankAccount
    });

    res.status(201).json({
      success: true,
      data: vendor
    });

  } catch (error) {
    console.error('Vendor creation error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Vendor creation failed'
    });
  }
});

// GET /vendors/:vendorId - Get vendor details
router.get('/:vendorId', async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorService.getVendor(vendorId);

    res.json({
      success: true,
      data: vendor
    });

  } catch (error) {
    console.error('Get vendor error:', error);
    
    if (error instanceof Error && error.message === 'Vendor not found') {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vendor'
    });
  }
});

// GET /vendors - List all vendors
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Invalid pagination parameters (page >= 1, limit between 1-100)'
      });
    }

    const result = await vendorService.listVendors(page, limit);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('List vendors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vendors'
    });
  }
});

// PATCH /vendors/:vendorId/status - Update vendor status
router.patch('/:vendorId/status', async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.body;

    if (!Object.values(VendorStatus).includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${Object.values(VendorStatus).join(', ')}`
      });
    }

    const vendor = await vendorService.updateVendorStatus(vendorId, status);

    res.json({
      success: true,
      data: vendor
    });

  } catch (error) {
    console.error('Update vendor status error:', error);
    
    if (error instanceof Error && error.message === 'Vendor not found') {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update vendor status'
    });
  }
});

export default router;