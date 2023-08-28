'use strict'

import express from 'express';
import { Schema, model, connect, CallbackError } from 'mongoose';
import * as mongoose  from 'mongoose'
const PocketBase = require('pocketbase/cjs')
const bcrypt = require('bcrypt')
import uuid4 from 'uuid4'

let adminTokenObtained = false
let adminToken = ''

const app = express();
app.use(express.json());


interface IUserV1 {
    collectionInterface: string,
    canonical_id: string,
    name: string,
    email?: string,
    phone?: string,
    password?: string
}

const UserV1Schema = new Schema<IUserV1>({
    collectionInterface: { type: String, default: 'UserV1' },
    canonical_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    password: { type: String }
});

const UserV1 = model<IUserV1>('UserV1', UserV1Schema);

interface ISessionKeyV1 {
    _id: mongoose.Types.ObjectId,
    collectionInterface: string,
    canonical_id: string
}

const SessionKeyV1Schema = new Schema<ISessionKeyV1>({
    collectionInterface: { type: String, default: 'SessionKeyV1' },
    canonical_id: { type: String, required: true }
})

const SessionKeyV1 = model<ISessionKeyV1>('SessionKeyV1', SessionKeyV1Schema)

class MongoDBSingleton {
    private static instance: MongoDBSingleton;
    private constructor() { }

    public static async getInstance() {
        if (!MongoDBSingleton.instance) {
            console.log('Creating instance of MongoDBSingleton')
            MongoDBSingleton.instance = new MongoDBSingleton();
            mongoose.set('bufferCommands', false);
            try {
                await connect('mongodb://0.0.0.0:27017/goodies?directConnection=true')
            } catch (error) {
                console.error(error)
            }
        }
        return MongoDBSingleton.instance;
    }
}

class PBSingleton {
    private static instance: PBSingleton;
    private pbClient: any;

    private constructor() {
    }

    public static getInstance(): PBSingleton {
        if (!PBSingleton.instance) {
            PBSingleton.instance = new PBSingleton();
        }
        return PBSingleton.instance;
    }

    public async getClient(): Promise<typeof PocketBase> {
        if (!this.pbClient) {
            this.pbClient = new PocketBase('http://127.0.0.1:8090')
            // @ts-ignore
            const adminData = await this.pbClient.admins.authViaEmail(process.env.PB_EMAIL, process.env.PB_PASSWORD)
        }
        return this.pbClient
    }
}


interface PBCollectionResponse {
    page: number,
    perPage: number,
    totalItems: number,
    totalPages: number,
}

interface PBPosition {
    latitude: number,
    longitude: number
}

interface PBCollectionRestaurant {
    id: string,
    created: string,
    updated: string,
    name: string,
    owner: string,
    inventoryManagers: string[],
    isVisible: boolean,
    isVerified: boolean,
    address: string,
    city: string,
    position: PBPosition | null,
}

interface PBCollectionRestaurantsListResponse extends PBCollectionResponse {
    items: PBCollectionRestaurant[]
}

app.get('/', (req, res) => {
    res.send('This is a test web page!');
})

app.get('/restaurants', async (req, res) => {
    const pb = await PBSingleton.getInstance().getClient()
    const body = await pb.records.getList('restaurant', 1, 50, {
        filter: 'hiddenByAdmin = false && isVisible = true',
        expand: [
            'openDuring',
        ].toString()
    })
    body.items = body.items.map((restaurant: any) => {
        delete restaurant['created']
        delete restaurant['updated']
        delete restaurant['hiddenByAdmin']
        delete restaurant['inventoryManagers']
        delete restaurant['owner']
        restaurant.openDuring = restaurant['@expand'].openDuring
        delete restaurant['@expand'].openDuring
        delete restaurant['@expand']
        return restaurant
    })
    res.send(body)
})

app.get('/users', async (req, res) => {
    await MongoDBSingleton.getInstance()

    const users: IUserV1[] = await UserV1.find({})

    res.send(users)
})

app.post('/login/email', async (req, res) => {
    try {
        await MongoDBSingleton.getInstance()

        const user = await UserV1.findOne({ email: req.body.email })

        if (!user) {
            res.status(404).send('Email not found')
            return
        }

        const passwordMatch = await bcrypt.compare(req.body.password, user.password)

        if (!passwordMatch) {
            res.status(401).send('Incorrect password')
            return
        }

        const sessionKey = await SessionKeyV1.create({ canonical_id: uuid4() })

        await sessionKey.save()

        res.send({
            sessionKey: sessionKey._id
        })
    } catch(err) {
        console.error(err)
        res.status(500).send('Server error')
    }
})

app.delete('/logout', async (req, res) => {
    try {
        // get bearer token from header
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

        const sessionKey = await SessionKeyV1.findById(bearerToken)

        if (sessionKey) {
            await sessionKey.delete()
        }
        res.status(200).send('OK')
    } catch (err) {
        console.error(err)
        res.send(500).send('Server error')
    }
})

app.post('/signup/email', async (req, res) => {
    try {
        const body = req.body;

        if (!(body.email && body.password)) {
            return res.status(400).send({error: "Data not formatted properly"});
        }

        await MongoDBSingleton.getInstance()

        const user = new UserV1({
            email: body.email,
            name: body.name,
            canonical_id: body.email // todo: generate this maybe?
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(body.password, salt);

        await user.save()
        res.status(200).send('ok')
    } catch (err) {
        console.error(err)
        res.status(500).send('Server error')
    }
})

require('dotenv').config({ path: '.env.local' })
app.listen(3000, () => {
    console.log('The application is listening on port 3000!');
})