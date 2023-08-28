'use strict'
//


import express from 'express'
import * as controller from './controller/controller'
import morgan from 'morgan'
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
import * as s3 from './s3'

import {
    FoodItemAddonCategoryV1,
    FoodItemAddonV1,
    FoodItemV1,
    MenuCategoryV1,
    MenuV1,
    MongoDBSingleton,
    RestaurantV1,
    SessionKeyV1,
    UserV1
} from './database'
import {z} from 'zod'
import {requireIsRestaurantOwnerWrapperTRPC} from './wrappers'
import mongoose from 'mongoose'
import {IRestaurantV1} from "./types";

const app = express()
//
app.use(morgan('combined'))
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
app.post('/login/email', express.json(), controller.user.postLoginWithEmail)
app.delete('/logout/all', express.json(), controller.user.deleteUserAllSessionKeys)
app.post('/signup/email', express.json(), controller.user.postUserSignupWithEmail)

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

const isAuthedUser = t.middleware(async ({ next, ctx, path, rawInput }) => {
    if (ctx.blob === null) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    console.log(`Request from ${ctx.blob.canonicalId} ${path} ${JSON.stringify(rawInput)}`)
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
        const restaurants = await RestaurantV1.find({ owner: user._id }).populate('menu')
        const restaurantsWithPictures = await Promise.all(restaurants.map(async (restaurant) => {
            const newObj = {
                ...restaurant.toJSON(),
                pictureURL: "https://placekitten.com/250/250"
            }
            if (await s3.resourceExists(restaurant._id.toString(), 'restaurant', restaurant._id.toString())) {
                newObj.pictureURL = await s3.generatePresignedGetURL(restaurant._id.toString(), 'restaurant', restaurant._id.toString())
            }
            return newObj
        }))
        return restaurantsWithPictures
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
    createRestaurantFoodAddon: loggedInProcedure
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

            const addon = new FoodItemAddonV1({
                restaurant: new mongoose.Types.ObjectId(input.restaurantID),
                names: input.names,
                descriptions: input.descriptions,
                price: input.price,
                inStock: input.inStock,
                visible: input.visible
            })

            await addon.save()
        }),
    createRestaurantFoodAddonCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            names: z.object({
                en: z.string(),
                vi: z.string()
            }),
            type: z.enum(['multipleChoice', 'pickOne'])
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()

            const addonCategory = new FoodItemAddonCategoryV1({
                restaurant: new mongoose.Types.ObjectId(input.restaurantID),
                names: input.names,
                type: input.type,
                addons: []
            })

            await addonCategory.save()
        }),
    patchRestaurantFoodAddonCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            addonCategoryID: z.string(),
            names: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            type: z.optional(z.enum(['multipleChoice', 'pickOne'])),
            pickOneRequiresSelection: z.optional(z.boolean()),
            pickOneDefaultValue: z.optional(z.string()),
            addons: z.optional(z.array(z.string()))

        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()

            const addonCategory = await FoodItemAddonCategoryV1.findOne({
                _id: new mongoose.Types.ObjectId(input.addonCategoryID),
                restaurant: new mongoose.Types.ObjectId(input.restaurantID)
            })

            if (!addonCategory) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Addon category not found'
                })
            }

            if (input.names) {
                addonCategory.names = input.names
            }

            if (input.type) {
                addonCategory.type = input.type
            }

            if (input.pickOneRequiresSelection !== undefined) {
                addonCategory.pickOneRequiresSelection = input.pickOneRequiresSelection
            }

            if (input.pickOneDefaultValue) {
                // make sure given value exists and belongs to restaurant
                const addon = await FoodItemAddonV1.findOne({
                    _id: new mongoose.Types.ObjectId(input.pickOneDefaultValue),
                    restaurant: new mongoose.Types.ObjectId(input.restaurantID)
                })
                if (!addon) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'pickOneDefaultValue: Addon not found'
                    })
                }
                addonCategory.pickOneDefaultValue = new mongoose.Types.ObjectId(input.pickOneDefaultValue)
            }

            if (input.addons) {
                // deduplicate the addons list
                input.addons = [...new Set(input.addons)]
                // make sure all given values exist and belong to restaurant
                const addons = await FoodItemAddonV1.find({
                    _id: {
                        $in: input.addons.map(id => new mongoose.Types.ObjectId(id))
                    },
                    restaurant: new mongoose.Types.ObjectId(input.restaurantID)
                })
                if (addons.length !== input.addons.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'addons: Addon not found'
                    })
                }
                addonCategory.addons = input.addons.map(id => new mongoose.Types.ObjectId(id))
            }

            await addonCategory.save()
        }),
    patchFoodAddon: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            addonID: z.string(),
            names: z.optional(
                z.object({
                    en: z.string(),
                    vi: z.string()
                })
            ),
            descriptions: z.optional(
                z.object({
                    en: z.string(),
                    vi: z.string()
                })
            ),
            price: z.optional(z.number()),
            inStock: z.optional(z.boolean()),
            visible: z.optional(z.boolean())

        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()

            const addon = await FoodItemAddonV1.findOne({
                _id: new mongoose.Types.ObjectId(input.addonID),
                restaurant: new mongoose.Types.ObjectId(input.restaurantID)
            })

            if (!addon) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Addon category not found'
                })
            }

            if (input.names) {
                addon.names = input.names
            }

            if (input.descriptions) {
                addon.descriptions = input.descriptions
            }

            if (input.price) {
                addon.price = input.price
            }

            if (input.inStock !== undefined) {
                addon.inStock = input.inStock
            }

            if (input.visible !== undefined) {
                addon.visible = input.visible
            }

            await addon.save()
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
            price: z.optional(z.number()),
            addons: z.optional(z.array(z.string()))
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
            if (input.addons) {
                // deduplicate the addons list
                input.addons = [...new Set(input.addons)]
                // make sure all given values exist and belong to restaurant
                const addons = await FoodItemAddonCategoryV1.find({
                    _id: {
                        $in: input.addons.map(id => new mongoose.Types.ObjectId(id))
                    },
                    restaurant: new mongoose.Types.ObjectId(input.restaurantID)
                })
                if (addons.length !== input.addons.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'addons: Addon Category not found'
                    })
                }
                foodItem.addons = input.addons.map(id => new mongoose.Types.ObjectId(id))
            }
            await foodItem.save()
        }),
    patchRestaurantMenu: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            menuID: z.string(),
            categories: z.array(z.string())
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            // find menu by menuID
            const menu = await MenuV1.findOne({
                _id: new mongoose.Types.ObjectId(input.menuID),
                restaurant: new mongoose.Types.ObjectId(input.restaurantID)
            })
            if (!menu) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Menu not found'
                })
            }
            menu.categories = input.categories.map((id) => new mongoose.Types.ObjectId(id))
            await menu.save()
        }),
    patchMenuCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            categoryID: z.string(),
            names: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            items: z.optional(
                z.array(
                    z.string()
                )
            )
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()

            const category = await MenuCategoryV1.findOne({ _id: input.categoryID, restaurant: input.restaurantID })
            if (!category) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Category not found'
                })
            }

            if (input.names) {
                category.names = input.names
            }
            if (input.items) {
                // Check all items belong to this restaurant
                const foodItems = await FoodItemV1.find({ _id: { $in: input.items } })
                for (const foodItem of foodItems) {
                    if (foodItem.restaurant.toString() !== input.restaurantID) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: 'Food item doesn\'t belong to this restaurant'
                        })
                    }
                }
                category.foodItems = input.items.map((id) => new mongoose.Types.ObjectId(id))
            }

            category.save()
        }),
    deleteMenuCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            categoryID: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()

            await MenuCategoryV1.deleteOne({ _id: new mongoose.Types.ObjectId(input.categoryID) })
        }),
    getRestaurantFoodItems: loggedInProcedure
        .input(z.object({
            restaurantID: z.string()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            const foodItems = await FoodItemV1.find({ restaurant: input.restaurantID })
            const foodItemsWithPictures = await Promise.all(foodItems.map(async (food) => {
                const ret = {
                    ...food.toObject({ flattenMaps: true }),
                    pictureURL: "https://placekitten.com/250/250"
                }
                if (await s3.resourceExists(input.restaurantID, 'food', food._id.toString())) {
                    ret.pictureURL = await s3.generatePresignedGetURL(input.restaurantID, 'food', food._id.toString())
                }
                return ret
            }))
            const sanitized = foodItemsWithPictures.map((food) => {
                return {
                    ...food,
                    _id: food._id.toString(),
                    addons: food.addons.map((v) => v.toString()),
                    restaurant: food.restaurant.toString()
                }
            })
            return sanitized
        }),
    getRestaurantFoodAddons: loggedInProcedure
        .input(z.object({
            restaurantID: z.string()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            const addons = await FoodItemAddonV1.find({ restaurant: input.restaurantID })
            return JSON.parse(JSON.stringify(addons))
        }),
    getRestaurantAddonCategories: loggedInProcedure
        .input(z.object({
            restaurantID: z.string()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            await MongoDBSingleton.getInstance()
            const categories = await FoodItemAddonCategoryV1.find({ restaurant: input.restaurantID }).populate('addons')
            return JSON.parse(JSON.stringify(categories))
        }),
    postRestaurantImage: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            return await s3.generatePresignedPutURL(input.restaurantID, 'restaurant', input.restaurantID)
        }),
    requestPutFoodItemPicture: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
            foodItemID: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperTRPC(ctx.user, input.restaurantID)
            return await s3.generatePresignedPutURL(input.restaurantID, 'food', input.foodItemID)
        }),
    getRestaurantImage: loggedInProcedure
        .input(z.object({
            restaurantID: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            return await s3.generatePresignedGetURL(input.restaurantID, 'restaurant', input.restaurantID)
        })
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter

app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext
    })
)
app.listen(3000)
