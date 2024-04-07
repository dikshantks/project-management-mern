import express from "express";
import joi from "joi";
import mongoose from "mongoose";
import Project from "../models/index.js";
import Projects from "../models/project.js";
import Task from "../models/task.js";
import User from "../models/user.js";

const api = express.Router();

api.get("/projects", async (req, res) => {
    try {
        const data = await Project.find({}, { task: 0, __v: 0, updatedAt: 0 });
        return res.send(data);
    } catch (error) {
        return res.send(error);
    }
});

api.get("/project/:id", async (req, res) => {
    if (!req.params.id)
        res.status(422).send({
            data: { error: true, message: "Id is reaquire" },
        });
    try {
        // const data = await Project.find({
        //     _id: mongoose.Types.ObjectId(req.params.id),
        // }).sort({ order: 1 });
        const project = await Project.findById(req.params.id);
        if (!project)
            return res
                .status(404)
                .send({ data: { error: true, message: "Project not found" } });

        // 2. Find and Group Tasks
        const tasks = await Task.find({ projectId: req.params.id }).sort({
            order: 1,
        });

        // 3. Restructure Response
        const formattedResponse = {
            ...project.toObject(), // Convert Mongoose document to plain object
            task: tasks,
        };

        // res.send(formattedResponse);

        return res.send(formattedResponse);
    } catch (error) {
        return res.send(error);
    }
});

api.post("/project", async (req, res) => {
    // validate type
    const project = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
    });

    // validation
    const { error, value } = project.validate({
        title: req.body.title,
        description: req.body.description,
    });
    if (error) return res.status(422).send(error.details[0].message);

    // insert data
    try {
        const newProject = new Projects({
            title: value.title,
            description: value.description,
        });

        const savedProject = await newProject.save();
        res.status(201).json({
            data: savedProject,
        }); // Created
        // const data = await new Project(value).save();
        // res.send({
        //     data: {
        //         title: savedProject.title,
        //         description: savedProject.description,
        //         updatedAt: savedProject.updatedAt,
        //         _id: savedProject._id,
        //     },
        // });
    } catch (e) {
        if (e.code === 11000) {
            return res.status(422).send({
                data: { error: true, message: "title must be unique" },
            });
        } else {
            return res
                .status(500)
                .send({ data: { error: true, message: "server error" } });
        }
    }
});

api.put("/project/:id", async (req, res) => {
    // validate type
    const project = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
    });

    // // validation
    const { error, value } = project.validate({
        title: req.body.title,
        description: req.body.description,
    });
    if (error) return res.status(422).send(error);

    Project.updateOne(
        { _id: mongoose.Types.ObjectId(req.params.id) },
        { ...value },
        { upsert: true },
        (error, data) => {
            if (error) {
                res.send(error);
            } else {
                res.send(data);
            }
        }
    );
});

api.delete("/project/:id", async (req, res) => {
    try {
        const data = await Project.deleteOne({
            _id: mongoose.Types.ObjectId(req.params.id),
        });
        res.send(data);
    } catch (error) {
        res.send(error);
    }
});
//task api
api.post("/project/:id/task", async (req, res) => {
    if (!req.params.id) return res.status(400).send("Project ID is required"); // Bad Request

    // Validate type (adjust if you have a different schema for tasks)
    const taskSchema = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
        assignedUsers: joi.array().items(joi.string()), // Array of user ObjectIds
    });

    const { error, value } = taskSchema.validate({
        ...req.body,
    });

    if (error) return res.status(400).send(error.details[0].message);

    try {
        // Find the project
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).send("Project not found");

        const tasks = await Task.find({ projectId: req.params.id }).sort({
            index: 1,
        });
        console.log(tasks);
        const countTaskLength = [
            tasks.length,
            tasks.length > 0 ? Math.max(...tasks.map((task) => task.index)) : 0,
        ];
        const nextIndex = countTaskLength[1] + 1;
        const { assignedUsers } = value;
        const taskAssignedUserIds = [];
        // Create the new task object
        const newTask = new Task({
            projectId: project._id,
            ...value,
            stage: "Requested",
            order: countTaskLength[0],
            index: countTaskLength[1] + 1,
        });

        // Save the task
        const savedTask = await newTask.save((err, task) => {
            console.log("hello");
            console.log(task);
            if (err) {
                console.log(err);
            }
            if (assignedUsers && assignedUsers.length > 0) {
                Promise.all(
                    assignedUsers.map(async (userName) => {
                        let user = await User.findOne({ name: userName });
                        if (!user) {
                            user = new User({ name: userName });
                            await user.save();
                        }
                        taskAssignedUserIds.push(user._id);

                        // Update user's assigned tasks
                        await User.findByIdAndUpdate(user._id, {
                            $push: { assignedTasks: task._id },
                        });
                    })
                );
            }
        });
        console.log(savedTask);
        // You might want to update the project to reflect the new task (optional)

        res.status(201).json(savedTask);
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

