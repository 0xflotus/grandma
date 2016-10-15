/* eslint-env mocha */

var Stream = require('stream');

var expect = require('chai').expect;
var through = require('through2');
var es = require('event-stream');
var _ = require('lodash');
var unstyle = require('unstyle');

var DATA = require('./data/testdata.js');

var diff = require('../').diff;

function writeData(stream, data) {
    setTimeout(function() {
        stream.end(_.map(data, JSON.stringify).join('\n'));
    });
    
    return stream;
}

function getReport(streams, options, callback) {
    var cb = _.once(callback);
    
    var output = through();

    var opts = _.defaults(options, {
        output: output
    });
    
    diff(streams, opts, function(err) {
        if (err) {
            return cb(err);
        }
    });
    
    // listen to output on the stream inside opts
    opts.output.pipe(es.wait(cb));
}

function hasColors(str) {
    return str !== unstyle.string(str);
}

function objToArr(obj) {
    return _.map(obj, function(item) {
        return item;
    });
}

describe.only('[diff]', function() {
    it('takes an array of input streams and writes output', function(done) {
        getReport([
            writeData(through(), DATA.test),
            writeData(through(), DATA.test)
        ], {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            expect(hasColors(data)).to.equal(false);
            
            done();
        });
    });
    
    it('takes an object hash of input streams and writes output', function(done) {
        getReport({
            one: writeData(through(), DATA.test),
            two: writeData(through(), DATA.test)
        }, {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            expect(hasColors(data)).to.equal(false);
            
            done();
        });
    });
    
    it('can write color output', function(done) {
        getReport([
            writeData(through(), DATA.test),
            writeData(through(), DATA.test)
        ], {
            color: true
        }, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            expect(hasColors(data)).to.equal(true);
            
            done();
        });
    });
    
    describe('errors if', function() {
        [{
            description: 'there are less than two streams',
            streams: {
                one: writeData(through(), DATA.test)
            },
            test: function(streams, done) {
                getReport(streams, {}, function(err, data) {
                    expect(err).to.be.instanceOf(Error);

                    expect(err).to.have.property('message')
                        .and.to.equal('at least two streams are required for a diff');

                    done();
                });
            }
        }, {
            description: 'one of the stream items is not a stream',
            streams: {
                one: writeData(through(), DATA.test),
                two: 'not a stream'
            },
            test: function(streams, done) {
                getReport(streams, {}, function(err, data) {
                    expect(err).to.be.instanceOf(Error);

                    expect(err).to.have.property('message')
                        .and.to.equal('streams is not an array or has object of readable streams');

                    done();
                });
            }
        }, {
            description: 'one of the stream items is not a readable stream',
            streams: {
                one: writeData(through(), DATA.test),
                two: new Stream.Writable()
            },
            test: function(streams, done) {
                getReport(streams, {}, function(err, data) {
                    expect(err).to.be.instanceOf(Error);

                    expect(err).to.have.property('message')
                        .and.to.equal('streams is not an array or has object of readable streams');

                    done();
                });
            }
        }].forEach(function(val) {
            it(val.description + ' in an array', function(done) {
                val.test(objToArr(val.streams), done);
            });
            
            it(val.description + ' in an object', function(done) {
                val.test(val.streams, done);
            });
        });
    
        it('there is no output stream', function(done) {
            diff([
                writeData(through(), DATA.test),
                writeData(through(), DATA.test)
            ], {
                output: null
            }, function(err) {
                expect(err).to.be.instanceOf(TypeError);

                expect(err).to.have.property('message')
                    .and.to.equal('options.output is not a writable stream');

                done();
            });
        });
        
        it('errors if the output stream is not writable', function(done) {
            diff([
                writeData(through(), DATA.test),
                writeData(through(), DATA.test)
            ], {
                output: new Stream.Readable()
            }, function(err) {
                expect(err).to.be.instanceOf(TypeError);

                expect(err).to.have.property('message')
                    .and.to.equal('options.output is not a writable stream');

                done();
            });
        });
    });
});