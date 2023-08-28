import {
    assertTypesWrapper,
    errorWrapper,
    getUserWrapper,
    requireIsRestaurantOwnerWrapper,
    requiresValidSessionKeyWrapper
} from '../../../wrappers'
import { FoodItemV1, MenuCategoryV1, MongoDBSingleton } from '../../../database'
import { IRestaurantV1, IUserV1 } from '../../../types'
import express from 'express'

// TODO: Need endpoint to delete category

export const postMenuCategory = async (req: express.Request, res: express.Response) => {
    /**
     *
     * This creates a menu category for a restaurant (must be owner).
     * By default, it has no availability. You must add availability zones to it with PATCH.
     * If the restaurant has lunch & dinner hours, you can either have an "all day" availability zone (of course outside
     * restaurant opening hours nobody can order) or you can select the lunch and dinner availability zones.
     *
     * URL: /restaurant/:restaurant_id/food/category
     * Method: POST
     *
     * Body parameters:
     *
     * name: string
     * englishName: string (optional)
     *
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await assertTypesWrapper(req, res, [
                        { field: 'name', type: 'string', isRequired: true },
                        { field: 'englishName', type: 'string', isRequired: false }
                    ], async () => {
                        await MongoDBSingleton.getInstance()

                        const category = new MenuCategoryV1({
                            restaurant: restaurant._id,
                            name: req.body.name,
                            englishName: req.body.englishName !== undefined ? req.body.englishName : null,
                            availability: null,
                            foodItems: []
                        })

                        await category.save()

                        res.status(200).send('OK')
                    })
                })
            })
        })
    })
}

export const getMenuCategories = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/categories
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await MongoDBSingleton.getInstance()
                    const menuCategories = await MenuCategoryV1.find({ restaurant: restaurant._id }).populate('foodItems')
                    res.status(200).send(menuCategories)
                })
            })
        })
    })
}

export const patchMenuCategory = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/category/:category_id
     *
     * Body parameters:
     *
     * name (optional)
     * englishName (optional)
     * foodItems (optional)
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await assertTypesWrapper(req, res, [
                        { field: 'name', type: 'string', isRequired: false },
                        { field: 'englishName', type: 'string', isRequired: false }
                    ], async () => {
                        await MongoDBSingleton.getInstance()

                        const category = await MenuCategoryV1.findOne({ _id: req.params.category_id, restaurant: restaurant._id })

                        if (category === null) {
                            res.status(404).send('Category not found')
                            return
                        }

                        if (req.body.name !== undefined) {
                            category.name = req.body.name
                        }

                        if (req.body.englishName !== undefined) {
                            category.englishName = req.body.englishName
                        }

                        if (req.body.foodItems !== undefined) {
                            if (Array.isArray(req.body.foodItems)) {
                                // Make sure all food items are strings
                                for (const foodItem of req.body.foodItems) {
                                    if (typeof foodItem !== 'string') {
                                        res.status(400).send('Invalid foodItems')
                                        return
                                    }
                                }
                                // Make sure all food items are valid food items & from restaurant
                                for (const foodItem of req.body.foodItems) {
                                    const food = await FoodItemV1.findOne({ _id: foodItem, restaurant: restaurant._id })
                                    if (food === null) {
                                        res.status(400).send('Invalid foodItems')
                                        return
                                    }
                                }
                                category.foodItems = req.body.foodItems
                            } else {
                                res.status(400).send('Invalid foodItems')
                                return
                            }
                        }

                        await category.save()

                        res.status(200).send('OK')
                    })
                })
            })
        })
    })
}
