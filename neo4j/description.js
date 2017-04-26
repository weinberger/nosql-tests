'use strict';

var opts = {maxSockets: 25};
//var Agent = require('http').Agent;
var Neo4j = require('node-neo4j');

module.exports = {
  name: 'Neo4J',
  CONCURRENCY: 32,

  startup: function (host, cb) {
    var db = new Neo4j('http://' + host + ':7474');

    cb(db);
  },

 warmup: function (db, cb) {
    db.cypherQuery('MATCH (n) return count(n)',
      function (err, result) {
        if (err) return cb(err);

        console.log('INFO warmup done, relationships ' + result.data);

        cb(null);
      }
    );
  },

  getCollection: function (db, name, cb) {
    cb(null, name.toUpperCase());
  },

  dropCollection: function (db, name, cb) {
    name = name.toUpperCase();

    db.cypherQuery('MATCH (n:' + name + ') DELETE n', cb);
  },

  createCollectionSync: function (db, name, cb) {
    cb();
  },

  getDocument: function (db, coll, id, cb) {
    db.cypherQuery('MATCH (f:' + coll + ' {_key:{key}}) RETURN f',
               {key: id}, cb);
  },

  saveDocumentSync: function (db, coll, doc, cb) {
    db.cypherQuery('CREATE (f:' + coll + ' {doc})',
               {doc: doc},cb);
  },

  aggregate: function (db, coll, cb) {
    db.cypherQuery('MATCH (f:' + coll + ') RETURN f.AGE, count(*)',

              function (err, result) {
                if (err) return cb(err);

                cb(null, result.data.length);
              });
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    db.cypherQuery('MATCH (s:' + collP + ' {_key:{key}})-->(n:' + collP + ') RETURN n._key',
               {key: id},

              function (err, result) {
                if (err) return cb(err);

                if (result.length === undefined) cb(null, 1);
                else cb(null, result.data.length);
              });
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    db.cypherQuery('MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:'
                      + collP + ') RETURN DISTINCT n._key',
               {key: id},

              function (err, result) {
                if (err) return cb(err);

                if (result.map === undefined) {
                  result = [result['n._key']];
                }
                else {
                  result = result.map(function (x) { return x['n._key']; });
                }

                if (result.indexOf(id) === -1) {
                  cb(null, result.length);
                }
                else {
                  cb(null, result.length - 1);
                }
              });
  },

  neighbors2data: function (db, collP, collR, id, i, cb) {
    db.cypherQuery('MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:'
                      + collP + ') RETURN DISTINCT n._key, n',
               {key: id},

              function (err, result) {
                if (err) return cb(err);

                if (result.map === undefined) {
                  result = [result['n._key']];
                }
                else {
                  result = result.map(function (x) { return x['n._key']; });
                }

                if (result.indexOf(id) === -1) {
                  cb(null, result.length);
                }
                else {
                  cb(null, result.length - 1);
                }
              });
  },
  
  shortestPath: function (db, collP, collR, path, i, cb) {
    db.cypherQuery('MATCH (s:' + collP + ' {_key:{from}}),(t:'
                      + collP + ' {_key:{to}}), p = shortestPath((s)-[*..15]->(t)) RETURN [x in nodes(p) | x._key] as path',
               {from: path.from, to: path.to},

              function (err, result) {
                if (err) return cb(err);

                if (result.length === 0) {cb(null, 0);}
                else {
					//console.log(result.data[0]);
					cb(null, (result.data[0].length - 1));}
              });
  }
};
