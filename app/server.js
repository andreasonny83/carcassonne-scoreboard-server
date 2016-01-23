"use strict";

var express = require('express'),
    app     = express(),
    http    = require('http').Server(app),
    io      = require('socket.io')(http),
    pkginfo = require('pkginfo')(module);
// configuration
var config = require('../config/config.json');
// Modules
var guid   = require('./modules/guid'),
    mongo  = require('./modules/mongo');
// global variables
var users = {
      active: [],
      connected: [],
      disconnected: []
    };

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');

  var token = req.query && req.query.api_key;
  console.log('token: ' + token);

  if ( token === config.API_KEY ) {
    next();
  }
  else {
    // if there is no API_KEY
    // return an error
    return res.status(403).send({
        success: false,
        message: 'Wrong API key.'
    });
  }
});

mongo.init();

/**
 * Make sure all the users are still online
 * if not, remove them from the users.connected array and notify
 * the users with the updated users.connected value on the home page
 */
function updateUsers() {
  var index = null,
      match = [],
      divergences = false;

  for ( index in users.active ) {
    if ( users.connected.indexOf( users.active[index] ) === -1 ) {
      if ( users.disconnected.indexOf(users.active[index]) !== -1 ) {
        // user is really disconnected, removing it...
        users.active.splice( users.active.indexOf(users.active[index]), 1 );
        users.disconnected.splice( users.active.indexOf(users.active[index]), 1 );
      }
      else {
        // send a ping to the user to see if the missing user is still alive somewhere
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
  io.sockets.emit('app:update', {users: users.active.length, games: Object.keys(config.games).length });
}

// render the app
app.get('/status', function( req, res ) {
  return res.status(200).json({
    app: module.exports.name,
    version: module.exports.version,
    status: 200,
    message: 'OK - ' + Math.random().toString(36).substr(3, 8)
  });
});

// render the games in the database sorted by pages
app.get('/gamesinfo', function( req, res ) {
  var page = req.query.page ? req.query.page : 0,
      items_per_page = 5;

  mongo.getGames(page, items_per_page, function(data) {
    return res.status(200).json({
      games: data
    });
  });
});

// return the selected game, if present in the database
app.get('/gamesinfo/:game_id', function( req, res ) {
  mongo.getGame(req.params.game_id, function(data) {
    return res.status(200).json({
      games: data
    });
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
  socket.emit('app:update', {users: users.active.length, games: Object.keys(config.games).length });

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
      users.active.push(uid);
    }

    // spread the updated online users to the conneted clients
    io.sockets.emit('app:update', {users: users.active.length, games: Object.keys(config.games).length });
  });

  /**
   * When a user disconnect, try to ping it and see if it's still alive somewhere
   * @param  [String] user_uid   The user uid of the disconnected user
   */
  socket.on('pong', function (user_uid) {
    if ( users.disconnected.indexOf(user_uid) !== -1 ) {
      // user is still alive
      users.connected.push( user_uid );
      users.disconnected.splice( users.disconnected.indexOf(user_uid), 1 );
    }
  });

  // when a user is disconnected, make sure it's really gone.
  socket.on('disconnect', function () {
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
      socket.emit('game:ready', {error: true});
      return false;
    }

    // create a new game on server side if doesn't exist
    if ( ! config.games[game_id] ) {
      config.games[game_id] = {
        new_game: true,
        admin: uid,
        players: [],
        logs: [],
        meeples: config.game.meeples
      };
    }
    else {
      config.games[game_id].new_game = false;
      // store the user's score before updating the user's information
      old_users = Object.create(config.games[game_id].players);
    }

    // remove the previous user information and use the new ones
    config.games[game_id].players = [];

    for ( i in data.game.players) {
      // limit players to the game.max_players value
      if ( i >= config.game.max_players ) continue;

      user_points = 0;
      if ( ! config.games[game_id].new_game && old_users[i] && old_users[i].score ) {
        user_points = old_users[i].score;
      }

      config.games[game_id].players.push({
        name: data.game.players[i].name || 'Player',
        color: data.game.players[i].color || 'Black',
        score: user_points
      });

      mongo.syncGame(game_id);
    }

    config.games[game_id].name = data.game.name || config.game.name;
    config.games[game_id].max_players = config.game.max_players;
    config.games[game_id].meeples = config.game.meeples;

    // send back the updated information to the client
    socket.emit('game:ready', {game_id: game_id, new_game: config.games[game_id].new_game});
    // send new information to all the other users connected to the game
    socket.broadcast.emit('game:update', {game_id: game_id, game: config.games[game_id]});
  });

  // a client requested a game_id information
  // every one knowing the game uid can request this
  // send back the game, if any
  socket.on('game:get', function (game_id) {

    if ( ! config.games[game_id] ) {
      socket.emit('game:get', {error: true});
      return;
    }

    socket.emit('game:get', {error: false, game: config.games[game_id]});
  });

  // update score in a game
  socket.on('game:score', function (data) {
    var currentTime = new Date(),
        hours = currentTime.getHours(),
        minutes = currentTime.getMinutes(),
        seconds = currentTime.getSeconds(),
        now, log;

    if ( ! config.games[data.game_id] || data.points <= 0 ) {
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

    config.games[data.game_id].logs.push( log );
    mongo.syncLog(data.game_id);

    io.sockets.emit('game:update', {
      game_id: data.game_id,
      game: config.games[data.game_id]
    });
  });

  socket.on('game:undo', function (data) {
    if ( config.games[data.game_id] && config.games[data.game_id].logs.length > 0 ) {
      config.games[data.game_id].logs.pop();
      mongo.syncLog(data.game_id);

      io.sockets.emit('game:update', {
        game_id: data.game_id,
        game: config.games[data.game_id]
      });
    }
  });

});

var serverPort = process.env.PORT || config.port;

http.listen(serverPort, function() {
  console.log("Server correctly started.");
  console.log("Server is listening on port " + serverPort);
});
