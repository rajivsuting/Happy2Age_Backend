const express = require("express");
const routes = express.Router();
// const generatePDF = require("../controllers/pdfController");
const {
  getReportsByCohort,
  getIndividualReport,
} = require("../controllers/reportController");
const authenticate = require("../middlewares/authenticate");

/**
 * @openapi
 * tags:
 *   - name: Reports
 */

/**
 * @openapi
 * /report/get:
 *   get:
 *     summary: Get reports by cohort
 *     tags:
 *       - Reports
 *     description: Retrieves reports for a specific cohort within a date range, including attendance, domain scores, and averages.
 *     parameters:
 *       - in: query
 *         name: cohort
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the cohort
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date of the date range (e.g., 2024-01-01)
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date of the date range (e.g., 2024-01-31)
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: object
 *                   properties:
 *                     cohort:
 *                       type: string
 *                       description: Name of the cohort
 *                     attendance:
 *                       type: integer
 *                       description: Number of participants who were present
 *                     totalAttendance:
 *                       type: integer
 *                       description: Total number of attendance records
 *                     totalNumberOfSessions:
 *                       type: integer
 *                       description: Total number of sessions in the cohort
 *                     graphDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           domainName:
 *                             type: string
 *                             description: Name of the domain
 *                           centerAverage:
 *                             type: number
 *                             format: float
 *                             description: Average score for the domain across all sessions
 *                           numberOfSessions:
 *                             type: integer
 *                             description: Number of sessions for the domain
 *                     participantDomainScores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           domain:
 *                             type: string
 *                             description: Domain name
 *                           score:
 *                             type: number
 *                             format: float
 *                             description: Average score for the domain
 *                           participant:
 *                             type: string
 *                             description: Name of the participant
 *                     averageForCohort:
 *                       type: number
 *                       format: float
 *                       description: Average score for the cohort
 *                     evaluations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Array of evaluation details
 *       400:
 *         description: Bad request, missing required query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'Cohort is required'
 *       404:
 *         description: No records found for the specified cohort and date range
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'No records found within the specified date range'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */

routes.get("/get", getReportsByCohort);

/**
 * @openapi
 * /report/{id}:
 *   get:
 *     summary: Get individual report by participant
 *     tags:
 *       - Reports
 *     description: Retrieves a report for a specific participant within a date range, including attendance, domain scores, and averages.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the participant
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date of the date range (e.g., 2024-01-01)
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date of the date range (e.g., 2024-01-31)
 *     responses:
 *       200:
 *         description: Individual report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     participant:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         cohort:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                     attendance:
 *                       type: integer
 *                       description: Number of sessions attended by the participant
 *                     totalNumberOfSessions:
 *                       type: integer
 *                       description: Total number of sessions for the participant
 *                     graphDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           domainName:
 *                             type: string
 *                             description: Name of the domain
 *                           average:
 *                             type: number
 *                             format: float
 *                             description: Average score for the domain
 *                           participant:
 *                             type: string
 *                             description: Name of the participant
 *                           participantId:
 *                             type: string
 *                             description: ID of the participant
 *                           numberOfSessions:
 *                             type: integer
 *                             description: Number of sessions for the domain
 *                     averageForCohort:
 *                       type: number
 *                       format: float
 *                       description: Average score for the cohort
 *                 evaluations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Array of evaluation details
 *       400:
 *         description: Bad request, missing participant ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'Participant ID is required'
 *       404:
 *         description: No evaluations or participant found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     participantNotFound:
 *                       summary: Participant not found
 *                       value: 'Participant not found'
 *                     noRecordsFound:
 *                       summary: No records found within the specified date range
 *                       value: 'No records found within the specified date range'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */

routes.get("/:id", getIndividualReport);

module.exports = routes;
