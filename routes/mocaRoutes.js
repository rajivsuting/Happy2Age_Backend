const express = require("express");
const {
  addMocaTest,
  getMocaTestByParticipantId,
  getAllMocaResult,
} = require("../controllers/mocaController");
const authenticate = require("../middlewares/authenticate");
const routes = express.Router();

routes.post("/create",authenticate, addMocaTest);
routes.get("/participant/:id",authenticate, getMocaTestByParticipantId);
routes.get("/all",authenticate, getAllMocaResult);

module.exports = routes;
