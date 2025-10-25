import { Router, Request, Response } from 'express';
import { CircleW3sService } from '../services/circleW3sService';

const router = Router();
const circleW3sService = new CircleW3sService();

// GET /circle/config - Get entity configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await circleW3sService.getEntityConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get config'
    });
  }
});

// GET /circle/wallet-sets - List all wallet sets
router.get('/wallet-sets', async (req: Request, res: Response) => {
  try {
    const walletSets = await circleW3sService.listWalletSets();
    
    res.json({
      success: true,
      data: walletSets
    });
  } catch (error) {
    console.error('List wallet sets error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list wallet sets'
    });
  }
});

// POST /circle/wallet-sets - Create a new wallet set
router.post('/wallet-sets', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'name is required'
      });
    }

    const walletSet = await circleW3sService.createWalletSet(name);
    
    res.status(201).json({
      success: true,
      data: walletSet
    });
  } catch (error) {
    console.error('Create wallet set error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create wallet set'
    });
  }
});

// GET /circle/wallets - List all wallets
router.get('/wallets', async (req: Request, res: Response) => {
  try {
    const { walletSetId } = req.query;
    const wallets = await circleW3sService.listWallets(walletSetId as string);
    
    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('List wallets error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list wallets'
    });
  }
});

// POST /circle/wallets - Create programmable wallets
router.post('/wallets', async (req: Request, res: Response) => {
  try {
    const { count = 1, walletSetId, blockchains = ['ETH-SEPOLIA'] } = req.body;

    if (!walletSetId) {
      return res.status(400).json({
        error: 'walletSetId is required'
      });
    }

    const wallets = await circleW3sService.createWallets(count, walletSetId, blockchains);
    
    res.status(201).json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Create wallets error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create wallets'
    });
  }
});

// GET /circle/wallets/:walletId - Get wallet details and balance
router.get('/wallets/:walletId', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const wallet = await circleW3sService.getWallet(walletId);
    
    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wallet'
    });
  }
});

// GET /circle/wallets/:walletId/balance - Get wallet balance
router.get('/wallets/:walletId/balance', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const balance = await circleW3sService.getWalletBalance(walletId);
    
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wallet balance'
    });
  }
});

// POST /circle/wallets/:walletId/addresses - Create wallet address
router.post('/wallets/:walletId/addresses', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const { blockchain = 'ETH-SEPOLIA' } = req.body;

    const address = await circleW3sService.createWalletAddress(walletId, blockchain);
    
    res.status(201).json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Create wallet address error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create wallet address'
    });
  }
});

// GET /circle/wallets/:walletId/addresses - List wallet addresses
router.get('/wallets/:walletId/addresses', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const addresses = await circleW3sService.listWalletAddresses(walletId);
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('List wallet addresses error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list wallet addresses'
    });
  }
});

// GET /circle/transactions/:transactionId - Get transaction status
router.get('/transactions/:transactionId', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const transaction = await circleW3sService.getTransaction(transactionId);
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transaction'
    });
  }
});

// GET /circle/wallets/:walletId/transactions - List wallet transactions
router.get('/wallets/:walletId/transactions', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const transactions = await circleW3sService.listTransactions(walletId);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list transactions'
    });
  }
});

// Mock exchange rates endpoint (W3S doesn't have exchange rates)
router.get('/exchange-rates', async (req: Request, res: Response) => {
  try {
    const rates = {
      data: {
        rates: [
          { from: 'SGD', to: 'USD', rate: '0.74' },
          { from: 'USD', to: 'USDC', rate: '1.00' },
          { from: 'USDC', to: 'USD', rate: '1.00' }
        ]
      }
    };
    
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get exchange rates'
    });
  }
});

export default router;