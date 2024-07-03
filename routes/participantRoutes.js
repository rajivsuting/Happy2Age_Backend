const express = require("express");
const routes = express.Router();
const authenticate = require("../middlewares/authenticate");
const {
  createParticipant,
  getAllParticipants,
  searchParticipantsByName,
  updateParticipant,
} = require("../controllers/participantController");

routes.post("/create",authenticate, createParticipant);
routes.get("/all",authenticate, getAllParticipants);
routes.get("/name",authenticate, searchParticipantsByName);
routes.patch("/edit/:id",authenticate, updateParticipant);

module.exports = routes;
