const express = require("express");
const routes = express.Router();
// const generatePDF = require("../controllers/pdfController");
const {
  getReportsByCohort,
  getIndividualReport,
} = require("../controllers/reportController");
const authenticate = require("../middlewares/authenticate");

routes.get("/get", getReportsByCohort);
routes.get("/:id", getIndividualReport);
// routes.get("/pdf", (req, res, next) => {
//   const stream = res.writeHead(200, {
//     "Content-Type": "application/pdf",
//     "Content-Disposition": "attachment; filename=report.pdf",
//   });

//   generatePDF(
//     (chunk) => stream.write(chunk),
//     () => stream.end()
//   );
// });

module.exports = routes;
