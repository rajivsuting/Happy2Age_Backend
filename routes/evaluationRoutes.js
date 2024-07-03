const express = require("express");
const routes = express.Router();

const {
  createEvaluation,
  getAllEvaluation,
} = require("../controllers/evaluationController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create",authenticate, createEvaluation);
routes.get("/all",authenticate, getAllEvaluation);

module.exports = routes;
