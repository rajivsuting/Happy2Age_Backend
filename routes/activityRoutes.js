const express = require("express");
const routes = express.Router();

const {
  createActivity,
  getAllActivities,
  updateActivity,
  deleteActivity,
  searchActivityByName,
  getActivityById,
  getAllActivitiesForExport,
} = require("../controllers/activityController");
const authenticate = require("../middlewares/authenticate");

/**
 * @openapi
 * tags:
 *   - name: Activities
 */

/**
 * @openapi
 * /activity/create:
 *   post:
 *     summary: Create a new activity
 *     tags:
 *       - Activities
 *     description: This endpoint creates a new activity with a name, description, and optional references.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Workshop'
 *                 description: Name of the activity
 *               description:
 *                 type: string
 *                 example: 'A workshop on web development'
 *                 description: Description of the activity
 *               references:
 *                 type: string
 *                 example: 'https://example.com/resources'
 *                 description: Optional references related to the activity
 *     responses:
 *       201:
 *         description: Activity created successfully
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
 *                   example: Activity added successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     name:
 *                       type: string
 *                       example: 'Workshop'
 *                     description:
 *                       type: string
 *                       example: 'A workshop on web development'
 *                     references:
 *                       type: string
 *                       example: 'https://example.com/resources'
 *       400:
 *         description: Bad request, required fields missing
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
 *                   example: Name is required
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

routes.post("/create", authenticate, createActivity);

/**
 * @openapi
 * /activity/all:
 *   get:
 *     summary: Get all activities with pagination
 *     tags:
 *       - Activities
 *     description: This endpoint retrieves all activities with pagination support.
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number to retrieve (default is 1)
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: Number of activities per page (default is 10)
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved activities
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
 *                         example: 'Workshop'
 *                       description:
 *                         type: string
 *                         example: 'A workshop on web development'
 *                       references:
 *                         type: string
 *                         example: 'https://example.com/resources'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalActivities:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *       404:
 *         description: No activities found
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
 *                   example: No activities found
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
 *                   example: Validation error message
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

routes.get("/all", authenticate, getAllActivities);
routes.get("/export", authenticate, getAllActivitiesForExport);

/**
 * @openapi
 * /activity/edit/{id}:
 *   patch:
 *     summary: Update an activity by ID
 *     tags:
 *       - Activities
 *     description: This endpoint updates an existing activity based on the provided ID and request body.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the activity to update
 *         required: true
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
 *                 description: Name of the activity
 *                 example: 'New Workshop'
 *               description:
 *                 type: string
 *                 description: Description of the activity
 *                 example: 'A comprehensive workshop on advanced web development.'
 *               references:
 *                 type: string
 *                 description: Reference URL or details
 *                 example: 'https://example.com/new-resources'
 *     responses:
 *       200:
 *         description: Successfully updated the activity
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
 *                     _id:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     name:
 *                       type: string
 *                       example: 'New Workshop'
 *                     description:
 *                       type: string
 *                       example: 'A comprehensive workshop on advanced web development.'
 *                     references:
 *                       type: string
 *                       example: 'https://example.com/new-resources'
 *       404:
 *         description: Activity not found
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
 *                   example: Activity not found
 *       400:
 *         description: Bad request due to invalid input
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
 *                   example: Validation error message
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

routes.patch("/edit/:id", authenticate, updateActivity);

/**
 * @openapi
 * /activity/delete/{id}:
 *   delete:
 *     summary: Delete an activity by ID
 *     tags:
 *       - Activities
 *     description: This endpoint deletes an existing activity based on the provided ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the activity to delete
 *         required: true
 *         schema:
 *           type: string
 *           example: '605c72ef5b4f7e001f64d4e7'
 *     responses:
 *       200:
 *         description: Successfully deleted the activity
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
 *                   example: 'Sample Activity is deleted successfully'
 *       400:
 *         description: Invalid activity ID format
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
 *                   example: 'Invalid activity ID'
 *       404:
 *         description: Activity not found
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
 *                   example: 'Activity not found'
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

routes.delete("/delete/:id", authenticate, deleteActivity);

/**
 * @openapi
 * /activities/search:
 *   get:
 *     summary: Search for activities by name
 *     tags:
 *       - Activities
 *     description: This endpoint searches for activities that match the specified name query parameter.
 *     parameters:
 *       - name: name
 *         in: query
 *         description: The name of the activity to search for
 *         required: true
 *         schema:
 *           type: string
 *           example: 'Yoga'
 *     responses:
 *       200:
 *         description: Successfully retrieved activities matching the search criteria
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
 *                     example: 'Yoga'
 *                   description:
 *                     type: string
 *                     example: 'A physical activity focusing on flexibility and strength'
 *                   references:
 *                     type: string
 *                     example: 'https://example.com/yoga'
 *       400:
 *         description: Missing or invalid query parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Name query parameter is required'
 *       404:
 *         description: No activities found with the specified name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'No activities found'
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

routes.get("/activities/search", authenticate, searchActivityByName);

routes.get("/:id", authenticate, getActivityById);

module.exports = routes;
