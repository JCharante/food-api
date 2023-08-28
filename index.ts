'use strict'

import express from 'express';
const bcrypt = require('bcrypt')
import uuid4 from 'uuid4'
import { errorWrapper, getUserWrapper, requiresValidSessionKeyWrapper, requireIsRestaurantOwnerWrapper } from './wrappers'
import {IRestaurantV1, IUserV1} from "./types";
import {
    AvailabilityZoneV1, FoodItemAddonCategoryV1,
    FoodItemAddonV1,
    MenuV1,
    MongoDBSingleton,
    RestaurantV1,
    SessionKeyV1,
    UserV1
} from "./database";
let adminTokenObtained = false
let adminToken = ''

const app = express();
app.use(express.json());

import * as controller from './controller/controller'
import {getAddonCategories, postAddAddonToCategory, postCreateAddon} from "./controller/restaurant/food/addons";



app.get('/', (req: express.Request, res: express.Response) => {
    res.send('Goodies API');
})

app.get('/users', controller.admin.getUsers)

app.get('/user/restaurants', controller.user.getUserRestaurants)

app.post('/user/restaurant', controller.restaurant.postNewRestaurant)

app.post('/restaurant/:restaurant_id/food/addon', controller.restaurant.food.addons.postCreateAddon)

app.get('/restaurant/:restaurant_id/food/addons', controller.restaurant.food.addons.getAddons)

app.get('/restaurant/:restaurant_id/food/addonCategories', controller.restaurant.food.addons.getAddonCategories)

app.post('/restaurant/:restaurant_id/food/addonCategory', controller.restaurant.food.addons.postAddonCategory)

app.patch('/restaurant/:restaurant_id/food/addonCategory/:category_id/modify', controller.restaurant.food.addons.patchAddonCategory)

app.post('/restaurant/:restaurant_id/food/addonCategory/:category_id/addAddon', controller.restaurant.food.addons.postAddAddonToCategory)

app.post('/restaurant/:restaurant_id/availability', controller.restaurant.postAvailability)

app.post('/login/email', controller.user.postLoginWithEmail)

app.delete('/logout', controller.user.deleteUserSessionKey)

app.delete('/logout/all', controller.user.deleteUserAllSessionKeys)

app.post('/signup/email', controller.user.postUserSignupWithEmail)

require('dotenv').config({ path: '.env.local' })
app.listen(3000, () => {
    console.log('The application is listening on port 3000!');
})