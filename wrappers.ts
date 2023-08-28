import {MongoDBSingleton, RestaurantV1, SessionKeyV1, UserV1} from "./database";
import {IAssertTypesItemProps, IRestaurantV1, IUserV1} from "./types";
import express from "express"

export const errorWrapper = async (fn: () => Promise<void>) => {
    try {
        await fn()
    } catch (err) {
        console.error(err)
    }
}

export const requiresValidSessionKeyWrapper = async (req: express.Request, res: express.Response, fn: (canonical_id: string) => Promise<void>) => {
    if (!req.headers.authorization) {
        res.status(401).send('Unauthorized')
        return
    }
    if (!req.headers.authorization.startsWith('Bearer ')) {
        res.status(401).send('Unauthorized')
        return
    }
    const bearerToken = req.headers.authorization?.split(' ')[1]

    await MongoDBSingleton.getInstance()

    const sessionKey = await SessionKeyV1.findOne({ sessionKey: bearerToken })

    if (!sessionKey) {
        res.status(401).send('Unauthorized')
        return
    }

    await fn(sessionKey.canonical_id)
}

export const getUserWrapper = async (req: express.Request, res: express.Response, canonical_id: string, fn: (user: IUserV1) => Promise<void>) => {
    await MongoDBSingleton.getInstance()

    const user = await UserV1.findOne({ canonical_id })
    if (!user) {
        res.status(401).send('Unauthorized')
        return
    }
    await fn(user)
}

export const requireIsRestaurantOwnerWrapper = async (req: express.Request, res: express.Response, user: IUserV1, fn: (restaurant: IRestaurantV1) => Promise<void>) => {
    await MongoDBSingleton.getInstance()
    const restaurant = await RestaurantV1.findOne({ _id: req.params.restaurant_id })
    if (!restaurant || restaurant.owner.toString() !== user._id.toString()) {
        res.status(403).send('Not your restaurant')
        return
    }
    await fn(restaurant)
}

export const assertTypesWrapper = async (req: express.Request, res: express.Response, types: IAssertTypesItemProps[], fn: () => Promise<void>) => {
    for (const type of types) {
        if (type.isRequired && !req.body[type.field]) {
            res.status(400).send(`Missing ${type.field}`)
            return
        }

        if (req.body[type.field] && typeof req.body[type.field] !== type.type) {
            res.status(400).send(`Invalid type for ${type.field}`)
            return
        }
    }
    await fn()
}