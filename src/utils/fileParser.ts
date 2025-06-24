import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import { Multer } from 'multer';

// Define the expected structure of the Excel data
export interface ProductExcelRow {
  ProductName: string;
  Category: string;
  description?: string;
  VendorPrice: number; // singleItemCostPrice
  'PLU/UPC': string;
  EAN?: string;
  SKU: string;
  VendorName: string; // Supplier Name
  VendorPhone: string; // Supplier phone
  IndividualItemQuantity: number; // itemQuantity
  IndividualItemSellingPrice: number; // singleItemSellingPrice
  DiscountValue: number; // DiscountAmount
  DiscountPercentage: number; // percentDiscount
  MinimumSellingQuantity: number;
  MinimumOrderValue: number;
  PackOf: number; // totalPacksQuantity
  PackOfPrice: number; // orderedPacksPrice
  PriceDiscountAmount: number;
  PercentDiscount: number;
  MatrixAttributes?: string; // for e.g: Color,Size etc.
  Attribute1?: string; // for e.g: Red
  Attribute2?: string; // for e.g: Small
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
  data: ProductExcelRow[];
}

export function validateExcelRow(row: any, rowIndex: number): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!row.ProductName || typeof row.ProductName !== 'string') {
    errors.push(`Row ${rowIndex + 1}: ProductName is required and must be text`);
  }
  if (!row.Category || typeof row.Category !== 'string') {
    errors.push(`Row ${rowIndex + 1}: Category is required and must be text`);
  }
  if (!row.VendorName || typeof row.VendorName !== 'string') {
    errors.push(`Row ${rowIndex + 1}: VendorName is required and must be text`);
  }
  if (!row.VendorPhone || typeof row.VendorPhone !== 'string') {
    errors.push(`Row ${rowIndex + 1}: VendorPhone is required and must be text`);
  }  // PLU/UPC is now optional - only validate format if provided
  if (row['PLU/UPC'] && typeof row['PLU/UPC'] !== 'string') {
    errors.push(`Row ${rowIndex + 1}: PLU/UPC must be text if provided`);
  }
  if (!row.SKU || typeof row.SKU !== 'string') {
    errors.push(`Row ${rowIndex + 1}: SKU is required and must be text`);
  }

  // Numeric fields validation
  if (row.VendorPrice === undefined || isNaN(Number(row.VendorPrice))) {
    errors.push(`Row ${rowIndex + 1}: VendorPrice is required and must be a number`);
  }
  if (row.IndividualItemQuantity === undefined || isNaN(Number(row.IndividualItemQuantity))) {
    errors.push(`Row ${rowIndex + 1}: IndividualItemQuantity is required and must be a number`);
  }
  if (row.IndividualItemSellingPrice === undefined || isNaN(Number(row.IndividualItemSellingPrice))) {
    errors.push(`Row ${rowIndex + 1}: IndividualItemSellingPrice is required and must be a number`);
  }
  if (row.DiscountValue === undefined || isNaN(Number(row.DiscountValue))) {
    errors.push(`Row ${rowIndex + 1}: DiscountValue is required and must be a number`);
  }
  if (row.DiscountPercentage === undefined || isNaN(Number(row.DiscountPercentage))) {
    errors.push(`Row ${rowIndex + 1}: DiscountPercentage is required and must be a number`);
  }
  if (row.MinimumSellingQuantity === undefined || isNaN(Number(row.MinimumSellingQuantity))) {
    errors.push(`Row ${rowIndex + 1}: MinimumSellingQuantity is required and must be a number`);
  }
  if (row.MinimumOrderValue === undefined || isNaN(Number(row.MinimumOrderValue))) {
    errors.push(`Row ${rowIndex + 1}: MinimumOrderValue is required and must be a number`);
  }
  if (row.PackOf === undefined || isNaN(Number(row.PackOf))) {
    errors.push(`Row ${rowIndex + 1}: PackOf is required and must be a number`);
  }
  if (row.PackOfPrice === undefined || isNaN(Number(row.PackOfPrice))) {
    errors.push(`Row ${rowIndex + 1}: PackOfPrice is required and must be a number`);
  }
  if (row.PriceDiscountAmount === undefined || isNaN(Number(row.PriceDiscountAmount))) {
    errors.push(`Row ${rowIndex + 1}: PriceDiscountAmount is required and must be a number`);
  }
  if (row.PercentDiscount === undefined || isNaN(Number(row.PercentDiscount))) {
    errors.push(`Row ${rowIndex + 1}: PercentDiscount is required and must be a number`);
  }

  // Optional fields validation
  if (row.description && typeof row.description !== 'string') {
    errors.push(`Row ${rowIndex + 1}: description must be text`);
  }
  if (row.EAN && typeof row.EAN !== 'string') {
    errors.push(`Row ${rowIndex + 1}: EAN must be text`);
  }
  if (row.MatrixAttributes && typeof row.MatrixAttributes !== 'string') {
    errors.push(`Row ${rowIndex + 1}: MatrixAttributes must be text`);
  }
  if (row.Attribute1 && typeof row.Attribute1 !== 'string') {
    errors.push(`Row ${rowIndex + 1}: Attribute1 must be text`);
  }
  if (row.Attribute2 && typeof row.Attribute2 !== 'string') {
    errors.push(`Row ${rowIndex + 1}: Attribute2 must be text`);
  }

  // Business logic validation
  if (Number(row.VendorPrice) < 0) {
    errors.push(`Row ${rowIndex + 1}: VendorPrice cannot be negative`);
  }
  if (Number(row.IndividualItemSellingPrice) < 0) {
    errors.push(`Row ${rowIndex + 1}: IndividualItemSellingPrice cannot be negative`);
  }
  if (Number(row.IndividualItemQuantity) < 0) {
    errors.push(`Row ${rowIndex + 1}: IndividualItemQuantity cannot be negative`);
  }
  if (Number(row.DiscountValue) < 0) {
    errors.push(`Row ${rowIndex + 1}: DiscountValue cannot be negative`);
  }
  if (Number(row.DiscountPercentage) < 0 || Number(row.DiscountPercentage) > 100) {
    errors.push(`Row ${rowIndex + 1}: DiscountPercentage must be between 0 and 100`);
  }
  if (Number(row.PercentDiscount) < 0 || Number(row.PercentDiscount) > 100) {
    errors.push(`Row ${rowIndex + 1}: PercentDiscount must be between 0 and 100`);
  }

  return errors;
};

