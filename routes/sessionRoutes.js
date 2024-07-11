const express = require("express");
const routes = express.Router();

const {
  createSession,
  getAllSessions,
  getAllParticipantsAttendance,
  getAttendanceByCohort,
  editSession,
  searchSessionsWithDateRange,
} = require("../controllers/sessionController");
const authenticate = require("../middlewares/authenticate");

routes.post("/create", createSession);
routes.get("/all", getAllSessions);
routes.get("/attendance", getAllParticipantsAttendance);
routes.get("/attendencecohort/:cohortId", getAttendanceByCohort);
routes.patch("/edit/:id", editSession);
routes.get("/sessions/search", searchSessionsWithDateRange);

module.exports = routes;
