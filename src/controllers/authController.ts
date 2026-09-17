import type {Request, Response} from 'express'
import bcrypt from 'bcrypt'
import {db} from '../db/connection.ts'
import { users, type newUser } from '../db/schema.ts'
import { generateToken } from '../utils/jwt.ts'
import { hashPasword,comparePasswords } from '../utils/passwords.ts'
import { eq } from 'drizzle-orm'

export const register = async (req: Request<any, any, newUser>, res: Response)=>{
    try{
        const hashedPassword = await hashPasword(req.body.password) 
        const [user] = await db.insert(users).values({
            ...req.body,
            password: hashedPassword
        })
        .returning({
            id: users.id,
            email: users.email,
            username: users.username,
            firstname: users.firstname,
            lastname: users.lastname,
            createdAt: users.createdAt
        })

        const token = await generateToken({
            id: user.id,
            email: user.email,
            username: user.username
        })

        return res.status(201).json({
            message: 'User created',
            user,
            token
        })

    }catch(e){
        console.log('Registration error')
        res.status(500).json({error: 'Failed to create user'})
    }
}

export const login = async (req: Request, res: Response)=>{
    try{
        const {email, password} = req.body
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        })

        if(!user){
            return res.status(401).json({error: "invalid credentials"})
        }
        const isValidPassword = await comparePasswords(password, user.password)
        if(!isValidPassword){
            return res.status(401).json({error: "Invalid credentials"})
        }

        const token = await generateToken({
            id: user.id,
            email: user.email,
            username: user.username
        })
        return res.status(201).json({
            message: 'Login success',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                createdAt: user.createdAt
            },
            token
        })
        
    }catch(e){
        console.log('Login error', e)
        res.status(500).jsonp({error: 'failed to login'})
    }
}
