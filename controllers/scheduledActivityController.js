const ScheduledActivity = require("../models/scheduledActivitySchema");
const Activity = require("../models/activitySchema");
const Cohort = require("../models/cohortSchema");

// Create a new scheduled activity
const createScheduledActivity = async (req, res) => {
  try {
    const { activityId, date, cohortId, notes } = req.body;

    // Validate required fields
    if (!activityId || !date || !cohortId) {
      return res.status(400).json({
        success: false,
        message: "Activity, date, and cohort are required",
      });
    }

    // Check if activity exists
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    // Check if cohort exists
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({
        success: false,
        message: "Cohort not found",
      });
    }

    const scheduledActivity = new ScheduledActivity({
      activity: activityId,
      date: new Date(date),
      cohort: cohortId,
      notes,
    });

    await scheduledActivity.save();

    // Populate the references
    await scheduledActivity.populate([
      { path: "activity", select: "name description category" },
      { path: "cohort", select: "name" },
    ]);

    res.status(201).json({
      success: true,
      message: "Activity scheduled successfully",
      data: scheduledActivity,
    });
  } catch (error) {
    console.error("Error scheduling activity:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get scheduled activities for a date range
const getScheduledActivities = async (req, res) => {
  try {
    const { startDate, endDate, cohortId } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (cohortId) {
      query.cohort = cohortId;
    }

    const scheduledActivities = await ScheduledActivity.find(query)
      .populate("activity", "name description category")
      .populate("cohort", "name")
      .sort({ date: 1 });

    res.json({
      success: true,
      data: scheduledActivities,
    });
  } catch (error) {
    console.error("Error fetching scheduled activities:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update a scheduled activity
const updateScheduledActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { activityId, date, cohortId, status, notes } = req.body;

    const scheduledActivity = await ScheduledActivity.findById(id);
    if (!scheduledActivity) {
      return res.status(404).json({
        success: false,
        message: "Scheduled activity not found",
      });
    }

    if (activityId) {
      const activity = await Activity.findById(activityId);
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: "Activity not found",
        });
      }
      scheduledActivity.activity = activityId;
    }

    if (date) {
      scheduledActivity.date = new Date(date);
    }

    if (cohortId) {
      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({
          success: false,
          message: "Cohort not found",
        });
      }
      scheduledActivity.cohort = cohortId;
    }

    if (status) {
      scheduledActivity.status = status;
    }

    if (notes !== undefined) {
      scheduledActivity.notes = notes;
    }

    await scheduledActivity.save();

    // Populate the references
    await scheduledActivity.populate([
      { path: "activity", select: "name description category" },
      { path: "cohort", select: "name" },
    ]);

    res.json({
      success: true,
      message: "Scheduled activity updated successfully",
      data: scheduledActivity,
    });
  } catch (error) {
    console.error("Error updating scheduled activity:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete a scheduled activity
const deleteScheduledActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const scheduledActivity = await ScheduledActivity.findById(id);
    if (!scheduledActivity) {
      return res.status(404).json({
        success: false,
        message: "Scheduled activity not found",
      });
    }

    await scheduledActivity.deleteOne();

    res.json({
      success: true,
      message: "Scheduled activity deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting scheduled activity:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createScheduledActivity,
  getScheduledActivities,
  updateScheduledActivity,
  deleteScheduledActivity,
};
