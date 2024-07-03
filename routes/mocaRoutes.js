const express = require("express");
const {
  addMocaTest,
  getMocaTestByParticipantId,
  getAllMocaResult,
} = require("../controllers/mocaController");
const authenticate = require("../middlewares/authenticate");
const routes = express.Router();

routes.post("/create", addMocaTest);
routes.get("/participant/:id", getMocaTestByParticipantId);
routes.get("/all", getAllMocaResult);

module.exports = routes;
