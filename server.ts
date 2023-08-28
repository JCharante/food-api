'use strict'

import express from 'express'
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
    PrismaSingleton,
} from './database'
import {z} from 'zod'
import {requireIsRestaurantOwnerWrapperPrisma } from './wrappers'
import bcrypt from "bcrypt";
import uuid4 from "uuid4";
import { performance, PerformanceObserver } from 'perf_hooks'

const app = express()

// app.use(morgan('combined'))

const perfObserver = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
        console.log(entry)
    })
})

perfObserver.observe({ entryTypes: ['measure'] })


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
        const bearerToken: string = req.headers.authorization?.split(' ')[1]

        performance.mark("start-get-session-key")
        const prisma = await PrismaSingleton.getInstance()

        const sessionKey = await prisma.sessionKey.findUnique({
            where: {
                key: bearerToken
            },
            include: {
                user: true
            }
        })
        performance.mark("end-get-session-key")
        performance.measure("get-session-key", "start-get-session-key", "end-get-session-key")

        if (sessionKey == null) {
            return null
        }

        return {
            sessionKey: bearerToken,
            user: sessionKey.user
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
    const date = new Date()
    console.log(`${date.toISOString()} Request from userID ${ctx.blob.user.id} ${ctx.blob.user.email} ${path} ${JSON.stringify(rawInput)}`)
    return await next({
        ctx: {
            user: ctx.blob.user,
            sessionKey: ctx.blob.sessionKey
        }
    })
})

const loggedInProcedure = t.procedure.use(isAuthedUser)