api.get("/project/:id/task/:taskId", async (req, res) => {
    if (!req.params.id || !req.params.taskId)
        return res.status(500).send(`server error`);

    try {
        console.log(req.params);
        // let data = await Task.find({
        //     _id: mongoose.Types.ObjectId(req.params.taskIdid),
        // });
        let data = await Task.findById(req.params.taskId);
        console.log(data);
        if (data == null) {
            console.log("empty");

            return res
                .status(404)
                .send({ error: true, message: "record not found" });
        }
        console.log(data);
        return res.send(data);
    } catch (error) {
        return res.status(5000).send(error);
    }
});

api.put("/project/:id/task/:taskId", async (req, res) => {
    if (!req.params.id || !req.params.taskId)
        return res.status(500).send(`server error`);

    const task = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
    });

    const { error, value } = task.validate({
        title: req.body.title,
        description: req.body.description,
    });
    if (error) return res.status(422).send(error);

    try {
        // const data = await Project.find({ $and: [{ _id: mongoose.Types.ObjectId(req.params.id) }, { "task._id": mongoose.Types.ObjectId(req.params.taskId) }] },{
        //     task: {
        //         $filter: {
        //             input: "$task",
        //             as: "task",
        //             cond: {
        //                 $in: [
        //                     "$$task._id",
        //                     [
        //                         mongoose.Types.ObjectId(req.params.taskId)
        //                     ]
        //                 ]
        //             }
        //         }
        //     }
        // })
        const data = await Project.updateOne(
            {
                _id: mongoose.Types.ObjectId(req.params.id),
                task: {
                    $elemMatch: {
                        _id: mongoose.Types.ObjectId(req.params.taskId),
                    },
                },
            },
            {
                $set: {
                    "task.$.title": value.title,
                    "task.$.description": value.description,
                },
            }
        );
        return res.send(data);
    } catch (error) {
        return res.send(error);
    }
});

api.delete("/project/:id/task/:taskId", async (req, res) => {
    if (!req.params.id || !req.params.taskId)
        return res.status(500).send(`server error`);

    try {
        const data = await Project.updateOne(
            { _id: mongoose.Types.ObjectId(req.params.id) },
            {
                $pull: {
                    task: { _id: mongoose.Types.ObjectId(req.params.taskId) },
                },
            }
        );
        return res.send(data);
    } catch (error) {
        return res.send(error);
    }
});

api.put("/project/:id/todo", async (req, res) => {
    let todo = [];

    for (const key in req.body) {
        // todo.push({ items: req.body[key].items, name: req.body[key]?.name })
        for (const index in req.body[key].items) {
            req.body[key].items[index].stage = req.body[key].name;
            todo.push({
                name: req.body[key].items[index]._id,
                stage: req.body[key].items[index].stage,
                order: index,
            });
        }
    }

    todo.map(async (item) => {
        await Project.updateOne(
            {
                _id: mongoose.Types.ObjectId(req.params.id),
                task: {
                    $elemMatch: { _id: mongoose.Types.ObjectId(item.name) },
                },
            },
            { $set: { "task.$.order": item.order, "task.$.stage": item.stage } }
        );
    });

    res.send(todo);
});

// api.use('/project/:id/task', async (req, res, next) => {
//     if (req.method !== "GET") return next()

//     if (!req.params.id) return res.status(500).send(`server error`);

//     try {
//         const data = await Project.find({ _id: mongoose.Types.ObjectId(req.params.id) }, { task: 1 })
//         return res.send(data)
//     } catch (error) {
//         return res.send(error)
//     }

// })

// api.get('/project/:id/task/:taskId', (req, res) => {
//     res.send(req.params)
// })

export default api;
