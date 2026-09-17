import {app} from "./server.ts"
import env from "../env.ts"

app.listen(env.PORT, '0.0.0.0', ()=>{
    console.log(`Server is running on port ${env.PORT}`)
})
