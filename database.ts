import mongoose, { connect, model, Schema } from 'mongoose'
import {
  IAvailabilityZoneV1,
  IFoodItemAddonCategoryV1,
  IFoodItemAddonV1,
  IFoodItemV1,
  IGeoJSONPoint,
  IMenuCategoryV1,
  IMenuV1,
  IRestaurantV1,
  ISessionKeyV1,
  IUserV1
} from './types'

export class MongoDBSingleton {
  private static instance: MongoDBSingleton | null = null
  private constructor () {}

  public static async getInstance () {
    if (MongoDBSingleton.instance == null) {
      console.log('Creating instance of MongoDBSingleton')
      MongoDBSingleton.instance = new MongoDBSingleton()
      mongoose.set('bufferCommands', false)
      try {
        await connect('mongodb://0.0.0.0:27017/goodies?directConnection=true')
      } catch (error) {
        console.error(error)
      }
    }
    return MongoDBSingleton.instance
  }
}

export const UserV1Schema = new Schema<IUserV1>({
  collectionInterface: { type: String, default: 'UserV1' },
  canonical_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  password: { type: String },
  isAlsoMerchant: { type: Boolean, required: true, default: false },
  isAlsoAdmin: { type: Boolean, required: true, default: false }
})

export const UserV1 = model<IUserV1>('UserV1', UserV1Schema)

export const SessionKeyV1Schema = new Schema<ISessionKeyV1>({
  sessionKey: { type: String, required: true, unique: true },
  collectionInterface: { type: String, default: 'SessionKeyV1' },
  canonical_id: { type: String, required: true }
})

export const SessionKeyV1 = model<ISessionKeyV1>('SessionKeyV1', SessionKeyV1Schema)

export const FoodItemAddonV1Schema = new Schema<IFoodItemAddonV1>({
  name: { type: String, required: true },
  englishName: { type: String },
  description: { type: String },
  englishDescription: { type: String },
  restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
  price: { type: Number, required: true },
  pictureID: { type: String }
})

export const FoodItemAddonV1 = model<IFoodItemAddonV1>('FoodItemAddonV1', FoodItemAddonV1Schema)

export const FoodItemAddonCategoryV1Schema = new Schema<IFoodItemAddonCategoryV1>({
  name: { type: String, required: true },
  englishName: { type: String },
  restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
  type: { type: String, required: true },
  addons: { type: [mongoose.SchemaTypes.ObjectId], required: true, ref: 'FoodItemAddonV1' },
  pickOneRequiresSelection: { type: Boolean },
  pickOneDefaultValue: { type: mongoose.SchemaTypes.ObjectId }
})

export const FoodItemAddonCategoryV1 = model<IFoodItemAddonCategoryV1>('FoodItemAddonCategoryV1', FoodItemAddonCategoryV1Schema)

export const FoodItemV1Schema = new Schema<IFoodItemV1>({
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

export const FoodItemV1 = model<IFoodItemV1>('FoodItemV1', FoodItemV1Schema)

export const AvailabilityZoneV1Schema = new Schema<IAvailabilityZoneV1>({
  restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
  name: { type: String, required: true },
  startHour: { type: Number, required: true },
  startMinute: { type: Number, required: true },
  endHour: { type: Number, required: true },
  endMinute: { type: Number, required: true },
  daysOfWeek: { type: [Number], required: true }
})

export const AvailabilityZoneV1 = model<IAvailabilityZoneV1>('AvailabilityZoneV1', AvailabilityZoneV1Schema)

export const MenuCategoryV1Schema = new Schema<IMenuCategoryV1>({
  name: { type: String, required: true },
  englishName: { type: String },
  restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
  availability: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: 'AvailabilityZoneV1' }
})

export const MenuCategoryV1 = model<IMenuCategoryV1>('MenuCategoryV1', MenuCategoryV1Schema)

export const MenuV1Schema = new Schema<IMenuV1>({
  restaurant: { type: mongoose.SchemaTypes.ObjectId, required: true },
  categories: { type: [mongoose.SchemaTypes.ObjectId], required: true, ref: 'MenuCategoryV1' },
  name: { type: String, required: true }
})

export const MenuV1 = model<IMenuV1>('MenuV1', MenuV1Schema)

export const GeoJSONPointSchema = new Schema<IGeoJSONPoint>({
  type: { type: String, enum: ['Point'], required: true },
  coordinates: { type: [Number], required: true }
})

export const RestaurantV1Schema = new Schema<IRestaurantV1>({
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

export const RestaurantV1 = model<IRestaurantV1>('RestaurantV1', RestaurantV1Schema)

export const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
})
