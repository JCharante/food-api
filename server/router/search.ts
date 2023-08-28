import {router, t} from "./trpc";
import {z} from "zod";
import {PrismaSingleton} from "../../database";
import { loggedInProcedure } from './middleware'

export const searchRouter = router({
    /**
     * Clients should call this when loading the homescreen.
     * this returns categories they should display (e.g. Chinese, Indian, Nearby, Promo)
     * At the moment this returns all caterogies, but in the future we will only return
     * categories that have restaurants inside the delivery range.
     */
    getRestaurantCategories: loggedInProcedure
        .input(z.object({

        }))
        .query(async ({ ctx }) => {
            const prisma = await PrismaSingleton.getInstance()

            const restaurantCategories = await prisma.restaurantCategory.findMany({
            })

            return restaurantCategories
    })
})