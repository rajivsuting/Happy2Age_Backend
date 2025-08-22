const express = require("express");
const routes = express.Router();

const {
  createDomain,
  getAllDomains,
  updateDomain,
  getDomainById,
  deleteDomain,
  getAllDomainsWithoutPagination,
} = require("../controllers/domainController");
const authenticate = require("../middlewares/authenticate");

/**
 * @openapi
 * tags:
 *   - name: Domains
 */

/**
 * @openapi
 * /domain/create:
 *   post:
 *     summary: Create a new domain
 *     tags:
 *       - Domains
 *     description: This endpoint creates a new domain with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the domain
 *                 example: 'Mathematics'
 *               category:
 *                 type: string
 *                 description: The category of the domain
 *                 enum: ['General', 'Special Need']
 *                 example: 'General'
 *               subTopics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                       description: The content of the sub-topic
 *                       example: 'Algebra'
 *                     score:
 *                       type: number
 *                       description: The score associated with the sub-topic
 *                       example: 85
 *               observation:
 *                 type: string
 *                 description: Additional observation or notes
 *                 example: 'Focus on algebraic equations'
 *               average:
 *                 type: number
 *                 description: The average score for the domain
 *                 example: 0
 *     responses:
 *       201:
 *         description: Domain created successfully
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
 *                   example: 'Domain added successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     name:
 *                       type: string
 *                       example: 'Mathematics'
 *                     category:
 *                       type: string
 *                       example: 'General'
 *                     subTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           content:
 *                             type: string
 *                             example: 'Algebra'
 *                           score:
 *                             type: number
 *                             example: 85
 *                     observation:
 *                       type: string
 *                       example: 'Focus on algebraic equations'
 *                     average:
 *                       type: number
 *                       example: 0
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

routes.post("/create", authenticate, createDomain);
/**
 * @openapi
 * /domain/all:
 *   get:
 *     summary: Retrieve all domains
 *     tags:
 *       - Domains
 *     description: This endpoint retrieves all domains. Optionally, you can filter domains by category.
 *     parameters:
 *       - name: category
 *         in: query
 *         description: Filter domains by category. Use "All" to get all domains, or specify "General" or "Special Need" to filter.
 *         required: false
 *         schema:
 *           type: string
 *           example: "General"
 *     responses:
 *       200:
 *         description: Domains retrieved successfully
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
 *                         example: 'Mathematics'
 *                       category:
 *                         type: string
 *                         example: 'General'
 *                       subTopics:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             content:
 *                               type: string
 *                               example: 'Algebra'
 *                             score:
 *                               type: number
 *                               example: 85
 *                       observation:
 *                         type: string
 *                         example: 'Focus on algebraic equations'
 *                       average:
 *                         type: number
 *                         example: 0
 *       404:
 *         description: No domains found
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
 *                   example: 'No domains found'
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

routes.get("/all", authenticate, getAllDomains);
routes.get("/all-no-pagination", authenticate, getAllDomainsWithoutPagination);

/**
 * @openapi
 * /domain/{id}:
 *   get:
 *     summary: Retrieve a domain by ID
 *     tags:
 *       - Domains
 *     description: This endpoint retrieves a specific domain by its ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the domain to retrieve
 *         required: true
 *         schema:
 *           type: string
 *           example: '605c72ef5b4f7e001f64d4e7'
 *     responses:
 *       200:
 *         description: Domain retrieved successfully
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
 *                       example: 'Mathematics'
 *                     category:
 *                       type: string
 *                       example: 'General'
 *                     subTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           content:
 *                             type: string
 *                             example: 'Algebra'
 *                           score:
 *                             type: number
 *                             example: 85
 *                     observation:
 *                       type: string
 *                       example: 'Focus on algebraic equations'
 *                     average:
 *                       type: number
 *                       example: 0
 *       404:
 *         description: Domain not found
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
 *                   example: 'Domain not found'
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

routes.get("/:id", authenticate, getDomainById);

/**
 * @openapi
 * /domain/edit/{id}:
 *   patch:
 *     summary: Update an existing domain
 *     tags:
 *       - Domains
 *     description: This endpoint updates an existing domain by its ID with the provided details.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the domain to update
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
 *                 description: The name of the domain
 *                 example: 'Mathematics'
 *               category:
 *                 type: string
 *                 description: The category of the domain
 *                 enum: ['General', 'Special Need']
 *                 example: 'General'
 *               subTopics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                       description: The content of the sub-topic
 *                       example: 'Algebra'
 *                     score:
 *                       type: number
 *                       description: The score associated with the sub-topic
 *                       example: 85
 *     responses:
 *       200:
 *         description: Domain updated successfully
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
 *                       example: 'Mathematics'
 *                     category:
 *                       type: string
 *                       example: 'General'
 *                     subTopics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           content:
 *                             type: string
 *                             example: 'Algebra'
 *                           score:
 *                             type: number
 *                             example: 85
 *       404:
 *         description: Domain not found
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
 *                   example: 'Domain not found'
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

routes.patch("/edit/:id", authenticate, updateDomain);

/**
 * @openapi
 * /domains/{id}:
 *   delete:
 *     summary: Delete a domain
 *     tags:
 *       - Domains
 *     description: This endpoint deletes a domain by its ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the domain to delete
 *         required: true
 *         schema:
 *           type: string
 *           example: '605c72ef5b4f7e001f64d4e7'
 *     responses:
 *       200:
 *         description: Domain deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Domain deleted successfully'
 *       404:
 *         description: Domain not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Domain not found'
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

routes.delete("/domains/:id", authenticate, deleteDomain);

module.exports = routes;
