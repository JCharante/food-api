import express from 'express'
import {
    errorWrapper,
    getUserWrapper,
    requireIsRestaurantOwnerWrapper,
    requiresValidSessionKeyWrapper
} from '../../wrappers'
import { IRestaurantV1, IUserV1 } from '../../types'
import { AvailabilityZoneV1, MenuV1, MongoDBSingleton, RestaurantV1 } from '../../database'

export * as food from './food/index'

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
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await MongoDBSingleton.getInstance()
                const restaurant = await RestaurantV1.findOne({ _id: req.params.restaurant_id })
                if ((restaurant == null) || restaurant.owner.toString() !== user._id.toString()) {
                    res.status(403).send('Not your restaurant')
                    return
                }
                if (req.body.name === undefined) {
                    res.status(400).send('Missing name')
                    return
                }
                if (req.body.startHour === undefined || req.body.startHour < 0 || req.body.startHour > 23) {
                    res.status(400).send('Invalid start hour')
                    return
                }
                if (req.body.startMinute === undefined || req.body.startMinute < 0 || req.body.startMinute > 59) {
                    res.status(400).send('Invalid start minute')
                    return
                }
                if (req.body.endHour === undefined || req.body.endHour < 0 || req.body.endHour > 23) {
                    res.status(400).send('Invalid end hour')
                    return
                }
                if (req.body.endMinute === undefined || req.body.endMinute < 0 || req.body.endMinute > 59) {
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
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
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
                    englishName: req.body.englishName !== undefined ? req.body.englishName : null,
                    description: 'This is a new Restaurant',
                    menu: menu._id,
                    owner: user._id,
                    inventoryManagers: [],
                    isVisible: false,
                    isVerified: false,
                    address: req.body.address,
                    city: 'Hanoi',
                    position: {
                        type: 'Point',
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

export const getAvailabilityZones = async (req: express.Request, res: express.Response) => {
    /**
   * URL: /restaurant/:restaurant_id/availabilityZones
   *
   * Get all availability zones for a restaurant
   */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    await MongoDBSingleton.getInstance()

                    const availabilityZones = await AvailabilityZoneV1.find({ restaurant: restaurant._id })

                    res.status(200).send(availabilityZones)
                })
            })
        })
    })
}

export const patchSetHours = async (req: express.Request, res: express.Response) => {
    /**
   * URL: /restaurant/:restaurant_id/setHours
   *
   * Set the restaurant hours by providing an array of availability zone IDs
   *
   * Body parameters:
   *
   * availabilityZones [string]
   */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                await requireIsRestaurantOwnerWrapper(req, res, user, async (restaurant: IRestaurantV1) => {
                    // Check input
                    if (req.body.availabilityZones === undefined) {
                        res.status(400).send('Missing availabilityZones')
                        return
                    }
                    for (const availabilityZoneId of req.body.availabilityZones) {
                        if (typeof availabilityZoneId !== typeof 'string') {
                            res.status(400).send('Invalid availability zone ID')
                            return
                        }
                    }
                    // Verify availability zones exist and belong to restaurant
                    await MongoDBSingleton.getInstance()
                    for (const availabilityZoneId of req.body.availabilityZones) {
                        const availabilityZone = await AvailabilityZoneV1.findOne({ _id: availabilityZoneId })
                        if (availabilityZone == null || availabilityZone.restaurant.toString() !== restaurant._id.toString()) {
                            res.status(400).send('Invalid availability zone ID (does not belong to your restaurant)')
                            return
                        }
                    }
                    const targetRestaurant = await RestaurantV1.findOne({ _id: restaurant._id })
                    if (targetRestaurant == null) {
                        res.status(400).send('Restaurant not found')
                        return
                    }
                    targetRestaurant.openDuring = req.body.availabilityZones
                    await targetRestaurant.save()
                    res.status(200).send('OK')
                })
            })
        })
    })
}

export const getRestaurants = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurants
     *
     * Query parameters:
     * sortBy = 'location'
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                // TODO: log activity from user
                await MongoDBSingleton.getInstance()

                let restaurants: IRestaurantV1[] = []

                // Sort by name
                restaurants = await RestaurantV1
                    .find({ isVisible: true, isVerified: true, hiddenByAdmin: false })
                    .sort({ name: 'asc' })
                    .populate('openDuring')

                res.status(200).send(restaurants)
            })
        })
    })
}

export const getRestaurant = async (req: express.Request, res: express.Response) => {
    /**
     * URL: /restaurant/:restaurant_id
     *
     * Get a restaurant
     */
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
                // TODO: log activity from user
                await MongoDBSingleton.getInstance()

                const restaurant = await RestaurantV1
                    .findOne({ _id: req.params.restaurant_id })
                    .populate([
                        {
                            path: 'menu',
                            populate: {
                                path: 'categories',
                                populate: {
                                    path: 'foodItems',
                                    populate: {
                                        path: 'addons',
                                        populate: 'addons'
                                    }
                                }
                            }
                        },
                        {
                            path: 'openDuring'
                        }
                    ])

                if (restaurant == null) {
                    res.status(404).send('Restaurant not found')
                    return
                }

                res.status(200).send({
                    _id: restaurant._id,
                    name: restaurant.name,
                    englishName: restaurant.englishName,
                    openDuring: restaurant.openDuring,
                    address: restaurant.address,
                    city: restaurant.city,
                    position: restaurant.position,
                    menu: restaurant.menu
                })
            })
        })
    })
}
