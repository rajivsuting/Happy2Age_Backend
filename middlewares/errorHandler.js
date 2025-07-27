const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    return sendErrorDev(err, res);
  }

  let error = { ...err };
  error.message = err.message;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    error = new ApiError(
      400,
      `Duplicate field value: ${value}. Please use another value!`
    );
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => el.message);
    error = new ApiError(400, `Invalid input data. ${errors.join(". ")}`);
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token. Please log in again!");
  }

  // JWT expired
  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Your token has expired! Please log in again.");
  }

  return sendErrorProd(error, res);
};

const sendErrorDev = (err, res) => {
  logger.error("ERROR 💥", err);
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error("ERROR 💥", err);
  return res.status(500).json({
    success: false,
    status: "error",
    message: "Something went very wrong!",
  });
};

module.exports = errorHandler;
