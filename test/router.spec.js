const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
const mongo = require('./mongo');

//Require the dev-dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();

chai.use(chaiHttp);

describe('Router', () => {
  it('should return a status message on /status GET', (done) => {
    chai.request(server)
      .get('/status')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('app');
        res.body.should.have.property('version');
        res.body.should.have.property('status');
        res.body.should.have.property('message');
        res.body.message.should.match(/^OK - /);

        done();
      });
  });

  describe('/gamesinfo GET', (done) => {
    before('should clean the database', (done) => {
      console.log(mongoose.connections[0].name);

      done();
    });

    it('should list the first 5 games on /gamesinfo GET', (done) => {
      chai.request(server)
      .get('/gamesinfo')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');

        done();
      });
    });
  });


  it('should list 5 games on /gamesinfo<game_id> GET', (done) => {
    chai.request(server)
      .get('/gamesinfo/1')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');

        done();
      });
  });

  it('should return 404 on /* GET', (done) => {
    chai.request(server)
      .get('/wrong-endpoint')
      .end((err, res) => {
        res.should.have.status(404);
        res.should.not.be.json;

        done();
      });
  });
});
