import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

 
 export class CreateSupplierDto {
   @ApiProperty({ description: 'Supplier name', example: 'John Doe' })
   @IsString()
   @IsNotEmpty()
   name: string;
 
   @ApiPropertyOptional({
     description: 'Supplier email address',
     example: 'supplier@example.com',
   })
   @IsEmail()
   @IsOptional()
   email?: string;
 
   @ApiPropertyOptional({
     description: 'Supplier physical address',
     example: '123 Main St, City, State 12345',
   })
   @IsString()
   @IsOptional()
   address?: string;
 
   @ApiPropertyOptional({
     description: 'Supplier phone number',
     example: '+1-555-123-4567',
   })
   @IsString()
   @IsOptional()
   phone?: string;
   
 }