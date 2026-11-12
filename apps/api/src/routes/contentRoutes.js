const express = require('express');
const contentController = require('../controllers/contentController');
const { handleUpload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.get('/', contentController.getAll);
router.post('/', handleUpload('file'), contentController.create);
router.get('/:id', contentController.getById);
router.put('/:id', handleUpload('file'), contentController.update);
router.delete('/:id', contentController.delete);

module.exports = router;

