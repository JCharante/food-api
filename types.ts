import mongoose from 'mongoose'

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
  name: string
  englishName?: string
  description?: string
  englishDescription?: string
  restaurant: mongoose.Types.ObjectId
  price: number
  pictureID?: string
}

export interface IFoodItemAddonCategoryV1 {
  _id: mongoose.Types.ObjectId
  name: string
  englishName?: string
  restaurant: mongoose.Types.ObjectId
  type: string
  addons: mongoose.Types.ObjectId[]
  pickOneRequiresSelection?: boolean
  pickOneDefaultValue?: mongoose.Types.ObjectId
}

export interface IFoodItemV1 {
  _id: mongoose.Types.ObjectId
  name: string
  englishName?: string
  description: string
  englishDescription?: string
  restaurant: mongoose.Types.ObjectId
  price: number
  inStock: boolean
  visible: boolean
  addons: [mongoose.Types.ObjectId]
  pictureID?: string
}

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

export interface IMenuCategoryV1 {
  _id: mongoose.Types.ObjectId
  name: string
  englishName?: string
  restaurant: mongoose.Types.ObjectId
  availability: mongoose.Types.ObjectId
}

export interface IMenuV1 {
  _id: mongoose.Types.ObjectId
  restaurant: mongoose.Types.ObjectId
  categories: mongoose.Types.ObjectId[]
  name: string
}

export interface IRestaurantV1 {
  _id: mongoose.Types.ObjectId
  name: string
  englishName?: string
  description: string
  englishDescription?: string
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
  isRequired: boolean
}
