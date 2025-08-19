const express = require("express");
const routes = express.Router();

const {
  createSession,
  getAllSessions,
  getAllParticipantsAttendance,
  getAttendanceByCohort,
  editSession,
  searchSessionsWithDateRange,
  searchSessionByName,
  deleteSession,
  getSessionById,
  getAttendanceByParticipantId,
} = require("../controllers/sessionController");
const authenticate = require("../middlewares/authenticate");

/**
 * @openapi
 * tags:
 *   - name: Sessions
 */

/**
 * @openapi
 * /session/create:
 *   post:
 *     summary: Create a new session
 *     tags:
 *       - Sessions
 *     description: This endpoint creates a new session and records attendance for participants in the specified cohort.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the session
 *                 example: 'Math Workshop'
 *               cohort:
 *                 type: string
 *                 description: The ID of the cohort for the session
 *                 example: '605c72ef5b4f7e001f64d4e7'
 *               activity:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: The IDs of activities associated with the session
 *                   example: ['605c72ef5b4f7e001f64d4e7', '605c72ef5b4f7e001f64d4e8']
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     participantId:
 *                       type: string
 *                       description: The ID of the participant
 *                       example: '605c72ef5b4f7e001f64d4e9'
 *               numberOfMins:
 *                 type: number
 *                 description: The duration of the session in minutes
 *                 example: 60
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: The date and time of the session
 *                 example: '2024-09-20T10:00:00Z'
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: '605c72ef5b4f7e001f64d4f0'
 *                 name:
 *                   type: string
 *                   example: 'Math Workshop'
 *                 cohort:
 *                   type: string
 *                   example: '605c72ef5b4f7e001f64d4e7'
 *                 activity:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: '605c72ef5b4f7e001f64d4e7'
 *                 participants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       participantId:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e9'
 *                 numberOfMins:
 *                   type: number
 *                   example: 60
 *                 date:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-09-20T10:00:00Z'
 *                 attendance:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: '605c72ef5b4f7e001f64d4f1'
 *       404:
 *         description: Cohort not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Cohort not found'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */

routes.post("/create", authenticate, createSession);

/**
 * @openapi
 * /session/all:
 *   get:
 *     summary: Retrieve all sessions with pagination
 *     tags:
 *       - Sessions
 *     description: This endpoint retrieves all sessions with pagination and populates related data such as cohorts, participants, and activities.
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           description: Page number for pagination
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           description: Number of sessions per page for pagination
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4f2'
 *                       name:
 *                         type: string
 *                         example: 'Math Workshop'
 *                       cohort:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: '605c72ef5b4f7e001f64d4e7'
 *                           name:
 *                             type: string
 *                             example: 'Cohort A'
 *                           participants:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                   example: '605c72ef5b4f7e001f64d4e9'
 *                                 name:
 *                                   type: string
 *                                   example: 'John Doe'
 *                       activity:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: '605c72ef5b4f7e001f64d4e8'
 *                             name:
 *                               type: string
 *                               example: 'Algebra Test'
 *                       participants:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: '605c72ef5b4f7e001f64d4e9'
 *                       numberOfMins:
 *                         type: number
 *                         example: 60
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: '2024-09-20T10:00:00Z'
 *       400:
 *         description: Invalid page or limit value
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
 *                   example: 'Invalid page or limit value'
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

routes.get("/all", authenticate, getAllSessions);

/**
 * @openapi
 * /attendance:
 *   get:
 *     summary: Retrieve all participants' attendance with pagination
 *     tags:
 *       - Sessions
 *     description: This endpoint retrieves all participants' attendance records with pagination and includes details about each session and participant.
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           description: Page number for pagination
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           description: Number of records per page for pagination
 *     responses:
 *       200:
 *         description: Attendance records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       participantName:
 *                         type: string
 *                         example: 'John Doe'
 *                       sessions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: 'Math Workshop'
 *                             present:
 *                               type: boolean
 *                               example: true
 *                             date:
 *                               type: string
 *                               format: date-time
 *                               example: '2024-09-20T10:00:00Z'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
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
 *                 error:
 *                   type: string
 *                   example: 'Internal server error'
 */

routes.get("/attendance", authenticate, getAllParticipantsAttendance);

/**
 * @openapi
 * /attendencecohort/{cohortId}:
 *   get:
 *     summary: Retrieve all participants' attendance for a specific cohort
 *     tags:
 *       - Sessions
 *     description: This endpoint retrieves all attendance records for a specified cohort and provides details about each participant and their sessions.
 *     parameters:
 *       - name: cohortId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           description: ID of the cohort for which to retrieve attendance records
 *     responses:
 *       200:
 *         description: Attendance records for the cohort retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       participantName:
 *                         type: string
 *                         example: 'John Doe'
 *                       sessions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: 'Math Workshop'
 *                             present:
 *                               type: boolean
 *                               example: true
 *                             date:
 *                               type: string
 *                               format: date-time
 *                               example: '2024-09-20T10:00:00Z'
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
 *                 error:
 *                   type: string
 *                   example: 'Internal server error'
 */

