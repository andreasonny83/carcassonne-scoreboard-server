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

This project uses NodeJS and npm and MongoDB.
Make sure you have them installed on your machine before proceeding.

Then, install MongoDB on your machine

```sh
# On OSX
$ brew update
$ brew install mongodb
```

If you are on Windows or Linux, check out the [official MongoDB installation
page](https://docs.mongodb.com/manual/installation/#mongodb-community-edition)

Then, install all the project's dependencies

```sh
$ npm install
# Or Yarn for a faster installation
$ yarn install
```

This will install all the local dependencies the application
needs to run in development mode.

## Run your local project

If you have correctly installed all the dependencies,
you will now be able to run your local project simply with:

```sh
npm start
```

## MongoDB

Mongo starts and stop automatically while running `npm start`
To manually stop the mongodb process, use the `npm stop` command.

If you kill the `npm start` process before it runs the node server application,
you will need to manually kill the mongod process with `npm stop`.

## Contributing

This package is using the AngularJS commit messages as default way to contribute
with commitizen node package integrated in this repository.

1.  Fork it!
1.  Create your feature branch: `git checkout -b my-new-feature`
1.  Add your changes: `git add .`
1.  Commit your changes: `npm run commit`
1.  Push and tag using npm version: `npm version minor`
1.  Submit a pull request :sunglasses:

## Changelog

Changelog available [here](http://andreasonny83.github.io/carcassonne-scoreboard-server/releases)

## License

[MIT License](http://andreasonny83.github.io/carcassonne-scoreboard-server/blob/master/LICENSE) © Andrea SonnY
