# Carcassonne Scoreboard (server)

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

> Client version available at: [github.com/andreasonny83/carcassonne-scoreboard-client](https://github.com/andreasonny83/carcassonne-scoreboard-client)

The API endpoint documentation is available at: [andreasonny83.github.io/carcassonne-scoreboard-server](http://andreasonny83.github.io/carcassonne-scoreboard-server/)

## Install

### Get the code

First clone this repo to your local machine with:

```sh
git clone https://github.com/andreasonny83/carcassonne-scoreboard-server.git
```

Then, cd inside the project folder with:

```sh
cd carcassonne-scoreboard-server
```

### Install the dependencies

This project uses NodeJS and npm.
Make sure you have them installed on your machine before proceeding.

Then, install all the project's dependencies

```sh
$ npm install
# Or Yarn for a faster installation
$ yarn install
```

This will install all the local dependencies the application
needs to run in development mode.

### Run your local project

If you have correctly installed all the dependencies,
you will now be able to run your local project simply with:

```sh
npm start
```

## Changelog

### 1.0.2
*   CORS support
*   Documentation for the API endpoints<br>
2016.01.23

### 1.0.1
*   pkginfo to render package info into /status API endpoint<br>
2016.01.17

### 1.0.0
*   Mongodb for storing the games on a database
*   Exported the `mongo` module<br>
2016.01.17

### 0.2.0
*   Exported the `guid` module
*   Gravatar removed
*   Filter points to make sure user is within the accepted range before updating the game information<br>
2016.01.10

### 0.1.1
*   Server Status
*   404 page<br>
2016.01.06

### 0.1.0
*   initial release<br>
2016.01.06
