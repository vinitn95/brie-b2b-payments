import prisma from '../config/database';
import { CreateVendorRequest, VendorStatus } from '../types';
import { validateEmail, validateBankAccount, sanitizeString } from '../utils/validation';

export class VendorService {
  async createVendor(request: CreateVendorRequest) {
    try {
      // Validate input
      if (!validateEmail(request.email)) {
        throw new Error('Invalid email format');
      }

      if (!validateBankAccount(request.bankAccount.accountNumber, request.bankAccount.routingNumber)) {
        throw new Error('Invalid bank account details');
      }

      // Check if vendor already exists
      const existingVendor = await prisma.vendor.findUnique({
        where: { email: request.email }
      });

      if (existingVendor) {
        throw new Error('Vendor with this email already exists');
      }

      // Create vendor with bank account
      const vendor = await prisma.vendor.create({
        data: {
          name: sanitizeString(request.name),
          email: request.email.toLowerCase(),
          phone: request.phone ? sanitizeString(request.phone) : null,
          address: request.address ? sanitizeString(request.address) : null,
          status: VendorStatus.ACTIVE,
          bankAccount: {
            create: {
              accountNumber: request.bankAccount.accountNumber,
              routingNumber: request.bankAccount.routingNumber,
              bankName: sanitizeString(request.bankAccount.bankName),
              accountHolder: sanitizeString(request.bankAccount.accountHolder),
              country: 'US',
              currency: 'USD'
            }
          }
        },
        include: {
          bankAccount: true
        }
      });

      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        status: vendor.status,
        bankAccount: vendor.bankAccount ? {
          id: vendor.bankAccount.id,
          accountNumber: `****${vendor.bankAccount.accountNumber.slice(-4)}`, // Mask account number
          routingNumber: vendor.bankAccount.routingNumber,
          bankName: vendor.bankAccount.bankName,
          accountHolder: vendor.bankAccount.accountHolder
        } : null,
        createdAt: vendor.createdAt
      };

    } catch (error) {
      console.error('Vendor creation error:', error);
      throw new Error(`Vendor creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVendor(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        bankAccount: true,
        payments: {
          select: {
            id: true,
            status: true,
            amountSgd: true,
            amountUsd: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 payments
        }
      }
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      status: vendor.status,
      bankAccount: vendor.bankAccount ? {
        id: vendor.bankAccount.id,
        accountNumber: `****${vendor.bankAccount.accountNumber.slice(-4)}`,
        routingNumber: vendor.bankAccount.routingNumber,
        bankName: vendor.bankAccount.bankName,
        accountHolder: vendor.bankAccount.accountHolder
      } : null,
      recentPayments: vendor.payments.map(payment => ({
        id: payment.id,
        status: payment.status,
        amountSgd: payment.amountSgd.toNumber(),
        amountUsd: payment.amountUsd?.toNumber(),
        createdAt: payment.createdAt
      })),
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt
    };
  }

  async listVendors(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        skip,
        take: limit,
        include: {
          bankAccount: {
            select: {
              bankName: true,
              accountHolder: true
            }
          },
          _count: {
            select: { payments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vendor.count()
    ]);

    return {
      vendors: vendors.map(vendor => ({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        status: vendor.status,
        bankAccount: vendor.bankAccount ? {
          bankName: vendor.bankAccount.bankName,
          accountHolder: vendor.bankAccount.accountHolder
        } : null,
        paymentCount: vendor._count.payments,
        createdAt: vendor.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateVendorStatus(vendorId: string, status: VendorStatus) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { status },
      include: { bankAccount: true }
    });

    return {
      id: updatedVendor.id,
      name: updatedVendor.name,
      email: updatedVendor.email,
      status: updatedVendor.status,
      updatedAt: updatedVendor.updatedAt
    };
  }
}