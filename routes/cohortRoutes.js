const express = require("express");
const routes = express.Router();

const {
  createCohort,
  getAllCohorts,
  updateCohort,
  deleteCohort,
  searchCohortByName,
} = require("../controllers/cohortController");
const authenticate = require("../middlewares/authenticate");

/**
 * @openapi
 * tags:
 *   - name: Centers
 */

/**
 * @openapi
 * /cohort/create:
 *   post:
 *     summary: Create a new cohort
 *     tags:
 *       - Centers
 *     description: This endpoint creates a new cohort with a name and a list of participants. Validates that all participant IDs exist before creating the cohort.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Engineering Cohort'
 *                 description: Name of the cohort
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['605c72ef5b4f7e001f64d4e8', '605c72ef5b4f7e001f64d4e9']
 *                 description: Array of participant IDs to be included in the cohort
 *     responses:
 *       201:
 *         description: Cohort created successfully
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
 *                   example: Cohort added successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     name:
 *                       type: string
 *                       example: 'Engineering Cohort'
 *                     participants:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ['605c72ef5b4f7e001f64d4e8', '605c72ef5b4f7e001f64d4e9']
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *       400:
 *         description: Bad request, validation errors
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
 *                   example: Name and participants are required fields, and participants must be an array
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
 *                   example: Internal server error
 */

routes.post("/create", createCohort);

/**
 * @openapi
 * /cohort/all:
 *   get:
 *     summary: Get all cohorts
 *     tags:
 *       - Centers
 *     description: Retrieve a paginated list of all cohorts with their participants and sessions. Supports pagination with `page` and `limit` query parameters.
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: Number of cohorts to retrieve per page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved cohorts
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
 *                       _id:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e7'
 *                       name:
 *                         type: string
 *                         example: 'Engineering Cohort'
 *                       participants:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: '605c72ef5b4f7e001f64d4e8'
 *                             name:
 *                               type: string
 *                               example: 'John Doe'
 *                             email:
 *                               type: string
 *                               example: 'john.doe@example.com'
 *                         description: List of participants in the cohort
 *                       sessions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: '605c72ef5b4f7e001f64d4e9'
 *                             topic:
 *                               type: string
 *                               example: 'Introduction to Engineering'
 *                         description: List of sessions in the cohort
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *       404:
 *         description: No cohorts found
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
 *                   example: No cohorts found
 *       400:
 *         description: Bad request, invalid query parameters
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
 *                   example: Invalid ID format
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
 *                   example: Internal server error
 */

routes.get("/all", getAllCohorts);

/**
 * @openapi
 * /cohort/name:
 *   get:
 *     summary: Search cohorts by name
 *     tags:
 *       - Centers
 *     description: Search for cohorts by name. The search is case-insensitive and supports partial matches.
 *     parameters:
 *       - name: name
 *         in: query
 *         description: The name of the cohort to search for
 *         required: true
 *         schema:
 *           type: string
 *           example: 'Engineering'
 *     responses:
 *       200:
 *         description: Successfully retrieved cohorts matching the search criteria
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
 *                       _id:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e7'
 *                       name:
 *                         type: string
 *                         example: 'Engineering Cohort'
 *                       participants:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: '605c72ef5b4f7e001f64d4e8'
 *                             name:
 *                               type: string
 *                               example: 'John Doe'
 *                             email:
 *                               type: string
 *                               example: 'john.doe@example.com'
 *                         description: List of participants in the cohort
 *                       sessions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: '605c72ef5b4f7e001f64d4e9'
 *                             topic:
 *                               type: string
 *                               example: 'Introduction to Engineering'
 *                         description: List of sessions in the cohort
 *       400:
 *         description: Bad request, missing or invalid query parameters
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
 *                   example: Cohort name is required
 *       404:
 *         description: No cohorts found with the specified name
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
 *                   example: No cohorts found with the specified name
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
 *                   example: Internal server error
 */

routes.get("/name", searchCohortByName);

/**
 * @openapi
 * /cohort/edit/{id}:
 *   patch:
 *     summary: Update a cohort by ID
 *     tags:
 *       - Centers
 *     description: Updates the details of a cohort, including the name and participants. If participants are updated, the cohort reference is removed from participants no longer in the cohort.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the cohort to update
 *         schema:
 *           type: string
 *           example: '605c72ef5b4f7e001f64d4e7'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Advanced Engineering Cohort'
 *                 description: New name for the cohort
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: '605c72ef5b4f7e001f64d4e8'
 *                   description: List of participant IDs for the cohort
 *     responses:
 *       200:
 *         description: Successfully updated the cohort
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
 *                     _id:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     name:
 *                       type: string
 *                       example: 'Advanced Engineering Cohort'
 *                     participants:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e8'
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e9'
 *       400:
 *         description: Bad request, invalid ID or request body
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
 *                   example: Invalid request data
 *       404:
 *         description: Cohort not found
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
 *                   example: Cohort not found
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
 *                   example: Internal server error
 */

routes.patch("/edit/:id", updateCohort);

/**
 * @openapi
 * /cohort/delete/{id}:
 *   delete:
 *     summary: Delete a cohort by ID
 *     tags:
 *       - Centers
 *     description: Deletes a cohort and all associated references. Checks if the provided ID is valid and exists.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the cohort to delete
 *         schema:
 *           type: string
 *           example: '605c72ef5b4f7e001f64d4e7'
 *     responses:
 *       200:
 *         description: Successfully deleted the cohort
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
 *                   example: Cohort deleted successfully
 *       400:
 *         description: Bad request, invalid cohort ID
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
 *                   example: Invalid cohort ID
 *       404:
 *         description: Cohort not found
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
 *                   example: Cohort not found
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
 *                   example: Internal server error
 */

routes.delete("/delete/:id", deleteCohort);

module.exports = routes;
