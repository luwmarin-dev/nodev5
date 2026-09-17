import { type Response } from "express";
import type { AuthenticatedRequest } from "../db/auth.ts";
import {db} from '../db/connection.ts'
import { habits, entries, habitTags, tags } from "../db/schema.ts";
import {eq, and, desc, gte, lt} from 'drizzle-orm'

export const createHabit = async (req: AuthenticatedRequest, res: Response)=>{
    try{
        const {name, description, frequency, targetCount, tagIds} = req.body

        const result = await db.transaction( async (tx) => {
            const [newHabit] = await tx.insert(habits).values({
                userId: req.user.id,
                name,
                description,
                frequency,
                targetCount
            })
                .returning()


            if(tagIds && tagIds.length > 0){
                const habitTagValues = tagIds.map((tagId) =>({
                    habitId: newHabit.id,
                    tagId
                }))

                await tx.insert(habitTags).values(habitTagValues)
            }

            return newHabit
        } )

        res.status(201).json({
            message: 'Habit created',
            habit: result
        })


    }catch(e){
        console.error("Create habit error")
        res.status(500).json({ error: 'Failed to create habit' })
    }



}


export const getUserHabits = async (req: AuthenticatedRequest, res: Response) => {
    try{
        const userHabitsWithTags = await db.query.habits.findMany({
            where: eq(habits.userId, req.user.id),
            with: {
                habitTags: {
                    with: {
                        tag: true
                    }
                }
            },
            orderBy: [desc(habits.createdAt)]
        })

        const habitsWithTags = userHabitsWithTags.map((habit) => ({
            ...habit,
            tags: habit.habitTags.map((ht) => ht.tag),
            habitTags: undefined
        }))

        res.json({
            habits: habitsWithTags
        })

    }catch(e){
        console.error('Error while having all the habits', e)
        res.status(500).json({ error: 'Failed to get habits' })
    }
}

export const updateHabit = async (req:AuthenticatedRequest, res: Response) => {
    try{
        const id = req.params.id
        const { tagIds, ...updates } = req.body
        const result = await db.transaction(async(tx)=> {

            const [updatedHabit] = await tx
            .update(habits)
            .set({...updates, updatedAt: new Date() })
            .where(and(eq(habits.id, id), eq(habits.userId, req.user.id)))
            .returning()
            
            if(!updatedHabit){
            return undefined
        }

        if(tagIds !== undefined){
            await tx.delete(habitTags).where(eq(habitTags.habitId, id))

            if(tagIds.length > 0){
                const habitTagValues = tagIds.map((tagId) => ({
                    habitId: id,
                    tagId
                }))

                await tx.insert(habitTags).values(habitTagValues)
            }        
        }

        return updatedHabit

        })

        if (!result) return res.status(404).json({ error: 'Habit not found' })

        res.json({
            message: 'Habit was updated',
            habit: result
        })

        
    }catch(e){
        console.error('Update habit error')
        res.status(500).json({error: 'Failed to update habit'})
    }
}


export const getHabit = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const habit = await db.query.habits.findFirst({
            where: and(eq(habits.id, req.params.id), eq(habits.userId, req.user.id)),
            with: { habitTags: { with: { tag: true } } },
        })
        if (!habit) return res.status(404).json({ error: 'Habit not found' })
        res.json({ habit: { ...habit, tags: habit.habitTags.map(ht => ht.tag), habitTags: undefined } })
    } catch (e) {
        console.error('Get habit error', e)
        res.status(500).json({ error: 'Failed to get habit' })
    }
}

export const deleteHabit = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const [habit] = await db.delete(habits)
            .where(and(eq(habits.id, req.params.id), eq(habits.userId, req.user.id))).returning()
        if (!habit) return res.status(404).json({ error: 'Habit not found' })
        res.json({ message: 'Habit deleted successfully' })
    } catch (e) {
        console.error('Delete habit error', e)
        res.status(500).json({ error: 'Failed to delete habit' })
    }
}

export const completeHabit = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await db.transaction(async tx => {
            // Serialize completion requests for this habit to prevent duplicate daily entries.
            const [habit] = await tx.select().from(habits)
                .where(and(eq(habits.id, req.params.id), eq(habits.userId, req.user.id))).for('update')
            if (!habit) return { status: 404, body: { error: 'Habit not found' } }
            const start = new Date()
            start.setUTCHours(0, 0, 0, 0)
            const end = new Date(start)
            end.setUTCDate(end.getUTCDate() + 1)
            const existing = await tx.query.entries.findFirst({ where: and(
                eq(entries.habitId, habit.id), gte(entries.completionDate, start), lt(entries.completionDate, end),
            ) })
            if (existing) return { status: 409, body: { error: 'Habit already completed today' } }
            const [entry] = await tx.insert(entries).values({ habitId: habit.id, note: req.body.note }).returning()
            return { status: 201, body: { message: 'Habit completed successfully', entry } }
        })
        res.status(result.status).json(result.body)
    } catch (e) {
        console.error('Complete habit error', e)
        res.status(500).json({ error: 'Failed to complete habit' })
    }
}
