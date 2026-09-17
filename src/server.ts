import express from "express"


import authRoutes from "./routes/authRoutes.ts"
import habitRoutes from "./routes/habitRoutes.ts"
import userRoutes from "./routes/userRoutes.ts"
import cors from "cors"
import morgan from "morgan"
import helmet from "helmet"
import { isTest } from "../env.ts"
import { APIError, errorHandler } from "./middleware/errorHandler.ts"

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev',{
    skip: ()=> isTest(),
}))

app.use(morgan('combined'))


const apiRouter = express.Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/habits', habitRoutes)
apiRouter.use('/users', userRoutes)

apiRouter.get('/health',(req,res)=>{
    res.json({status:"ok"})
})

app.use('/api', apiRouter)

app.use(errorHandler)

export default app
export {app}


