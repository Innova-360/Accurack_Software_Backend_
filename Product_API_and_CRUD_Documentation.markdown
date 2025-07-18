# Product API and CRUD Operations Documentation

## Overview
This document outlines the CRUD (Create, Read, Update, Delete) operations for the `createProduct` API and related entities (products, categories, suppliers, sales, etc.) in a multi-store inventory management system. All operations are scoped to a specific store using a mandatory `storeId` field to ensure data isolation. The `createProduct` API supports both non-variant and variant products, with new fields (`description`, `brandName`), dynamic attributes for non-variant products, unique PLU/UPCs for variants across the store, and specific deletion logic. Suppliers follow the rule: only the first supplier is marked as `primary`; additional suppliers are `secondary`. This documentation is designed for developers to implement the API and related operations using a Prisma-based backend.

---

## 1. Database Schema Updates
### New Fields
- **description**: A string field to store the product description (applies to both non-variant and variant products).
- **brandName**: A string field to store the product’s brand name (applies to both non-variant and variant products).
- **Location**: Added to the `products` table in the Prisma schema.

### Dynamic Attributes (Non-Variant Products)
- Non-variant products accept dynamic attributes as key-value pairs (e.g., `{"color": "red", "size": "medium"}`).
- Attributes are not predefined and can vary per product.
- Stored in a flexible format (e.g., just create an array of objects for these attrbutes and store it directly in Product table).

### StoreId Requirement
- All entities (products, categories, suppliers, sales, packs, etc.) include a `storeId` field to associate them with a specific store.
- `storeId` is validated in all CRUD operations to ensure data is scoped to the correct store.

---

## 2. `createProduct` API

### Endpoint
- **Method**: POST
- **Path**: `/products`
- **Purpose**: Creates a new product (non-variant or variant) with associated entities (suppliers, packs, variants, dynamic attributes).

### Input: `CreateProductDto`
- **Fields**:
  - `name`: String (required) - Product name.
  - `description`: String (optional) - Product description.
  - `brandName`: String (optional) - Product brand name.
  - `clientId`: String (required) - ID of the client owning the store.
  - `storeId`: String (required) - ID of the store.
  - `categoryId`: String (required) - ID of the category, must belong to `storeId`.
  - `ean`: String (optional) - Product EAN code.
  - `sku`: String (optional) - Product SKU.
  - `pluUpc`: String (optional for non-variant, forbidden for variant products) - PLU/UPC code, unique across the store.
  - `itemQuantity`: Number (required) - Quantity of items.
  - `msrpPrice`: Number (required) - Manufacturer’s suggested retail price.
  - `singleItemSellingPrice`: Number (required) - Selling price per item.
  - `discountAmount`: Number (optional) - Discount amount.
  - `percentDiscount`: Number (optional) - Discount percentage.
  - `hasVariants`: Boolean (optional, default: `false`) - Indicates if the product has variants.
  - `productSuppliers`: Array of objects (optional) - Supplier details:
    - `supplierId`: String (required) - Must exist and belong to `storeId`.
    - `costPrice`: Number (required) - Cost price from the supplier.
    - `state`: String (required, `primary` or `secondary`) - First supplier must be `primary`; others are `secondary`.
  - `supplierId`: String (optional, for non-variant products) - Single supplier ID, marked as `primary`.
  - `packs`: Array of objects (optional, for non-variant products):
    - `minimumSellingQuantity`: Number (required) - Minimum quantity per pack.
    - `totalPacksQuantity`: Number (required) - Total pack quantity.
    - `orderedPacksPrice`: Number (required) - Price per pack.
    - `discountAmount`: Number (optional) - Pack discount amount.
    - `percentDiscount`: Number (optional) - Pack discount percentage.
  - `attributes`: Object (optional, for non-variant products) - Dynamic key-value pairs (e.g., `{"color": "red", "size": "medium"}`).
  - `variants`: Array of objects (required if `hasVariants` = `true`):
    - `name`: String (required) - Variant name.
    - `pluUpc`: String (required) - Unique across the store.
    - `price`: Number (required) - Variant price.
    - `quantity`: Number (optional) - Variant quantity.
    - `msrpPrice`: Number (optional) - Variant MSRP.
    - `supplierId`: String (optional) - Variant supplier, marked as `secondary`.
    - `discountAmount`: Number (optional) - Variant discount amount.
    - `percentDiscount`: Number (optional) - Variant discount percentage.
    - `packs`: Array of objects (optional) - Same structure as product-level packs.

