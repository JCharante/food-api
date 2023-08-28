import bcrypt from "bcrypt";
import {MongoDBSingleton, UserV1} from "./database";



(async () => {
    try {
        await MongoDBSingleton.getInstance()

        const user = await UserV1.findOne({ email: 'john@jcharante.com' })
        if (user === null) process.exit(1)

        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash('12345678', salt)

        await user.save()

        console.log('done')
        process.exit(0)
    } catch (e) {
        // Deal with the fact the chain failed
    }
    // `text` is not available here
})();
