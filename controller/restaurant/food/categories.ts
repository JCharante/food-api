import {
    assertTypesWrapper,
    errorWrapper,
    getUserWrapper,
    requireIsRestaurantOwnerWrapper,
    requiresValidSessionKeyWrapper
} from '../../../wrappers'
import { MenuCategoryV1, MongoDBSingleton } from '../../../database'
import { IRestaurantV1, IUserV1 } from '../../../types'
import express from 'express'

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
                            availability: null
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
     * URL: /resturant/:restaurant_id/food/categories
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await MongoDBSingleton.getInstance()
                    const menuCategories = await MenuCategoryV1.find({ restaurant: restaurant._id })
                    res.status(200).send(menuCategories)
                })
            })
        })
    })
}
