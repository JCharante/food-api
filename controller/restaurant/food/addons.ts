import {
    assertTypesWrapper,
    errorWrapper,
    getUserWrapper,
    requireIsRestaurantOwnerWrapper,
    requiresValidSessionKeyWrapper
} from "../../../wrappers";
import {FoodItemAddonCategoryV1, FoodItemAddonV1, MongoDBSingleton, RestaurantV1} from "../../../database";
import {IRestaurantV1, IUserV1} from "../../../types";
import express from "express";


export const getAddons = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/addons
     * Returns the list of food addons for a restaurant (must be owner OR inventory manager)
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await getUserWrapper(req, res, canonical_id, async (user: IUserV1) => {
                await MongoDBSingleton.getInstance()
                const restaurant = await RestaurantV1.findOne({ _id: req.params.restaurant_id })
                if (!restaurant || (restaurant.owner.toString() !== user._id.toString() && !restaurant.inventoryManagers.includes(user._id))) {
                    res.status(403).send('Not your restaurant')
                    return
                }

                const addons = await FoodItemAddonV1.find({ restaurant: restaurant._id })

                res.status(200).send(addons)
            })
        })
    })
}

export const getAddonCategories = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/addonCategories
     * Returns the list of food addon categories for a restaurant (must be owner OR inventory manager)
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await getUserWrapper(req, res, canonical_id, async (user: IUserV1) => {
                await MongoDBSingleton.getInstance()
                const restaurant = await RestaurantV1.findOne({ _id: req.params.restaurant_id })
                if (!restaurant || (restaurant.owner.toString() !== user._id.toString() && !restaurant.inventoryManagers.includes(user._id))) {
                    res.status(403).send('Not your restaurant')
                    return
                }

                const categories = await FoodItemAddonCategoryV1.find({ restaurant: restaurant._id }).populate('addons')

                res.status(200).send(categories)
            })
        })
    })
}

export const postAddonCategory = async (req: express.Request, res: express.Response) => {
    /**
     * Create a food addon category
     * Body Arguments:
     *  name
     *  englishName (optional)
     *  type: 'multipleChoice' | 'pickOne'
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await getUserWrapper(req, res, canonical_id, async (user: IUserV1) => {
                await MongoDBSingleton.getInstance()
                const restaurant = await RestaurantV1.findOne({ _id: req.params.restaurant_id })
                if (!restaurant || restaurant.owner.toString() !== user._id.toString()) {
                    res.status(403).send('Not your restaurant')
                    return
                }

                if (req.body.type !== 'multipleChoice' && req.body.type !== 'pickOne') {
                    res.status(400).send('Invalid type')
                }

                const addonCategory = new FoodItemAddonCategoryV1({
                    name: req.body.name,
                    englishName: req.body.englishName ? req.body.englishName : null,
                    restaurant: restaurant._id,
                    type: req.body.type,
                    addons: []
                })

                await addonCategory.save()

                res.status(200).send('OK')
            })
        })
    })
}

export const patchAddonCategory = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/addonCategory/:category_id/modify
     * Modify settings of a food addon category
     * Body parameters:
     * name (optional)
     * englishName (optional)
     * type (optional)
     * pickOneRequiresSelection
     * pickOneDefaultValue
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await getUserWrapper(req, res, canonical_id, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await assertTypesWrapper(req, res, [
                        { field: 'name', type: 'string', isRequired: false },
                        { field: 'englishName', type: 'string', isRequired: false },
                        { field: 'type', type: 'string', isRequired: false },
                        { field: 'pickOneRequiresSelection', type: 'boolean', isRequired: false },
                        { field: 'pickOneDefaultValue', type: 'string', isRequired: false }
                    ], async () => {
                        await MongoDBSingleton.getInstance()

                        const category = await FoodItemAddonCategoryV1.findOne({ _id: req.params.category_id, restaurant: restaurant._id })

                        if (!category) {
                            res.status(404).send('Category not found')
                            return
                        }

                        if (req.body.name) {
                            category.name = req.body.name
                        }

                        if (req.body.englishName) {
                            category.englishName = req.body.englishName
                        }

                        if (req.body.type) {
                            if (req.body.type !== 'multipleChoice' && req.body.type !== 'pickOne') {
                                res.status(400).send('Invalid value for type (must be multipleChoice or pickOne)')
                                return
                            }
                            category.type = req.body.type
                        }

                        if(req.body.pickOneRequiresSelection) {
                            category.pickOneRequiresSelection = req.body.pickOneRequiresSelection
                        }

                        if (req.body.pickOneDefaultValue) {
                            category.pickOneDefaultValue = req.body.pickOneDefaultValue
                        }

                        await category.save()
                        res.status(200).send('OK')
                    })
                })
            })
        })
    })
}

export const postAddAddonToCategory = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/addonCategory/:category_id/addAddon
     * Add a food addon to a food addon category
     * Body parameters:
     * foodAddonId
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await getUserWrapper(req, res, canonical_id, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await MongoDBSingleton.getInstance()

                    const category = await FoodItemAddonCategoryV1.findOne({ _id: req.params.category_id, restaurant: restaurant._id })
                    if (!category) {
                        res.status(404).send('Food category not found')
                        return
                    }

                    const addon = await FoodItemAddonV1.findOne({ _id: req.body.foodAddonId, restaurant: restaurant._id })
                    if (!addon) {
                        res.status(404).send('Food addon not found')
                        return
                    }

                    if (category.addons.includes(addon._id)) {
                        res.status(400).send('Addon already in category')
                        return
                    }
                    category.addons.push(addon._id)
                    await category.save()

                    res.status(200).send('OK')
                })
            })
        })
    })
}

export const postCreateAddon = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/addon
     *
     * Create a food addon
     * Body Arguments:
     *  name
     *  englishName (optional)
     *  description (optional)
     *  englishDescription (optional)
     *  price
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await getUserWrapper(req, res, canonical_id, async (user: IUserV1) => {
                await MongoDBSingleton.getInstance()
                const restaurant = await RestaurantV1.findOne({ _id: req.params.restaurant_id })
                if (!restaurant || restaurant.owner.toString() !== user._id.toString()) {
                    res.status(403).send('Not your restaurant')
                    return
                }

                const addon = new FoodItemAddonV1({
                    name: req.body.name,
                    englishName: req.body.englishName ? req.body.englishName : null,
                    description: req.body.description,
                    englishDescription: req.body.englishDescription ? req.body.englishDescription : null,
                    restaurant: restaurant._id,
                    price: req.body.price
                })

                await addon.save()

                res.status(200).send('OK')
            })
        })
    })
}