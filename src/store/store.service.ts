import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaClientService } from "src/prisma-client/prisma-client.service";
import { CreateStoreDto, UpdateStoreDto } from "./dto/dto.store";
import { Role, Status } from "@prisma/client";

@Injectable()
export class StoreService {
    constructor(private readonly prisma: PrismaClientService) {
    }

    async createStore(user: any, dto: CreateStoreDto) {        // Only super_admin and admin can create stores
        if (user.role !== Role.super_admin && user.role !== Role.admin) {
            throw new ForbiddenException('Only admins can create stores');
        }

        const { name, email, address, phone, currency = 'USD', timezone = 'UTC' } = dto;

        try {
            // Create store and store settings in a transaction
            const result = await this.prisma.$transaction(async (prisma) => {
                // Create the store
                const store = await prisma.stores.create({
                    data: {
                        name,
                        email,
                        address,
                        phone,
                        clientId: user.clientId,
                        status: Status.active,
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        address: true,
                        phone: true,
                        clientId: true,
                        status: true,
                        createdAt: true,
                    },
                });

                // Create store settings
                const storeSettings = await prisma.storeSettings.create({
                    data: {
                        storeId: store.id,
                        currency,
                        timezone,
                    },
                    select: {
                        id: true,
                        storeId: true,
                        currency: true,
                        timezone: true,
                        taxRate: true,
                        taxMode: true,
                        lowStockAlert: true,
                        enableNotifications: true,
                    },
                });

                // Add user to store mapping if they're not already mapped
                await prisma.userStoreMap.create({
                    data: {
                        userId: user.id,
                        storeId: store.id,
                    },
                });

                return {
                    store,
                    settings: storeSettings,
                };
            });

            return {
                message: "Store created successfully",
                data: {
                    store: result.store,
                    settings: result.settings,
                },
            };
        } catch (error) {
            console.error('Create store error:', error);
            throw new BadRequestException('Failed to create store: ' + error.message);
        }
    }

    async getStores(user: any) {
        try {
            const stores = await this.prisma.stores.findMany({
                where: {
                    clientId: user.clientId,
                    users: {
                        some: {
                            userId: user.id,
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    address: true,
                    phone: true,
                    status: true,
                    createdAt: true,
                    settings: {
                        select: {
                            currency: true,
                            timezone: true,
                            taxRate: true,
                            taxMode: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return {
                message: "Stores retrieved successfully",
                data: stores,
            };
        } catch (error) {
            console.error('Get stores error:', error);
            throw new BadRequestException('Failed to retrieve stores: ' + error.message);
        }
    }
}