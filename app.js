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

const port = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(cookieParser());

// auth

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});

app.use("/auth", authRoutes);
app.use("/participant", participantRoutes);
app.use("/cohort", cohortRoutes);
app.use("/activity", activityRoutes);
app.use("/domain", domainRoutes);
app.use("/session", sessionRoutes);
app.use("/evaluation", evaluationRoutes);
app.use("/report", reportRoutes);
app.use("/oxford", oxfordRoutes);
app.use("/casp", caspRoutes);
app.use("/moca", mocaRoutes);

connectDB();

app.listen(port, () => {
  console.log(`Connection is live at port no. ${port}`);
});