routes.get("/attendencecohort/:cohortId", authenticate, getAttendanceByCohort);

/**
 * @openapi
 * /edit/{id}:
 *   patch:
 *     summary: Edit an existing session
 *     tags:
 *       - Sessions
 *     description: This endpoint updates the details of an existing session, including its name, cohort, activities, date, participants, and duration.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           description: ID of the session to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the session
 *                 example: 'Advanced Algebra Workshop'
 *               cohort:
 *                 type: string
 *                 description: The ID of the cohort associated with the session
 *                 example: '605c72ef5b4f7e001f64d4e7'
 *               activity:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: List of activity IDs related to the session
 *                   example: ['605c72ef5b4f7e001f64d4e7']
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: The date and time of the session
 *                 example: '2024-09-20T10:00:00Z'
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     participantId:
 *                       type: string
 *                       description: The ID of the participant
 *                       example: '605c72ef5b4f7e001f64d4e8'
 *               numberOfMins:
 *                 type: number
 *                 description: The duration of the session in minutes
 *                 example: 90
 *     responses:
 *       200:
 *         description: Session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: '605c72ef5b4f7e001f64d4e7'
 *                 name:
 *                   type: string
 *                   example: 'Advanced Algebra Workshop'
 *                 cohort:
 *                   type: string
 *                   example: '605c72ef5b4f7e001f64d4e7'
 *                 activity:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: '605c72ef5b4f7e001f64d4e7'
 *                 date:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-09-20T10:00:00Z'
 *                 participants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       participantId:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e8'
 *                 numberOfMins:
 *                   type: number
 *                   example: 90
 *       400:
 *         description: Bad request due to missing or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Cohort and participants are required'
 *       404:
 *         description: Session or cohort not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Session not found'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */

routes.patch("/edit/:id", authenticate, editSession);

/**
 * @openapi
 * /sessions/search:
 *   get:
 *     summary: Search for sessions within a specified date range
 *     tags:
 *       - Sessions
 *     description: This endpoint retrieves sessions that fall within the given date range.
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           description: The start date of the range for searching sessions
 *           example: '2024-09-01T00:00:00Z'
 *       - name: endDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           description: The end date of the range for searching sessions
 *           example: '2024-09-30T23:59:59Z'
 *     responses:
 *       200:
 *         description: Sessions found within the specified date range
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: '605c72ef5b4f7e001f64d4e7'
 *                   name:
 *                     type: string
 *                     example: 'Advanced Algebra Workshop'
 *                   cohort:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e7'
 *                       name:
 *                         type: string
 *                         example: 'Algebra Cohort'
 *                   date:
 *                     type: string
 *                     format: date-time
 *                     example: '2024-09-20T10:00:00Z'
 *                   numberOfMins:
 *                     type: number
 *                     example: 90
 *                   participants:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         participantId:
 *                           type: string
 *                           example: '605c72ef5b4f7e001f64d4e8'
 *       400:
 *         description: Missing or invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Both startDate and endDate query parameters are required'
 *       404:
 *         description: No sessions found within the specified date range
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'No sessions found within the specified date range'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */

routes.get("/sessions/search", authenticate, searchSessionsWithDateRange);
/**
 * @openapi
 * /sessions/name:
 *   get:
 *     summary: Search sessions by name
 *     tags:
 *       - Sessions
 *     description: This endpoint retrieves sessions that match the specified name.
 *     parameters:
 *       - name: name
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           description: The name of the session to search for
 *           example: 'Math Workshop'
 *     responses:
 *       200:
 *         description: Sessions found with the specified name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e7'
 *                       name:
 *                         type: string
 *                         example: 'Math Workshop'
 *                       cohort:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: '605c72ef5b4f7e001f64d4e7'
 *                           name:
 *                             type: string
 *                             example: 'Math Cohort'
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: '2024-09-20T10:00:00Z'
 *                       numberOfMins:
 *                         type: number
 *                         example: 120
 *                       participants:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             participantId:
 *                               type: string
 *                               example: '605c72ef5b4f7e001f64d4e8'
 *       400:
 *         description: Missing or invalid query parameter
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
 *                   example: 'Session name is required'
 *       404:
 *         description: No sessions found with the specified name
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
 *                   example: 'No sessions found'
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

routes.get("/name", authenticate, searchSessionByName);

routes.get(
  "/attendance/participant/:participantId",
  authenticate,
  getAttendanceByParticipantId
);

routes.delete("/delete/:id", authenticate, deleteSession);
routes.get("/:id", authenticate, getSessionById);

module.exports = routes;