### Operations
1. **Permission Validation**:
   - Check user permissions for creating a product in the specified `storeId`.
2. **Input Validation**:
   - Validate `storeId`, `clientId`, and `categoryId` exist and are related.
   - Ensure `categoryId` belongs to `storeId`.
   - For non-variant products: Validate dynamic attributes (non-empty keys/values) and PLU/UPC uniqueness (if provided).
   - For variant products: Ensure product-level `pluUpc` is empty, no product-level packs, and each variant has a unique PLU/UPC across the store.
3. **Supplier Validation**:
   - Enforce: First supplier is `primary`; additional suppliers (product or variant-level) are `secondary`.
   - Verify all supplier IDs exist and belong to `storeId`.
4. **Product Creation**:
   - Create product with `storeId`, `description`, `brandName`, and other fields.
   - Store dynamic attributes for non-variant products.
   - Create packs (non-variant) or variants with their packs.
   - Create `ProductSupplier` records.
5. **Response Formatting**:
   - Calculate `profitAmount` (`singleItemSellingPrice - costPrice`) and `profitMargin` (`profitAmount / costPrice * 100`) using the primary supplier’s cost price.
   - Return `ProductResponseDto`.

### Response: `ProductResponseDto`
- **Fields**:
  - `id`: String - Product ID.
  - `name`: String - Product name.
  - `description`: String - Product description.
  - `brandName`: String - Product brand name.
  - `categoryId`: String - Category ID.
  - `ean`: String - EAN code.
  - `pluUpc`: String - PLU/UPC code (non-variant only).
  - `sku`: String - SKU.
  - `singleItemCostPrice`: Number - Cost price from primary supplier.
  - `itemQuantity`: Number - Quantity.
  - `msrpPrice`: Number - MSRP.
  - `singleItemSellingPrice`: Number - Selling price.
  - `discountAmount`: Number - Discount amount.
  - `percentDiscount`: Number - Discount percentage.
  - `clientId`: String - Client ID.
  - `storeId`: String - Store ID.
  - `hasVariants`: Boolean - Indicates variants.
  - `store`: Object - Store details (id, name).
  - `sales`: Array - Associated sales.
  - `purchaseOrders`: Array - Associated purchase orders.
  - `createdAt`: Date - Creation timestamp.
  - `updatedAt`: Date - Update timestamp.
  - `profitAmount`: Number - Profit (rounded to 2 decimals).
  - `profitMargin`: Number - Profit margin (rounded to 2 decimals).
  - `category`: Object - Category details.
  - `productSuppliers`: Array - Supplier details.
  - `packIds`: Array - Pack IDs (non-variant).
  - `packs`: Array - Pack details.
  - `attributes`: Object - Dynamic attributes (non-variant).
  - `variants`: Array - Variant details (variant products).

### Conditions
- **StoreId**:
  - Required and must exist (via `prisma.stores.findUnique`).
  - Must belong to `clientId`.
  - Error: `BadRequestException` ("Invalid storeId - store does not exist or does not belong to the client").
- **Category**:
  - `categoryId` must exist and belong to `storeId` (via `prisma.category.findFirst`).
  - Error: `BadRequestException` ("Invalid categoryId - category does not exist for this store").
