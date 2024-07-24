const express = require("express");
const routes = express.Router();
const authenticate = require("../middlewares/authenticate");

const {
  addOxfordHappinessEvaluation,
  getHappinessScoresByParticipantId,
  getAllHappinessScores,
  deleteOxfordHappinessResult,
  editOxfordHappinessEvaluation,
} = require("../controllers/oxfordHappinessController");

routes.post("/add", addOxfordHappinessEvaluation);
routes.get("/participant/:participantId", getHappinessScoresByParticipantId);
routes.get("/all", getAllHappinessScores);
routes.put("/edit/:id", editOxfordHappinessEvaluation);
routes.delete("/delete/:id", deleteOxfordHappinessResult);

module.exports = routes;
