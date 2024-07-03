const express = require("express");
const routes = express.Router();

const {
  createSession,
  getAllSessions,
  getAllParticipantsAttendance,
  getAttendanceByCohort,
} = require("../controllers/sessionController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create",authenticate, createSession);
routes.get("/all",authenticate, getAllSessions);
routes.get("/attendance",authenticate, getAllParticipantsAttendance);
routes.get("/attendencecohort/:cohortId",authenticate, getAttendanceByCohort);

module.exports = routes;
