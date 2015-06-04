'use strict';

module.exports = {
  name: 'Neo4J',

  startup: function (host, cb) {
    var neo4j = require('seraph')({
      server: 'http://' + host + ':7474',
      user: 'neo4j',
      pass: 'abc'
    });

    cb(neo4j);
  },

  warmup: function (db, cb) {
    module.exports.getCollection(db, 'profiles', function (err, coll) {
      if (err) return cb(err);

      module.exports.aggregate(db, coll, function (err, result) {
        if (err) return cb(err);

        console.log('INFO warmup done');

        return cb(null);
      });
    });
  },

  getCollection: function (db, name, cb) {
    cb(null, name.toUpperCase());
  },

  dropCollection: function (db, name, cb) {
    name = name.toUpperCase();

    db.nodesWithLabel(name, function (err, results) {
      if (err) cb(err);

      console.log('INFO clearing %d documents in %s', results.length, name);

      var i = -1;
      var next = function (err) {
        // if (err) console.log('ERROR %s', err);
        if (err) cb(err);

        ++i;

        if (i === results.length) {
          cb();
        }
        else {
          var obj = {id: results[i].id};
          db.delete(obj, function (err) {
            next(err);
          });
        }
      };

      next();
    });
  },

  createCollection: function (db, name, cb) {
    cb();
  },

  getDocument: function (db, coll, id, cb) {
    var obj = {_key: 'P/' + id};
    db.find(obj, false, coll, cb);
  },

  saveDocument: function (db, coll, doc, cb) {
    db.save(doc, coll, cb);
  },

  aggregate: function (db, coll, cb) {
    db.query('MATCH (f:' + coll + ') WITH f.AGE as AGE RETURN AGE, count(*)',
      function (err, result) {
        if (err) return cb(err);

        cb(null, result.length);
      }
    );
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    db.query('MATCH (s:' + collP + ' {_key:{key}})-->(n:' + collP + ') RETURN n._key', {key: 'P/' + id},
      function (err, result) {
        if (err) return cb(err);

        if (result.length === undefined) cb(null, 1);
        else cb(null, result.length);
      }
    );
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    db.query('MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:' + collP + ') RETURN DISTINCT n._key', {key: 'P/' + id},
      function (err, result) {
        if (err) return cb(err);

        if (result.map === undefined) {
          result = [result['n._key']];
        }
        else {
          result = result.map(function (x) { return x['n._key']; });
        }

        if (result.indexOf('P/' + id) === -1) {
          cb(null, result.length);
        }
        else {
          cb(null, result.length - 1);
        }
      }
    );
  },

  neighbors3: function (db, collP, collR, id, i, cb) {
    db.query('MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:' + collP + ') RETURN DISTINCT n._key', {key: 'P/' + id},
      function (err, result) {
        if (err) return cb(err);

        result = result.map(function (x) { return x['n._key']; });

        if (result.indexOf('P/' + id) === -1) {
          cb(null, result.length);
        }
        else {
          cb(null, result.length - 1);
        }
      }
    );
  },

  shortestPath: function (db, collP, collR, path, i, cb) {
    db.query('MATCH (s:' + collP + ' {_key:{from}}),(t:' + collP + ' {_key:{to}}), p = shortestPath((s)-[*..15]->(t)) RETURN p',
      {from: 'P/' + path.from, to: 'P/' + path.to},
      function (err, result) {
        if (err) return cb(err);

        cb(null, result[0].length);
      }
    );
  }
};
