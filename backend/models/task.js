import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Projects",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        // ... other taskSchema fields
        assignedUsers: [],
        description: String,
        order: Number,
        stage: String,
        index: Number,
        attachment: [
            { url: String }, // Simple for now, adjust if needed
        ],
    }
    // { timestamps: true }
);

export default mongoose.model("Tasks", taskSchema);
