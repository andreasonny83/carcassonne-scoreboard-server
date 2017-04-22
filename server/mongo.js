/**
 * mongo.js
 *
 * Perform MongoDB connection and sync the games collection
 */
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// configuration
const config = require('../config/config.json');

// MongoDB connection URL
const url = process.env.MONGOLAB_URI ||
            process.env.NODE_ENV === 'test' ?
              config.db.testdb :
              config.db.mongodb;

console.log(url);

module.exports = {
  init: init,
  syncGame: syncGame,
  syncLog: syncLog,
  getGames: getGames,
  getGame: getGame
}

// Use connect method to connect to the Server
function init() {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log('Database connection established.');

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

function getItems(db, page, items_per_page, callback) {
  var output = {};

  db.collection('games')
    .find()
    .skip(items_per_page * page)
    .limit(items_per_page)
    .each(function(err, doc) {
      if (doc) {
        output[doc._id] = doc;
      }
      else {
        callback(output);
      }
    });
}

function getGames(page, items_per_page, callback) {
  page = page || 0;
  items_per_page = items_per_page || 10;

  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);

    getItems(db, page, items_per_page, function(res) {
      db.close();
      callback(res);
    });
  });
}

function getGame(game_id, callback) {
  if ( ! game_id ) return 0;

  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);

    db.collection('games')
      .findOne({_id:game_id}, function(err, item) {
        callback(item);
      });
  });
}
