import Activity from "../models/Activity.js";

export default async function recordActivity({
  project,
  user,
  action,
  resourceType,
  resourceId = null,
  details = "",
}) {
  try {
    return await Activity.create({
      project,
      user,
      action,
      resourceType,
      resourceId,
      details: details.slice(0, 240),
    });
  } catch {
    console.error("Project activity could not be recorded");
    return null;
  }
}
