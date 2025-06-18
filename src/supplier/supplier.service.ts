import { Injectable } from "@nestjs/common";



@Injectable()
export class SupplierService { 

    async createSupplier(user: any, createSupplierDto: any) {
        // Here you would typically interact with your database to create a supplier
        // For example, using Prisma or any other ORM
        // This is just a placeholder implementation

        console.log("Creating supplier for user:", user);
        console.log("Supplier data:", createSupplierDto);

        // Return a success message or the created supplier object
        return {
            message: "Supplier created successfully",
            supplier: createSupplierDto,
            createdBy: user.email,
        };
    }
}