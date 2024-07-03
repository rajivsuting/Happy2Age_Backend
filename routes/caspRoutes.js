const express = require("express");
const routes = express.Router();

const {
  addCASP,
  getCASPByParticipantId,
  getCASPParticipantAll,
} = require("../controllers/caspController");
const authenticate = require("../middlewares/authenticate");
const {
  getAllHappinessScores,
} = require("../controllers/oxfordHappinessController");

routes.post("/add", addCASP);
routes.get("/participant/:participantId", getCASPByParticipantId);
routes.get("/all", getCASPParticipantAll);

module.exports = routes;
