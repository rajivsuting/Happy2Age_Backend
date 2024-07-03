const express = require("express");
const routes = express.Router();
const authenticate = require("../middlewares/authenticate");

const {
  addOxfordHappinessEvaluation,
  getHappinessScoresByParticipantId,
  getAllHappinessScores,
} = require("../controllers/oxfordHappinessController");

routes.post("/add", addOxfordHappinessEvaluation);

routes.get("/participant/:participantId", getHappinessScoresByParticipantId);

routes.get("/all", getAllHappinessScores);

module.exports = routes;
