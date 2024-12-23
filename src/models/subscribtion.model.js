import { Schema } from "mongoose";

const subscribtionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId, //one who is subscribing
            ref: "User"
        },
        channel: {
            type: Schema.Types.ObjectId, // one who is subscribing to channels
            ref:"User"
        }
    },
    { timestamps: true}
)


export const Subscribtion = mongoose.model("Subscribtion" , subscribtionSchema)