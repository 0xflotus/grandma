/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var through = require('through2');
var es = require('event-stream');
var _ = require('lodash');

var report = require('../lib/report.js');

var TESTDATA = [
    {"type":"header","epoch":1460127721611,"duration":30000,"rate":20,"targetCount":600},
    {"type":"report","report":{"fullTest":{"start":0,"end":19.801774,"duration":19.801774,"status":"success"},"one":{"start":0.14821399999999585,"end":2.897864999999996,"duration":2.749651,"status":"success"},"two":{"start":0.45399899999999604,"end":6.853753000000005,"duration":6.399754000000009,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":47.191123999999995,"end":61.882996999999996,"duration":14.691873000000001,"status":"success"},"one":{"start":47.213159999999995,"end":49.951642,"duration":2.7384820000000047,"status":"success"},"two":{"start":47.56996,"end":51.722057,"duration":4.152096999999998,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":97.46002200000001,"end":111.861504,"duration":14.401481999999987,"status":"success"},"one":{"start":97.46877600000002,"end":99.933471,"duration":2.4646949999999777,"status":"success"},"two":{"start":97.493529,"end":101.74916300000001,"duration":4.255634000000015,"status":"success"}},"id":0},
];

var TESTRESULTS = {
  "info": {
    "count": 3,
    "targetCount": 600,
    "duration": 30000,
    "rate": 20
  },
  "latencies": {
    "fullTest": {
      "50": 14.691873000000001,
      "95": 19.801774,
      "99": 19.801774,
      "mean": 16.29837633333333,
      "min": 14.401481999999987,
      "max": 19.801774
    },
    "one": {
      "50": 2.7384820000000047,
      "95": 2.749651,
      "99": 2.749651,
      "mean": 2.6509426666666607,
      "min": 2.4646949999999777,
      "max": 2.749651
    },
    "two": {
      "50": 4.255634000000015,
      "95": 6.399754000000009,
      "99": 6.399754000000009,
      "mean": 4.93582833333334,
      "min": 4.152096999999998,
      "max": 6.399754000000009
    }
  }
};

function getReport(options, callback) {
    var cb = _.once(callback);
    
    var input = through();
    var output = through();

    var opts = _.defaults(options, {
        input: input,
        output: output
    });
    
    report(opts, function(err) {
        if (err) {
            return cb(err);
        }
    });
    
    // listen to output on the stream inside opts
    opts.output.pipe(es.wait(cb));

    // write to original input, in case the user has decided
    // to overwrite the opt with their own
    input.end(TESTDATA.map(JSON.stringify).join('\n'));
}

describe('[report]', function() {
    it('takes an input and output stream', function(done) {
        var input = through();
        
        getReport({
            input: input
        }, function(err, content) {
            expect(err).to.be.instanceof(Error);
            expect(err).to.have.property('message').and.to.equal('no data provided');
            
            done();
        });
        
        input.end();
    });
    it('reads data from the input stream', function(done) {
        var input = through();
        
        getReport({
            input: input
        }, function(err, content) {
            expect(err).to.not.be.ok;
            
            expect(content).to.be.ok;
            expect(content.toString()).to.match(/Summary:/);
            expect(content.toString()).to.match(/Latencies:/);
            done();
        });
        
        input.end(TESTDATA.map(JSON.stringify).join('\n'));
    });
    it('writes results to the output stream');
    
    describe('#json', function() {
        it('provides readable json data', function(done) {
            getReport({
                type: 'json'
            }, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var jsonData = JSON.parse(content.toString());
                
                // match the ground-truthed json
                // not sure how fragile this test actually is
                expect(jsonData).to.deep.equal(TESTRESULTS);
                
                done();
            });
        });
    });
    describe('#text', function() {
        it('provides pretty text data', function(done) {
            function tableRegex() {
                var str = [].slice.call(arguments).join('\\s+?');
                return new RegExp(str);
            }
            
            getReport({
                type: 'text'
            }, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                // regular expressions to match the ground-truthed results
                // not sure how fragile this test actually is
                expect(str).to.match(tableRegex('Summary:', 'duration', 'rate', 'total'));
                expect(str).to.match(tableRegex('30s', '20', '3'));
                
                expect(str).to.match(tableRegex('Latencies:', 'mean', '50', '95', '99', 'max'));
                expect(str).to.match(tableRegex('fullTest', '16.298ms', '14.692ms', '19.802ms', '19.802ms', '19.802ms'));
                expect(str).to.match(tableRegex('one', '2.651ms', '2.738ms', '2.750ms', '2.750ms', '2.750ms'));
                expect(str).to.match(tableRegex('two', '4.936ms', '4.256ms', '6.400ms', '6.400ms', '6.400ms'));
                
                done();
            });
        });
    });
    describe('#plot', function() {
        it('provides an html page', function(done) {
            getReport({
                type: 'plot'
            }, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                // what the hell do I test here?
                expect(str).to.match(/<html/);
                
                done();
            });
        });
    });
    
    describe('errors when the reporter', function() {
        it('does not receive an input stream');
        it('does not receive an output stream');
        it('encounters a read error on the input stream');
        
    });
});