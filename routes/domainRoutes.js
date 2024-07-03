const express = require("express");
const routes = express.Router();

const {
  createDomain,
  getAllDomains,
  updateDomain,
  getDomainById,
} = require("../controllers/domainController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create",authenticate, createDomain);
routes.get("/all",authenticate, getAllDomains);
routes.get("/:id",authenticate, getDomainById);
routes.patch("/edit/:id",authenticate, updateDomain);

module.exports = routes;
