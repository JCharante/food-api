'use strict'
//
import express from 'express'
//
// import * as controller from './controller/controller'
//
// import morgan from 'morgan'
//
// const app = express()
//
// app.use(morgan('combined'))
// app.use(express.json())
//
// app.get('/', (req: express.Request, res: express.Response) => {
//     res.send('Goodies API')
// })
//
// // Restaurant owner routes
// app.get('/user/restaurants', controller.user.getUserRestaurants)
// app.post('/user/restaurant', controller.restaurant.postNewRestaurant)
// app.patch('/restaurant/:restaurant_id/setHours', controller.restaurant.patchSetHours)
// //    availability zones
// app.get('/restaurant/:restaurant_id/availabilityZones', controller.restaurant.getAvailabilityZones)
// app.post('/restaurant/:restaurant_id/availability', controller.restaurant.postAvailability)
// //    menu
// app.patch('/restaurant/:restaurant_id/food/menu', controller.restaurant.food.menu.patchMenu)
// //    menu categories
// app.get('/restaurant/:restaurant_id/food/categories', controller.restaurant.food.categories.getMenuCategories)
// app.post('/restaurant/:restaurant_id/food/category', controller.restaurant.food.categories.postMenuCategory)
// app.patch('/restaurant/:restaurant_id/food/category/:category_id', controller.restaurant.food.categories.patchMenuCategory)
// //    food items
// app.get('/restaurant/:restaurant_id/food/foodItems', controller.restaurant.food.foodItems.getFoodItems)
// app.post('/restaurant/:restaurant_id/food/foodItem', controller.restaurant.food.foodItems.postCreateFoodItem)
// app.patch('/restaurant/:restaurant_id/food/foodItem/:foodItemID', controller.restaurant.food.foodItems.patchFoodItem)
// //    addon categories
// app.get('/restaurant/:restaurant_id/food/addonCategories', controller.restaurant.food.addons.getAddonCategories)
// app.post('/restaurant/:restaurant_id/food/addonCategory', controller.restaurant.food.addons.postAddonCategory)
// app.patch('/restaurant/:restaurant_id/food/addonCategory/:category_id/modify', controller.restaurant.food.addons.patchAddonCategory)
// app.post('/restaurant/:restaurant_id/food/addonCategory/:category_id/addAddon', controller.restaurant.food.addons.postAddAddonToCategory)
// //    addons
// app.get('/restaurant/:restaurant_id/food/addons', controller.restaurant.food.addons.getAddons)
// app.post('/restaurant/:restaurant_id/food/addon', controller.restaurant.food.addons.postCreateAddon)
//
// // User related routes
// app.post('/login/email', controller.user.postLoginWithEmail)
// app.delete('/logout/all', controller.user.deleteUserAllSessionKeys)
// app.post('/signup/email', controller.user.postUserSignupWithEmail)
// app.delete('/logout', controller.user.deleteUserSessionKey)
// // Normal end-user routes
// app.get('/restaurants', controller.restaurant.getRestaurants)
// app.get('/restaurant/:restaurant_id', controller.restaurant.getRestaurant)
// // Admin routes
// app.get('/users', controller.admin.getUsers)
//
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// require('dotenv').config({ path: '.env.local' })
// app.listen(3000, '0.0.0.0', () => {
//     console.log('The application is listening on port 3000!')
// })
import {inferAsyncReturnType, initTRPC, TRPCError} from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import * as trpcExpress from '@trpc/server/adapters/express'

import {FoodItemV1, MenuCategoryV1, MongoDBSingleton, RestaurantV1, SessionKeyV1, UserV1} from './database'
import {IRestaurantV1} from './types'
import {z} from 'zod'
import {requireIsRestaurantOwnerWrapperTRPC} from './wrappers'
import mongoose from 'mongoose'

