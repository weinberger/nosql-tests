// benchmark driver
'use strict';

var underscore = require('underscore');

// .............................................................................
// parse command-line options
// .............................................................................

var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')

  .command('arangodb', 'ArangoDB benchmark')
  .command('mongodb', 'MongoDB benchmark')
  .command('neo4j', 'neo4j benchmark')
  .demand(1)

  .option('t', {
    alias: 'tests',
    demand: false,
    default: 'all',
    describe: 'tests to run separated by comma: shortest, neighbors, neighbors2, singleRead, singleWrite, aggregation',
    type: 'string'
    })
  .requiresArg('t')

  .option('s', {
    alias: 'restrict',
    demand: false,
    default: 0,
    describe: 'restrict to that many elements (0=no restriction)',
    type: 'integer'
    })
  .requiresArg('s')

  .option('l', {
    alias: 'neighbors',
    demand: false,
    default: 500,
    describe: 'look at that many neighbors',
    type: 'integer'
    })
  .requiresArg('l')

  .option('a', {
    alias: 'address',
    demand: false,
    default: '127.0.0.1',
    describe: 'server host',
    type: 'string'
    })
  .requiresArg('a')

  .boolean('d')
  .help('h')
  .epilog('copyright 2015 Claudius Weinberger')
  .argv
;

// .............................................................................
// checks the arguments
// .............................................................................

var databases = argv._;
var tests = argv.t;
var debug = argv.d;
var restriction = argv.s;
var neighbors = argv.l;
var host = argv.a;

var total = 0;

if (tests.length === 0 || tests === 'all') {
  tests = ['warmup', 'shortest', 'neighbors', 'neighbors2', 'singleRead', 'singleWrite',
           'aggregation'];
}
else {
  tests = tests.split(',');
}

var database = databases[0];
var desc;

try {
  desc = require('./' + database + '/description');
} catch (err) {
  console.log('ERROR database %s is unknown', database);
  process.exit(1);
}

// .............................................................................
// loads the ids and documents
// .............................................................................

var ids = require('./data/ids100000');
var bodies = require('./data/bodies100000');
var paths;

paths = require('./data/shortest');

if (restriction > 0) {
  ids = ids.slice(0, restriction);
  bodies = bodies.slice(0, restriction);
  paths = paths.slice(0, restriction);
}

// .............................................................................
// execute tests for the given database
// .............................................................................

var posTests = -1;
var testRuns = [];

console.log('INFO using server address ', host);

desc.startup(host, function (db) {
  testRuns.push(function (resolve, reject) {
    console.log('INFO start');
    return resolve();
  });

  for (var j = 0; j < tests.length; ++j) {
    var test = tests[j];

    if (test === 'warmup') {
      testRuns.push(function (resolve, reject) {
        desc.warmup(db, function (err) {if (err) return reject(err); return resolve();});
      });
    }
    else if (test === 'singleRead') {
      testRuns.push(function (resolve, reject) { benchmarkSingleRead(desc, db, resolve, reject); });
    }
    else if (test === 'singleWrite') {
      testRuns.push(function (resolve, reject) { benchmarkSingleWrite(desc, db, resolve, reject); });
    }
    else if (test === 'aggregation') {
      testRuns.push(function (resolve, reject) { benchmarkAggregation(desc, db, resolve, reject); });
    }
    else if (test === 'neighbors') {
      testRuns.push(function (resolve, reject) { benchmarkNeighbors(desc, db, resolve, reject); });
    }
    else if (test === 'neighbors2') {
      testRuns.push(function (resolve, reject) { benchmarkNeighbors2(desc, db, resolve, reject); });
    }
    else if (test === 'shortest') {
      testRuns.push(function (resolve, reject) { benchmarkShortestPath(desc, db, resolve, reject); });
    }
    else {
      console.error('ERROR unknown test case %s', test);
    }
  }

  testRuns.push(function (resolve, reject) {
    console.log('DONE');
    process.exit(0);
  });

  executeTest();
});

function reportError(err) {
  console.log('ERROR %s', err);
  process.exit(0);
}

function executeTest() {
  testRuns[++posTests](function () {
    process.nextTick(executeTest);
  }, reportError);
}

// .............................................................................
// single read
// .............................................................................

function benchmarkSingleRead(desc, db, resolve, reject) {
  console.log('INFO executing single read with %d documents', ids.length);
  var name = 'profiles';

  try {
    var goal = ids.length;
    total = 0;

    desc.getCollection(db, name, function (err, coll) {
      if (err) return reject(err);

      var start = Date.now();

      for (var k = 0; k < ids.length; ++k) {
        desc.getDocument(db, coll, ids[k], function (err, doc) {
          if (err) return reject(err);

          if (debug) {
            console.log('RESULT', doc);
          }

          ++total;

          if (total === goal) {
            reportResult(desc.name, 'single reads', goal, Date.now() - start);
            return resolve();
          }
        });
      }
    });
  } catch (err) {
    console.log('ERROR %s', err.stack);
    return reject(err);
  }
}

// .............................................................................
// single write
// .............................................................................

