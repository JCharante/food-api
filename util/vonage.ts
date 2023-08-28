import dotenv from 'dotenv';
import {PrismaSingleton} from "../database";

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });


const { Vonage } = require('@vonage/server-sdk');

export const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET
});

export const logNewVerifyRequest = async <T extends {
    phoneNumber: string,
    vonageRequestId: string
}>({
    phoneNumber,
    vonageRequestId
}: T) => {
    const prisma = await PrismaSingleton.getInstance()

    const newVonageRequest = await prisma.userVerifyRequest.create({
        data: {
            updatedAt: new Date(),
            phoneNumber,
            vonageRequestId
        }
    })
}

export const getVerifyRequestByPhone = async (phoneNumber: string) => {
    const prisma = await PrismaSingleton.getInstance()

    const existingRequest = await prisma.userVerifyRequest.findFirst({
        where: {
            phoneNumber
        }
    })

    return {
        requestExists: existingRequest !== null,
        request: existingRequest
    }
}


export const checkIfVerifyRequestExistsAndReturn = async (requestID: string) => {
    const prisma = await PrismaSingleton.getInstance()

    const existingRequest = await prisma.userVerifyRequest.findFirst({
        where: {
            vonageRequestId: requestID
        }
    })

    return {
        requestExists: existingRequest !== null,
        request: existingRequest
    }
}

export const deleteVerifyRequest = async (requestID: string) => {
    console.warn('You should verify that vonage does not consider this request active anymore')
    const prisma = await PrismaSingleton.getInstance()

    await prisma.userVerifyRequest.delete({
        where: {
            vonageRequestId: requestID
        }
    })
}