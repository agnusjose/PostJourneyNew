import mongoose from "mongoose";
import User from "../models/User.js";

const findProvider = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB");
        const provider = await User.findOne({ userType: { $in: ["service-provider", "service provider"] } });
        if (provider) {
            console.log(JSON.stringify({
                id: provider._id,
                name: provider.name,
                email: provider.email
            }));
        } else {
            console.log("null");
        }
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

findProvider();