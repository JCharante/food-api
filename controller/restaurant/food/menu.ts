import express from 'express'
import {
    assertTypesWrapper,
    errorWrapper,
    getUserWrapper,
    requireIsRestaurantOwnerWrapper,
    requiresValidSessionKeyWrapper
} from '../../../wrappers'
import { IRestaurantV1, IUserV1 } from '../../../types'
import { MenuCategoryV1, MenuV1, MongoDBSingleton } from '../../../database'

export const patchMenu = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/food/menu
     * Method: PATCH
     *
     * Body parameters:
     *
     * categories (optional)
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await assertTypesWrapper(req, res, [
                        { field: 'categories', type: 'array', isRequired: false }
                    ], async () => {
                        await MongoDBSingleton.getInstance()
                        const menu = await MenuV1.findOne({ restaurant: restaurant._id })
                        if (menu === null) {
                            res.status(404).send('Menu not found')
                            return
                        }
                        if (req.body.categories !== undefined) {
                            // check all entries are strings
                            for (const category of req.body.categories) {
                                if (typeof category !== 'string') {
                                    res.status(400).send('Bad request category')
                                    return
                                }
                            }
                            // check each category exists
                            for (const category of req.body.categories) {
                                const cat = await MenuCategoryV1.findOne({ _id: category, restaurant: restaurant._id })
                                if (cat === null) {
                                    res.status(400).send('Bad request categories')
                                    return
                                }
                            }
                            menu.categories = req.body.categories
                        }
                        await menu.save()
                        res.status(200).send('OK')
                    })
                })
            })
        })
    })
}
