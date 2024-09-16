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

routes.post("/create", authenticate, addMocaTest);
routes.get("/participant/:id", authenticate, getMocaTestByParticipantId);
routes.get("/all", authenticate, getAllMocaResult);
routes.patch("/edit/:id", authenticate, updateMocaResult);
routes.delete("/delete/:id", authenticate, deleteMocaResult);

module.exports = routes;