export async function createContext ({
    req,
    res
}: trpcNext.CreateNextContextOptions) {
    // Create your context based on the request object
    // Will be available as `ctx` in all your resolvers
    // This is just an example of something you might want to do in your ctx fn
    async function getUserFromHeader () {
        if (!req.headers.authorization) {
            return null
        }
        if (!req.headers.authorization.startsWith('Bearer ')) {
            return null
        }
        const bearerToken = req.headers.authorization?.split(' ')[1]

        await MongoDBSingleton.getInstance()

        const sessionKey = await SessionKeyV1.findOne({ sessionKey: bearerToken })

        if (sessionKey == null) {
            return null
        }

        const user = await UserV1.findOne({ canonical_id: sessionKey.canonical_id })

        if (user == null) {
            return null
        }

        return {
            canonicalId: sessionKey.canonical_id,
            sessionKey: bearerToken,
            user
        }
    }
    const blob = await getUserFromHeader()
    return {
        blob
    }
}
export type Context = inferAsyncReturnType<typeof createContext>

const t = initTRPC.context<Context>().create()

const router = t.router
// const publicProcedure = t.procedure

const isAuthedUser = t.middleware(async ({ next, ctx }) => {
    if (ctx.blob === null) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    return await next({
        ctx: {
            user: ctx.blob.user,
            canonicalId: ctx.blob.canonicalId,
            sessionKey: ctx.blob.sessionKey
        }
    })
})

const loggedInProcedure = t.procedure.use(isAuthedUser)

const appRouter = router({
    userGetRestaurants: loggedInProcedure.query(async ({ ctx }) => {
        const { user } = ctx
        await MongoDBSingleton.getInstance()
        const restaurants: IRestaurantV1[] = await RestaurantV1.find({ owner: user._id })
        return JSON.parse(JSON.stringify(restaurants))
    }),
    getRestaurantCategories: loggedInProcedure
        .input(z.object({
            restaurantID: z.string()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            const menuCategories = await MenuCategoryV1.find({ restaurant: input.restaurantID }).populate('foodItems')
            return JSON.parse(JSON.stringify(menuCategories))
        }),
    createRestaurantCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            names: z.object({
                en: z.string(),
                vi: z.string()
            })
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            const category = new MenuCategoryV1({
                restaurant: new mongoose.Types.ObjectId(input.restaurantID),
                names: input.names,
                availability: null,
                foodItems: []
            })

            await category.save()
        }),
    createRestaurantFoodItem: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            names: z.object({
                en: z.string(),
                vi: z.string()
            }),
            descriptions: z.object({
                en: z.string(),
                vi: z.string()
            }),
            price: z.number(),
            inStock: z.boolean(),
            visible: z.boolean()
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()

            const foodItem = new FoodItemV1({
                restaurant: new mongoose.Types.ObjectId(input.restaurantID),
                names: input.names,
                descriptions: input.descriptions,
                price: input.price,
                inStock: input.inStock,
                visible: input.visible,
                addons: []
            })

            await foodItem.save()
        }),
    patchRestaurantFoodItem: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            foodItemID: z.string(),
            names: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            descriptions: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            price: z.optional(z.number())
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            const foodItem = await FoodItemV1.findOne({
                _id: new mongoose.Types.ObjectId(input.foodItemID),
                restaurant: new mongoose.Types.ObjectId(input.restaurantID)
            })
            if (!foodItem) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Food item not found'
                })
            }
            if (input.names) {
                foodItem.names = input.names
            }
            if (input.descriptions) {
                foodItem.descriptions = input.descriptions
            }
            if (input.price !== undefined) {
                foodItem.price = input.price
            }
            await foodItem.save()
        }),
    getRestaurantFoodItems: loggedInProcedure
        .input(z.object({
            restaurantID: z.string()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            const foodItems = await FoodItemV1.find({ restaurant: input.restaurantID })
            return JSON.parse(JSON.stringify(foodItems))
        })
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter

const app = express()
app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext
    })
)
app.listen(3000)
