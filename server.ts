'use strict'

import express from 'express'
import morgan from 'morgan'
// app.delete('/logout', controller.user.deleteUserSessionKey)
// // Normal end-user routes
// app.get('/restaurants', controller.restaurant.getRestaurants)
// app.get('/restaurant/:restaurant_id', controller.restaurant.getRestaurant)
// // Admin routes
// app.get('/users', controller.admin.getUsers)
//
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// require('dotenv').config({ path: '.env.local' })
// app.listen(3000, '0.0.0.0', () => {
//     console.log('The application is listening on port 3000!')
// })
import {inferAsyncReturnType, initTRPC, TRPCError} from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import * as trpcExpress from '@trpc/server/adapters/express'
import * as s3 from './s3'
import {
    PrismaSingleton,
} from './database'
import {z} from 'zod'
import {requireIsRestaurantOwnerWrapperPrisma } from './wrappers'
import bcrypt from "bcrypt";
import uuid4 from "uuid4";
import { performance, PerformanceObserver } from 'perf_hooks'
import {legacyRouter} from "./server/router/legacy";
import {createContext, router, t } from "./server/router/trpc";
import {userRouter} from "./server/router/user";
import { expressHandler } from 'trpc-playground/handlers/express'
import {searchRouter} from "./server/router/search";
import {geoRouter} from "./server/router/geo";


const app = express()

app.use(morgan('dev'))

const perfObserver = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
        //console.log(entry)
    })
})

perfObserver.observe({ entryTypes: ['measure'] })

const namedRouters = router({
    user: userRouter,
    search: searchRouter,
    geo: geoRouter
})

export const appRouter = t.mergeRouters(legacyRouter, namedRouters)

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter

const runApp = async () => {
    app.use(
        '/trpc',
        trpcExpress.createExpressMiddleware({
            router: appRouter,
            createContext
        })
    )

    app.use(
        '/trpc-playground',
        await expressHandler({
            trpcApiEndpoint: '/trpc',
            playgroundEndpoint: '/trpc-playground',
            router: appRouter,
        }),

    )

    app.listen(3000)
}

runApp()
