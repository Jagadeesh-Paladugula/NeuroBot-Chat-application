import express from 'express';
import { createMessage } from '../controllers/messageController.js';
import { authMiddleware } from '../utils/auth.js';

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Create a new message in a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - text
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 description: Message text content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: URL of the attachment
 *                     type:
 *                       type: string
 *                       enum: [image, file, video, audio]
 *                       description: Type of attachment
 *                     name:
 *                       type: string
 *                       description: Name of the attachment
 *                 description: Optional array of attachments
 *               parentMessageId:
 *                 type: string
 *                 description: ID of the parent message (for replies)
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs mentioned in the message
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied (user is not a participant)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createMessage);

export default router;

