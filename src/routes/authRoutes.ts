import {Router} from 'express';
import {login, register} from '../controllers/authController.ts'
import {validateBody} from '../middleware/validation.ts'
import { insertUserSchema } from '../db/schema.ts';
import {z} from 'zod'

const loginSchema = z.object({
    email: z.email('Invalid email'),
    password: z.string().min(1, 'Password is required')
})

const router = Router();

router.post('/login',validateBody(loginSchema), login);

router.post('/register',validateBody(insertUserSchema), register);

export default router;