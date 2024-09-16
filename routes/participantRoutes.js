const express = require("express");
const routes = express.Router();
const authenticate = require("../middlewares/authenticate");
const {
  createParticipant,
  getAllParticipants,
  searchParticipantsByName,
  updateParticipant,
} = require("../controllers/participantController");

/**
 * @openapi
 * tags:
 *   - name: Participants
 */

/**
 * @openapi
 * /participant/create:
 *   post:
 *     summary: Create a new participant
 *     tags:
 *       - Participants
 *     description: This endpoint creates a new participant and adds them to the specified cohort.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *                 description: Full name of the participant
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *                 description: Email address of the participant
 *               phone:
 *                 type: string
 *                 example: '1234567890'
 *                 description: 10-digit phone number of the participant
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: '1990-01-01'
 *                 description: Date of birth of the participant
 *               gender:
 *                 type: string
 *                 enum:
 *                   - Male
 *                   - Female
 *                   - Other
 *                 example: Male
 *                 description: Gender of the participant
 *               participantType:
 *                 type: string
 *                 enum:
 *                   - General
 *                   - Special Need
 *                 example: General
 *                 description: Type of the participant
 *               address:
 *                 type: object
 *                 properties:
 *                   addressLine:
 *                     type: string
 *                     example: '123 Main St'
 *                     description: Address line of the participant
 *                   city:
 *                     type: string
 *                     example: 'Springfield'
 *                     description: City of the participant
 *                   state:
 *                     type: string
 *                     example: 'IL'
 *                     description: State of the participant
 *                   pincode:
 *                     type: string
 *                     example: '62701'
 *                     description: 6-digit PIN code of the participant
 *               cohort:
 *                 type: string
 *                 example: '605c72ef5b4f7e001f64d4e7'
 *                 description: Object ID of the cohort
 *               briefBackground:
 *                 type: string
 *                 example: 'Participant has a background in engineering.'
 *                 description: Brief background of the participant
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: 'Jane Doe'
 *                     description: Name of the emergency contact
 *                   relationship:
 *                     type: string
 *                     example: 'Sister'
 *                     description: Relationship with the participant
 *                   phone:
 *                     type: string
 *                     example: '0987654321'
 *                     description: 10-digit phone number of the emergency contact
 *     responses:
 *       201:
 *         description: Participant created successfully
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
 *                   example: Participant added successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e8'
 *                     name:
 *                       type: string
 *                       example: 'John Doe'
 *                     email:
 *                       type: string
 *                       example: 'john.doe@example.com'
 *                     phone:
 *                       type: string
 *                       example: '1234567890'
 *                     dob:
 *                       type: string
 *                       format: date
 *                       example: '1990-01-01'
 *                     gender:
 *                       type: string
 *                       example: 'Male'
 *                     participantType:
 *                       type: string
 *                       example: 'General'
 *                     address:
 *                       type: object
 *                       properties:
 *                         addressLine:
 *                           type: string
 *                           example: '123 Main St'
 *                         city:
 *                           type: string
 *                           example: 'Springfield'
 *                         state:
 *                           type: string
 *                           example: 'IL'
 *                         pincode:
 *                           type: string
 *                           example: '62701'
 *                     cohort:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     briefBackground:
 *                       type: string
 *                       example: 'Participant has a background in engineering.'
 *                     emergencyContact:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: 'Jane Doe'
 *                         relationship:
 *                           type: string
 *                           example: 'Sister'
 *                         phone:
 *                           type: string
 *                           example: '0987654321'
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
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
 *                   example: No cohort found with id 605c72ef5b4f7e001f64d4e7
 *       409:
 *         description: Conflict, user with this email already exists
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
 *                   example: User with this email already exists
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

routes.post("/create", authenticate, createParticipant);

/**
 * @openapi
 * /participant/all:
 *   get:
 *     summary: Retrieve all participants
 *     tags:
 *       - Participants
 *     description: This endpoint retrieves all participants with pagination support. If `limit` is not provided, it returns all participants.
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
 *         description: Number of participants per page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved participants
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
 *                         example: '605c72ef5b4f7e001f64d4e8'
 *                       name:
 *                         type: string
 *                         example: 'John Doe'
 *                       email:
 *                         type: string
 *                         example: 'john.doe@example.com'
 *                       phone:
 *                         type: string
 *                         example: '1234567890'
 *                       dob:
 *                         type: string
 *                         format: date
 *                         example: '1990-01-01'
 *                       gender:
 *                         type: string
 *                         example: 'Male'
 *                       participantType:
 *                         type: string
 *                         example: 'General'
 *                       address:
 *                         type: object
 *                         properties:
 *                           addressLine:
 *                             type: string
 *                             example: '123 Main St'
 *                           city:
 *                             type: string
 *                             example: 'Springfield'
 *                           state:
 *                             type: string
 *                             example: 'IL'
 *                           pincode:
 *                             type: string
 *                             example: '62701'
 *                       cohort:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e7'
 *                       briefBackground:
 *                         type: string
 *                         example: 'Participant has a background in engineering.'
 *                       emergencyContact:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: 'Jane Doe'
 *                           relationship:
 *                             type: string
 *                             example: 'Sister'
 *                           phone:
 *                             type: string
 *                             example: '0987654321'
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 totalParticipants:
 *                   type: integer
 *                   example: 50
 *       404:
 *         description: No participants found
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
 *                   example: No participants found
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

routes.get("/all", authenticate, getAllParticipants);

/**
 * @openapi
 * /participant/name:
 *   get:
 *     summary: Search participants by name
 *     tags:
 *       - Participants
 *     description: This endpoint searches for participants by their name using a case-insensitive regular expression match.
 *     parameters:
 *       - name: name
 *         in: query
 *         description: Name of the participant to search for
 *         required: true
 *         schema:
 *           type: string
 *           example: John
 *     responses:
 *       200:
 *         description: Successfully retrieved participants
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
 *                         example: '605c72ef5b4f7e001f64d4e8'
 *                       name:
 *                         type: string
 *                         example: 'John Doe'
 *                       email:
 *                         type: string
 *                         example: 'john.doe@example.com'
 *                       phone:
 *                         type: string
 *                         example: '1234567890'
 *                       dob:
 *                         type: string
 *                         format: date
 *                         example: '1990-01-01'
 *                       gender:
 *                         type: string
 *                         example: 'Male'
 *                       participantType:
 *                         type: string
 *                         example: 'General'
 *                       address:
 *                         type: object
 *                         properties:
 *                           addressLine:
 *                             type: string
 *                             example: '123 Main St'
 *                           city:
 *                             type: string
 *                             example: 'Springfield'
 *                           state:
 *                             type: string
 *                             example: 'IL'
 *                           pincode:
 *                             type: string
 *                             example: '62701'
 *                       cohort:
 *                         type: string
 *                         example: '605c72ef5b4f7e001f64d4e7'
 *                       briefBackground:
 *                         type: string
 *                         example: 'Participant has a background in engineering.'
 *                       emergencyContact:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: 'Jane Doe'
 *                           relationship:
 *                             type: string
 *                             example: 'Sister'
 *                           phone:
 *                             type: string
 *                             example: '0987654321'
 *       400:
 *         description: Invalid name parameter
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
 *                   example: Invalid name parameter
 *       404:
 *         description: No participants found
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
 *                   example: No participants found
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

routes.get("/name", authenticate, searchParticipantsByName);

/**
 * @openapi
 * /participant/edit/{id}:
 *   patch:
 *     summary: Update a participant's details
 *     tags:
 *       - Participants
 *     description: This endpoint updates the details of a participant. It also handles changing the participant's cohort and updating related references if necessary.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the participant to be updated
 *         required: true
 *         schema:
 *           type: string
 *           example: '605c72ef5b4f7e001f64d4e8'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'John Doe'
 *                 description: Full name of the participant
 *               email:
 *                 type: string
 *                 example: 'john.doe@example.com'
 *                 description: Email address of the participant
 *               phone:
 *                 type: string
 *                 example: '1234567890'
 *                 description: 10-digit phone number of the participant
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: '1990-01-01'
 *                 description: Date of birth of the participant
 *               gender:
 *                 type: string
 *                 enum:
 *                   - Male
 *                   - Female
 *                   - Other
 *                 example: Male
 *                 description: Gender of the participant
 *               participantType:
 *                 type: string
 *                 enum:
 *                   - General
 *                   - Special Need
 *                 example: General
 *                 description: Type of the participant
 *               address:
 *                 type: object
 *                 properties:
 *                   addressLine:
 *                     type: string
 *                     example: '123 Main St'
 *                     description: Address line of the participant
 *                   city:
 *                     type: string
 *                     example: 'Springfield'
 *                     description: City of the participant
 *                   state:
 *                     type: string
 *                     example: 'IL'
 *                     description: State of the participant
 *                   pincode:
 *                     type: string
 *                     example: '62701'
 *                     description: 6-digit PIN code of the participant
 *               cohort:
 *                 type: string
 *                 example: '605c72ef5b4f7e001f64d4e7'
 *                 description: Object ID of the cohort
 *               briefBackground:
 *                 type: string
 *                 example: 'Participant has a background in engineering.'
 *                 description: Brief background of the participant
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: 'Jane Doe'
 *                     description: Name of the emergency contact
 *                   relationship:
 *                     type: string
 *                     example: 'Sister'
 *                     description: Relationship with the participant
 *                   phone:
 *                     type: string
 *                     example: '0987654321'
 *                     description: 10-digit phone number of the emergency contact
 *     responses:
 *       200:
 *         description: Successfully updated participant
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
 *                       example: '605c72ef5b4f7e001f64d4e8'
 *                     name:
 *                       type: string
 *                       example: 'John Doe'
 *                     email:
 *                       type: string
 *                       example: 'john.doe@example.com'
 *                     phone:
 *                       type: string
 *                       example: '1234567890'
 *                     dob:
 *                       type: string
 *                       format: date
 *                       example: '1990-01-01'
 *                     gender:
 *                       type: string
 *                       example: 'Male'
 *                     participantType:
 *                       type: string
 *                       example: 'General'
 *                     address:
 *                       type: object
 *                       properties:
 *                         addressLine:
 *                           type: string
 *                           example: '123 Main St'
 *                         city:
 *                           type: string
 *                           example: 'Springfield'
 *                         state:
 *                           type: string
 *                           example: 'IL'
 *                         pincode:
 *                           type: string
 *                           example: '62701'
 *                     cohort:
 *                       type: string
 *                       example: '605c72ef5b4f7e001f64d4e7'
 *                     briefBackground:
 *                       type: string
 *                       example: 'Participant has a background in engineering.'
 *                     emergencyContact:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: 'Jane Doe'
 *                         relationship:
 *                           type: string
 *                           example: 'Sister'
 *                         phone:
 *                           type: string
 *                           example: '0987654321'
 *       400:
 *         description: Bad request, invalid input data
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
 *                   example: Invalid input data
 *       404:
 *         description: Participant or cohort not found
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
 *                   example: Participant not found or No cohort found
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

routes.patch("/edit/:id", authenticate, updateParticipant);

module.exports = routes;
