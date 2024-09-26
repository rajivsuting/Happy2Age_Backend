const { default: mongoose } = require("mongoose");
const Activity = require("../models/activitySchema");

const createActivity = async (req, res) => {
  try {
    const { name, description, references } = req.body;

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

    const activity = new Activity({ name, description, references });
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
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit);

    // If limit is not provided or invalid, set it to null to fetch all documents
    if (!limit || isNaN(limit)) {
      limit = null;
    }

    const skip = (page - 1) * (limit || 0);

    // Find the total number of activities
    const totalActivities = await Activity.countDocuments();

    // Calculate total pages only if limit is provided, otherwise set it to 1
    const totalPages = limit ? Math.ceil(totalActivities / limit) : 1;

    // Fetch activities
    const query = Activity.find();

    if (limit) {
      query.skip(skip).limit(limit);
    }

    const activities = await query;

    if (activities.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No activities found" });
    }

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        totalActivities,
        totalPages,
        currentPage: page,
        pageSize: limit || totalActivities, // Set pageSize to totalActivities if no limit is provided
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, references } = req.body;

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

module.exports = {
  createActivity,
  getAllActivities,
  updateActivity,
  deleteActivity,
  searchActivityByName,
};
