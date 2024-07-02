const express = require("express");
const routes = express.Router();
const authenticate = require("../middlewares/authenticate");

const {
  addOxfordHappinessEvaluation,
  getHappinessScoresByParticipantId,
  getAllHappinessScores,
} = require("../controllers/oxfordHappinessController");

routes.post("/add", authenticate, addOxfordHappinessEvaluation);

routes.get("/participant/:participantId", authenticate, getHappinessScoresByParticipantId);

routes.get("/all", authenticate, getAllHappinessScores);
module.exports = routes;
