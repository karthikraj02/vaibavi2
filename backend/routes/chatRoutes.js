const express = require('express');
const { handleChat, getChats, getChat, renameChat, deleteChat } = require('../controllers/chatController');

const router = express.Router();

router.get('/', getChats);
router.get('/:id', getChat);
router.put('/:id', renameChat);
router.delete('/:id', deleteChat);
router.post('/', handleChat);

module.exports = router;
