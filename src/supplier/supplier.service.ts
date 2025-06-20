import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaClientService } from "src/prisma-client/prisma-client.service";
import { CreateSupplierDto, UpdateSupplierDto } from "./dto/dto.supplier";
import { Role, Status } from "@prisma/client";

@Injectable()
export class SupplierService {
    constructor(private readonly prisma: PrismaClientService) {}    async createSupplier(user: any, createSupplierDto: CreateSupplierDto) {
        // Check permissions - only super_admin, admin, and manager can create suppliers
        if (![Role.super_admin, Role.admin, Role.manager].includes(user.role)) {
            throw new ForbiddenException('Only admins and managers can create suppliers');
        }

        // Validate store access
        await this.validateStoreAccess(user, createSupplierDto.storeId);

        try {
            const supplier = await this.prisma.suppliers.create({
                data: {
                    name: createSupplierDto.name,
                    email: createSupplierDto.email,
                    phone: createSupplierDto.phone,
                    address: createSupplierDto.address,
                    storeId: createSupplierDto.storeId,
                    status: Status.active,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    storeId: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    store: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            return {
                message: "Supplier created successfully",
                data: supplier,
            };        } catch (error) {
            console.error('Create supplier error:', error);
            
            // Handle specific Prisma errors
            if (error.code === 'P2003') {
                // Foreign key constraint violation
                if (error.meta?.field_name === 'storeId') {
                    throw new BadRequestException('Invalid store ID provided - store does not exist');
                }
                throw new BadRequestException('Foreign key constraint violation');
            }
            if (error.code === 'P2002') {
                // Unique constraint violation
                const field = error.meta?.target?.[0] || 'field';
                throw new BadRequestException(`Supplier with this ${field} already exists`);
            }
            
            throw new BadRequestException('Failed to create supplier: ' + (error.message || 'Unknown error'));
        }
    }

    async getSuppliers(user: any, storeId?: string, page: number = 1, limit: number = 10) {
        try {
            // Build where clause based on user role and store access
            let whereClause: any = {
                status: Status.active,
            };

            if (user.role === Role.super_admin) {
                // Super admin can see all suppliers
                if (storeId) {
                    whereClause.storeId = storeId;
                }
            } else {
                // Other users can only see suppliers from their accessible stores
                const accessibleStoreIds = user.stores?.map(store => store.storeId) || [];
                if (storeId) {
                    // Check if user has access to the specific store
                    if (!accessibleStoreIds.includes(storeId)) {
                        throw new ForbiddenException('No access to this store');
                    }
                    whereClause.storeId = storeId;
                } else {
                    whereClause.storeId = { in: accessibleStoreIds };
                }
            }

            const skip = (page - 1) * limit;

            const [suppliers, total] = await Promise.all([
                this.prisma.suppliers.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        storeId: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        store: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    skip,
                    take: limit,
                }),
                this.prisma.suppliers.count({
                    where: whereClause,
                }),
            ]);

            const totalPages = Math.ceil(total / limit);

            return {
                message: "Suppliers retrieved successfully",
                data: {
                    suppliers,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                    },
                },
            };
        } catch (error) {
            if (error instanceof ForbiddenException) throw error;
            console.error('Get suppliers error:', error);
            throw new BadRequestException('Failed to retrieve suppliers: ' + error.message);
        }
    }

