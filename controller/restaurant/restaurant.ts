import express from "express";
import {errorWrapper, getUserWrapper, requiresValidSessionKeyWrapper} from "../../wrappers";
import {IUserV1} from "../../types";
import {AvailabilityZoneV1, MenuV1, MongoDBSingleton, RestaurantV1} from "../../database";

export * as food from './food/food'

export const postAvailability = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id/availability
     *
     * Create a new availability zone for a restaurant
     * Body parameters:
     * name
     * startHour
     * startMinute
     * endHour
     * endMinute
     * daysOfWeek [number], where 1 = Sunday, 2 = Monday, etc.
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
                if (!req.body.name) {
                    res.status(400).send('Missing name')
                    return
                }
                if (!req.body.startHour || req.body.startHour < 0 || req.body.startHour > 23) {
                    res.status(400).send('Invalid start hour')
                    return
                }
                if (!req.body.startMinute || req.body.startMinute < 0 || req.body.startMinute > 59) {
                    res.status(400).send('Invalid start minute')
                    return
                }
                if (!req.body.endHour || req.body.endHour < 0 || req.body.endHour > 23) {
                    res.status(400).send('Invalid end hour')
                    return
                }
                if (!req.body.endMinute || req.body.endMinute < 0 || req.body.endMinute > 59) {
                    res.status(400).send('Invalid end minute')
                    return
                }
                for (const day of req.body.daysOfWeek) {
                    if (typeof day !== typeof 2 || day < 1 || day > 7) {
                        res.status(400).send('Invalid day of week')
                        return
                    }
                }

                const availability = new AvailabilityZoneV1({
                    restaurant: restaurant._id,
                    name: req.body.name,
                    startHour: req.body.startHour,
                    startMinute: req.body.startMinute,
                    endHour: req.body.endHour,
                    endMinute: req.body.endMinute,
                    daysOfWeek: req.body.daysOfWeek
                })

                await availability.save()

                res.status(200).send('OK')
            })
        })
    })
}

export const postNewRestaurant = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /user/restaurant
     *
     * Create a restaurant
     * Must have isAlsoMerchant flag enabled in user profile (by contacting support)
     * Arguments:
     *  name
     *  englishName (optional)
     *  address
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await getUserWrapper(req, res, canonical_id, async (user: IUserV1) => {
                if (!user.isAlsoMerchant) {
                    res.status(403).send('Not a merchant')
                    return
                }

                // create placeholder menu

                const menu = new MenuV1({
                    restaurant: null,
                    categories: [],
                    name: 'Default Menu'
                })

                const restaurant = new RestaurantV1({
                    name: req.body.name,
                    englishName: req.body.englishName ? req.body.englishName : null,
                    description: 'This is a new Restaurant',
                    menu: menu._id,
                    owner: user._id,
                    inventoryManagers: [],
                    isVisible: false,
                    isVerified: false,
                    address: req.body.address,
                    city: 'Hanoi',
                    position: {
                        type: "Point",
                        coordinates: [0, 0]
                    },
                    openDuring: [],
                    hiddenByAdmin: false
                })

                menu.restaurant = restaurant._id

                await menu.save()
                await restaurant.save()

                res.status(200).send('OK')
            })
        })
    })
}