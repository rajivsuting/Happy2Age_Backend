const express = require("express");
const routes = express.Router();
const {
  createScheduledActivity,
  getScheduledActivities,
  updateScheduledActivity,
  deleteScheduledActivity,
} = require("../controllers/scheduledActivityController");
const { authenticate } = require("../middlewares/authenticate");

// Apply authentication middleware to all routes
routes.use(authenticate);

// Create a new scheduled activity
routes.post("/", createScheduledActivity);

// Get scheduled activities
routes.get("/", getScheduledActivities);

// Update a scheduled activity
routes.put("/:id", updateScheduledActivity);

// Delete a scheduled activity
routes.delete("/:id", deleteScheduledActivity);

module.exports = routes;
