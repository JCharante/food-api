import { PrismaSingleton } from './database'
import { TRPCError } from '@trpc/server'

export const errorWrapper = async (fn: () => Promise<void>): Promise<void> => {
    try {
        await fn()
    } catch (err) {
        console.error(err)
    }
}

export const requireIsRestaurantOwnerWrapperPrisma = async (userID: number, restaurantID: number) => {
    const prisma = await PrismaSingleton.getInstance()
    const restaurant = await prisma.restaurant.findUnique({
        where: {
            id: restaurantID
        }
    })
    if (restaurant == null) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Restaurant does not exist'
        })
    }
    if (restaurant.ownerID != userID) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User does not have permission to access admin endpoints for this restaurant'
        })
    }
    return {
        restaurant
    }
}
