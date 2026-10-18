import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "project.created",
        "project.member_added",
        "project.member_removed",
        "project.sharing_changed",
        "note.created",
        "note.updated",
        "note.deleted",
        "file.uploaded",
        "file.deleted",
        "task.created",
        "task.updated",
        "task.deleted",
      ],
    },
    resourceType: {
      type: String,
      enum: ["project", "note", "file", "task"],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: String,
      maxlength: 240,
      default: "",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ project: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
