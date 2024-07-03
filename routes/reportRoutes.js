const express = require("express");
const routes = express.Router();

const {
  getReportsByCohort,
  getIndividualReport,
} = require("../controllers/reportController");
const authenticate = require("../middlewares/authenticate");

routes.get("/get",authenticate, getReportsByCohort);
routes.get("/:id",authenticate, getIndividualReport);

module.exports = routes;
