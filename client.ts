import { IFoodItemAPI, IMenuCategoryAPI, IRestaurantV1 } from './types'

export const baseURL = 'http://127.0.0.1:3000'

export const getUserRestaurants = async (token: string): Promise<IRestaurantV1[]> => {
    const response = await fetch(`${baseURL}/user/restaurants`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    })
    if (response.ok) {
        const data: IRestaurantV1[] = await response.json()
        return data
    } else {
        console.error(response) // log this?
        return []
    }
}

export const getMenuCategories = async (token: string, restaurantID: string): Promise<IMenuCategoryAPI[]> => {
    const response = await fetch(`${baseURL}/restaurant/${restaurantID}/food/categories`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    })
    if (response.ok) {
        const data = await response.json()
        return data
    } else {
        console.error(response) // log this?
        return []
    }
}

export const getRestaurantFoodItems = async (token: string, restaurantID: string): Promise<IFoodItemAPI[]> => {
    const response = await fetch(`${baseURL}/restaurant/${restaurantID}/food/foodItems`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    })
    if (response.ok) {
        const data = await response.json()
        return data
    } else {
        console.error(response) // log this?
        return []
    }
}

export const PatchMenuCategoryFoodItems = async (token: string, restaurantID: string, categoryID: string, foodItemIDs: string[]): Promise<void> => {
    const response = await fetch(`${baseURL}/restaurant/${restaurantID}/food/category/${categoryID}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            foodItems: foodItemIDs
        })
    })
    if (response.ok) {
        // good
    } else {
        console.error(response) // log this?
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw (response)
    }
}