- **Non-Variant Products**:
  - `hasVariants` = `false`.
  - No variants allowed.
  - Dynamic attributes must be valid (non-empty keys/values).
  - PLU/UPC (if provided) must be unique across the store.
  - Error: `BadRequestException` (e.g., "PLU/UPC already exists").
- **Variant Products**:
  - `hasVariants` = `true`.
  - Product-level `pluUpc` must be empty.
  - No product-level packs.
  - At least one variant required.
  - Each variant must have a PLU/UPC, unique across the store.
  - Error: `BadRequestException` (e.g., "Variant PLU/UPC missing", "PLU/UPC '...' already exists in store").
- **Suppliers**:
  - First supplier is `primary`; others are `secondary`.
  - All supplier IDs must exist and belong to `storeId`.
  - If `productSuppliers` provided: Exactly one `primary`, others `secondary`.
  - If `supplierId` provided (non-variant): Marked as `primary`.
  - Variant suppliers are `secondary`.
  - Error: `BadRequestException` (e.g., "Invalid supplier IDs for this store").

---

## 3. Product Deletion

### Non-Variant Product Deletion
- **Endpoint**: DELETE `/products`
- **Input**:
  - `productId`: String (required) - Product ID.
  - `pluUpc`: String (required) - Product PLU/UPC.
  - `storeId`: String (required) - Store ID.
- **Operations**:
  - Verify `storeId` exists and user has permission.
  - Check `productId` and `pluUpc` match a non-variant product in the `storeId`.
  - Delete the product and associated entities (packs, `ProductSupplier` records).
- **Conditions**:
  - `storeId`, `productId`, and `pluUpc` must be provided.
  - Product must be non-variant (`hasVariants` = `false`).
  - `pluUpc` must match the product’s PLU/UPC.
  - Error: `BadRequestException` (e.g., "Invalid productId or PLU/UPC for store", "Cannot delete variant product").

### Variant Deletion (Single)
- **Endpoint**: DELETE `/products/variants`
- **Input**:
  - `pluUpc`: String (required) - Variant PLU/UPC.
  - `storeId`: String (required) - Store ID.
- **Operations**:
  - Verify `storeId` exists and user has permission.
  - Find the variant by `pluUpc` in the product’s variants for the `storeId`.
  - Delete the variant and its packs.
  - Update the product’s variant list.
- **Conditions**:
  - `pluUpc` must match a variant in a product for the `storeId`.
  - If deleting the last variant, handle edge case (e.g., mark product as non-variant or delete).
  - Error: `BadRequestException` (e.g., "Variant PLU/UPC not found for store").

### Variant Deletion (Bulk)
- **Endpoint**: DELETE `/products/variants/bulk`
- **Input**:
  - `pluUpcs`: Array of strings (required) - List of variant PLU/UPCs.
  - `storeId`: String (required) - Store ID.
- **Operations**:
  - Verify `storeId` exists and user has permission.
  - Validate each `pluUpc` belongs to a variant in the same product for the `storeId`.
  - Delete specified variants and their packs.
  - Update the product’s variant list.
- **Conditions**:
  - All `pluUpcs` must be valid for the product in the `storeId`.
  - If deleting all variants, handle edge case.
  - Error: `BadRequestException` (e.g., "Invalid variant PLU/UPCs for store").

---

## 4. Other Entities’ CRUD Operations

All CRUD operations for entities (categories, suppliers, sales, packs, purchase orders, etc.) include `storeId` to scope data to a specific store. Below is the generalized approach.

### Category CRUD
- **Create**:
  - **Input**: `name`, `storeId`, other fields (e.g., description).
  - **Operations**: Create category with `storeId`. Validate `storeId` exists.
  - **Conditions**: `storeId` must exist. Error: `BadRequestException`.
- **Read**:
  - **Input**: `storeId`.
  - **Operations**: Query `prisma.category.findMany` where `storeId` matches.
  - **Conditions**: Return categories for the `storeId`. If none, return empty list.
