import {router, t} from "./trpc";
import {z} from "zod";
import {
    checkIfVerifyRequestExistsAndReturn, deleteVerifyRequest, getVerifyRequestByPhone,
    logNewVerifyRequest,
    vonage
} from "../../util/vonage"
import {PrismaSingleton} from "../../database";
import uuid4 from "uuid4";

// TODO: add POW to prevent spamming
// https://github.com/alexeichhorn/node-json-work-proof#readme
// https://chat.openai.com/share/be29412f-7866-4886-98bc-85b20896aa70

export const userRouter = router({
    /**
    * This is the first step in the auth process.
    * This will send a SMS OTP to the user's phone number
     **/
    authSMS: t.procedure.input(z.object({
        phoneNumber: z.string().min(10).max(14).regex(/^\d+$/)
    })).mutation(async ({ input }) => {
        const { requestExists, request } = await getVerifyRequestByPhone(input.phoneNumber)
        if (requestExists && request !== null) {
            // check date of request
            const now = new Date()
            const requestDate = new Date(request.createdAt)
            const diff = now.getTime() - requestDate.getTime()
            const diffMinutes = Math.floor(diff / 1000 / 60)
            if (diffMinutes < 10) {
                throw new Error('There is an outstanding request for this phone number')
            } else {
                // delete old request
                // await vonage.verify.control({
                //     request_id: request.vonageRequestId,
                //     cmd: 'cancel'
                // })
                await deleteVerifyRequest(request.vonageRequestId)
            }
        }

        const res = await vonage.verify.start({
            number: input.phoneNumber,
            brand: "Goodies"
        })
        if (res.status === '0') {
            await logNewVerifyRequest({
                phoneNumber: input.phoneNumber,
                vonageRequestId: res.request_id
            })
            console.log(res)
            return res
        } else {
            console.error(res)
        }
    }),
    /**
     * This is the second step in the auth process. You verify the SMS OTP
     */
    authSMSVerify: t.procedure.input(z.object({
        requestId: z.string(),
        code: z.string().min(4).max(6).regex(/^\d+$/)
    })).mutation(async ({ input }) => {
        const { request } = await checkIfVerifyRequestExistsAndReturn(input.requestId)
        if (request === null) {
            throw new Error('Request does not exist')
        }
        if (request.success) {
            // Success is true if the request was completed successfully (maybe they called this twice)
            return {
                requestId: request.vonageRequestId,
                success: true
            }
        }
        const res = await vonage.verify.check(input.requestId, input.code)
        console.log(res)
        // update updatedAt field (or is it auto)
        const prisma = await PrismaSingleton.getInstance()
        await prisma.userVerifyRequest.update({
            where: {
                vonageRequestId: input.requestId
            },
            data: {
                success: true
            }
        })
        return res
    }),
    /**
     * This is the third step in the auth process, you check if an account exists with this phone number
     * if it does, then you'll need to get the PIN from the user for the next step, or
     * you'll need to gather user information and create a new account in the next step
     */
    phoneNumberStatus: t.procedure.input(z.object({
        vonageRequestId: z.string(),
        phoneNumber: z.string().min(10).max(14).regex(/^\d+$/)
    })).mutation(async ({ input }) => {
        const { request } = await checkIfVerifyRequestExistsAndReturn(input.vonageRequestId)
        if (request === null) {
            throw new Error('Request does not exist')
        }
        if (request.phoneNumber !== input.phoneNumber) {
            throw new Error('Phone number does not match')
        }
        if (!request.success) {
            throw new Error('Request has not been approved')
        }

        // So now, we know that the request exists, the phone number matches, and the request has been approved
        // check that the SMS OTP request is less than 15 minutes old

        const now = new Date()
        const requestDate = new Date(request.updatedAt)
        const diff = now.getTime() - requestDate.getTime()
        const diffMinutes = Math.floor(diff / 1000 / 60)
        if (diffMinutes > 15) {
            // delete old request and throw error
            await deleteVerifyRequest(request.vonageRequestId)
            throw new Error('Request is too old (10 minutes max')
        }

        // The API caller has proven this is their phone number

        // Check if this phone number is in use

        const prisma = await PrismaSingleton.getInstance()

        const user = await prisma.user.findFirst({
            where: {
                phoneNumber: input.phoneNumber
            }
        })

        return {
            requestId: input.vonageRequestId,
            phoneNumber: input.phoneNumber,
            accountExists: user !== null
        }
    }),
    /**
     * This is the fourth step in the auth process, you check if you have the correct PIN for
     * this account, and if so then you will get a session key for this user
     */
    checkPIN: t.procedure.input(z.object({
        phoneNumber: z.string().min(10).max(14).regex(/^\d+$/),
        vonageRequestId: z.string(),
        pin: z.string().min(4).max(6).regex(/^\d+$/)
    })).mutation(async ({ input }) => {
        const { request } = await checkIfVerifyRequestExistsAndReturn(input.vonageRequestId)
        if (request === null) {
            throw new Error('Request does not exist')
        }
        if (request.phoneNumber !== input.phoneNumber) {
            throw new Error('Phone number does not match')
        }
        if (!request.success) {
            throw new Error('Request has not been approved')
        }

        // So now, we know that the request exists, the phone number matches, and the request has been approved
        // check that the SMS OTP request is less than 15 minutes old

        const now = new Date()
        const requestDate = new Date(request.updatedAt)
        const diff = now.getTime() - requestDate.getTime()
        const diffMinutes = Math.floor(diff / 1000 / 60)
        if (diffMinutes > 15) {
            // delete old request and throw error
            await deleteVerifyRequest(request.vonageRequestId)
            throw new Error('Request is too old (15 minutes max')
        }

        // The API caller has proven this is their phone number

        // Check if this phone number is in use

        const prisma = await PrismaSingleton.getInstance()

        const user = await prisma.user.findFirst({
            where: {
                phoneNumber: input.phoneNumber
            }
        })

        if (user === null) {
            throw new Error('Account does not exist')
        }

        if (user.password !== input.pin) {
            throw new Error('PIN does not match')
        }

        const sessionKey = await prisma.sessionKey.create({
            data: {
                userId: user.id,
                key: uuid4()
            }
        })

        // TODO: delete the verify request in a cleanup script

        return {
            sessionKey: sessionKey.key
        }
    }),
    /**
     * This is the fourth step in the auth process, you know that there is no account with
     * this phone number, so you are creating a new account and will get the session key
     * for this user. This session key will eventually expire* so when it expires you
     * will need to call another procedure to get a new session key by also passing in the PIN
     * * if the session key is expired but the user never set a PIN, then you don't need a PIN
     * to get a new session key
     */
    createAccount: t.procedure.input(z.object({
        phoneNumber: z.string().min(10).max(14).regex(/^\d+$/),
        vonageRequestId: z.string(),
        name: z.string().min(1).max(50), // TODO: document this max
        promoCode: z.optional(z.string().min(1).max(50)), // TODO: document this max
        userType: z.enum(['vegan', 'vegetarian', 'exploring', 'skip'])
    })).mutation(async ({ input }) => {
        const { request } = await checkIfVerifyRequestExistsAndReturn(input.vonageRequestId)
        if (request === null) {
            throw new Error('Request does not exist')
        }
        if (request.phoneNumber !== input.phoneNumber) {
            throw new Error('Phone number does not match')
        }
        if (!request.success) {
            throw new Error('Request has not been approved')
        }

        // So now, we know that the request exists, the phone number matches, and the request has been approved
        // check that the SMS OTP request is less than 15 minutes old

        const now = new Date()
        const requestDate = new Date(request.updatedAt)
        const diff = now.getTime() - requestDate.getTime()
        const diffMinutes = Math.floor(diff / 1000 / 60)
        if (diffMinutes > 15) {
            // delete old request and throw error
            await deleteVerifyRequest(request.vonageRequestId)
            throw new Error('Request is too old (15 minutes max')
        }

        // The API caller has proven this is their phone number

        // Check if this phone number is in use

        const prisma = await PrismaSingleton.getInstance()

        const user = await prisma.user.findFirst({
            where: {
                phoneNumber: input.phoneNumber
            }
        })

        if (user !== null) {
            throw new Error('Account already exists')
        }

        const newUser = await prisma.user.create({
            data: {
                phoneNumber: input.phoneNumber,
                name: input.name,
                extraInfo: {
                    promoCode: input.promoCode,
                    userType: input.userType
                },
                email: "",
                password: "",
                isAdmin: false,
                isMerchant: false
            }
        })

        const sessionKey = await prisma.sessionKey.create({
            data: {
                userId: newUser.id,
                key: uuid4()
            }
        })

        return {
            sessionKey: sessionKey.key
        }
    })
})
