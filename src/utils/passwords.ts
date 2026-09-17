import bcrypt from 'bcrypt'
import env from '../../env.ts'
import { hashQuery } from 'drizzle-orm/cache/core'

export const hashPasword = async( password:string )=>{
    return bcrypt.hash(password, env.BCRYPT_ROUNDS)
}


export const comparePasswords = async (password: string,
    hashedPassword: string)=>{
    return bcrypt.compare(password, hashedPassword)
}