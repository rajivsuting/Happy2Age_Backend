const express = require("express");

const routes = express.Router();

const { register, login, allUser, deleteUser, logout } = require("../controllers/authController");

routes.post("/register", register);
routes.post("/login", login);
routes.post("/logout", logout);
routes.get("/alluser", allUser);
routes.delete("/deleteuser/:adminid", deleteUser);

module.exports = routes;
