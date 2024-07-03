const express = require("express");
const routes = express.Router();

const {
  createActivity,
  getAllActivities,
  updateActivity,
  deleteActivity,
} = require("../controllers/activityController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create", createActivity);
routes.get("/all", getAllActivities);
routes.patch("/edit/:id", updateActivity);
routes.delete("/delete/:id", deleteActivity);

module.exports = routes;
