const express = require("express");
const routes = express.Router();

const {
  createEvaluation,
  getAllEvaluation,
  deleteEvaluation,
  updateEvaluation,
} = require("../controllers/evaluationController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create", createEvaluation);
routes.get("/all", getAllEvaluation);
routes.delete("/:id", deleteEvaluation);
routes.patch("/:id", updateEvaluation);

module.exports = routes;
