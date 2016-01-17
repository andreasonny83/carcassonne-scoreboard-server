"use strict";

var express = require('express'),
    app     = express(),
    http    = require('http').Server(app),
    io      = require('socket.io')(http),
    guid    = require('./modules/guid');

// configuration
var config = require('../config/config.json');

// Retrieve
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
// Connection URL
var url = 'mongodb://localhost:27017/carcassonne';

// global variables
var users = {
      active: [],
      connected: [],
      disconnected: []
    },
    games = {};

// default game settings
var new_game = {
      name: 'New game',
      meeples: ['red', 'green', 'blue', 'yellow', 'black', 'gray'],
      max_players: 6
    };

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  // console.log('Database connection established.');

  var collection = db.collection('games');

  collection.find().each(function(err, doc) {
    if (doc) {
      games[doc._id] = doc;
    }
    else {
      db.close();
    }
  });
});

function syncGame(game_id) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    // console.log('Database connection established.');

    var collection = db.collection('games');
    collection.update(
      { _id: game_id },
      { $set: {
        name : games[game_id].name,
        new_game : games[game_id].new_game,
        admin : games[game_id].admin,
        meeples : games[game_id].meeples,
        max_players : games[game_id].max_players,
        players : games[game_id].players,
        logs : games[game_id].logs
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
    console.log('Database connection established.');

    var collection = db.collection('games');

    collection.update(
      { _id: game_id },
      { $set: {
        logs : games[game_id].logs
      }},
      { upsert: true },
      function() {
        db.close();
      }
    );
  });
}

/**
 * Make sure all the users are still online
 * if not, remove them from the users.connected array and notify
 * the users with the updated users.connected value on the home page
 */
function updateUsers() {
  var index = null,
      match = [],
      divergences = false;

      console.log('\n[updateUsers]');
      console.log('users.connected: ' + users.connected);
      console.log('users: ' + users.active);

  for ( index in users.active ) {
    if ( users.connected.indexOf( users.active[index] ) === -1 ) {
      if ( users.disconnected.indexOf(users.active[index]) !== -1 ) {
        // user is really disconnected, removing it...
        console.log(' - removing user: ' + users.active[index]);
        users.active.splice( users.active.indexOf(users.active[index]), 1 );
        users.disconnected.splice( users.active.indexOf(users.active[index]), 1 );
        console.log('\n[updateUsers]');
        console.log('users.connected: ' + users.connected);
        console.log('users: ' + users.active);
      }
      else {
        // send a ping to the user to see if the missing user is still alive somewhere
        console.log(' - pinging missing user: ' + users.active[index]);
        users.disconnected.push(users.active[index]);
        io.sockets.emit('ping', users.active[index]);
        divergences = true;
      }
    }
  }

  // offline users will be removed after 30 seconds if they don't send
  // a 'pong' back before that time
  if ( divergences ) {
    setTimeout( updateUsers, 30000 );
  }

  // spread the updated online users to the conneted clients
  io.sockets.emit('app:update', {users: users.active.length, games: Object.keys(games).length });
  console.log('\n');
}

// render the app
app.get('/status', function( req, res ) {
  return res.status(200).json({
    app: 'carcassonne-scoreborad-server',
    status: 200,
    message: 'OK - ' + Math.random().toString(36).substr(3, 8)
  });
});

// render the games in the database
app.get('/gamesinfo', function( req, res ) {
  console.log('page: ' + req.query.page);
  var page = req.query.page ? req.query.page : 0,
      output = {},
      items_per_page = 20;

  return res.status(200).json({
    games
  });
});

// redirect all others requests to the 404 page
app.get('*', function( req, res ) {
  res.sendFile( __dirname + '/404.html');
});

