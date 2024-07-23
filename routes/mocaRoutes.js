const express = require("express");
const {
  addMocaTest,
  getMocaTestByParticipantId,
  getAllMocaResult,
  updateMocaResult,
  deleteMocaResult,
} = require("../controllers/mocaController");
const authenticate = require("../middlewares/authenticate");
const routes = express.Router();

routes.post("/create", addMocaTest);
routes.get("/participant/:id", getMocaTestByParticipantId);
routes.get("/all", getAllMocaResult);
routes.patch("/edit/:id", updateMocaResult);
routes.delete("/delete/:id", deleteOxfordHappinessResult);

module.exports = routes;
