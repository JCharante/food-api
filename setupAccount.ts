import { PrismaClient } from '@prisma/client'
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

(async () => {
    try {
        const salt = await bcrypt.genSalt(10)
        const user = await prisma.user.create({
            data: {
                email: 'john@jcharante.com',
                isAdmin: false,
                isMerchant: false,
                name: 'John Z',
                password: await bcrypt.hash('12345678', salt)
            }
        })
        const menuCreated = await prisma.menu.create({
            data: {
                restaurant: undefined
            }
        })
        await prisma.restaurant.create({
            data: {
                address: '',
                city: 'Hanoi',
                descriptions: {
                    'en': 'This is a restaurant',
                    'vi': 'Đây là một nhà hàng'
                },
                hiddenByAdmin: false,
                isVerified: true,
                isVisible: true,
                names: {
                    'en': 'Kiez Vegan',
                    'vi': 'Kiez Vegan'
                },
                position: undefined,
                menuID: menuCreated.id,
                ownerID: user.id
            }
        })
    } catch (e) {
        // Deal with the fact the chain failed
    }
    // `text` is not available here
})();