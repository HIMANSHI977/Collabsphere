import Project from "../models/Project.js";

export async function getPublicProject(req, res, next) {
  try {
    const { shareId } = req.params;
    if (typeof shareId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(shareId)) {
      return res.status(404).json({ success: false, message: "Public project not found" });
    }

    const project = await Project.findOne({ shareId, isPublic: true })
      .select("name description status publicReadme createdAt updatedAt");
    if (!project) {
      return res.status(404).json({ success: false, message: "Public project not found" });
    }

    return res.status(200).json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        readme: project.publicReadme,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
