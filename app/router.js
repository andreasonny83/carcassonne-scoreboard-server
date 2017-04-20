const express = require('express');
const mongo = require('./modules/mongo');

const router = express.Router();

let pkginfo;

module.exports = function(_pkginfo) {
  pkginfo = _pkginfo;

  return router;
};

// render the app
router.get('/status', function(req, res) {
  return res.status(200).json({
    app: pkginfo.exports.name,
    version: pkginfo.exports.version,
    status: 200,
    message: 'OK - ' + Math.random().toString(36).substr(3, 8)
  });
});

// render the games in the database sorted by pages
router.get('/gamesinfo', function(req, res) {
  var page = req.query.page ? req.query.page : 0;
  var items_per_page = 5;

  mongo.getGames(page, items_per_page, function(data) {
    return res.status(200).json({
      games: data
    });
  });
});

// return the selected game, if present in the database
router.get('/gamesinfo/:game_id', function(req, res) {
  mongo.getGame(req.params.game_id, function(data) {
    return res.status(200).json({
      games: data
    });
  });
});

// redirect all others requests to the 404 page
router.get('*', function(req, res) {
  res.sendFile( __dirname + '/404.html');
});