// start listening for new users connected
io.on('connection', function(socket) {
  var uid        = null,
      registered = false;

  // send the new user the number of online users so far
  socket.emit('app:update', {users: users.active.length, games: Object.keys(games).length });

  // welcome the new user
  socket.emit('init', true);

  // register the new user
  socket.on('register', function (user_uid) {
    if ( ! user_uid ) {
      socket.emit('user:failed', true);
    }

    registered = true;
    uid = user_uid;

    if ( users.connected.indexOf(uid) < 0 ) {
      users.connected.push(uid);
    }

    if ( users.active.indexOf(uid) < 0 ) {
      console.log('\nNew user connected: ' + uid + '\n');
      users.active.push(uid);
    }

    // spread the updated online users to the conneted clients
    io.sockets.emit('app:update', {users: users.active.length, games: Object.keys(games).length });
  });

  /**
   * When a user disconnect, try to ping it and see if it's still alive somewhere
   * @param  [String] user_uid   The user uid of the disconnected user
   */
  socket.on('pong', function (user_uid) {
    console.log('\n===========\npong from: ' + user_uid + '\n===========\n');
    if ( users.disconnected.indexOf(user_uid) !== -1 ) {
      // user is still alive
      users.connected.push( user_uid );
      users.disconnected.splice( users.disconnected.indexOf(user_uid), 1 );
    }
  });

  // when a user is disconnected, make sure it's really gone.
  socket.on('disconnect', function () {
    console.log('\nuser disconnected: ' + uid + '\n');
    if ( users.connected.indexOf(uid) !== -1 ) {
      users.connected.splice(users.connected.indexOf(uid), 1);
    }

    // update the users.connected array
    updateUsers();
  });


  //=======================
  //
  //         Game
  //
  //=======================

  // create a new game or update an existing one
  // using the information fetched from the client
  socket.on('game:start', function (data) {
    // if game_id is missing, create a new game
    var game_id = data.game_id || guid(),
        old_users, user_points, i;

    if ( ! data.game.players || data.game.players.length <= 0 ) {
      console.log('\n !Game updated with no users! Moving on!\n');
      socket.emit('game:ready', {error: true});
      return false;
    }

    // create a new game on server side if doesn't exist
    if ( ! games[game_id] ) {
      games[game_id] = {
        new_game: true,
        admin: uid,
        players: [],
        logs: [],
        meeples: new_game.meeples
      };
    }
    else {
      games[game_id].new_game = false;
      // store the user's score before updating the user's information
      old_users = Object.create(games[game_id].players);
    }

    // remove the previous user information and use the new ones
    games[game_id].players = [];

    for ( i in data.game.players) {
      // limit players to the new_game.max_players value
      if ( i >= new_game.max_players ) continue;

      user_points = 0;
      if ( ! games[game_id].new_game && old_users[i] && old_users[i].score ) {
        user_points = old_users[i].score;
      }

      games[game_id].players.push({
        name: data.game.players[i].name || 'Player',
        color: data.game.players[i].color || 'Black',
        score: user_points
      });

      syncGame(game_id);
    }

    console.log(games[game_id]);

    games[game_id].name = data.game.name || new_game.name;
    games[game_id].max_players = new_game.max_players;
    games[game_id].meeples = new_game.meeples;

    // send back the updated information to the client
    console.log('\n======================');
    console.log('games in the database:');
    console.log(games);
    console.log('======================\n');
    socket.emit('game:ready', {game_id: game_id, new_game: games[game_id].new_game});
    // send new information to all the other users connected to the game
    socket.broadcast.emit('game:update', {game_id: game_id, game: games[game_id]});
  });

  // a client requested a game_id information
  // every one knowing the game uid can request this
  // send back the game, if any
  socket.on('game:get', function (game_id) {
    console.log('\nreceived get on game: ' + game_id);
    console.log('sending game data back:');
    console.log(games[game_id]);

    if ( ! games[game_id] ) {
      socket.emit('game:get', {error: true});
      return;
    }

    console.log('\n');
    socket.emit('game:get', {error: false, game: games[game_id]});
  });

  // update score in a game
  socket.on('game:score', function (data) {
    console.log(data);

    var currentTime = new Date(),
        hours = currentTime.getHours(),
        minutes = currentTime.getMinutes(),
        seconds = currentTime.getSeconds(),
        now, log;

    if ( ! games[data.game_id] || data.points <= 0 ) {
      io.sockets.emit('game:update', {
        game_id: data.game_id,
        error: true
      });

      return;
    }

    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    now     = hours + ':' + minutes + ':' + seconds;
    log     = [now];

    for (var i = 0; i < data.game.players.length; i++) {
      if ( i === data.player_selected ) {
        log.push( '+' + data.points );
      }
      else {
        log.push( '-' );
      }
    }

    games[data.game_id].logs.push( log );
    syncLog(data.game_id);

    console.log('-------LOG-------');
    console.log(games[data.game_id].logs);

    io.sockets.emit('game:update', {
      game_id: data.game_id,
      game: games[data.game_id]
    });
  });

  socket.on('game:undo', function (data) {
    console.log('Undo requested on game: ' + data.game_id);
    if ( games[data.game_id] && games[data.game_id].logs.length > 0 ) {
      games[data.game_id].logs.pop();
      syncLog(data.game_id);

      io.sockets.emit('game:update', {
        game_id: data.game_id,
        game: games[data.game_id]
      });
    }
  });

});

var serverPort = process.env.PORT || config.port;

http.listen(serverPort, function() {
  console.log("Server correctly started.");
  console.log("Server is listening on port " + serverPort);
});
