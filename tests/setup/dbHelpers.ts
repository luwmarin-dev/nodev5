import {db} from '../../src/db/connection.ts'
import { entries, habits, habitTags, tags, users, type newHabit, type newUser } from '../../src/db/schema.ts'
import { generateToken } from '../../src/utils/jwt.ts'
import { hashPasword } from '../../src/utils/passwords.ts'

export const createTestUser = async(userData: Partial<newUser>) => {
    const defaultData = {
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        username: `testUser-${Date.now()}-${Math.random()}`,
        password: 'adminpassword1234',
        firstName: 'Test',
        lastName:'User',
        ...userData,

    }

    const hashedPassword = await hashPasword(defaultData.password)
    const [user] = await db.insert(users).values({
        ...defaultData,
        password:hashedPassword,

    })
      .returning()

      const token = generateToken({
        id: user.id,
        email: user.email,
        username: user.username
      })

      return {token, user, rawPassword: defaultData.password}

}

export const createTestHabit = async (
    userId:string, 
    habitData:Partial<newHabit> = {}
) => {
    const defaultData = {
        name: `Test habit ${Date.now()}`,
        description: 'A test habit',
        frequency: 'daily',
        targetCount: 1,
        ...habitData
    }

    const [habit] = await db.insert(habits).values({
        userId,
        ...defaultData,
    })
    .returning()

    return habit

}

export const cleanUpDataBase = async () => {
    await db.delete(entries)
    await db.delete(habits)
    await db.delete(users)
    await db.delete(tags)
    await db.delete(habitTags)
}
