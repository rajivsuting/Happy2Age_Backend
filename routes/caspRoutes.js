const express = require("express");
const routes = express.Router();

const {
  addCASP,
  getCASPByParticipantId,
  getCASPParticipantAll,
  getCASPById,
  updateCASPResult,
  deleteCASPResult,
} = require("../controllers/caspController");
const authenticate = require("../middlewares/authenticate");

routes.post("/add", authenticate, addCASP);
routes.get("/all", authenticate, getCASPParticipantAll);
routes.get("/participant/:participantId", authenticate, getCASPByParticipantId);
routes.get("/:id", authenticate, getCASPById);
routes.patch("/edit/:id", authenticate, updateCASPResult);
routes.delete("/delete/:id", authenticate, deleteCASPResult);

module.exports = routes;
