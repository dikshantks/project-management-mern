import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    assignedTasks: [],
});

export default mongoose.model("Users", userSchema);
