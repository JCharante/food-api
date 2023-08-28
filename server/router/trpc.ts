import * as trpcNext from "@trpc/server/dist/adapters/next";
import {performance} from "perf_hooks";
import {PrismaSingleton} from "../../database";
import {inferAsyncReturnType, initTRPC} from "@trpc/server";

export async function createContext ({
                                         req,
                                         res
                                     }: trpcNext.CreateNextContextOptions) {
    // Create your context based on the request object
    // Will be available as `ctx` in all your resolvers
    // This is just an example of something you might want to do in your ctx fn
    async function getUserFromHeader () {
        if (!req.headers.authorization) {
            return null
        }
        if (!req.headers.authorization.startsWith('Bearer ')) {
            return null
        }
        const bearerToken: string = req.headers.authorization?.split(' ')[1]

        performance.mark("start-get-session-key")
        const prisma = await PrismaSingleton.getInstance()

        const sessionKey = await prisma.sessionKey.findUnique({
            where: {
                key: bearerToken
            },
            include: {
                user: true
            }
        })
        performance.mark("end-get-session-key")
        performance.measure("get-session-key", "start-get-session-key", "end-get-session-key")

        if (sessionKey == null) {
            return null
        }

        return {
            sessionKey: bearerToken,
            user: sessionKey.user
        }
    }
    const blob = await getUserFromHeader()
    return {
        blob
    }
}
export type Context = inferAsyncReturnType<typeof createContext>

export const t = initTRPC.context<Context>().create()

export const router = t.router
// const publicProcedure = t.procedure
