import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import { Multer } from 'multer';

// Define the expected structure of the Excel data
export interface ProductExcelRow {
  name: string;
  category: string;
  stock: number;
  price: number;
  sellingPrice: number;
  PLU?: string;
  SKU?: string;
  description?: string;
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
  if (!row.name || typeof row.name !== 'string') {
    errors.push(`Row ${rowIndex + 1}: Name is required and must be text`);
  }
  if (!row.category || typeof row.category !== 'string') {
    errors.push(`Row ${rowIndex + 1}: Category is required and must be text`);
  }
  if (row.stock === undefined || isNaN(Number(row.stock))) {
    errors.push(`Row ${rowIndex + 1}: Stock is required and must be a number`);
  }
  if (row.price === undefined || isNaN(Number(row.price))) {
    errors.push(`Row ${rowIndex + 1}: Price is required and must be a number`);
  }
  if (row.sellingPrice === undefined || isNaN(Number(row.sellingPrice))) {
    errors.push(`Row ${rowIndex + 1}: Selling price is required and must be a number`);
  }

  // Optional fields validation
  if (row.PLU && typeof row.PLU !== 'string') {
    errors.push(`Row ${rowIndex + 1}: PLU must be text`);
  }
  if (row.SKU && typeof row.SKU !== 'string') {
    errors.push(`Row ${rowIndex + 1}: SKU must be text`);
  }
  if (row.description && typeof row.description !== 'string') {
    errors.push(`Row ${rowIndex + 1}: Description must be text`);
  }

  // Business logic validation
  if (Number(row.price) < 0) {
    errors.push(`Row ${rowIndex + 1}: Price cannot be negative`);
  }
  if (Number(row.sellingPrice) < 0) {
    errors.push(`Row ${rowIndex + 1}: Selling price cannot be negative`);
  }
  if (Number(row.stock) < 0) {
    errors.push(`Row ${rowIndex + 1}: Stock cannot be negative`);
  }

  return errors;
};

export function parseExcel(file: { buffer: Buffer; originalname: string }): ValidationResult {
  try {
    // Validate file type
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls) are allowed');
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
      }

      // Convert types and clean data
      const cleanedRow: ProductExcelRow = {
        name: String(row.name).trim(),
        category: String(row.category).trim(),
        stock: Number(row.stock),
        price: Number(row.price),
        sellingPrice: Number(row.sellingPrice),
        PLU: row.PLU ? String(row.PLU).trim() : undefined,
        SKU: row.SKU ? String(row.SKU).trim() : undefined,
        description: row.description ? String(row.description).trim() : undefined
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