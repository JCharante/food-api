import express from 'express'
import {
    assertTypesWrapper,
    errorWrapper,
    getUserWrapper,
    requireIsRestaurantOwnerWrapper,
    requiresValidSessionKeyWrapper
} from '../../../wrappers'
import { IRestaurantV1, IUserV1 } from '../../../types'
import { FoodItemAddonCategoryV1, FoodItemV1, MongoDBSingleton } from '../../../database'

export const postCreateFoodItem = async (req: express.Request, res: express.Response) => {
    /**
   * URL: /restaurant/:restaurant_id/food/foodItem
   *
   * Creates a food item for a restaurant (must be owner)
   *
   * Body Parameters:
   *
   * name: string
   * englishName: string (optional)
   * description: string
   * englishDescription: string (optional)
   * price: number
   * inStock: boolean
   * visible: boolean
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await assertTypesWrapper(req, res, [
                        { field: 'name', type: 'string', isRequired: true },
                        { field: 'englishName', type: 'string', isRequired: false },
                        { field: 'description', type: 'string', isRequired: true },
                        { field: 'englishDescription', type: 'string', isRequired: false },
                        { field: 'price', type: 'number', isRequired: true },
                        { field: 'inStock', type: 'boolean', isRequired: true },
                        { field: 'visible', type: 'boolean', isRequired: true }
                    ], async () => {
                        await MongoDBSingleton.getInstance()

                        const foodItem = new FoodItemV1({
                            restaurant: restaurant._id,
                            name: req.body.name,
                            englishName: req.body.englishName !== undefined ? req.body.englishName : null,
                            description: req.body.description,
                            englishDescription: req.body.englishDescription !== undefined ? req.body.englishDescription : null,
                            price: req.body.price,
                            inStock: req.body.inStock,
                            visible: req.body.visible,
                            addons: []
                        })

                        await foodItem.save()

                        res.status(200).send('OK')
                    })
                })
            })
        })
    })
}

export const getFoodItems = async (req: express.Request, res: express.Response) => {
    /**
     *
     * Returns all food items for a restaurant, must be owner
     *
     * URL: /restaurant/:restaurant_id/food/foodItems
     * method: GET
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await MongoDBSingleton.getInstance()
                    const foodItems = await FoodItemV1.find({ restaurant: restaurant._id })
                    res.status(200).send(foodItems)
                })
            })
        })
    })
}

export const patchFoodItem = async (req: express.Request, res: express.Response) => {
    /**
     * Edit a food item, must be owner
     *
     * URL: /restaurant/:restaurant_id/food/foodItem/:foodItemID
     * method: PATCH
     *
     * Body parameters:
     *
     * addons (optional) object IDs of addon categories
     *
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await assertTypesWrapper(req, res, [
                        { field: 'addons', type: 'array', isRequired: false }
                    ], async () => {
                        await MongoDBSingleton.getInstance()
                        const foodItem = await FoodItemV1.findOne({ _id: req.params.foodItemID, restaurant: restaurant._id })
                        if (foodItem === null) {
                            res.status(404).send('Not found')
                            return
                        }

                        if (req.body.addons !== undefined) {
                            // Make sure entries in addons are strings
                            for (const addon of req.body.addons) {
                                if (typeof addon !== 'string') {
                                    res.status(400).send('Bad request')
                                    return
                                }
                            }
                            // Make sure addons are valid
                            for (const addon of req.body.addons) {
                                const addonCategory = await FoodItemAddonCategoryV1.findOne({ _id: addon, restaurant: restaurant._id })
                                if (addonCategory === null) {
                                    res.status(400).send('Bad request')
                                    return
                                }
                            }
                            foodItem.addons = req.body.addons
                        }

                        await foodItem.save()

                        res.status(200).send('OK')
                    })
                })
            })
        })
    })
}
