import { IsUUID, IsInt, IsPositive, IsEnum, IsOptional, IsBoolean } from 'class-validator';

enum DamageSubCategory {
  SCRAP = 'SCRAP',
  RESELLABLE = 'RESELLABLE',
  NON_SELLABLE = 'NON_SELLABLE',
}

export class CreateDamageDto {
  @IsUUID()
  saleId: string;

  @IsUUID()
  productId: string;

  @IsUUID()
  storeId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  amount: number;

  @IsEnum(DamageSubCategory)
  damageSubCategory: DamageSubCategory;

  @IsOptional()
  reason?: string;
}

export class CreateRefundDto {
  @IsUUID()
  saleId: string;

  @IsUUID()
  productId: string;

  @IsUUID()
  storeId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  amount: number;

  @IsBoolean()
  addToRevenue: boolean;

  @IsOptional()
  reason?: string;
}

export class CreateReturnDto {
  @IsUUID()
  saleId: string;

  @IsUUID()
  productId: string;

  @IsUUID()
  storeId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  amount: number;

  @IsBoolean()
  addToInventory: boolean;

  @IsOptional()
  reason?: string;
}

export class CreateExchangeDto {
  @IsUUID()
  saleId: string;

  @IsUUID()
  productId: string;

  @IsUUID()
  storeId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  amount: number;

  @IsUUID()
  replacementProductId: string;

  @IsOptional()
  reason?: string;
}