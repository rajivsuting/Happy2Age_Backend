const express = require("express");
const routes = express.Router();

const {
  createDomain,
  getAllDomains,
  updateDomain,
  getDomainById,
  deleteDomain,
} = require("../controllers/domainController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create", createDomain);
routes.get("/all", getAllDomains);
routes.get("/:id", getDomainById);
routes.patch("/edit/:id", updateDomain);
routes.delete("/domains/:id", deleteDomain);

module.exports = routes;
