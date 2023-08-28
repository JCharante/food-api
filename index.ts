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
    password?: string,
    isAlsoMerchant: boolean,
    isAlsoAdmin: boolean,
}

const UserV1Schema = new Schema<IUserV1>({
    collectionInterface: { type: String, default: 'UserV1' },
    canonical_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    password: { type: String },
    isAlsoMerchant: { type: Boolean, required: true, default: false },
    isAlsoAdmin: { type: Boolean, required: true, default: false },
});

const UserV1 = model<IUserV1>('UserV1', UserV1Schema);

interface ISessionKeyV1 {
    _id: mongoose.Types.ObjectId,
    sessionKey: string,
    collectionInterface: string,
    canonical_id: string
}

const SessionKeyV1Schema = new Schema<ISessionKeyV1>({
    sessionKey: { type: String, required: true, unique: true },
    collectionInterface: { type: String, default: 'SessionKeyV1' },
    canonical_id: { type: String, required: true }
})

const SessionKeyV1 = model<ISessionKeyV1>('SessionKeyV1', SessionKeyV1Schema)

interface IFoodItemAddonV1 {
    _id: mongoose.Types.ObjectId,
    name: string,
    englishName?: string,
    description: string,
    englishDescription?: string,
    restaurant: mongoose.Types.ObjectId,
    price: number,
    pictureID?: string
}

const FoodItemAddonV1Schema = new Schema<IFoodItemAddonV1>({
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    name: { type: String, required: true },
    englishName: { type: String },
    description: { type: String },
    englishDescription: { type: String },
    restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
    price: { type: Number, required: true },
    pictureID: { type: String }
})

const FoodItemAddonV1 = model<IFoodItemAddonV1>('FoodItemAddonV1', FoodItemAddonV1Schema)

interface IFoodItemAddonCategoryV1 {
    _id: mongoose.Types.ObjectId,
    name: string,
    englishName?: string,
    restaurant: mongoose.Types.ObjectId,
    type: string,
    addons: mongoose.Types.ObjectId[],
    pickOneRequiresSelect?: boolean,
    pickOneDefaultValue?: mongoose.Types.ObjectId,
}

const FoodItemAddonCategoryV1Schema = new Schema<IFoodItemAddonCategoryV1>({
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    name: { type: String, required: true },
    englishName: { type: String },
    restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
    type: { type: String, required: true },
    addons: { type: [mongoose.SchemaTypes.ObjectId], required: true, ref: 'FoodItemAddonV1' },
    pickOneRequiresSelect: { type: Boolean },
    pickOneDefaultValue: { type: mongoose.SchemaTypes.ObjectId}
})

const FoodItemAddonCategoryV1 = model<IFoodItemAddonCategoryV1>('FoodItemAddonCategoryV1', FoodItemAddonCategoryV1Schema)

interface IFoodItemV1 {
    _id: mongoose.Types.ObjectId,
    name: string,
    englishName?: string,
    description: string,
    englishDescription?: string,
    restaurant: mongoose.Types.ObjectId,
    price: number,
    inStock: boolean,
    visible: boolean,
    addons: [mongoose.Types.ObjectId],
    pictureID?: string
}

const FoodItemV1Schema = new Schema<IFoodItemV1>({
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    name: { type: String, required: true },
    englishName: { type: String },
    description: { type: String },
    englishDescription: { type: String },
    restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
    price: { type: Number, required: true },
    inStock: { type: Boolean, required: true },
    visible: { type: Boolean, required: true },
    addons: { type: [mongoose.SchemaTypes.ObjectId], required: true, ref: 'FoodItemAddonCategoryV1' },
    pictureID: { type: String }
})

const FoodItemV1 = model<IFoodItemV1>('FoodItemV1', FoodItemV1Schema)

interface IAvailabilityZoneV1 {
    _id: mongoose.Types.ObjectId,
    restaurant: mongoose.Types.ObjectId,
    name: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    daysOfWeek: number[],
}

const AvailabilityZoneV1Schema = new Schema<IAvailabilityZoneV1>({
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
    name: { type: String, required: true },
    startHour: { type: Number, required: true },
    startMinute: { type: Number, required: true },
    endHour: { type: Number, required: true },
    endMinute: { type: Number, required: true },
    daysOfWeek: { type: [Number], required: true }
})

