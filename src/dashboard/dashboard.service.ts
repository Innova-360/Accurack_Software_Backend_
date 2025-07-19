import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { RevenueSummaryQueryDto, RevenueSummaryResponseDto, SaleSummaryDto, SaleItemSummaryDto } from './dto/revenue-summary.dto';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getRevenueSummary(query: RevenueSummaryQueryDto): Promise<RevenueSummaryResponseDto> {
    const prisma = await this.tenantContext.getPrismaClient();
    const { storeId, dateFrom, dateTo } = query;

    // Build where clause for sales
    const where: any = { 
      storeId,
      confirmation: 'CONFIRMED' // Only include confirmed sales
      // status filter removed to show all statuses (PENDING, COMPLETED, CONFIRMED, etc.)
    };

    // Handle date filters - dateFrom is required, dateTo defaults to today if not provided
    where.createdAt = {};
    
    // Validate start date
    const startDate = new Date(dateFrom);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date format. Please use ISO 8601 format (e.g., 2024-06-01T00:00:00Z)');
    }
    
    // Get today's date (local timezone)
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const startDateString = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Compare dates as strings (YYYY-MM-DD format)
    console.log(`Date validation - Provided: ${startDateString}, Today: ${todayString}`);
    if (startDateString > todayString) {
      throw new BadRequestException(`Start date cannot be in the future. Provided: ${startDateString}, Today: ${todayString}`);
    }
    
    // Start date is required
    where.createdAt.gte = startDate;
    
    // End date - if not provided, default to today
    let endDate: Date;
    if (dateTo) {
      endDate = new Date(dateTo);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid end date format. Please use ISO 8601 format (e.g., 2024-06-30T23:59:59Z)');
      }
      if (endDate < startDate) {
        throw new BadRequestException('End date cannot be before start date');
      }
    } else {
      // Default to today
      endDate = new Date();
    }
    // Set to end of day for inclusive end date
    endDate.setHours(23, 59, 59, 999);
    where.createdAt.lte = endDate;

    // Fetch sales with all related data
    const sales = await prisma.sales.findMany({
      where,
      include: {
        customer: {
          select: {
            customerName: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                msrpPrice: true,
                singleItemSellingPrice: true,
                discountAmount: true,
                percentDiscount: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n=== DATABASE QUERY RESULTS ===`);
    console.log(`Query conditions:`, JSON.stringify(where, null, 2));
    console.log(`Total sales found: ${sales.length}`);
    console.log(`Date range: ${dateFrom} to ${dateTo || 'today'}`);
    
    // Check if ANY sales exist in this store
    const allSalesInStore = await prisma.sales.findMany({
      where: { storeId },
      select: { id: true, createdAt: true, totalAmount: true, status: true, confirmation: true }
    });
    console.log(`\n=== ALL SALES IN STORE (${storeId}) ===`);
    console.log(`Total sales in store: ${allSalesInStore.length}`);
    allSalesInStore.forEach((sale, index) => {
      console.log(`${index + 1}. ${sale.id} - ${sale.createdAt} - Amount: ${sale.totalAmount} - Status: ${sale.status} - Confirmation: ${sale.confirmation}`);
    });


    // Calculate summary metrics
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalProductsSold = 0;

    const salesSummary: SaleSummaryDto[] = [];

    for (const sale of sales) {
      // Skip sales with negative totalAmount (refunds or invalid sales)
      if (sale.totalAmount < 0) {
        console.log(`Skipping sale ${sale.id} with negative totalAmount: ${sale.totalAmount} (refund/return)`);
        continue;
      }
      
      // Skip sales with unrealistic allowances (likely data entry errors)
      const saleAllowance = sale.allowance || 0;
      const totalItemValue = sale.saleItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
      
      if (saleAllowance > totalItemValue * 10) { // Allowance more than 10x item value
        console.log(`Skipping sale ${sale.id} with unrealistic allowance: ${saleAllowance} vs item value: ${totalItemValue}`);
        continue;
      }
      
      let saleProfit = 0;
      let saleCost = 0;
      let saleDiscount = 0;
      let saleTax = sale.tax || 0;
      let saleProductsSold = 0;

      const items: SaleItemSummaryDto[] = [];

      for (const item of sale.saleItems) {
        const costPrice = item.product?.msrpPrice || 0;
        // Use sellingPrice from saleItem (this is the actual price charged)
        const sellingPrice = item.sellingPrice;
        const quantity = item.quantity;
        
        // Calculate item-level metrics
        const itemCost = costPrice * quantity;
        const itemRevenue = sellingPrice * quantity;
        const itemProfit = (sellingPrice - costPrice) * quantity;
        
        // Debug logging with more details
        console.log(`Item: ${item.productName}, Cost: ${costPrice}, Selling: ${sellingPrice}, Profit: ${itemProfit}, Quantity: ${quantity}`);
        if (sellingPrice === costPrice) {
          console.log(`⚠️  Warning: Selling price equals cost price for ${item.productName} - no profit margin`);
        }
        
        // Note: Profit is 0 because selling price equals cost price
        // This might be intentional (selling at cost) or a data issue
        
        // Calculate discount (proportional to item value, but cap at item revenue)
        const allowance = sale.allowance || 0;
        const totalItemRevenue = sale.saleItems.reduce((sum, si) => sum + (si.sellingPrice * si.quantity), 0);
        const itemDiscount = allowance > 0 && totalItemRevenue > 0 
          ? Math.min((itemRevenue / totalItemRevenue) * allowance, itemRevenue) 
          : 0;
        
        // Calculate tax (proportional to item value)
        const itemTax = saleTax > 0 && totalItemRevenue > 0 
          ? (itemRevenue / totalItemRevenue) * saleTax 
          : 0;

        items.push({
          productId: item.productId || '',
          productName: item.productName,
          quantity,
          costPrice,
          sellingPrice,
          discountApplied: itemDiscount,
          taxApplied: itemTax,
          profit: itemProfit,
        });

        // Accumulate sale totals
        saleProfit += itemProfit;
        saleCost += itemCost;
        saleDiscount += itemDiscount;
        saleProductsSold += quantity;
      }

      // Calculate actual revenue (before tax and discounts)
      // Based on the sale creation logic: totalAmount = originalAmount - allowance + tax
      // So: originalAmount = totalAmount + allowance - tax
      const allowance = sale.allowance || 0;
      const originalAmount = sale.totalAmount + allowance - saleTax;
      
      // Validate that originalAmount is not negative
      const validOriginalAmount = Math.max(originalAmount, 0);
      
      // Add sale-level discount (allowance)
      const saleLevelDiscount = allowance;
      saleDiscount += saleLevelDiscount;

      salesSummary.push({
        saleId: sale.id,
        date: sale.createdAt.toISOString(),
        customerName: sale.customer.customerName,
        totalAmount: sale.totalAmount,
        tax: saleTax,
        discount: saleDiscount,
        profit: saleProfit,
        items,
      });

      // Debug logging for sale totals
      console.log(`Sale ${sale.id}: Original: ${originalAmount}, Valid: ${validOriginalAmount}, Total: ${sale.totalAmount}, Tax: ${saleTax}, Allowance: ${allowance}, Profit: ${saleProfit}`);
      
      // Accumulate overall totals
      totalRevenue += validOriginalAmount; // Use validated original amount (before tax and discounts)
      totalProfit += saleProfit;
      totalCost += saleCost;
      totalTax += saleTax;
      totalDiscount += saleDiscount;
      totalProductsSold += saleProductsSold;
    }

    // Debug logging for final totals
    console.log(`Final Totals - Revenue: ${totalRevenue}, Profit: ${totalProfit}, Cost: ${totalCost}, Tax: ${totalTax}, Discount: ${totalDiscount}`);
    console.log(`Processed ${salesSummary.length} valid sales out of ${sales.length} total sales`);
    
    return {
      totalRevenue,
      totalProfit,
      totalCost,
      totalTax,
      totalDiscount,
      totalProductsSold,
      sales: salesSummary,
    };
  }
} 