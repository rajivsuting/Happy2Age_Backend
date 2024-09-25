const express = require("express");
const routes = express.Router();

const {
  createEvaluation,
  getAllEvaluation,
  deleteEvaluation,
  updateEvaluation,
  searchEvaluationsByParticipantName,
} = require("../controllers/evaluationController");
const authenticate = require("../middlewares/authenticate");

/**
 * @openapi
 * tags:
 *   - name: Evaluations
 */
/**
 * @openapi
 * /evaluations/create:
 *   post:
 *     summary: Create a new evaluation
 *     tags:
 *       - Evaluations
 *     description: This endpoint creates a new evaluation record with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cohort:
 *                 type: string
 *                 description: The ID of the cohort
 *                 example: '605c72ef5b4f7e001f64d4e7'
 *               session:
 *                 type: string
 *                 description: The ID of the session
 *                 example: '605c72ef5b4f7e001f64d4e8'
 *               activity:
 *                 type: string
 *                 description: The ID of the activity
 *                 example: '605c72ef5b4f7e001f64d4e9'
 *               domain:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     subTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           content:
 *                             type: string
 *                             description: The content of the sub-topic
 *                             example: 'Algebra'
 *                           score:
 *                             type: number
 *                             description: The score associated with the sub-topic
 *                             example: 85
 *                     average:
 *                       type: number
 *                       description: The average score for the domain
 *                       example: 0
 *               participant:
 *                 type: string
 *                 description: The ID of the participant
 *                 example: '605c72ef5b4f7e001f64d4ea'
 *     responses:
 *       201:
 *         description: Evaluation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Evaluation added successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4eb'
 *                     cohort:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     session:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e8'
 *                     activity:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e9'
 *                     domain:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subTopics:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 content:
 *                                   type: string
 *                                   example: 'Algebra'
 *                                 score:
 *                                   type: number
 *                                   example: 85
 *                           average:
 *                             type: number
 *                             example: 80
 *                     participant:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4ea'
 *                     grandAverage:
 *                       type: number
 *                       example: 80.00
 *       400:
 *         description: Bad request, missing or invalid fields
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
 *                   example: 'All fields are required'
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

routes.post("/create", authenticate, createEvaluation);

/**
 * @openapi
 * /evaluations/all:
 *   get:
 *     summary: Get all evaluations
 *     tags:
 *       - Evaluations
 *     description: Fetches all evaluation records, including populated details for participants, cohorts, activities, and sessions.
 *     responses:
 *       200:
 *         description: List of evaluations retrieved successfully
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
 *                         example: '605c72ef5b4f7e001f64d4eb'
 *                       cohort:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: '605c72ef5b4f7e001f64d4e7'
 *                           name:
 *                             type: string
 *                             example: 'Cohort A'
 *                       participant:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: '605c72ef5b4f7e001f64d4ea'
 *                           name:
 *                             type: string
 *                             example: 'John Doe'
 *                       activity:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: '605c72ef5b4f7e001f64d4e9'
 *                           name:
 *                             type: string
 *                             example: 'Activity 1'
 *                       session:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: '605c72ef5b4f7e001f64d4e8'
 *                           name:
 *                             type: string
 *                             example: 'Session 1'
 *                       domain:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             subTopics:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   content:
 *                                     type: string
 *                                     example: 'Algebra'
 *                                   score:
 *                                     type: number
 *                                     example: 85
 *                             average:
 *                               type: number
 *                               example: 80.00
 *                       grandAverage:
 *                         type: number
 *                         example: 80.00
 *       404:
 *         description: No evaluations found
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
 *                   example: 'No evaluations found'
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

routes.get("/all", authenticate, getAllEvaluation);

/**
 * @openapi
 * /evaluations/{id}:
 *   delete:
 *     summary: Delete an evaluation by ID
 *     tags:
 *       - Evaluations
 *     description: Deletes a specific evaluation based on the provided ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the evaluation to delete
 *     responses:
 *       200:
 *         description: Evaluation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Evaluation deleted successfully'
 *       404:
 *         description: Evaluation not found
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
 *                   example: 'Evaluation not found'
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

routes.delete("/:id", authenticate, deleteEvaluation);

/**
 * @openapi
 * /evaluations/{id}:
 *   patch:
 *     summary: Update an evaluation by ID
 *     tags:
 *       - Evaluations
 *     description: Updates the details of a specific evaluation based on the provided ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the evaluation to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cohort:
 *                 type: string
 *                 description: The ID of the cohort
 *               session:
 *                 type: string
 *                 description: The ID of the session
 *               activity:
 *                 type: string
 *                 description: The ID of the activity
 *               domain:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     subTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                             format: float
 *                             description: Score for the sub-topic
 *               participant:
 *                 type: string
 *                 description: The ID of the participant
 *     responses:
 *       200:
 *         description: Evaluation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Evaluation updated successfully'
 *                 data:
 *                   type: object
 *                   description: Updated evaluation object
 *       400:
 *         description: Bad request, missing required fields
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
 *                   example: 'All fields are required'
 *       404:
 *         description: Evaluation not found
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
 *                   example: 'Evaluation not found'
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

routes.patch("/:id", authenticate, updateEvaluation);

routes.get("/search", authenticate, searchEvaluationsByParticipantName);

module.exports = routes;