    async getSupplierById(user: any, supplierId: string) {
        try {
            let whereClause: any = {
                id: supplierId,
                status: Status.active,
            };

            // Add store access check for non-super-admin users
            if (user.role !== Role.super_admin) {
                const accessibleStoreIds = user.stores?.map(store => store.storeId) || [];
                whereClause.storeId = { in: accessibleStoreIds };
            }

            const supplier = await this.prisma.suppliers.findFirst({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    storeId: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    store: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            if (!supplier) {
                throw new NotFoundException('Supplier not found');
            }

            return {
                message: "Supplier retrieved successfully",
                data: supplier,
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            console.error('Get supplier error:', error);
            throw new BadRequestException('Failed to retrieve supplier: ' + error.message);
        }
    }

    async updateSupplier(user: any, supplierId: string, updateSupplierDto: UpdateSupplierDto) {
        // Check permissions
        if (![Role.super_admin, Role.admin, Role.manager].includes(user.role)) {
            throw new ForbiddenException('Only admins and managers can update suppliers');
        }

        try {
            // First, check if supplier exists and user has access
            let whereClause: any = {
                id: supplierId,
                status: Status.active,
            };

            if (user.role !== Role.super_admin) {
                const accessibleStoreIds = user.stores?.map(store => store.storeId) || [];
                whereClause.storeId = { in: accessibleStoreIds };
            }

            const existingSupplier = await this.prisma.suppliers.findFirst({
                where: whereClause,
            });

            if (!existingSupplier) {
                throw new NotFoundException('Supplier not found');
            }            // If storeId is being updated, validate the new store
            if (updateSupplierDto.storeId && updateSupplierDto.storeId !== existingSupplier.storeId) {
                await this.validateStoreAccess(user, updateSupplierDto.storeId);
            }

            const updatedSupplier = await this.prisma.suppliers.update({
                where: { id: supplierId },
                data: {
                    ...(updateSupplierDto.name && { name: updateSupplierDto.name }),
                    ...(updateSupplierDto.email !== undefined && { email: updateSupplierDto.email }),
                    ...(updateSupplierDto.phone && { phone: updateSupplierDto.phone }),
                    ...(updateSupplierDto.address !== undefined && { address: updateSupplierDto.address }),
                    ...(updateSupplierDto.storeId && { storeId: updateSupplierDto.storeId }),
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    storeId: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    store: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            return {
                message: "Supplier updated successfully",
                data: updatedSupplier,
            };        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
            
            console.error('Update supplier error:', error);
            
            // Handle specific Prisma errors
            if (error.code === 'P2003') {
                // Foreign key constraint violation
                if (error.meta?.field_name === 'storeId') {
                    throw new BadRequestException('Invalid store ID provided - store does not exist');
                }
                throw new BadRequestException('Foreign key constraint violation');
            }
            if (error.code === 'P2002') {
                // Unique constraint violation
                const field = error.meta?.target?.[0] || 'field';
                throw new BadRequestException(`Supplier with this ${field} already exists`);
            }
            
            throw new BadRequestException('Failed to update supplier: ' + (error.message || 'Unknown error'));
        }
    }

    async deleteSupplier(user: any, supplierId: string) {
        // Check permissions - only super_admin and admin can delete suppliers
        if (![Role.super_admin, Role.admin].includes(user.role)) {
            throw new ForbiddenException('Only admins can delete suppliers');
        }

        try {
            // First, check if supplier exists and user has access
            let whereClause: any = {
                id: supplierId,
                status: Status.active,
            };

            if (user.role !== Role.super_admin) {
                const accessibleStoreIds = user.stores?.map(store => store.storeId) || [];
                whereClause.storeId = { in: accessibleStoreIds };
            }

            const existingSupplier = await this.prisma.suppliers.findFirst({
                where: whereClause,
            });

            if (!existingSupplier) {
                throw new NotFoundException('Supplier not found');
            }

            // Soft delete by updating status to inactive
            await this.prisma.suppliers.update({
                where: { id: supplierId },
                data: {
                    status: Status.inactive,
                },
            });

            return {
                message: "Supplier deleted successfully",
                data: {
                    id: supplierId,
                    deleted: true,
                },
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
            console.error('Delete supplier error:', error);            throw new BadRequestException('Failed to delete supplier: ' + (error.message || 'Unknown error'));
        }
    }    private async validateStoreAccess(user: any, storeId: string): Promise<any> {
        if (!storeId) {
            throw new BadRequestException('Store ID is required');
        }

        // Check if store exists
        const store = await this.prisma.stores.findUnique({
            where: { id: storeId },
            select: { id: true, name: true, clientId: true, status: true },
        });

        if (!store) {
            throw new NotFoundException(`Store with ID '${storeId}' not found`);
        }

        if (store.status !== Status.active) {
            throw new BadRequestException('Store is not active');
        }

        // Check user access to store (only for non-super-admin users)
        if (user.role !== Role.super_admin) {
            const storeAccess = user.stores?.find(s => s.storeId === storeId);
            if (!storeAccess) {
                throw new ForbiddenException('You do not have access to this store');
            }
        }

        return store;
    }
}