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
const adminRoutes = require("./routes/adminRoutes");
const authenticate = require("./middlewares/authenticate");

const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "https://happy2age-frontend-gn8ln.ondigitalocean.app",
        "https://happy2age-backend-gn8ln.ondigitalocean.app",
        "https://admin.happy2age.com",
        "https://www.admin.happy2age.com",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
      ];

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        console.log(`CORS: Allowing origin: ${origin}`);
        return callback(null, true);
      }

      // Check if origin is a subdomain of happy2age.com
      if (origin.endsWith(".happy2age.com")) {
        console.log(`CORS: Allowing subdomain origin: ${origin}`);
        return callback(null, true);
      }

      // Special handling for Safari and mobile browsers
      if (origin.includes("safari") || origin.includes("webkit")) {
        console.log(`CORS: Allowing Safari/WebKit origin: ${origin}`);
        return callback(null, true);
      }

      // Check if origin is localhost for development
      if (
        process.env.NODE_ENV !== "production" &&
        origin.includes("localhost")
      ) {
        console.log(`CORS: Allowing localhost origin: ${origin}`);
        return callback(null, true);
      }

      console.log(`CORS: Blocking origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cookie",
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Add headers for Safari compatibility and dynamic origin handling
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://happy2age-frontend-gn8ln.ondigitalocean.app",
    "https://happy2age-backend-gn8ln.ondigitalocean.app",
    "https://admin.happy2age.com",
    "https://www.admin.happy2age.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin,X-Requested-With,Content-Type,Accept,Authorization"
    );
    res.header("Access-Control-Max-Age", "86400"); // 24 hours
    res.status(200).end();
    return;
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization"
  );
  next();
});

app.use(express.json());
app.use(cookieParser());

// CORS error handler
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    console.error("CORS Error:", {
      origin: req.headers.origin,
      method: req.method,
      url: req.url,
      userAgent: req.headers["user-agent"],
    });
    return res.status(403).json({
      error: "CORS: Origin not allowed",
      origin: req.headers.origin,
      message: "This origin is not allowed to access the API",
    });
  }
  next(err);
});

// auth
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

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
  console.log(`CORS Configuration:`);
  console.log(
    `- Allowed origins: https://happy2age-frontend-gn8ln.ondigitalocean.app, https://happy2age-backend-gn8ln.ondigitalocean.app, https://admin.happy2age.com, https://www.admin.happy2age.com`
  );
  console.log(`- Subdomain support: *.happy2age.com`);
  console.log(`- Development origins: localhost variants`);
  console.log(`- Credentials: enabled`);
  console.log(`- Methods: GET, POST, PUT, DELETE, OPTIONS`);
});
