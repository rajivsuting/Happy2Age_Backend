const express = require("express");

const routes = express.Router();

const {
  register,
  login,
  allUser,
  deleteUser,
  logout,
  refreshToken,
} = require("../controllers/authController");
const authenticate = require("../middlewares/authenticate");

routes.post("/register", register);
routes.post("/login", login);
routes.post("/logout", logout);
routes.get("/alluser", allUser);
routes.post("/refresh", refreshToken);
routes.get("/verify", authenticate, (req, res) => {
  res.status(200).json({ success: true, message: "User verified" });
});
routes.delete("/deleteuser/:adminid", deleteUser);

module.exports = routes;