const appRouter = router({
    userGetRestaurants: loggedInProcedure.query(async ({ ctx }) => {
        performance.mark("start-userGetRestaurants")
        const prisma = await PrismaSingleton.getInstance()

        const restaurants = await prisma.restaurant.findMany({
            where: {
                ownerID: ctx.user.id
            },
            include: {
                menu: {
                    include: {
                        categories: true
                    }
                }
            }
        })

        const restaurantsWithPictures = await Promise.all(restaurants.map(async (restaurant) => {
            const newObj = {
                ...restaurant,
                pictureURL: "https://placekitten.com/250/250"
            }
            performance.mark("start-s3-resourceExists")
            if (await s3.resourceExists(restaurant.id, 'restaurant', restaurant.id)) {
                newObj.pictureURL = await s3.generatePresignedGetURL(restaurant.id, 'restaurant', restaurant.id)
            }
            performance.mark("end-s3-resourceExists")
            performance.measure("s3-resourceExists", "start-s3-resourceExists", "end-s3-resourceExists")
            return newObj
        }))
        performance.mark("end-userGetRestaurants")
        performance.measure("userGetRestaurants", "start-userGetRestaurants", "end-userGetRestaurants")
        return restaurantsWithPictures
    }),
    getRestaurantCategories: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int()
        }))
        .query(async ({ ctx, input }) => {
            performance.mark("start-getRestaurantCategories")
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            const categories = await prisma.menuCategory.findMany({
                where: {
                    restaurantID: input.restaurantID
                },
                include: {
                    foods: true
                }
            })
            performance.mark("end-getRestaurantCategories")
            performance.measure("getRestaurantCategories", "start-getRestaurantCategories", "end-getRestaurantCategories")
            return categories
        }),
    createRestaurantCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            names: z.object({
                en: z.string(),
                vi: z.string()
            })
        }))
        .mutation(async ({ ctx, input }) => {
            performance.mark("start-createRestaurantCategory")
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            const category = await prisma.menuCategory.create({
                data: {
                    restaurantID: input.restaurantID,
                    names: input.names,
                    descriptions: {
                        'en': '',
                        'vi': ''
                    }
                }
            })
            performance.mark("end-createRestaurantCategory")
            performance.measure("createRestaurantCategory", "start-createRestaurantCategory", "end-createRestaurantCategory")
        }),
    createRestaurantFoodItem: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
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
            performance.mark("start-createRestaurantFoodItem")
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            await prisma.food.create({
                data: {
                    restaurantID: input.restaurantID,
                    names: input.names,
                    descriptions: input.descriptions,
                    price: input.price,
                    inStock: input.inStock,
                    visible: input.visible,
                    pictureURL: ''
                }
            })
            performance.mark("end-createRestaurantFoodItem")
            performance.measure("createRestaurantFoodItem", "start-createRestaurantFoodItem", "end-createRestaurantFoodItem")
        }),
    createRestaurantFoodAddon: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
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
            performance.mark("start-createRestaurantFoodAddon")
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            await prisma.foodAddon.create({
                data: {
                    restaurantID: input.restaurantID,
                    names: input.names,
                    descriptions: input.descriptions,
                    inStock: input.inStock,
                    visible: input.visible,
                    price: input.price
                }
            })
            performance.mark("end-createRestaurantFoodAddon")
            performance.measure("createRestaurantFoodAddon", "start-createRestaurantFoodAddon", "end-createRestaurantFoodAddon")
        }),
    createRestaurantFoodAddonCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            names: z.object({
                en: z.string(),
                vi: z.string()
            }),
            type: z.enum(['multipleChoice', 'pickOne'])
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            await prisma.foodAddonCategory.create({
                data: {
                    type: input.type,
                    names: input.names,
                    restaurantID: input.restaurantID
                }
            })
        }),
    patchRestaurantFoodAddonCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            addonCategoryID: z.number().int(),
            names: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            type: z.optional(z.enum(['multipleChoice', 'pickOne'])),
            pickOneRequiresSelection: z.optional(z.boolean()),
            pickOneDefaultValue: z.optional(z.number().int()),
            addons: z.optional(z.array(z.number().int()))

        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            const addonCategory = await prisma.foodAddonCategory.findUnique({
                where: {
                    id: input.addonCategoryID
                }
            })
            if (!addonCategory) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Addon category not found'
                })
            }
            if (addonCategory.restaurantID !== input.restaurantID) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Addon category not found (restaurantID mismatch)'
                })
            }
            const updatedFields: any = {}

            if (input.names) {
                updatedFields.names = input.names
            }
            if (input.type) {
                updatedFields.type = input.type
            }
            if (input.pickOneRequiresSelection !== undefined) {
                updatedFields.pickOneRequiresSelection = input.pickOneRequiresSelection
            }
            if  (input.pickOneDefaultValue) {
                // make sure given value exists and belongs to restaurant
                const addon = await prisma.foodAddon.findUnique({
                    where: {
                        id: input.pickOneDefaultValue
                    }
                })
                if (!addon) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'pickOneDefaultValue: Addon not found'
                    })
                }
                if (addon.restaurantID !== input.restaurantID) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'pickOneDefaultValue: Addon not found (restaurantID mismatch)'
                    })
                }
                updatedFields.pickOneDefaultValue = input.pickOneDefaultValue
            }
            if (input.addons) {
                // deduplicate the addons list
                input.addons = [...new Set(input.addons)]
                // make sure all given values exist and belong to restaurant
                const addons = await prisma.foodAddon.findMany({
                    where: {
                        id: {
                            in: input.addons
                        },
                        restaurantID: input.restaurantID
                    }
                })
                if (addons.length !== input.addons.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'addons: Addon not found'
                    })
                }
                updatedFields.addons = {
                    set: [],
                    connect: input.addons.map(id => ({ id }))
                }
            }
            await prisma.foodAddonCategory.update({
                where: {
                    id: input.addonCategoryID
                },
                data: updatedFields
            })
        }),
    patchFoodAddon: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            addonID: z.number().int(),
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
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            const addon = await prisma.foodAddon.findUnique({
                where: {
                    id: input.addonID
                }
            })
            if (addon === null) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Addon not found'
                })
            }
            if (addon.restaurantID !== input.restaurantID) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Addon not found (restaurantID mismatch)'
                })
            }
            const updateData: any = {}
            if (input.names) {
                updateData.names = input.names
            }
            if (input.descriptions) {
                updateData.descriptions = input.descriptions
            }
            if (input.price !== undefined) {
                updateData.price = input.price
            }
            if (input.inStock !== undefined) {
                updateData.inStock = input.inStock
            }
            if (input.visible !== undefined) {
                updateData.visible = input.visible
            }
            await prisma.foodAddon.update({
                where: {
                    id: input.addonID
                },
                data: updateData
            })
        }),
    patchRestaurantFoodItem: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            foodItemID: z.number().int(),
            names: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            descriptions: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            price: z.optional(z.number()),
            addons: z.optional(z.array(z.number().int()))
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()
            const food = await prisma.food.findUnique({
                where: {
                    id: input.foodItemID
                }
            })
            if (food === null) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Food item not found'
                })
            }
            if (food.restaurantID !== input.restaurantID) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Food item not owned by given restaurant'
                })
            }
            const updatedFields: any = {}
            if (input.names) {
                updatedFields.names = input.names
            }
            if (input.descriptions) {
                updatedFields.descriptions = input.descriptions
            }
            if (input.price !== undefined) {
                updatedFields.price = input.price
            }
            if (input.addons) {
                // deduplicate the addons list
                input.addons = [...new Set(input.addons)]
                // make sure all given values exist and belong to restaurant
                const addons = await prisma.foodAddonCategory.findMany({
                    where: {
                        id: {
                            in: input.addons
                        },
                        restaurantID: input.restaurantID
                    }
                })
                if (addons.length !== input.addons.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'addons: Addon Category not found or doesn\'t belong to restaurant'
                    })
                }
                // https://github.com/prisma/prisma/discussions/10459#discussioncomment-3145958
                updatedFields.addons = {
                    set: [],
                    connect: input.addons.map(id => ({ id }))
                }
            }
            await prisma.food.update({
                where: {
                    id: input.foodItemID
                },
                data: updatedFields
            })
        }),
    patchRestaurantMenu: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            menuID: z.number().int(),
            categories: z.array(z.number().int())
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            // retrieve the menu, and then throw if the menu is not found or throw if the menu does not belong to the restaurant
            const menu = await prisma.menu.findUnique({
                where: {
                    id: input.menuID
                }
            })
            if (menu == null) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Menu not found'
                })
            }
            if (menu.owningRestaurantID != input.restaurantID) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Menu does not belong to restaurant'
                })
            }
            if (input.categories) {
                // verify that all categories belong to the restaurant
                const categories = await prisma.menuCategory.findMany({
                    where: {
                        id: {
                            in: input.categories
                        },
                        restaurantID: input.restaurantID
                    }
                })
                if (categories.length != input.categories.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'One or more categories not found'
                    })
                }
                await prisma.menu.update({
                    where: {
                        id: input.menuID
                    },
                    data: {
                        categories: {
                            set: [],
                            connect: input.categories.map(id => ({id}))
                        }
                    }
                })
            }
        }),
    patchMenuCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            categoryID: z.number().int(),
            names: z.optional(z.object({
                en: z.string(),
                vi: z.string()
            })),
            items: z.optional(
                z.array(
                    z.number().int()
                )
            )
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            const category = await prisma.menuCategory.findUnique({
                where: {
                    id: input.categoryID
                }
            })
            if (!category) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Category not found'
                })
            }
            if (category.restaurantID != input.restaurantID) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Category not owned by restaurant'
                })
            }
            if (input.names) {
                category.names = input.names
            }
            if (input.items) {
                // Check all items belong to this restaurant
                const foodItems = await prisma.food.findMany({
                    where: {
                        id: {
                            in: input.items
                        },
                        restaurantID: input.restaurantID
                    }
                })
                if (foodItems.length !== input.items.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Food item doesn\'t belong to this restaurant'
                    })
                }
                await prisma.menuCategory.update({
                    where: {
                        id: input.categoryID
                    },
                    data: {
                        foods: {
                            set: [],
                            connect: input.items.map(id => ({ id }))
                        }
                    }
                })
            }
        }),
    deleteMenuCategory: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            categoryID: z.number().int()
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()

            const menuCategory = await prisma.menuCategory.findUnique({
                where: {
                    id: input.categoryID
                }
            })
            if (menuCategory === null) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Category not found'
                })
            }
            if (menuCategory.restaurantID !== input.restaurantID) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Category doesn\'t belong to this restaurant'
                })
            }
            await prisma.menuCategory.delete({
                where: {
                    id: input.categoryID
                }
            })
            return true
        }),
    getRestaurantFoodItems: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()
            const foodItems = await prisma.food.findMany({
                where: {
                    restaurantID: input.restaurantID
                },
                include: {
                    addons: true
                }
            })
            const foodItemsWithPictures = await Promise.all(foodItems.map(async (food) => {
                const ret = {
                    ...food,
                    pictureURL: "https://placekitten.com/250/250"
                }
                if (await s3.resourceExists(input.restaurantID, 'food', food.id)) {
                    ret.pictureURL = await s3.generatePresignedGetURL(input.restaurantID, 'food', food.id)
                }
                return ret
            }))
            return foodItemsWithPictures
        }),
    getRestaurantFoodAddons: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()
            const addons = await prisma.foodAddon.findMany({
                where: {
                    restaurantID: input.restaurantID
                }
            })
            return addons
        }),
    getRestaurantAddonCategories: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int()
        }))
        .query(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            const prisma = await PrismaSingleton.getInstance()
            const categories = await prisma.foodAddonCategory.findMany({
                where: {
                    restaurantID: input.restaurantID
                },
                include: {
                    'addons': true
                }
            })
            return categories
        }),
    postRestaurantImage: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            return await s3.generatePresignedPutURL(input.restaurantID, 'restaurant', input.restaurantID)
        }),
    requestPutFoodItemPicture: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
            foodItemID: z.number().int()
        }))
        .mutation(async ({ ctx, input }) => {
            await requireIsRestaurantOwnerWrapperPrisma(ctx.user.id, input.restaurantID)
            return await s3.generatePresignedPutURL(input.restaurantID, 'food', input.foodItemID)
        }),
    getRestaurantImage: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int(),
        }))
        .query(async ({ ctx, input }) => {
            return await s3.generatePresignedGetURL(input.restaurantID, 'restaurant', input.restaurantID)
        }),
    loginWithEmail: t.procedure.input(z.object({
        email: z.string(),
        password: z.string()
    })).mutation(async ({ ctx, input }) => {
        const prisma = await PrismaSingleton.getInstance()

        const User = await prisma.user.findFirst({
            where: {
                email: input.email.toLowerCase()
            }
        })
        if (!User) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Invalid credentials'
            })
        }
        const isPasswordCorrect = await bcrypt.compare(input.password, User.password)

        if (!isPasswordCorrect) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Invalid credentials'
            })
        }

        const sessionKey = await prisma.sessionKey.create({
            data: {
                userId: User.id,
                key: uuid4()
            }
        })


        return {
            sessionKey: sessionKey.key
        }
    }),
    browseRestaurants: loggedInProcedure
        .input(z.object({

        }))
        .query(async ({ ctx }) => {
            performance.mark("start-browseRestaurants")
            const prisma = await PrismaSingleton.getInstance()
            const restaurants = await prisma.restaurant.findMany({})
            const restaurantsWithPictures = await Promise.all(restaurants.map(async (restaurant) => {
                const newObj = {
                    ...restaurant,
                    pictureURL: "https://placekitten.com/250/250"
                }
                performance.mark("start-s3-resourceExists")
                if (await s3.resourceExists(restaurant.id, 'restaurant', restaurant.id)) {
                    newObj.pictureURL = await s3.generatePresignedGetURL(restaurant.id, 'restaurant', restaurant.id)
                }
                performance.mark("end-s3-resourceExists")
                performance.measure("s3-resourceExists", "start-s3-resourceExists", "end-s3-resourceExists")
                return newObj
            }))
            performance.mark("end-browseRestaurants")
            performance.measure("browseRestaurants", "start-browseRestaurants", "end-browseRestaurants")
            return restaurantsWithPictures
        }),
    publicGetRestaurant: loggedInProcedure
        .input(z.object({
            restaurantID: z.number().int()
        }))
        .query(async ({ ctx, input }) => {
            performance.mark("start-publicGetRestaurant")
            const prisma = await PrismaSingleton.getInstance()
            const restaurant = await prisma.restaurant.findUnique({
                where: {
                    id: input.restaurantID
                },
                include: {
                    menu: {
                        include: {
                            categories: {
                                include: {
                                    foods: {
                                        where: {
                                            visible: true
                                        },
                                        include: {
                                            addons: {
                                                include: {
                                                    addons: {
                                                        where: {
                                                            visible: true
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })
            if (!restaurant) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invalid restaurant ID'
                })
            }
            const newObj = {
                ...restaurant,
                pictureURL: "https://placekitten.com/250/250"
            }
            performance.mark("start-s3-resourceExists")
            if (await s3.resourceExists(restaurant.id, 'restaurant', restaurant.id)) {
                newObj.pictureURL = await s3.generatePresignedGetURL(restaurant.id, 'restaurant', restaurant.id)
            }
            // Loop over ALL foods and generate presigned URLs for them
            // TODO: maybe we should let this be a public bucket and skip the whole presigned URL thing?
            await Promise.all(restaurant.menu.categories.map(async (category) => {
                await Promise.all(category.foods.map(async (food) => {
                    food.pictureURL = "https://placekitten.com/250/250"
                    if (await s3.resourceExists(restaurant.id, 'food', food.id)) {
                        food.pictureURL = await s3.generatePresignedGetURL(restaurant.id, 'food', food.id)
                    }
                }))
            }))
            performance.mark("end-s3-resourceExists")
            performance.measure("s3-resourceExists", "start-s3-resourceExists", "end-s3-resourceExists")

            performance.mark("end-publicGetRestaurant")
            performance.measure("publicGetRestaurant", "start-publicGetRestaurant", "end-publicGetRestaurant")
            return newObj
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
