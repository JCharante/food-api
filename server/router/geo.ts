import {router} from "./trpc";
import {z} from "zod";
import {loggedInProcedure} from "./middleware";
// import {Client} from "@googlemaps/google-maps-services-js";
import {GeocodeResult} from "@googlemaps/google-maps-services-js/src/common";
import dotenv from "dotenv";
import {PrismaSingleton} from "../../database";
import {Prisma} from ".prisma/client";
import axios, {AxiosResponse} from 'axios'


// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

export const geoRouter = router({
    getCurrentPlace: loggedInProcedure
        .input(z.object({
            latitude: z.number(),
            longitude: z.number(),
        }))
        .query(async ({ ctx, input }) => {
            const prisma = await PrismaSingleton.getInstance()
            const searchRadius = 2 // meters
            const searchRadiusInDegrees = searchRadius / 1000 / 6371 * (180 / Math.PI);  // Convert from meters to degrees

            // Don't worry, this is safe from SQL injection
            // https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access

            const point = `POINT(${input.longitude} ${input.latitude})`

            const query = Prisma.sql`
            SELECT results
            FROM "Geocache"
            WHERE ST_DWithin(
                "location"::geometry,
                ST_GeomFromText(${point}, 4326)::geometry,
                ${searchRadiusInDegrees}
            )
            ORDER BY "insertedOn" DESC
            LIMIT 1;
            `
            // @ts-ignore
            const [result] = await prisma.$queryRaw(query)
            if (result) {
                const jsonb: GeocodeResult[] = result.results
                console.log(`${input.longitude}, ${input.latitude} cache hit`)
                console.log(`Typeof ${typeof jsonb}, ${jsonb}, stringified ${JSON.stringify(jsonb)}`)
                return jsonb
            }

            console.log(`Querying Goong Maps for ${input.latitude} ${input.longitude}`)


            const req: AxiosResponse<any, any> = await new Promise((resolve, reject) => {
                axios.get(
                    `https://rsapi.goong.io/Geocode?latlng=${input.latitude},${input.longitude}&api_key=${process.env.GOONG_API_KEY}`
                ).then((response) => {
                    console.log(response)
                    resolve(response)
                }).catch((e: any) => {
                    console.error(e)
                    reject(e)
                })
            })
            console.log('Goong Maps Request Complete')

            console.log(`Queried goong for ${input.longitude}, ${input.latitude}, got ${req.status}`)
            const data = req.data
            console.log(`${input.longitude}, ${input.latitude} cache miss, queried goong`)

            const reqResults = data.results || []
            const reqResultsString = JSON.stringify(reqResults)

            console.log(`Results from Goong Maps ${reqResultsString.length} bytes`)


            // Don't worry, this is safe from SQL injection
            // https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access

            const insertQuery = Prisma.sql`
                INSERT INTO "Geocache" ("location", "results")
                VALUES (
                    ST_GeomFromText(${point}, 4326)::geometry,
                    CAST(${reqResultsString} AS JSONB)
                );
            `

            prisma.$executeRaw(insertQuery)
            .then(affectedRows => {
                console.log(`${input.longitude}, ${input.latitude} inserted into db. ${affectedRows} rows affected`)
            })
                .catch(error => {
                    console.error(error)
                })

            return reqResults

        })
})
