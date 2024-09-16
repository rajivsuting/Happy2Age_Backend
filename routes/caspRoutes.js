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

routes.post("/add", authenticate, addCASP);
routes.get("/participant/:participantId", authenticate, getCASPByParticipantId);
routes.get("/all", authenticate, getCASPParticipantAll);
routes.patch("/edit/:id", authenticate, updateCASPResult);
routes.delete("/delete/:id", authenticate, deleteCASPResult);

module.exports = routes;
