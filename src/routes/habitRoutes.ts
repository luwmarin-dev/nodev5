import { Router } from 'express'
import { z } from 'zod'
import { validateBody, validateParams } from '../middleware/validation.ts'
import { authenticateToken } from '../db/auth.ts'
import { createHabit, getUserHabits, getHabit, updateHabit, deleteHabit, completeHabit } from '../controllers/habitControllers.ts'

const router = Router()
const idSchema = z.object({ id: z.uuid() })
const fields = {
    name: z.string().trim().min(1).max(100),
    description: z.string().nullable().optional(),
    frequency: z.string().trim().min(1).max(20),
    targetCount: z.number().int().positive().max(2147483647).optional(),
    tagIds: z.array(z.uuid()).transform(ids => [...new Set(ids)]).optional(),
}
const createSchema = z.object(fields).strict()
const updateSchema = z.object({ ...fields, isActive: z.boolean().optional() })
    .partial().strict().refine(body => Object.keys(body).length > 0, 'Provide at least one field')
const completionSchema = z.object({ note: z.string().optional() }).strict().default({})

router.use(authenticateToken)
router.get('/', getUserHabits)
router.post('/', validateBody(createSchema), createHabit)
router.get('/:id', validateParams(idSchema), getHabit)
router.patch('/:id', validateParams(idSchema), validateBody(updateSchema), updateHabit)
router.put('/:id', validateParams(idSchema), validateBody(updateSchema), updateHabit)
router.delete('/:id', validateParams(idSchema), deleteHabit)
router.post('/:id/complete', validateParams(idSchema), validateBody(completionSchema), completeHabit)

export default router
