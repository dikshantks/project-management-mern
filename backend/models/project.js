import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            unique: true,
        },
        description: String,
    }
    // { timestamps: true }
);

export default mongoose.model("Projects", projectSchema);
