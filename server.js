const express = require('express');
const pkginfo = require('pkginfo')(module);
const morgan = require('morgan');

const app = express();
const server = require('http').Server(app);

// Modules
const mongo = require('./server/mongo');

// websockets
const io = require('socket.io')(server);
const websockets = require('./server/websockets').start(server);

// configuration
const config = require('./config/config');

// Get our API routes
const router = require('./server/router')(module);
const serverPort = process.env.PORT || config.port;

app.use(function (req, res, next) {
  res.removeHeader('x-powered-by');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept');

  next();
});

app.use(morgan('dev'));
app.use('/', router);

mongo.connect(app.settings);

app.listen(serverPort, () => console.log(`Server listening at http://localhost:${serverPort}`));

module.exports = app;
