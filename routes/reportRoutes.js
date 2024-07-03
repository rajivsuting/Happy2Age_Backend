const express = require("express");
const routes = express.Router();

const {
  getReportsByCohort,
  getIndividualReport,
} = require("../controllers/reportController");
const authenticate = require("../middlewares/authenticate");

routes.get("/get", getReportsByCohort);
routes.get("/:id", getIndividualReport);

module.exports = routes;
