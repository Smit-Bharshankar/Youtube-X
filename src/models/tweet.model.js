import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    ownwer: {
        type: Schema.Types.ObjectIdl+,
        ref: "User"
    }
},{timestamps: true})

export const Tweet = mongoose.model("Tweet" , tweetSchema)