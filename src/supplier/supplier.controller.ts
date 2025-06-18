import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { CreateSupplierDto } from "./dto/dto.supplier";
import { SupplierService } from "./supplier.service";


@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createSupplier(@Req() req, CreateSupplierDto: CreateSupplierDto) {
    const user = req.user; // This contains the user details from JWT
    return await this.supplierService.createSupplier(user, CreateSupplierDto);
  }
}