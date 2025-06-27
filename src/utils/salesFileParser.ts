import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import { Multer } from 'multer';

// Define the expected structure of the Excel data
export interface ProductExcelRow {
  CustomerName: string;
  CustomerPhoneNumber: Number;
  Description?: string;
  Category: string;
  'PLU/UPC': string;
  ProductName: string; // Product Name
  VendorPrice: number; // singleItemCostPrice
  IndividualItemQuantity: number; // itemQuantity
  IndividualItemSellingPrice: number; // singleItemSellingPrice
  TotalPrice: number
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
    errors.push(
      `Row ${rowIndex + 1}: ProductName is required and must be text`,
    );
  }
  if (!row.Category || typeof row.Category !== 'string') {
    errors.push(`Row ${rowIndex + 1}: Category is required and must be text`);
  }
  
   // PLU/UPC is now optional - only validate format if provided
  if (row['PLU/UPC'] && typeof row['PLU/UPC'] !== 'string') {
    errors.push(`Row ${rowIndex + 1}: PLU/UPC must be text if provided`);
  }

  // Numeric fields validation
  if (row.VendorPrice === undefined || isNaN(Number(row.VendorPrice))) {
    errors.push(
      `Row ${rowIndex + 1}: VendorPrice is required and must be a number`,
    );
  }
  if (
    row.IndividualItemQuantity === undefined ||
    isNaN(Number(row.IndividualItemQuantity))
  ) {
    errors.push(
      `Row ${rowIndex + 1}: IndividualItemQuantity is required and must be a number`,
    );
  }
  if (
    row.IndividualItemSellingPrice === undefined ||
    isNaN(Number(row.IndividualItemSellingPrice))
  ) {
    errors.push(
      `Row ${rowIndex + 1}: IndividualItemSellingPrice is required and must be a number`,
    );
  }
  // Optional fields validation
  if (row.Description && typeof row.Description !== 'string') {
    errors.push(`Row ${rowIndex + 1}: description must be text`);
  }

  // Business logic validation
  if (Number(row.VendorPrice) < 0) {
    errors.push(`Row ${rowIndex + 1}: VendorPrice cannot be negative`);
  }
  if (Number(row.IndividualItemSellingPrice) < 0) {
    errors.push(
      `Row ${rowIndex + 1}: IndividualItemSellingPrice cannot be negative`,
    );
  }
  if (Number(row.IndividualItemQuantity) < 0) {
    errors.push(
      `Row ${rowIndex + 1}: IndividualItemQuantity cannot be negative`,
    );
  }

  return errors;
}

export function parseExcelOrHTML(file: {
  buffer: Buffer;
  originalname: string;
}): ValidationResult {
  try {
    // Validate file type
    if (!file.originalname.match(/\.(xlsx|xls|csv|html)$/)) {
      throw new BadRequestException(
        'Only Excel and HTML files (.xlsx, .xls, .csv, .html) are allowed',
      );
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });

    if (workbook.SheetNames.length === 0) {
      throw new BadRequestException('Excel file is empty');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log("rowData", rawData);

    if (rawData.length === 0) {
      throw new BadRequestException('No data found in Excel file');
    }

    const validationResult: ValidationResult = {
      isValid: true,
      errors: [],
      data: [],
    };

    // Validate each row
    rawData.forEach((row: any, index: number) => {
        // console.log("row", row);
      // const rowErrors = validateExcelRow(row, index);

      // if (rowErrors.length > 0) {
      //   validationResult.isValid = false;
      //   validationResult.errors.push({
      //     row: index + 1,
      //     errors: rowErrors
      //   });
      // }      // Convert types and clean data
      const cleanedRow: ProductExcelRow = {
        ProductName: String(row.ProductName).trim(),
        CustomerName: String(row.CustomerName).trim(),
        CustomerPhoneNumber: row.CustomerPhoneNumber,
        Category: String(row.Category || row.category).trim(),
        Description: row.Description
          ? String(row.Description).trim()
          : undefined,
        VendorPrice: Number(row.ProductPrice|| row.Price),
        'PLU/UPC': String(row['PLU/UPC'] || row.PLU || row.PLUNumber).trim(),
        IndividualItemQuantity: row.IndividualItemQuantity|| row.Quantity || row.Items,
        IndividualItemSellingPrice: Number(
          row.IndividualItemSellingPrice || row.SellingPrice|| row.Price,
        ),
        TotalPrice: Number(row.TotalPrice)
      };


      validationResult.data.push(cleanedRow);
    });

    // console.log(validationResult.data);

    return validationResult;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(
      `Failed to parse Excel file: ${error.message}`,
    );
  }
}