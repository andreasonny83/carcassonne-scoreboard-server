/**
 * mongo.js
 *
 * Perform MongoDB connection and sync the games collection
 */
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const assert = require('assert');
const _log = require('./log');

// configuration
const config = require('../config/config');

let url;

var gamesSchema = mongoose.Schema({
  name: String
});

var Games = mongoose.model('Games', gamesSchema);

var gameSchema = mongoose.Schema({
  id: String,
  name: String,
  new_game: Boolean,
  admin: String,
  meeples: [],
  max_players: Number,
  players: Number,
  logs: []
});

var Game = mongoose.model('Game', gameSchema);

module.exports = {
  init: _init,
  connect: connect,
  syncGame: syncGame,
  syncLog: syncLog,
  getGames: getGames,
  getGame: getGame
}

// Use connect method to connect to the Server
function _init(env) {
  url = config.mongoURI[env];

  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    _log('Database connection established.');

    var collection = db.collection('games');

    collection.find().each(function(err, doc) {

      if (doc) {
        config.games[doc._id] = doc;
        console.log(config.games);
      }
      else {
        db.close();
      }
    });
  });
}

function init(err, games) {
  if (err || !games) return console.error(err);

  _log(games);

  // games.forEach(function(err, doc) {
  //   if (doc.id) {
  //     config.games[doc.id] = games[doc];
  //   }
  // });
}

function connect(app) {
  url = process.env.MONGOLAB_URI || config.mongoURI[app.env];

  _log('NODE_ENV:', app.env);
  _log('mongodb url:', url);

  mongoose.connect(config.mongoURI[app.env], function(err, res) {
    if(err) return console.error('Error connecting to the database.', err);

    _log('Connected to Database:', config.mongoURI[app.env]);

    Games.find({}, init);
  });
}

function syncGame(game_id) {
  var game = new Game({
    id: game_id,
    name: config.games[game_id].name,
    admin: config.games[game_id].admin,
    meeples: config.games[game_id].meeples,
    max_players: config.games[game_id].max_players,
    players: config.games[game_id].players,
    logs: config.games[game_id].logs
  });

  game.save(function (err, fluffy) {
    if (err) return console.error(err);

    console.log('done');
  });

  // MongoClient.connect(url, function(err, db) {
  //   assert.equal(null, err);
  //
  //   var collection = db.collection('games');
  //
  //   collection.update(
  //     { _id: game_id },
  //     { id: game_id },
  //     { $set: {
  //       name        : config.games[game_id].name,
  //       new_game    : config.games[game_id].new_game,
  //       admin       : config.games[game_id].admin,
  //       meeples     : config.games[game_id].meeples,
  //       max_players : config.games[game_id].max_players,
  //       players     : config.games[game_id].players,
  //       logs        : config.games[game_id].logs
  //     }},
  //     { upsert: true },
  //     function() {
  //       console.log(db.collection('games'));
  //       db.close();
  //     }
  //   );
  // });
}

function syncLog(game_id) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);

    var collection = db.collection('games');

    collection.update(
      { _id: game_id },
      { id: game_id },
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

function getGames(page, items_per_page, callback) {
  page = page || 0;
  items_per_page = items_per_page || 1;

  Games
    .find({id: 'pippo'})
    .skip(items_per_page * page)
    .limit(items_per_page)
    .exec(function(err, stat) {
      if (err || !stat) callback(err, null);

      callback(null, stat);
    });
}

function getGame(game_id, callback) {
  if ( ! game_id ) return 0;

  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);

    db.collection('games')
      .findOne({_id: game_id}, function(err, item) {
        callback(item);
      });
  });
}
