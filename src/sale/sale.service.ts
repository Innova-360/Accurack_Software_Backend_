import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import {
  CreateSaleDto,
  UpdateSaleDto,
  CreateSaleReturnDto,
  CreatePaymentDto,
  SaleQueryDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  PaymentMethod,
  SaleStatus,
  ReturnCategory,
  PaymentStatus,
  PackType,
} from './dto/sale.dto';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  parseExcelOrHTML,
  ProductExcelRow,
  ValidationResult,
} from 'src/utils/salesFileParser';
import * as crypto from 'crypto';
import { chunk, includes } from 'lodash';
import { InvoiceService } from 'src/invoice/invoice.service';
import { InvoiceSource, SaleConfirmation } from '@prisma/client';

@Injectable()
export class SaleService {
  constructor(
    private prisma: PrismaClientService,
    private invoiceService: InvoiceService,
    private readonly tenantContext: TenantContextService, // Add tenant context
  ) { }

  // Customer Management
  async createCustomer(dto: CreateCustomerDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Check if customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingCustomer) {
      throw new BadRequestException(
        'Customer with this phone number already exists',
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Create customer
      const customer = await tx.customer.create({
        data: dto,
      });

      // Create initial balance sheet for customer
      await tx.balanceSheet.create({
        data: {
          customerId: customer.id,
          remainingAmount: 0,
          amountPaid: 0,
          paymentStatus: PaymentStatus.PAID,
          description: 'Initial balance sheet created',
        },
      });

      return customer;
    });
  }

  async findCustomerByPhone(phoneNumber: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.customer.findUnique({
      where: { phoneNumber },
      include: {
        balanceSheets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async updateCustomer(customerId: string, dto: UpdateCustomerDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (customer?.id !== customerId) {
      throw new NotFoundException('Customer not found');
    }

    return await prisma.customer.update({
      where: { id: customerId },
      data: dto,
    });
  }

  async deleteCustomer(customerId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    // First check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if customer has any associated sales
    const salesCount = await prisma.sales.count({
      where: { customerId: customerId },
    });

    if (salesCount > 0) {
      throw new BadRequestException(
        'Cannot delete customer with existing sales records',
      );
    }

    // Delete related balance sheets first (due to foreign key constraints)
    await prisma.balanceSheet.deleteMany({
      where: { customerId: customerId },
    });

    // Delete the customer
    const response = await prisma.customer.delete({
      where: { id: customerId },
    });

    return response;
  }

  async getCustomers(
    user: any,
    storeId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();

    if (storeId === 'undefined' || storeId === null) {
      const store = await prisma.stores.findFirst({
        where: { clientId: user.clientId },
        select: { id: true },
      });
      if (!store) {
        throw new NotFoundException('No store found for this user');
      }
    }

    // If search is provided, ignore pagination and return all matches
    if (search && search.trim() !== '') {
      const where: any = {
        storeId,
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
        ],
      };
      const customers = await prisma.customer.findMany({
        where,
        include: {
          balanceSheets: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { sales: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return {
        customers,
        total: customers.length,
        page: 1,
        limit: customers.length,
        totalPages: 1,
      };
    }

    // Default: paginated fetch
    const skip = (page - 1) * limit;
    const where: any = { storeId };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          balanceSheets: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { sales: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);
    // console.log('customers', customers, 'total', total);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createSale(dto: CreateSaleDto, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    const result = await prisma.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findUnique({
        where: { phoneNumber: dto.customerPhone },
      });

      if (!customer) {
        if (!dto.customerData) {
          throw new BadRequestException(
            'Customer data required for new customer',
          );
        }
        customer = await tx.customer.create({ data: dto.customerData });
        await tx.balanceSheet.create({
          data: {
            customerId: customer.id,
            remainingAmount: 0,
            amountPaid: 0,
            paymentStatus: PaymentStatus.PAID,
            description: 'Initial balance sheet created',
          },
        });
      }

      // Validate products, pack types, and update inventory
      for (const item of dto.saleItems) {
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          include: { packs: true },
        });
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.pluUpc} not found`,
          );
        }

        // Validate pack type compatibility
        if (item.packType === PackType.ITEM) {
          // Check if single-item sales are allowed
          if (!product.singleItemSellingPrice || product.singleItemSellingPrice <= 0) {
            throw new BadRequestException(
              `Product ${product.name} does not support single-item sales`,
            );
          }
        } else if (item.packType === PackType.BOX) {
          // Check if packs are available
          if (!product.packs || product.packs.length === 0) {
            throw new BadRequestException(
              `Product ${product.name} does not have any packs available`,
            );
          }
          // If packId is specified, validate it exists
          if (item.packId) {
            const pack = product.packs.find(p => p.id === item.packId);
            if (!pack) {
              throw new BadRequestException(
                `Pack with ID ${item.packId} not found for product ${product.name}`,
              );
            }
            // Validate pack quantity and pricing
            if (pack.totalPacksQuantity <= 0) {
              throw new BadRequestException(
                `Pack ${item.packId} has zero or negative quantity`,
              );
            }
          }
        }

        // Check inventory availability
        if (product.itemQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient inventory for product ${product.name}`,
          );
        }

        // Update inventory
        await tx.products.update({
          where: { id: item.productId },
          data: { itemQuantity: { decrement: item.quantity } },
        });
      }

      // Set sale properties based on source
      const isWebsite = dto.source === InvoiceSource.website;
      const saleData = {
        customerId: customer.id,
        userId: user.id,
        storeId: dto.storeId,
        clientId: dto.clientId,
        paymentMethod: dto.paymentMethod,
        confirmation: isWebsite
          ? SaleConfirmation.NOT_CONFIRMED
          : SaleConfirmation.CONFIRMED,
        source: dto.source as InvoiceSource | undefined,
        allowance: dto.allowance,
        quantitySend: isWebsite ? 0 : dto.saleItems.length,
        totalAmount: dto.totalAmount - (dto.allowance ?? 0) + (dto.tax || 0),
        tax: dto.tax || 0,
        status: isWebsite ? SaleStatus.PENDING : SaleStatus.COMPLETED,
        generateInvoice: false,
        cashierName: dto.cashierName || 'nan',
      };

      // Create sale
      const sale = await tx.sales.create({ data: saleData });

      // Create sale items
      await Promise.all(
        dto.saleItems.map((item) =>
          tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              pluUpc: item.pluUpc,
              productName: item.productName,
              quantity: item.quantity,
              sellingPrice: item.sellingPrice,
              totalPrice: item.totalPrice,
              packType: item.packType,
              packId: item.packId,
            },
          }),
        ),
      );

      // Update customer balance sheet
      await tx.balanceSheet.create({
        data: {
          customerId: customer.id,
          saleId: sale.id,
          remainingAmount: saleData.totalAmount,
          amountPaid: 0,
          paymentStatus: PaymentStatus.UNPAID,
          description: `Sale #${sale.id} - ${saleData.totalAmount}`,
        },
      });

      return { sale, customer };
    });

    // Generate invoice after transaction completes
    let invoice: any = null;
    const isWebsite = dto.source === InvoiceSource.website;
    if (dto.generateInvoice && !isWebsite) {
      // Check if business info is provided in DTO for invoice generation
      if (dto.companyName && dto.companyNo && dto.companyAddress) {
        // Create or update business info if provided
        const businessData = {
          businessName: dto.companyName,
          contactNo: dto.companyNo,
          address: dto.companyAddress,
          website: dto.companyMail ? `mailto:${dto.companyMail}` : undefined,
          logoUrl: undefined,
        };

        // Set business info before creating invoice
        await this.invoiceService.setBusinessInfo(dto.storeId, businessData, user);
      }

      const invoiceNumber = dto.invoiceNumber ?? await this.generateInvoiceNumber();
      invoice = await this.invoiceService.createInvoice(
        { saleId: result.sale.id, invoiceNumber },
        user,
      );
    }

    return { ...result, invoice };
  }

  async setSaleConfirmation(
    setStatus: 'CONFIRMED' | 'CANCELLED',
    sale: any,
    user: any,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      if (setStatus === 'CONFIRMED') {
        // Update sale status
        const updatedSale = await tx.sales.update({
          where: { id: sale.id },
          data: {
            confirmation: SaleConfirmation.CONFIRMED,
            status: SaleStatus.COMPLETED,
            quantitySend: sale.saleItems.length,
            generateInvoice: true,
          },
          include: { saleItems: true },
        });

        // Generate invoice
        const invoiceNumber = await this.generateInvoiceNumber();
        const invoice = await this.invoiceService.createInvoice(
          { saleId: sale.id, invoiceNumber },
          user,
        );

        return { sale: updatedSale, invoice };
      } else {
        // Rollback inventory
        await Promise.all(
          sale.saleItems.map((item) =>
            tx.products.update({
              where: { id: item.productId },
              data: { itemQuantity: { increment: item.quantity } },
            }),
          ),
        );

        // Update sale status
        const updatedSale = await tx.sales.update({
          where: { id: sale.id },
          data: {
            confirmation: SaleConfirmation.CANCELLED,
            status: SaleStatus.CANCELLED,
          },
        });

        // Update balance sheet
        await tx.balanceSheet.updateMany({
          where: { saleId: sale.id },
          data: {
            remainingAmount: 0,
            paymentStatus: PaymentStatus.UNPAID,
            description: `Sale #${sale.id} cancelled`,
          },
        });

        return { sale: updatedSale };
      }
    });
  }

  async getSales(query: SaleQueryDto, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const {
      page = '1',
      limit = '20',
      customerId,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { storeId };

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [sales, total] = await Promise.all([
      prisma.sales.findMany({
        where,
        include: {
          customer: true,
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  pluUpc: true,
                  msrpPrice: true,
                  discountAmount: true,
                  percentDiscount: true,
                  packs: true
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sales.count({ where }),
    ]);



    return {
      sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async getSaleById(saleId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const sale = await prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                msrpPrice: true,
                discountAmount: true,
                percentDiscount: true,
                packIds: true,
                packs: {
                  select: {
                    totalPacksQuantity: true,
                  }
                }
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        invoices: true,
        returns: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return sale;
  }

  async updateSale(saleId: string, dto: UpdateSaleDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const sale = await prisma.sales.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return await prisma.sales.update({
      where: { id: saleId },
      data: dto,
    });
  }

  async deleteSale(saleId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const sale = await prisma.sales.findUnique({
      where: { id: saleId },
      include: { saleItems: true },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return await prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of sale.saleItems) {
        await tx.products.update({
          where: { id: item.pluUpc },
          data: {
            itemQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Delete related records
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.invoice.deleteMany({ where: { saleId } });
      await tx.balanceSheet.deleteMany({ where: { saleId } });

      // Delete sale
      await tx.sales.delete({ where: { id: saleId } });
    });
  }

  async deleteAllSales(user: any, storeId: string): Promise<void> {
    const prisma = await this.tenantContext.getPrismaClient();

    // First, get the total count to check if sales exist
    const totalCount = await prisma.sales.count({
      where: { storeId },
    });

    if (totalCount === 0) {
      throw new NotFoundException('No sales found for this store.');
    }

    console.log(
      `Starting batch deletion of ${totalCount} sales for store ${storeId}`,
    );

    const batchSize = 500; // Process 500 sales at a time
    let processed = 0;

    // Process in batches to avoid overwhelming the database
    while (processed < totalCount) {
      // Get a batch of sale IDs
      const saleBatch = await prisma.sales.findMany({
        where: { storeId },
        select: { id: true },
        take: batchSize,
        skip: 0, // Always take from the beginning since we're deleting
      });

      if (saleBatch.length === 0) {
        break; // No more sales to process
      }

      const saleIds = saleBatch.map((s) => s.id);

      try {
        // Delete in transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
          // Delete related records first
          await tx.saleItem.deleteMany({
            where: { saleId: { in: saleIds } },
          });

          await tx.invoice.deleteMany({
            where: { saleId: { in: saleIds } },
          });

          await tx.balanceSheet.deleteMany({
            where: { saleId: { in: saleIds } },
          });

          // Delete sale adjustments
          await tx.saleAdjustment.deleteMany({
            where: { saleId: { in: saleIds } },
          });

          // Delete sale returns
          await tx.saleReturn.deleteMany({
            where: { saleId: { in: saleIds } },
          });

          // Finally delete the sales themselves
          await tx.sales.deleteMany({
            where: { id: { in: saleIds } },
          });
        });

        processed += saleIds.length;
        console.log(`Deleted batch: ${processed}/${totalCount} sales`);

        // Small delay between batches to prevent database overload
        if (processed < totalCount) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(
          `Error deleting batch at ${processed}/${totalCount}:`,
          error,
        );
        throw new BadRequestException(
          `Failed to delete sales at batch ${Math.floor(processed / batchSize) + 1}. ${error.message}`,
        );
      }
    }

    // After deleting all sales, clean up file upload records
    try {
      console.log(`Cleaning up sales file upload records for store ${storeId}`);

      await prisma.$transaction(async (tx) => {
        // Delete file upload sales records
        const deletedFileUploads = await tx.fileUploadSales.deleteMany({
          where: { storeId },
        });

        console.log(
          `Deleted ${deletedFileUploads.count} sales file upload records`,
        );
      });
    } catch (error) {
      console.error('Error cleaning up sales file upload records:', error);
      // Don't throw error here as sales were already deleted successfully
      // Just log the error for debugging
    }

    console.log(
      `Successfully deleted all ${processed} sales and file upload records for store ${storeId}`,
    );
    return;
  }

  // Sale Returns
  async createSaleReturn(dto: CreateSaleReturnDto, userId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.$transaction(async (tx) => {
      // Verify sale exists
      const sale = await tx.sales.findUnique({
        where: { id: dto.saleId },
        include: {
          saleItems: true,
          customer: true,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      if (!sale.customerId) {
        throw new BadRequestException('Sale does not have a valid customerId');
      }

      // Get last balance for the customer
      const lastBalance = await tx.balanceSheet.findFirst({
        where: { customerId: sale.customerId },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastBalance || lastBalance.paymentStatus !== PaymentStatus.PAID) {
        throw new BadRequestException('Sale is not paid or no balance found');
      }

      const returnRecords: any = [];
      let totalRefundAmount = 0;

      // Process each return item
      for (const item of dto.returnItems) {
        // Find the corresponding sale item
        const saleItem = sale.saleItems.find(
          (si) => si.productId === item.productId,
        );
        if (!saleItem) {
          throw new NotFoundException(
            `Product ${item.productId} not found in this sale`,
          );
        }

        if (item.quantity > saleItem.quantity) {
          throw new BadRequestException(
            `Return quantity (${item.quantity}) for product ${item.productId} cannot exceed purchased quantity (${saleItem.quantity})`,
          );
        }

        // Create return record
        const returnRecord = await tx.saleReturn.create({
          data: {
            saleId: dto.saleId,
            productId: item.productId,
            pluUpc: item.pluUpc,
            quantity: item.quantity,
            // isProductReturned: item.isProductReturned,
            // refundAmount: item.refundAmount,
            returnCategory: item.returnCategory,
            reason: item.reason,
            processedBy: userId,
          },
        });

        // Update inventory only if product is returned and category is SALEABLE or SCRAP
        if (
          item.isProductReturned &&
          item.returnCategory !== ReturnCategory.NON_SALEABLE
        ) {
          const product = await tx.products.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found`);
          }

          switch (item.returnCategory) {
            case ReturnCategory.SALEABLE:
            case ReturnCategory.SCRAP:
              await tx.products.update({
                where: { id: item.productId },
                data: {
                  itemQuantity: {
                    increment: item.quantity,
                  },
                },
              });
              break;
          }
        }

        returnRecords.push(returnRecord);
        totalRefundAmount += item.refundAmount;
      }

      // Update balance sheet with total refund amount
      await tx.balanceSheet.create({
        data: {
          customerId: sale.customerId,
          saleId: dto.saleId,
          remainingAmount: lastBalance.remainingAmount - totalRefundAmount, // Deduct total refund
          amountPaid: 0,
          paymentStatus: PaymentStatus.PAID,
          description: `Return for sale #${dto.saleId} - ${totalRefundAmount}`,
        },
      });

      return {
        saleId: dto.saleId,
        returns: returnRecords,
        totalRefundAmount,
      };
    });
  }

  async getReturnSales(storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.saleReturn.findMany({
      where: {
        sale: {
          storeId: storeId,
        },
      },
      include: {
        sale: {
          include: {
            customer: {
              select: {
                id: true,
                customerName: true,
                customerStreetAddress: true,
                country: true,
                state: true,
                city: true,
                zipCode: true,
                phoneNumber: true,
                telephoneNumber: true,
                customerMail: true,
                website: true,
                threshold: true,
                storeId: true,
                clientId: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            saleItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    categoryId: true,
                    ean: true,
                    pluUpc: true,
                    sku: true,
                    itemQuantity: true,
                    msrpPrice: true,
                    singleItemSellingPrice: true,
                    clientId: true,
                    storeId: true,
                    discountAmount: true,
                    percentDiscount: true,
                    hasVariants: true,
                    packIds: true,
                    variants: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            ean: true,
            pluUpc: true,
            sku: true,
            itemQuantity: true,
            msrpPrice: true,
            singleItemSellingPrice: true,
            clientId: true,
            storeId: true,
            discountAmount: true,
            percentDiscount: true,
            hasVariants: true,
            packIds: true,
            variants: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Payment Management
  async createPayment(dto: CreatePaymentDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Get current balance
      const lastBalance = await tx.balanceSheet.findFirst({
        where: { customerId: dto.customerId },
        orderBy: { createdAt: 'desc' },
      });

      const currentBalance = lastBalance ? lastBalance.remainingAmount : 0;
      const newBalance = currentBalance - dto.amountPaid;

      // Create payment record
      const payment = await tx.balanceSheet.create({
        data: {
          customerId: dto.customerId,
          saleId: dto.saleId,
          remainingAmount: newBalance,
          amountPaid: dto.amountPaid,
          paymentStatus:
            newBalance <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
          description: dto.description || `Payment - ${dto.amountPaid}`,
        },
      });

      return payment;
    });
  }

  async getCustomerBalance(customerId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const balanceSheets = await prisma.balanceSheet.findMany({
      where: { customerId },
      include: {
        sale: {
          select: {
            id: true,
            customerId: true,
            userId: true,
            storeId: true,
            clientId: true,
            paymentMethod: true,
            totalAmount: true,
            quantitySend: true,
            allowance: true,
            source: true,
            tax: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            validatorId: true,
            saleItems: {
              select: {
                id: true,
                productId: true,
                pluUpc: true,
                productName: true,
                quantity: true,
                sellingPrice: true,
                totalPrice: true,
                createdAt: true,
                updatedAt: true,
                product: true,
              },
            },
            customer: true,
            invoices: true,
            returns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const currentBalance = balanceSheets[0]?.remainingAmount || 0;
    const totalPaid = balanceSheets.reduce(
      (sum, sheet) => sum + sheet.amountPaid,
      0,
    );

    return {
      customer,
      currentBalance,
      totalPaid,
      balanceHistory: balanceSheets,
    };
  }

  // Utility methods
  private async generateInvoiceNumber(): Promise<string> {
    const prisma = await this.tenantContext.getPrismaClient();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `INV-${year}${month}${day}`;

    // Find the last invoice number for today
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(
        lastInvoice.invoiceNumber.split('-').pop() || '0',
      );
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  async checkSalesFileHash(fileHash: string, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.fileUploadSales.findUnique({
      where: {
        fileHash,
        storeId,
      },
    });
  }

  async checkSalesFileStatus(
    file: Express.Multer.File,
    user: any,
    storeId: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    const dataToHash = Buffer.concat([file.buffer, Buffer.from(user.id)]);
    const fileHash = crypto
      .createHash('sha256')
      .update(dataToHash)
      .digest('hex');
    const existingFile = await this.checkSalesFileHash(fileHash, storeId);
    if (existingFile) {
      throw new ConflictException('This file has already been uploaded');
    }
    return fileHash;
  }

  async uploadSalesSheet(
    user: any,
    parsedData: ValidationResult,
    file: Express.Multer.File,
    fileHash: string,
    storeId: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Validate that the store exists
    const store = await prisma.stores.findFirst({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }

    // Validate that the client exists
    const client = await prisma.clients.findUnique({
      where: { id: user.clientId },
    });
    if (!client) {
      throw new BadRequestException(
        'Invalid client - user client does not exist',
      );
    }

    // Validate that the store belongs to the user's client
    if (store.clientId !== user.clientId) {
      throw new BadRequestException('Store does not belong to your client');
    }

    // Start a transaction to ensure atomicity
    await prisma.$transaction(
      async (prisma) => {
        // Create FileUploadSales record
        const fileUpload = await prisma.fileUploadSales.create({
          data: {
            fileHash,
            storeId: store.id,
            fileName: file.originalname,
          },
        });

        // Step 1: Aggregate unique product sales by PLU/UPC and calculate total quantity
        const productSalesCount = parsedData.data.reduce((map, item) => {
          const plu = item['PLU/UPC'];
          const quantity = item.IndividualItemQuantity || 0;
          map.set(plu, (map.get(plu) || 0) + quantity);
          return map;
        }, new Map<string, number>());

        // Step 2: Fetch product inventory and validate stock
        const inventoryMap = new Map<string, any>();
        for (const plu of productSalesCount.keys()) {
          const product = await prisma.products.findFirst({
            where: { pluUpc: plu, storeId: store.id },
          });
          if (product) {
            inventoryMap.set(plu, product);
          }
        }

        // Step 3: Decrement stock for valid products
        for (const [plu, quantity] of productSalesCount.entries()) {
          const product = inventoryMap.get(plu);
          console.log('product', product);
          if (product && product.itemQuantity >= quantity) {
            await prisma.products.update({
              where: { id: product.id },
              data: { itemQuantity: { decrement: quantity } },
            });
          } else {
            throw new BadRequestException(
              `Insufficient stock for product with PLU/UPC: ${plu} or product not found`,
            );
          }
        }

        // Step 4: Group data by customer (CustomerName and CustomerPhoneNumber, allowing null/undefined)
        const salesByCustomer = parsedData.data.reduce(
          (acc, row) => {
            const customerName = row.CustomerName || 'Unknown';
            const customerPhoneNumber = String(row.CustomerPhoneNumber || '');
            const key = `${customerName}-${customerPhoneNumber}`;
            if (!acc[key]) {
              acc[key] = {
                customerName,
                customerPhoneNumber,
                items: [],
                totalAmount: 0,
              };
            }
            acc[key].items.push(row);
            acc[key].totalAmount += row.TotalPrice;
            return acc;
          },
          {} as Record<
            string,
            {
              customerName: string;
              customerPhoneNumber: string;
              items: ProductExcelRow[];
              totalAmount: number;
            }
          >,
        );

        // Step 5: Process each customer sale
        for (const customerSale of Object.values(salesByCustomer)) {
          let customerId = 'walking-customer';

          // Only attempt to find or create customer if we have meaningful details
          if (
            customerSale.customerName !== 'Unknown' ||
            customerSale.customerPhoneNumber
          ) {
            // Build where filter without null values
            const customerWhere: any = { clientId: user.clientId };
            if (customerSale.customerName !== 'Unknown') {
              customerWhere.customerName = customerSale.customerName;
            }
            if (customerSale.customerPhoneNumber) {
              customerWhere.phoneNumber = customerSale.customerPhoneNumber;
            }

            let customer = await prisma.customer.findFirst({
              where: customerWhere,
            });

            if (
              !customer &&
              (customerSale.customerName !== 'Unknown' ||
                customerSale.customerPhoneNumber)
            ) {
              customer = await prisma.customer.create({
                data: {
                  customerName:
                    customerSale.customerName === 'Unknown'
                      ? 'Anonymous'
                      : customerSale.customerName,
                  phoneNumber: customerSale.customerPhoneNumber || '',
                  clientId: user.clientId,
                  storeId: store.id,
                },
              });
              customerId = customer.id;
            }
          }

          // Step 6: Create Sales record
          const sale = await prisma.sales.create({
            data: {
              customerId,
              userId: user.id,
              storeId: store.id,
              clientId: user.clientId,
              paymentMethod: PaymentMethod.CASH, // Adjust based on your requirements
              totalAmount: customerSale.totalAmount,
              confirmation: SaleConfirmation.CONFIRMED,
              source: InvoiceSource.manual,
              quantitySend: customerSale.items?.length,
              allowance: 0,
              tax: 0, // Adjust based on your requirements
              status: 'PENDING',
              generateInvoice: false,
              cashierName: user.name || 'nan',
              fileUploadSalesId: fileUpload.id,
            },
          });

          // Step 7: Create SaleItem records
          const saleItems = customerSale.items.map((item) => ({
            saleId: sale.id,
            productId: inventoryMap.get(item['PLU/UPC'])?.id || null, // Use actual productId or null
            pluUpc: item['PLU/UPC'],
            productName: item.ProductName,
            quantity: item.IndividualItemQuantity || 0,
            sellingPrice: item.IndividualItemSellingPrice || 0,
            totalPrice: item.TotalPrice,
          }));

          // Batch create SaleItems
          const batchSize = 500;
          const itemBatches = chunk(saleItems, batchSize);
          for (const batch of itemBatches) {
            await prisma.saleItem.createMany({
              data: batch,
            });
          }
        }
      },
      {
        timeout: 120000, // 120 seconds = 2 mins
      },
    );

    return { success: true, message: 'Sales processed successfully' };
  }

  async addSales(user: any, file: Express.Multer.File, storeId: string) {
    console.log('user', user, 'file', file);
    const fileHash = await this.checkSalesFileStatus(file, user, storeId);
    const parsedData = parseExcelOrHTML(file);
    console.log('parsedData', parsedData);
    return await this.uploadSalesSheet(
      user,
      parsedData,
      file,
      fileHash,
      storeId,
    );
  }
}
