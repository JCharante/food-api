import express from 'express'
import {
    assertTypesWrapper,
    errorWrapper,
    getUserWrapper,
    requireIsRestaurantOwnerWrapper,
    requiresValidSessionKeyWrapper
} from '../../../wrappers'
import { IRestaurantV1, IUserV1 } from '../../../types'
import { FoodItemV1, MongoDBSingleton } from '../../../database'

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
