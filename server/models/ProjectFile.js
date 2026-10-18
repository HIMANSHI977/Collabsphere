import mongoose from "mongoose";

const projectFileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    storageName: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
      maxlength: 120,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 5 * 1024 * 1024,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

projectFileSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model("ProjectFile", projectFileSchema);
