import {TRPCError} from "@trpc/server";
import { t } from './trpc'

const isAuthedUser = t.middleware(async ({ next, ctx, path, rawInput }) => {
    if (ctx.blob === null) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    const date = new Date()
    console.log(`${date.toISOString()} Request from userID ${ctx.blob.user.id} ${ctx.blob.user.email} ${path} ${JSON.stringify(rawInput)}`)
    return await next({
        ctx: {
            user: ctx.blob.user,
            sessionKey: ctx.blob.sessionKey
        }
    })
})

export const loggedInProcedure = t.procedure.use(isAuthedUser)