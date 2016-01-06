"use strict";

var express = require('express'),
    app     = express(),
    http    = require('http').Server(app),
    io      = require('socket.io')(http);

// configuration
var config = require('../config/config.json');

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
      meeple_available: ['red', 'green', 'blue', 'yellow', 'black', 'gray'],
      max_players: 6
    };

/**
 * Generates a random unique id for the new games
 * @return [String] The unique id in string format
 */
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000 | 0)
      .toString(16)
      .substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
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
  io.sockets.emit('users:update', users.active.length);
  console.log('\n');
}

app.use(express.static(__dirname + '/client'));

// render the app
app.get('/', function( req, res ) {
  res.sendFile( __dirname + '/client/app.html');
});

// redirect all others requests to the 404 page
app.get('*', function( req, res ) {
  res.sendFile( __dirname + '/client/404.html');
});

// start listening for new users connected
io.on('connection', function(socket) {
  var uid        = null,
      registered = false;

  // send the new user the number of online users so far
  socket.emit('users:update', users.active.length);

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
    io.sockets.emit('users:update', users.active.length);
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

  // create a new game or update an existing one
  // using the information fetched from the client
  socket.on('game:ready', function (data) {
    // if game_id is missing, create a new game
    var game_id = data.game_id || guid(),
        old_users, user_points, i;

    if ( ! data.players || data.players.length <= 0 ) {
      console.log('\n !Game updated with no users! Moving on!\n');
      socket.emit('game:ready', {error: true});
      return false;
    }

    // create the game on the server database if doesn't exist
    if ( ! games[game_id] ) {
      games[game_id] = {
        new_game: true,
        admin: uid,
        players: [],
        logs: []
      };
    }
    else {
      games[game_id].new_game = false;
      // store the user's score before updating the user's information
      old_users = Object.create(games[game_id].players);
    }

    // remove the previous user information and use the new ones
    games[game_id].players = [];

    for ( i in data.players) {
      // limit players to the new_game.max_players value
      if ( i >= new_game.max_players ) continue;

      user_points = games[game_id].new_game ? 0 : old_users[i].score;

      games[game_id].players.push({
        name: data.players[i].name || 'Player',
        color: data.players[i].color || 'Black',
        email: data.players[i].email || null,
        gravatar: data.players[i].gravatar || 'https://secure.gravatar.com/avatar/857d4d7384156e928e743d53a8d37519?d=identicon&s=150',
        score: user_points
      });
    }

    console.log(games[game_id]);

    if ( games[game_id].new_game ) {
      games[game_id].players[0].selected = true;
    }
    games[game_id].name = data.name || new_game.name;
    games[game_id].meeples = games[game_id].meeple_available = ['red', 'green', 'blue', 'yellow', 'black', 'gray'];
    games[game_id].max_players = new_game.max_players;

    // send back the updated information to the client
    console.log('\n======================');
    console.log('games in the database:');
    console.log(games);
    console.log('======================\n');
    socket.emit('game:ready', {game_id: game_id, new_game: games[game_id].new_game});
  });

  // a client requested a game_id information
  // every one knowing the game uid can request this
  // send back the game, if any
  socket.on('game:get', function (game_id) {
    console.log('\nreceived get on game: ' + game_id);
    console.log('sending game data back:');
    console.log(games[game_id]);

    if ( ! games[game_id] ) {
      return;
    }

    console.log('\n');
    socket.emit('game:get', games[game_id]);
  });

  // update score in a game
  // TOBE CONTINUED
  socket.on('game:score', function (data) {
    var currentTime = new Date(),
        hours = currentTime.getHours(),
        minutes = currentTime.getMinutes(),
        seconds = currentTime.getSeconds();

    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    var now = hours + ':' + minutes + ':' + seconds,
        log = [now];

    for (var i = 0; i < data.game.players.length; i++) {
      if ( data.game.players[i].selected ) {
        log.push( '+' + data.points );
      }
      else {
        log.push( '-' );
      }
    }

    data.game.logs.push( log );
    socket.emit('game:score_updated', data.game.logs);
  });
});

var serverPort = process.env.PORT || config.port;

http.listen(serverPort, function() {
  console.log("Server correctly started.");
  console.log("Server is listening on port " + serverPort);
});
