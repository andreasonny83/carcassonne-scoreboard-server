const config = {
  port: 5005,
  mongoURI: {
    production: "mongodb://localhost/carcassonne",
    development: "mongodb://localhost/carcassonne_dev",
    test: "mongodb://localhost/carcassonne_test"
  },
  games: {},
  game: {
    name: "New game",
    meeples: [
      "red", "green", "blue", "yellow", "black", "gray"
    ],
    max_players: 6
  }
};

module.exports = config;
