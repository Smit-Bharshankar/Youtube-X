// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import {app} from './app.js'
import mongoose from "mongoose";
import connectDB from "./db/index.js";

dotenv.config({ path: './.env'})

const port = process.env.PORT
connectDB()
.then((e) => {
    app.listen(port || 8000 , () => {
        console.log(`Server is running at the port ${(port || 8000)}`);
        
    })
})
.catch( (e) => {
    console.log('Mongodb connection failed :' , e);
    
})