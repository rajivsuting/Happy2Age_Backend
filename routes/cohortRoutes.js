const express = require("express");
const routes = express.Router();

const {
  createCohort,
  getAllCohorts,
  updateCohort,
  deleteCohort,
  searchCohortByName,
} = require("../controllers/cohortController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create", authenticate, createCohort);
routes.get("/all", authenticate, getAllCohorts);
routes.get("/name", authenticate, searchCohortByName);
routes.patch("/edit/:id", authenticate, updateCohort);
routes.delete("/delete/:id", authenticate, deleteCohort);

module.exports = routes;
