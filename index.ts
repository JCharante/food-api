'use strict'

import express from 'express'

import * as controller from './controller/controller'

const app = express()
app.use(express.json())

app.get('/', (req: express.Request, res: express.Response) => {
    res.send('Goodies API')
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

app.patch('/restaurant/:restaurant_id/setHours', controller.restaurant.patchSetHours)

app.get('/restaurant/:restaurant_id/availabilityZones', controller.restaurant.getAvailabilityZones)

app.post('/restaurant/:restaurant_id/food/foodItem', controller.restaurant.food.foodItems.postCreateFoodItem)

app.post('/login/email', controller.user.postLoginWithEmail)

app.delete('/logout', controller.user.deleteUserSessionKey)

app.delete('/logout/all', controller.user.deleteUserAllSessionKeys)

app.post('/signup/email', controller.user.postUserSignupWithEmail)

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: '.env.local' })
app.listen(3000, () => {
    console.log('The application is listening on port 3000!')
})
