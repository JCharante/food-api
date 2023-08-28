'use strict'

import express from 'express';
import {stringify} from "querystring";
const PocketBase = require('pocketbase/cjs')

let adminTokenObtained = false
let adminToken = ''

const app = express();

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

const getAdminToken = async (): Promise<string> => {
    if (!adminTokenObtained) {
        const res = await fetch('http://127.0.0.1:8090/api/admins/auth-via-email', {
            method: 'POST',
            body: JSON.stringify({ 'email': process.env.PB_EMAIL, 'password': process.env.PB_PASSWORD }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        console.log(res)
        const { token } = await res.json()
        console.log(token)
        adminToken = token
        adminTokenObtained = true
    }
    return adminToken
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

require('dotenv').config({ path: '.env.local' })
app.listen(3000, () => {
    console.log('The application is listening on port 3000!');
})