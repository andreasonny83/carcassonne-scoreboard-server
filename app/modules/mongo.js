/**
 * mongo.js
 *
 * Perform MongoDB connection and sync the games collection
 */
var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');
// configuration
var config = require('../../config/config.json');
// MongoDB connection URL
var url = process.env.MONGOLAB_URI || config.mongodb;

module.exports = {
  init: init,
  syncGame: syncGame,
  syncLog: syncLog
}

// Use connect method to connect to the Server
function init() {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    // console.log('Database connection established.');

    var collection = db.collection('games');

    collection.find().each(function(err, doc) {
      if (doc) {
        config.games[doc._id] = doc;
      }
      else {
        db.close();
      }
    });
  });
}

function syncGame(game_id) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    // console.log('Database connection established.');

    var collection = db.collection('games');
    collection.update(
      { _id: game_id },
      { $set: {
        name        : config.games[game_id].name,
        new_game    : config.games[game_id].new_game,
        admin       : config.games[game_id].admin,
        meeples     : config.games[game_id].meeples,
        max_players : config.games[game_id].max_players,
        players     : config.games[game_id].players,
        logs        : config.games[game_id].logs
      }},
      { upsert: true },
      function() {
        db.close();
      }
    );
  });
}

function syncLog(game_id) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    // console.log('Database connection established.');

    var collection = db.collection('games');

    collection.update(
      { _id: game_id },
      { $set: {
        logs : config.games[game_id].logs
      }},
      { upsert: true },
      function() {
        db.close();
      }
    );
  });
}
