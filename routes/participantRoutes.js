const express = require("express");
const routes = express.Router();
const authenticate = require("../middlewares/authenticate");
const {
  createParticipant,
  getAllParticipants,
  searchParticipantsByName,
  updateParticipant,
} = require("../controllers/participantController");

routes.post("/create", createParticipant);
routes.get("/all", getAllParticipants);
routes.get("/name", searchParticipantsByName);
routes.patch("/edit/:id", updateParticipant);

module.exports = routes;
