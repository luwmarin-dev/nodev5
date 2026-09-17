import {db} from './connection.ts'
import {users, habits, entries, tags, habitTags} from './schema.ts'
import { pathToFileURL } from 'node:url'

console.log('SEED FILE REACHED')

const seed = async ()=>{
    console.log('starting database seeding...')

    try{
        console.log('clearing existing seed...')
        console.log('clearing existing seed...')

console.log('1 deleting entries')
await db.delete(entries)
console.log('1 done')

console.log('2 deleting habitTags')
await db.delete(habitTags)
console.log('2 done')

console.log('3 deleting habits')
await db.delete(habits)
console.log('3 done')

console.log('4 deleting tags')
await db.delete(tags)
console.log('4 done')

console.log('5 deleting users')
await db.delete(users)
console.log('5 done')

        console.log('creating demo users...')
        const [demoUser] = await db.insert(users).values({
            email: "demo@app.com",
            password: "password",
            firstname: "demo",
            lastname: "person",
            username: "demo"
        })
        .returning()
        console.log('creating tags...')
        const [healthTag] = await db.insert(tags).values({
            name: "Health",
            color: "#ff0000"
        }).returning()

        const [exerciseHabit] = await db.insert(habits).values({
            userId: demoUser.id,
            name: "Exercise",
            description: "Exercise for 30 minutes",
            frequency: "daily",
            targetCount: 1,
        }).returning()

        await db.insert(habitTags).values({
            habitId: exerciseHabit.id,
            tagId: healthTag.id
        })
        console.log('Adding completion entries...')
        const today = new Date()
        today.setHours(12,0,0,0)

        for(let i = 0; i<7;i++){
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            await db.insert(entries).values({
                habitId: exerciseHabit.id,
                completionDate: date,
            })
        }

        console.log('Database seeding completed successfully.')
        console.log('Demo user credentials:')
        console.log(`Email: ${demoUser.email}`)
        console.log(`Username: ${demoUser.username}`)
        console.log(`Password: ${demoUser.password}`)

    }catch(e){
        console.error('Error during database seeding:', e)
        process.exit(1)
    }
}


if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    seed()
        .then(()=> process.exit(0))
        .catch(e => process.exit(1))
}

export default seed
