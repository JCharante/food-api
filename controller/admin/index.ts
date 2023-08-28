import express from 'express'
import { errorWrapper, requiresValidSessionKeyWrapper } from '../../wrappers'
import { MongoDBSingleton, UserV1 } from '../../database'
import { IUserV1 } from '../../types'

export const getUsers = async (req: express.Request, res: express.Response) => {
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonicalId: string) => {
            await MongoDBSingleton.getInstance()

            // only for admins
            const user = await UserV1.findOne({ canonical_id: canonicalId })
            if ((user == null) || !user.isAlsoAdmin) {
                res.status(401).send('Unauthorized')
                return
            }

            const users: IUserV1[] = await UserV1.find({})

            res.send(users)
        })
    })
}