const AvailabilityZoneV1 = model<IAvailabilityZoneV1>('AvailabilityZoneV1', AvailabilityZoneV1Schema)

interface IMenuCategoryV1 {
    _id: mongoose.Types.ObjectId,
    name: string,
    englishName?: string,
    restaurant: mongoose.Types.ObjectId,
    availability: mongoose.Types.ObjectId
}

const MenuCategoryV1Schema = new Schema<IMenuCategoryV1>({
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    name: { type: String, required: true },
    englishName: { type: String },
    restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
    availability: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: 'AvailabilityZoneV1' }
})

const MenuCategoryV1 = model<IMenuCategoryV1>('MenuCategoryV1', MenuCategoryV1Schema)

interface IMenuV1 {
    _id: mongoose.Types.ObjectId,
    restaurant: mongoose.Types.ObjectId,
    categories: mongoose.Types.ObjectId[]
    name: string
}

const MenuV1Schema = new Schema<IMenuV1>({
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
    categories: { type: [mongoose.SchemaTypes.ObjectId], required: true, ref: 'MenuCategoryV1' },
    name: { type: String, required: true }
})

const MenuV1 = model<IMenuV1>('MenuV1', MenuV1Schema)


const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true
    },
    coordinates: {
        type: [Number],
        required: true
    }
});

interface IGeoJSONPoint {
    type: 'Point',
    coordinates: [number, number]
}

const GeoJSONPointSchema = new Schema<IGeoJSONPoint>({
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
})

interface IRestaurantV1 {
    _id: mongoose.Types.ObjectId,
    name: string,
    englishName?: string,
    description: string,
    englishDescription?: string,
    menu: mongoose.Types.ObjectId,
    owner: mongoose.Types.ObjectId,
    inventoryManagers: mongoose.Types.ObjectId[],
    isVisible: boolean,
    isVerified: boolean,
    address: string,
    city: string,
    position: IGeoJSONPoint,
    openDuring: mongoose.Types.ObjectId[],
    hiddenByAdmin: boolean
}

const RestaurantV1Schema = new Schema<IRestaurantV1>({
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    name: { type: String, required: true },
    englishName: { type: String },
    description: { type: String },
    englishDescription: { type: String },
    menu: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: 'MenuV1' },
    owner: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: 'UserV1' },
    inventoryManagers: { type: [mongoose.SchemaTypes.ObjectId], required: true, ref: 'UserV1' },
    isVisible: { type: Boolean, required: true },
    isVerified: { type: Boolean, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    position: { type: GeoJSONPointSchema },
    openDuring: { type: [mongoose.SchemaTypes.ObjectId], required: true, ref: 'AvailabilityZoneV1' },
    hiddenByAdmin: { type: Boolean, required: true }
})

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

const errorWrapper = async (fn: () => Promise<void>) => {
    try {
        await fn()
    } catch (err) {
        console.error(err)
    }
}

const requiresValidSessionKeyWrapper = async (req: any, res:any, fn: (canonical_id: string) => Promise<void>) => {
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

app.get('/users', async (req, res) => {
    await errorWrapper(async () => {
        await requiresValidSessionKeyWrapper(req, res, async (canonical_id: string) => {
            await MongoDBSingleton.getInstance()

            // only for admins
            const user = await UserV1.findOne({ canonical_id })
            if (!user || !user.isAlsoAdmin) {
                res.status(401).send('Unauthorized')
                return
            }

            const users: IUserV1[] = await UserV1.find({})

            res.send(users)
        })
    })
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

        const sessionKey = await SessionKeyV1.create({
            canonical_id: user.canonical_id,
            sessionKey: uuid4()
        })

        await sessionKey.save()

        res.send({
            sessionKey: sessionKey.sessionKey
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

        const sessionKey = await SessionKeyV1.findOne({ sessionKey: bearerToken })

        if (sessionKey) {
            await sessionKey.delete()
        }
        res.status(200).send('OK')
    } catch (err) {
        console.error(err)
        res.send(500).send('Server error')
    }
})

app.delete('/logout/all', async (req, res) => {
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

        const sessionKey = await SessionKeyV1.findOne({ sessionKey: bearerToken })

        if (!sessionKey) {
            res.status(401).send('Unauthorized')
            return
        }

        await SessionKeyV1.deleteMany({ canonical_id: sessionKey.canonical_id })

        res.send(200).send('OK')
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