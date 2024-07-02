const express = require("express");
const routes = express.Router();

const {
  addCASP,
  getCASPByParticipantId,
  getCASPParticipantAll,
} = require("../controllers/caspController");
const authenticate = require("../middlewares/authenticate");
const { getAllHappinessScores } = require("../controllers/oxfordHappinessController");

routes.post("/add", authenticate, addCASP);
routes.get("/participant/:participantId", authenticate, getCASPByParticipantId);
routes.get("/all", authenticate, getCASPParticipantAll);

module.exports = routes;
