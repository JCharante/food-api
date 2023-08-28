import mongoose from 'mongoose'

type Modify<T, R> = Omit<T, keyof R> & R

export interface IUserV1 {
    _id: mongoose.Types.ObjectId
    collectionInterface: string
    canonical_id: string
    name: string
    email?: string
    phone?: string
    password?: string
    isAlsoMerchant: boolean
    isAlsoAdmin: boolean
}

export interface ISessionKeyV1 {
    _id: mongoose.Types.ObjectId
    sessionKey: string
    collectionInterface: string
    canonical_id: string
}

export interface IFoodItemAddonV1 {
    _id: mongoose.Types.ObjectId
    names: { [languageCode: string]: string }
    descriptions?: { [languageCode: string]: string }
    restaurant: mongoose.Types.ObjectId
    price: number
    pictureID?: string
    visible: boolean
    inStock: boolean
}

export interface IFoodItemAddonCategoryV1 {
    _id: mongoose.Types.ObjectId
    names: { [languageCode: string]: string }
    restaurant: mongoose.Types.ObjectId
    type: string
    addons: mongoose.Types.ObjectId[]
    pickOneRequiresSelection?: boolean
    pickOneDefaultValue?: mongoose.Types.ObjectId
}

export interface IFoodItemV1 {
    _id: mongoose.Types.ObjectId
    names: { [languageCode: string]: string }
    descriptions: { [languageCode: string]: string }
    restaurant: mongoose.Types.ObjectId
    price: number
    inStock: boolean
    visible: boolean
    addons: [mongoose.Types.ObjectId]
    pictureID?: string
}

export type IFoodItemAPI = Modify<IFoodItemV1, {
    _id: string
}>

export interface IAvailabilityZoneV1 {
    _id: mongoose.Types.ObjectId
    restaurant: mongoose.Types.ObjectId
    name: string
    startHour: number
    startMinute: number
    endHour: number
    endMinute: number
    daysOfWeek: number[]
}

// Menu Category

export interface IMenuCategoryV1 {
    names: { [languageCode: string]: string }
    _id: mongoose.Types.ObjectId
    restaurant: mongoose.Types.ObjectId
    availability?: mongoose.Types.ObjectId
    foodItems: mongoose.Types.ObjectId[]
}

export type IMenuCategoryAPI = Modify<IMenuCategoryV1, {
    _id: string
    foodItems: IFoodItemAPI[]
}>

// Menu

export type languageCode = 'vi' | 'en'

export interface IMenuV1 {
    _id: mongoose.Types.ObjectId
    restaurant: mongoose.Types.ObjectId
    categories: mongoose.Types.ObjectId[]
    name: string
}

export interface IRestaurantV1 {
    _id: mongoose.Types.ObjectId
    names: { [languageCode: string]: string }
    descriptions: { [languageCode: string]: string }
    menu: mongoose.Types.ObjectId
    owner: mongoose.Types.ObjectId
    inventoryManagers: mongoose.Types.ObjectId[]
    isVisible: boolean
    isVerified: boolean
    address: string
    city: string
    position: IGeoJSONPoint
    openDuring: mongoose.Types.ObjectId[]
    hiddenByAdmin: boolean
}

export interface IGeoJSONPoint {
    type: 'Point'
    coordinates: [number, number]
}

export interface IAssertTypesItemProps {
    field: string
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    values?: 'string'
    isRequired: boolean
}