- **Update**:
  - **Input**: `categoryId`, `storeId`, updated fields.
  - **Operations**: Verify category exists for `storeId`. Update fields.
  - **Conditions**: `storeId` and `categoryId` must match. Error: `BadRequestException`.
- **Delete**:
  - **Input**: `categoryId`, `storeId`.
  - **Operations**: Verify category exists for `storeId`. Check for dependencies (e.g., products). Delete if safe.
  - **Conditions**: Error if `storeId` or `categoryId` is invalid or dependencies exist.

### Supplier CRUD
- **Create**:
  - **Input**: `name`, `storeId`, other fields (e.g., contact).
  - **Operations**: Create supplier with `storeId`. Validate `storeId`.
  - **Conditions**: Error if `storeId` is invalid.
- **Read**:
  - **Input**: `storeId`.
  - **Operations**: Query `prisma.suppliers.findMany` where `storeId` matches.
- **Update**:
  - **Input**: `supplierId`, `storeId`, updated fields.
  - **Operations**: Verify supplier exists for `storeId`. Update fields.
  - **Conditions**: Error if `storeId` or `supplierId` is invalid.
- **Delete**:
  - **Input**: `supplierId`, `storeId`.
  - **Operations**: Verify supplier exists for `storeId`. Check for dependencies (e.g., `ProductSupplier`). Delete if safe.
  - **Conditions**: Error if invalid or dependencies exist.

### Other Entities (Packs, Purchase Orders, etc.)
- **Create**: Include `storeId` and validate its existence. Associate with related entities (e.g., products) in the same store.
- **Read**: Filter by `storeId`.
- **Update**: Verify `storeId` matches the entity’s stored `storeId`. Update fields.
- **Delete**: Require `storeId` for verification. Check dependencies before deletion.

---

## 5. Implementation Notes
- **Prisma Schema**:
  - Add `description` and `brandName` to `products` table.
  - Store dynamic attributes in a JSON field or a related `productAttributes` table.
  - Ensure all entities (products, categories, suppliers, sales, etc.) have a `storeId` field.
- **Validation**:
  - Use `prisma.stores.findUnique` to validate `storeId`.
  - Check `storeId` consistency across related entities (e.g., product’s `categoryId` must belong to `storeId`).
- **Supplier Rule**:
  - Enforce: First supplier is `primary`; others are `secondary`.
  - Validate in `createProduct` and supplier-related operations.
- **PLU/UPC Uniqueness**:
  - Use `validatePluUniqueness` for non-variant products.
  - Use `validateVariantPluUniqueness` for variants, checking store-wide uniqueness.
- **Error Handling**:
  - Throw `BadRequestException` for invalid inputs, non-existent `storeId`, or constraint violations.
  - Handle Prisma errors (e.g., `P2003` for foreign key issues).
- **Permissions**:
  - Validate user permissions for each operation based on `storeId`.

---

## 6. Example Workflow
### Creating a Non-Variant Product
1. Client sends `CreateProductDto` with `storeId`, `description`, `brandName`, dynamic `attributes`, and `supplierId` (primary).
2. API validates `storeId`, `clientId`, `categoryId`, and supplier belong to the store.
3. Checks PLU/UPC uniqueness.
4. Creates product, stores attributes, creates packs, and associates supplier.
5. Returns `ProductResponseDto` with profit calculations.

### Deleting a Variant
1. Client sends `pluUpc` and `storeId`.
2. API verifies `storeId` and finds the variant in a product.
3. Deletes the variant and its packs.
4. Updates the product and returns confirmation.

### Updating a Category
1. Client sends `categoryId`, `storeId`, and updated fields.
2. API verifies `categoryId` exists for `storeId`.
3. Updates category and returns updated data.

---

This documentation provides a clear blueprint for implementing the `createProduct` API and CRUD operations for related entities, ensuring `storeId` scoping, data integrity, and compliance with all specified requirements.