export function parseExcel(file: { buffer: Buffer; originalname: string }): ValidationResult {
  try {
    // Validate file type
    if (!file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls, .csv) are allowed');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    
    if (workbook.SheetNames.length === 0) {
      throw new BadRequestException('Excel file is empty');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
      throw new BadRequestException('No data found in Excel file');
    }

    const validationResult: ValidationResult = {
      isValid: true,
      errors: [],
      data: []
    };

    // Validate each row
    rawData.forEach((row: any, index: number) => {
      const rowErrors = validateExcelRow(row, index);
      
      if (rowErrors.length > 0) {
        validationResult.isValid = false;
        validationResult.errors.push({
          row: index + 1,
          errors: rowErrors
        });
      }      // Convert types and clean data
      const cleanedRow: ProductExcelRow = {
        ProductName: String(row.ProductName).trim(),
        Category: String(row.Category).trim(),
        description: row.description ? String(row.description).trim() : undefined,
        VendorPrice: Number(row.VendorPrice),
        'PLU/UPC': String(row['PLU/UPC']).trim(),
        EAN: row.EAN ? String(row.EAN).trim() : undefined,
        SKU: String(row.SKU).trim(),
        VendorName: String(row.VendorName).trim(),
        VendorPhone: String(row.VendorPhone).trim(),
        IndividualItemQuantity: Number(row.IndividualItemQuantity),
        IndividualItemSellingPrice: Number(row.IndividualItemSellingPrice),
        DiscountValue: Number(row.DiscountValue),
        DiscountPercentage: Number(row.DiscountPercentage),
        MinimumSellingQuantity: Number(row.MinimumSellingQuantity),
        MinimumOrderValue: Number(row.MinimumOrderValue),
        PackOf: Number(row.PackOf),
        PackOfPrice: Number(row.PackOfPrice),
        PriceDiscountAmount: Number(row.PriceDiscountAmount),
        PercentDiscount: Number(row.PercentDiscount),
        MatrixAttributes: row.MatrixAttributes ? String(row.MatrixAttributes).trim() : undefined,
        Attribute1: row.Attribute1 ? String(row.Attribute1).trim() : undefined,
        Attribute2: row.Attribute2 ? String(row.Attribute2).trim() : undefined,
      };

      validationResult.data.push(cleanedRow);
    });

    return validationResult;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
  }
}