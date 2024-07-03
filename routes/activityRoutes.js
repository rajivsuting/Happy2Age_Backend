const express = require("express");
const routes = express.Router();

const {
  createActivity,
  getAllActivities,
  updateActivity,
  deleteActivity,
} = require("../controllers/activityController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create",authenticate, createActivity);
routes.get("/all",authenticate, getAllActivities);
routes.patch("/edit/:id",authenticate, updateActivity);
routes.delete("/delete/:id",authenticate, deleteActivity);

module.exports = routes;
