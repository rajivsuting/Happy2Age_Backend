const express = require("express");
const path = require("path");
const fs = require("fs");

const cors = require("cors");
require("dotenv/config");
const cookieParser = require("cookie-parser");

const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Happy2Age API",
      version: "1.0.0",
      description: "API for managing Happy2Age data",
    },
    servers: [
      {
        url: "https://happy2age-backend-gn8ln.ondigitalocean.app",
        description: "Production server",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsDoc(options);

const app = express();

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

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
const scheduledActivityRoutes = require("./routes/scheduledActivityRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// auth
const authRoutes = require("./routes/authRoutes");
const authenticate = require("./middlewares/authenticate");

const port = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(cookieParser());

// auth
app.use("/auth", authRoutes);

// app.use(authenticate)
app.use("/participant", participantRoutes);
app.use("/cohort", cohortRoutes);
app.use("/activity", activityRoutes);
app.use("/domain", domainRoutes);
app.use("/session", sessionRoutes);
app.use("/evaluation", evaluationRoutes);
app.use("/report", reportRoutes);
app.use("/oxford-happiness", oxfordRoutes);
app.use("/casp", caspRoutes);
app.use("/moca", mocaRoutes);
app.use("/scheduled-activity", scheduledActivityRoutes);
app.use("/dashboard", dashboardRoutes);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads", "reports");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files with proper headers
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".pdf")) {
        res.set("Content-Type", "application/pdf");
        res.set("Content-Disposition", "inline");
      }
    },
  })
);

connectDB();

app.listen(port, () => {
  console.log(`Connection is live at port no. ${port}`);
});