function benchmarkSingleWrite(desc, db, resolve, reject) {
  console.log('INFO executing single write with %d documents', bodies.length);
  var name = 'profiles_temp';

  try {
    var goal = bodies.length ;
    total = 0;

    desc.dropCollection(db, name, function (noerr) {
      desc.createCollection(db, name, function (err, coll) {
        if (err) return reject(err);

        desc.getCollection(db, name, function (err, coll) {
          if (err) return reject(err);

          var start = Date.now();

          for (var k = 0; k < bodies.length; ++k) {
            desc.saveDocument(db, coll, underscore.clone(bodies[k]), function (err, doc) {
              if (err) return reject(err);

              if (debug) {
                console.log('RESULT', doc);
              }

              ++total;

              if (total === goal) {
                reportResult(desc.name, 'single writes', goal, Date.now() - start);
                return resolve();
              }
            });
          }
        });
      });
    });
  } catch (err) {
    console.log('ERROR %s', err.stack);
    return reject(err);
  }
}

// .............................................................................
// aggregation
// .............................................................................

function benchmarkAggregation(desc, db, resolve, reject) {
  console.log('INFO executing aggregation');
  var name = 'profiles';

  try {
    desc.getCollection(db, name, function (err, coll) {
      if (err) return reject(err);

      var start = Date.now();

      desc.aggregate(db, coll, function (err, result) {
        if (err) return reject(err);

        if (debug) {
          console.log('RESULT', result);
        }

        reportResult(desc.name, 'aggregate', 1, Date.now() - start);
        return resolve();
      });
    });
  } catch (err) {
    console.log('ERROR %s', err.stack);
    return reject(err);
  }
}

// .............................................................................
// neighbors
// .............................................................................

function benchmarkNeighbors(desc, db, resolve, reject) {
  console.log('INFO executing neighbors for %d elements', neighbors);
  var nameP = 'profiles';
  var nameR = 'relations';

  try {
    var myNeighbors = 0;
    var goal = neighbors;
    total = 0;

    desc.getCollection(db, nameP, function (err, collP) {
      if (err) return reject(err);

      desc.getCollection(db, nameR, function (err, collR) {
        if (err) return reject(err);

        var start = Date.now();

        for (var k = 0; k < neighbors; ++k) {
          desc.neighbors(db, collP, collR, ids[k], k, function (err, result) {
            if (err) return reject(err);

            if (debug) {
              console.log('RESULT', result);
            }

            myNeighbors += result;

            ++total;

            if (total === goal) {
              console.log('INFO total number of neighbors found: %d', myNeighbors);
              reportResult(desc.name, 'neighbors', goal, Date.now() - start);
              return resolve();
            }
          });
        }
      });
    });
  } catch (err) {
    console.log('ERROR %s', err.stack);
    return reject(err);
  }
}

// .............................................................................
// neighbors2
// .............................................................................

function benchmarkNeighbors2(desc, db, resolve, reject) {
  console.log('INFO executing distinct neighbors of 1st and 2nd degree for %d elements', neighbors);
  var nameP = 'profiles';
  var nameR = 'relations';

  try {
    var myNeighbors = 0;
    var goal = neighbors;
    total = 0;

    desc.getCollection(db, nameP, function (err, collP) {
      if (err) return reject(err);

      desc.getCollection(db, nameR, function (err, collR) {
        if (err) return reject(err);

        var start = Date.now();

        for (var k = 0; k < neighbors; ++k) {
          desc.neighbors2(db, collP, collR, ids[k], k, function (err, result) {
            if (err) return reject(err);

            if (debug) {
              console.log('RESULT', result);
            }

            myNeighbors += result;

            ++total;

            if (total === goal) {
              console.log('INFO total number of neighbors2 found: %d', myNeighbors);
              reportResult(desc.name, 'neighbors2', goal, Date.now() - start);
              return resolve();
            }
          });
        }
      });
    });
  } catch (err) {
    console.log('ERROR %s', err.stack);
    return reject(err);
  }
}

// .............................................................................
// shortest path
// .............................................................................

function benchmarkShortestPath(desc, db, resolve, reject) {
  if (desc.shortestPath === undefined) {
    console.log('INFO %s does not implement shortest path', desc.name);
    return resolve();
  }

  console.log('INFO executing shortest path for %d paths', paths.length);
  var nameP = 'profiles';
  var nameR = 'relations';

  try {
    var myPaths = 0;
    var goal = paths.length;
    total = 0;

    desc.getCollection(db, nameP, function (err, collP) {
      if (err) return reject(err);

      desc.getCollection(db, nameR, function (err, collR) {
        if (err) return reject(err);

        var start = Date.now();

        for (var k = 0; k < paths.length; ++k) {
          desc.shortestPath(db, collP, collR, paths[k], k, function (err, result) {
            if (err) return reject(err);

            if (debug) {
              console.log('RESULT', result);
            }

            myPaths += result;

            ++total;

            if (total === goal) {
              console.log('INFO total paths length: %d', myPaths);
              reportResult(desc.name, 'shortest path', goal, Date.now() - start);
              return resolve();
            }
          });
        }
      });
    });
  } catch (err) {
    console.log('ERROR %s', err.stack);
    return reject(err);
  }
}

// .............................................................................
// result reporter
// .............................................................................

function reportResult(db, name, num, duration) {
  console.log('INFO -----------------------------------------------------------------------------');
  console.log('INFO %s: %s, %d items', db, name, num);
  console.log('INFO Total Time for %d requests: %d ms', num, duration);
  console.log('INFO Average: %d ms', (duration / num));
  console.log('INFO -----------------------------------------------------------------------------');
}
