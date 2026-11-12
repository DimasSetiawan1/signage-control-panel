const express = require('express');
const deviceController = require('../controllers/deviceController');
const playlistController = require('../controllers/playlistController');
const pushController = require('../controllers/pushController');
const { validateBody } = require('../middlewares/validateMiddleware');
const {
  createDeviceSchema,
  updateDeviceSchema,
  updatePlaylistSchema,
  pushCommandSchema,
} = require('shared');

const router = express.Router();

router.get('/', deviceController.getAll);
router.post('/', validateBody(createDeviceSchema), deviceController.create);
router.get('/:id', deviceController.getById);
router.put('/:id', validateBody(updateDeviceSchema), deviceController.update);
router.delete('/:id', deviceController.delete);

// Playlist endpoints
router.get('/:id/playlist', playlistController.getPlaylist);
router.put('/:id/playlist', validateBody(updatePlaylistSchema), playlistController.updatePlaylist);

// Push command endpoint
router.post('/:id/push', validateBody(pushCommandSchema), pushController.push);

module.exports = router;

