const { default: mongoose } = require("mongoose");
const Activity = require("../models/activitySchema");

const createActivity = async (req, res) => {
  try {
    const { name, description, references, primaryDomain, secondaryDomain } =
      req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    if (!description) {
      return res
        .status(400)
        .json({ success: false, message: "Description is required" });
    }

    if (!primaryDomain) {
      return res
        .status(400)
        .json({ success: false, message: "Primary domain is required" });
    }

    const activity = new Activity({
      name,
      description,
      references,
      primaryDomain,
      secondaryDomain,
    });
    const savedActivity = await activity.save();

    res.status(201).json({
      success: true,
      message: "Activity added successfully",
      data: savedActivity,
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllActivities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      name,
      primaryDomain,
      secondaryDomain,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const parsedPage = Math.max(parseInt(page), 1);
    const parsedLimit = Math.max(parseInt(limit), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const filters = {};

    if (name) {
      filters.name = { $regex: name, $options: "i" };
    }

    if (primaryDomain) {
      filters.primaryDomain = primaryDomain;
    }

    if (secondaryDomain) {
      filters.secondaryDomain = secondaryDomain;
    }

    const sortOrder = order === "asc" ? 1 : -1;

    const totalActivities = await Activity.countDocuments(filters);

    const activities = await Activity.find(filters)
      .populate("primaryDomain")
      .populate("secondaryDomain")
      .skip(skip)
      .limit(parsedLimit)
      .sort({ [sortBy]: sortOrder });

    if (!activities.length) {
      return res.status(404).json({
        success: false,
        message: "No activities found for the given filters.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Activities fetched successfully",
      data: activities,
      pagination: {
        totalActivities,
        totalPages: Math.ceil(totalActivities / parsedLimit),
        currentPage: parsedPage,
        pageSize: parsedLimit,
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, references, primaryDomain, secondaryDomain } =
      req.body;

    const activity = await Activity.findOne({ _id: id });
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
    }

    if (name) {
      activity.name = name;
    }
    if (description) {
      activity.description = description;
    }
    if (references) {
      activity.references = references;
    }
    if (primaryDomain) {
      activity.primaryDomain = primaryDomain;
    }
    if (secondaryDomain) {
      activity.secondaryDomain = secondaryDomain;
    }

    const updatedActivity = await activity.save();
    res.status(200).json({ success: true, message: updatedActivity });
  } catch (error) {
    console.error("Error updating activity:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid activity ID" });
    }

    const activity = await Activity.findById(id);
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
    }

    await Activity.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `${activity.name} is deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting activity:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const searchActivityByName = async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res
      .status(400)
      .json({ message: "Name query parameter is required" });
  }

  try {
    const activities = await Activity.find({ name: new RegExp(name, "i") });

    if (activities.length === 0) {
      return res.status(404).json({ message: "No activities found" });
    }

    res.status(200).json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
};

const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findById(id)
      .populate("primaryDomain")
      .populate("secondaryDomain");

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Activity fetched successfully",
      data: activity,
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllActivitiesForExport = async (req, res) => {
  try {
    const search = req.query.search || "";
    const filter = search ? { name: { $regex: search, $options: "i" } } : {};

    const activities = await Activity.find(filter).lean();

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No activities found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Activities fetched successfully",
      data: activities,
    });
  } catch (error) {
    console.error("Error fetching activities for export:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createActivity,
  getAllActivities,
  updateActivity,
  deleteActivity,
  searchActivityByName,
  getActivityById,
  getAllActivitiesForExport,
};
