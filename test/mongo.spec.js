const mongoose = require('mongoose');
const db = require('../server/mongo');

const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();

const server = require('../server');
const config = require('../config/config');

chai.use(chaiHttp);

describe('MongoDB', () => {
  it('should establish a database connection', (done) => {
    let dbConnection = mongoose.connections[0];

    config.mongoURI['test'].should.have.string(dbConnection.name);

    done();
  });
});
