const express = require("express");
const routes = express.Router();

const {
  addCASP,
  getCASPByParticipantId,
  getCASPParticipantAll,
  updateCASPResult,
  deleteCASPResult,
} = require("../controllers/caspController");
const authenticate = require("../middlewares/authenticate");

routes.post("/add", addCASP);
routes.get("/participant/:participantId", getCASPByParticipantId);
routes.get("/all", getCASPParticipantAll);
routes.patch("/edit/:id", updateCASPResult);
routes.delete("/delete/:id", deleteCASPResult);

module.exports = routes;
