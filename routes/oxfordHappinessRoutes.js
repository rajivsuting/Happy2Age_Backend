const express = require("express");
const routes = express.Router();
const { authenticate } = require("../middlewares/authenticate");

const {
  addOxfordHappinessEvaluation,
  getHappinessScoresByParticipantId,
  getAllHappinessScores,
  getHappinessScoreById,
  deleteOxfordHappinessResult,
  editOxfordHappinessEvaluation,
} = require("../controllers/oxfordHappinessController");

routes.post("/add", authenticate, addOxfordHappinessEvaluation);
routes.get("/all", authenticate, getAllHappinessScores);
routes.get(
  "/participant/:participantId",
  authenticate,
  getHappinessScoresByParticipantId
);
routes.get("/:id", authenticate, getHappinessScoreById);
routes.put("/edit/:id", authenticate, editOxfordHappinessEvaluation);
routes.delete("/delete/:id", authenticate, deleteOxfordHappinessResult);

module.exports = routes;
