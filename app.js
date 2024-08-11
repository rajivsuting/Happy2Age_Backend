const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv/config");
const cookieParser = require("cookie-parser");

const connectDB = require("./db/connectDb");
const participantRoutes = require("./routes/participantRoutes");
const cohortRoutes = require("./routes/cohortRoutes");
const activityRoutes = require("./routes/activityRoutes");
const domainRoutes = require("./routes/domainRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const evaluationRoutes = require("./routes/evaluationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const oxfordRoutes = require("./routes/oxfordHappinessRoutes");
const caspRoutes = require("./routes/caspRoutes");
const mocaRoutes = require("./routes/mocaRoutes");

// auth
const authRoutes = require("./routes/authRoutes");
const authenticate = require("./middlewares/authenticate");

const port = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(cookieParser());

// auth
app.use("/auth", authRoutes);
// app.use()
app.use("/participant", authenticate,participantRoutes);
app.use("/cohort", authenticate,cohortRoutes);
app.use("/activity", authenticate,activityRoutes);
app.use("/domain",authenticate, domainRoutes);
app.use("/session",authenticate, sessionRoutes);
app.use("/evaluation",authenticate, evaluationRoutes);
app.use("/report",authenticate, reportRoutes);
app.use("/oxford",authenticate, oxfordRoutes);
app.use("/casp",authenticate, caspRoutes);
app.use("/moca",authenticate, mocaRoutes);

connectDB();

app.listen(port, () => {
  console.log(`Connection is live at port no. ${port}`);
});
