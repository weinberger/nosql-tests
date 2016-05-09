'use strict';

var neo4j = require('neo4j-driver').v1;

function subscriptionWrapper(cb) {
  var response = [];
  var called = false;
  return {
    onNext: function (record) {
      if (called) return;
      response.push(record);
    },
    onCompleted: function () {
      if (called) return;
      called = true;
      cb(null, response);
    },
    onError: function (err) {
      if (called) return;
      called = true;
      cb(err);
    }
  };
}

module.exports = {
  name: 'Neo4J',
  CONCURRENCY: 32,

  startup: function (host, cb) {
    var driver = neo4j.driver(
      'bolt://' + host + ':7474',
      neo4j.auth.basic('neo4j', 'abc')
    );

    cb(driver);
  },

  warmup: function (driver, cb) {
    var session = driver.session();
    session.run(
      'MATCH (:PROFILES)--() return count(*) as count'
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      var result = results[0];
      console.log('INFO warmup done, relationships ' + result.count);
      cb(err, result);
    }));
  },

  getCollection: function (driver, name, cb) {
    cb(null, name.toUpperCase());
  },

  dropCollection: function (driver, name, cb) {
    name = name.toUpperCase();

    var session = driver.session();
    session.run(
      'MATCH (n:' + name + ') DELETE n'
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      cb(null, results[0]);
    }));
  },

  createCollectionSync: function (driver, name, cb) {
    cb();
  },

  getDocument: function (driver, coll, id, cb) {
    var session = driver.session();
    session.run(
      'MATCH (f:' + coll + ' {_key:{key}}) RETURN f',
      {key: id}
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      cb(null, results[0]);
    }));
  },

  saveDocumentSync: function (driver, coll, doc, cb) {
    var session = driver.session();
    session.run(
      'CREATE (f:' + coll + ' {doc})',
      {doc: doc}
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      cb(null, results[0]);
    }));
  },

  aggregate: function (driver, coll, cb) {
    var session = driver.session();
    session.run(
      'MATCH (f:' + coll + ') RETURN f.AGE, count(*)'
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      var result = results[0];
      cb(null, result.length);
    }));
  },

  neighbors: function (driver, collP, collR, id, i, cb) {
    var session = driver.session();
    session.run(
      'MATCH (s:' + collP + ' {_key:{key}})-->(n:' + collP + ') RETURN n._key',
      {key: id}
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      var result = results[0];
      cb(null, result.length);
    }));
  },

  neighbors2: function (driver, collP, collR, id, i, cb) {
    var session = driver.session();
    session.run(
      'MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:' + collP
      + ') RETURN DISTINCT n._key',
      {key: id}
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      var result = results[0];
      if (result.map === undefined) {
        result = [result['n._key']];
      } else {
        result = result.map(function (x) { return x['n._key']; });
      }
      if (result.indexOf(id) === -1) {
        cb(null, result.length);
      } else {
        cb(null, result.length - 1);
      }
    }));
  },

  neighbors2data: function (driver, collP, collR, id, i, cb) {
    var session = driver.session();
    session.run(
      'MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:' + collP
      + ') RETURN DISTINCT n._key, n',
      {key: id}
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      var result = results[0];
      if (result.map === undefined) {
        result = [result['n._key']];
      } else {
        result = result.map(function (x) { return x['n._key']; });
      }
      if (result.indexOf(id) === -1) {
        cb(null, result.length);
      } else {
        cb(null, result.length - 1);
      }
    }));
  },

  shortestPath: function (driver, collP, collR, path, i, cb) {
    var session = driver.session();
    session.run(
      'MATCH (s:' + collP + ' {_key:{from}}),(t:' + collP
      + ' {_key:{to}}), p = shortestPath((s)-[*..15]->(t)) RETURN [x in nodes(p) | x._key] as path',
      {from: path.from, to: path.to}
    ).subscribe(subscriptionWrapper(function (err, results) {
      session.close();
      if (err) return cb(err);
      var result = results[0];
      if (result.length === 0) cb(null, 0);
      else cb(null, result[0].path.length - 1);
    }))
  }
};
