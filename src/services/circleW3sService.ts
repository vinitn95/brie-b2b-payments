import { circleConfig } from '../config/circle';
import { generateIdempotencyKey } from '../utils/idempotency';
import crypto from 'crypto';
import fetch from 'node-fetch';

export class CircleW3sService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = circleConfig.apiKey;
    this.baseUrl = circleConfig.w3sApiUrl;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data: any = await response.json();
      
      if (!response.ok) {
        throw new Error(`Circle W3S API error: ${data.message || response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`Circle W3S API request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  /**
   * Get entity configuration including app ID
   */
  async getEntityConfig(): Promise<any> {
    return this.makeRequest('/config/entity');
  }

  /**
   * Get entity public key for encryption
   */
  async getEntityPublicKey(): Promise<string> {
    const response = await this.makeRequest('/config/entity/publicKey');
    return response.data.publicKey;
  }

  /**
   * List all wallet sets
   */
  async listWalletSets(): Promise<any> {
    return this.makeRequest('/walletSets');
  }

  /**
   * Create a new wallet set
   */
  async createWalletSet(name: string): Promise<any> {
    // Generate and encrypt entity secret
    const entitySecret = this.generateEntitySecret();
    const encryptedSecret = await this.encryptEntitySecret(entitySecret);

    const body = {
      idempotencyKey: generateIdempotencyKey(),
      name: name,
      entitySecretCiphertext: encryptedSecret
    };

    const response = await this.makeRequest('/developer/walletSets', 'POST', body);
    
    // Store the entity secret securely (in production, use proper secret management)
    console.log('Entity secret for wallet set (store securely):', entitySecret);
    
    return response;
  }

  /**
   * Generate entity secret (this would normally be done securely)
   */
  generateEntitySecret(): string {
    // Generate a 32-byte random secret
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt entity secret with public key
   */
  async encryptEntitySecret(secret: string): Promise<string> {
    const publicKeyPem = await this.getEntityPublicKey();
    
    // Encrypt the secret using RSA-OAEP with the PEM key directly
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(secret, 'hex')
    );

    return encrypted.toString('base64');
  }

  /**
   * Create programmable wallets
   */
  async createWallets(count: number = 1, walletSetId: string, blockchains: string[] = ['ETH-SEPOLIA']): Promise<any> {
    // Generate and encrypt entity secret
    const entitySecret = this.generateEntitySecret();
    const encryptedSecret = await this.encryptEntitySecret(entitySecret);

    const body = {
      idempotencyKey: generateIdempotencyKey(),
      count,
      blockchains,
      walletSetId,
      entitySecretCiphertext: encryptedSecret
    };

    const response = await this.makeRequest('/developer/wallets', 'POST', body);
    
    // Store the entity secret securely (in production, use proper secret management)
    console.log('Entity secret (store securely):', entitySecret);
    
    return response;
  }

  /**
   * List wallets in a wallet set
   */
  async listWallets(walletSetId?: string): Promise<any> {
    const endpoint = walletSetId ? `/wallets?walletSetId=${walletSetId}` : '/wallets';
    return this.makeRequest(endpoint);
  }

  /**
   * Get wallet details
   */
  async getWallet(walletId: string): Promise<any> {
    return this.makeRequest(`/wallets/${walletId}`);
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<any> {
    return this.makeRequest(`/wallets/${walletId}/balances`);
  }

  /**
   * Create a wallet address for receiving funds
   */
  async createWalletAddress(walletId: string, blockchain: string = 'ETH-SEPOLIA'): Promise<any> {
    const body = {
      idempotencyKey: generateIdempotencyKey(),
      blockchain,
      walletId
    };

    return this.makeRequest('/wallets/addresses/deposit', 'POST', body);
  }

  /**
   * List wallet addresses
   */
  async listWalletAddresses(walletId: string): Promise<any> {
    return this.makeRequest(`/wallets/${walletId}/addresses`);
  }

  /**
   * Get transaction status
   */
  async getTransaction(transactionId: string): Promise<any> {
    return this.makeRequest(`/transactions/${transactionId}`);
  }

  /**
   * List transactions for a wallet
   */
  async listTransactions(walletId: string): Promise<any> {
    return this.makeRequest(`/transactions?walletId=${walletId}`);
  }

  /**
   * Transfer tokens between wallets (would require user authentication in production)
   */
  async createTransfer(sourceWalletId: string, destinationAddress: string, amount: string, tokenId: string): Promise<any> {
    // Note: This would require proper user authentication and entity secret in production
    const body = {
      idempotencyKey: generateIdempotencyKey(),
      walletId: sourceWalletId,
      destinationAddress,
      amount,
      tokenId,
      // entitySecretCiphertext would be required for signing
    };

    return this.makeRequest('/transactions/transfer', 'POST', body);
  }
}