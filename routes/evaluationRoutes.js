const express = require("express");
const routes = express.Router();

const {
  createEvaluation,
  getAllEvaluation,
} = require("../controllers/evaluationController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create", createEvaluation);
routes.get("/all", getAllEvaluation);

module.exports = routes;
