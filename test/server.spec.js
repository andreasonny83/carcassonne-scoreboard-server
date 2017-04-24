const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();

const server = require('../server');

chai.use(chaiHttp);

describe('Server API', () => {
  it('verify the header', (done) => {
    chai.request(server)
      .get('/status')
      .end((err, res) => {
        res.header.should.not.have.property('x-powered-by');
        res.header.should.have.property('access-control-allow-origin');
        res.header['access-control-allow-origin'].should.equal('*');
        res.header.should.have.property('access-control-allow-methods');
        res.header['access-control-allow-methods'].should.equal('GET');
        res.header['content-type'].should.have.string('application/json');

        done();
      });
  });
});
