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
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find the total number of activities
    const totalActivities = await Activity.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalActivities / limit);

    // Fetch paginated activities
    const activities = await Activity.find().skip(skip).limit(limit);

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
        pageSize: limit,
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

module.exports = {
  createActivity,
  getAllActivities,
  updateActivity,
  deleteActivity,
};
