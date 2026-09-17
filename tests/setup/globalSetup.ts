import {db} from '../../src/db/connection.ts'
import { entries, habits, habitTags, tags, users } from '../../src/db/schema.ts'
import {sql} from 'drizzle-orm'
import { execSync } from 'child_process'

export default async function setup(){
    console.log('seting up the db')
    try{
        await db.execute(sql`DROP TABLE IF EXISTS ${entries} CASCADE`)
        await db.execute(sql`DROP TABLE IF EXISTS ${habits} CASCADE`)
        await db.execute(sql`DROP TABLE IF EXISTS ${tags} CASCADE`)
        await db.execute(sql`DROP TABLE IF EXISTS ${habitTags} CASCADE`)
        await db.execute(sql`DROP TABLE IF EXISTS ${users} CASCADE`)

        console.log('🚀 Pushing schema using drizzle-kit...')

        execSync(`npx drizzle-kit push -- 
                  url="${process.env.DATABASE_URL}"
                  --schema="./src/db/schema.ts"
                  --dialect="postgresql" `,
                  {
                    stdio:'inherit',
                    cwd: process.cwd(),
                  }
            )
        console.log("✅ Test DB created...")

    }catch(e){
        console.log(' Failed to setup test db', e)
        throw e
    }
}
