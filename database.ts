import dotenv from 'dotenv';
import {PrismaClient} from "@prisma/client";

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

export class PrismaSingleton {
    private static instance: PrismaSingleton | null = null
    private prisma: PrismaClient | undefined;
    private constructor() {}

    public static async getInstance() {
        if (PrismaSingleton.instance == null) {
            console.log('Creating instance of PrismaSingleton')
            PrismaSingleton.instance = new PrismaSingleton()
            PrismaSingleton.instance.prisma = new PrismaClient()
        }
        if (PrismaSingleton.instance.prisma !== undefined) {
            return PrismaSingleton.instance.prisma
        } else {
            throw new Error('Prisma instance is undefined')
        }
    }
}