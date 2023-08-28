import express from 'express'
import { errorWrapper, getUserWrapper, requiresValidSessionKeyWrapper } from '../../wrappers'
import { IRestaurantV1, IUserV1 } from '../../types'
import { MongoDBSingleton, RestaurantV1, SessionKeyV1, UserV1 } from '../../database'
import uuid4 from 'uuid4'
import bcrypt from 'bcrypt'

export const getUserRestaurants = async (req: express.Request, res: express.Response) => {
  /**
     * URL: /user/restaurants
     *
     * Get restaurants owned by a user
     * TODO: also fetch restaurants you're an inventoryManager of
     */
  await errorWrapper(async () => {
    await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
      await getUserWrapper(req, res, canonicalId, async (user: IUserV1) => {
        const restaurants: IRestaurantV1[] = await RestaurantV1.find({ owner: user._id })
        res.send(restaurants)
      })
    })
  })
}

export const deleteUserSessionKey = async (req: express.Request, res: express.Response) => {
  /**
     * URL: /logout
     */
  try {
    // get bearer token from header
    if (req.headers.authorization === undefined) {
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

    if (sessionKey != null) {
      await sessionKey.delete()
    }
    res.status(200).send('OK')
  } catch (err) {
    console.error(err)
    res.send(500).send('Server error')
  }
}

export const deleteUserAllSessionKeys = async (req: express.Request, res: express.Response) => {
  /**
     * URL: /logout/all
     */
  try {
    // get bearer token from header
    if (req.headers.authorization === undefined) {
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

    if (sessionKey == null) {
      res.status(401).send('Unauthorized')
      return
    }

    await SessionKeyV1.deleteMany({ canonical_id: sessionKey.canonical_id })

    res.send(200).send('OK')
  } catch (err) {
    console.error(err)
    res.send(500).send('Server error')
  }
}

export const postUserSignupWithEmail = async (req: express.Request, res: express.Response) => {
  /**
     * URL: /signup/email
     */
  try {
    const body = req.body

    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      res.status(400).send({ error: 'Data not formatted properly' })
      return
    }

    await MongoDBSingleton.getInstance()

    const user = new UserV1({
      email: body.email,
      name: body.name,
      canonical_id: body.email // todo: generate this maybe?
    })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(body.password, salt)

    await user.save()
    res.status(200).send('ok')
  } catch (err) {
    console.error(err)
    res.status(500).send('Server error')
  }
}

export const postLoginWithEmail = async (req: express.Request, res: express.Response) => {
  /**
     * URL: /login/email
     */
  try {
    await MongoDBSingleton.getInstance()

    const user = await UserV1.findOne({ email: req.body.email })

    if (user == null) {
      res.status(404).send('Email not found')
      return
    }

    if (user.password === null || user.password === undefined) {
      // User didn't previously sign in with a password (social media login probably)
      res.status(400).send('User did not previously sign in with a password')
      return
    }

    const passwordMatch = await bcrypt.compare(req.body.password, user.password)

    if (!passwordMatch) {
      res.status(401).send('Incorrect password')
      return
    }

    const sessionKey = await SessionKeyV1.create({
      canonical_id: user.canonical_id,
      sessionKey: uuid4()
    })

    await sessionKey.save()

    res.send({
      sessionKey: sessionKey.sessionKey
    })
  } catch (err) {
    console.error(err)
    res.status(500).send('Server error')
  }
}
