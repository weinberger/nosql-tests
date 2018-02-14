'use strict';

var opts = {maxSockets: 25};
var Agent = require('http').Agent;
var Neo4j = require('neo4j-driver').v1;

module.exports = {
  name: 'Neo4J',
  CONCURRENCY: 25,

  startup: function (host, cb) {
    var driver = Neo4j.driver('bolt://' + host + ':7687');
    var db = driver.session();
    cb(db);
  },

 warmup: function (db, cb) {
    db.run('MATCH (:PROFILES)--() return count(*) as count').then(
      function (result) {
        console.log('INFO step 1/2 done');

        module.exports.getCollection(db, 'profiles', function (err, coll) {
          if (err) return cb(err);

          var warmupIds = require('../data/warmup1000');
          var goal = 1000;
          var total = 0;
          for (var i = 0; i < goal; i++) {
            module.exports.getDocument(db, coll, warmupIds[i], function (err, result) {
              if (err) return cb(err);
              ++total;
              if (total === goal) {
                console.log('INFO step 2/2 done');
                console.log('INFO warmup done');
                cb(null);
              }
            });
          }
        });
      }
    ).catch(function (err) {
      return cb(err); 
    });
  },

  getCollection: function (db, name, cb) {
    cb(null, name.toUpperCase());
  },

  dropCollection: function (db, name, cb) {
    name = name.toUpperCase();

    db.run('MATCH (n:' + name + ') DELETE n').then(
      function (result) { cb(null, result); }).catch(function (err) { cb(err); });
  },

  createCollectionSync: function (db, name, cb) {
    cb();
  },

  getDocument: function (db, coll, id, cb) {
    db.run('MATCH (f:' + coll + ' {_key:{key}}) RETURN f', {key: id}).then(
      function (result) { cb(null, result); }).catch(function (err) { cb(err); });
  },

  saveDocumentSync: function (db, coll, doc, cb) {
    db.run('CREATE (f:' + coll + ' {doc})', {doc: doc}).then(
      function (result) { cb(null, result); }).catch(function (err) { cb(err); });
  },

  aggregate: function (db, coll, cb) {
    db.run('MATCH (f:' + coll + ') RETURN f.AGE, count(*)').then(
      function (result) {
        cb(null, result.records.length);
      }).catch(function (err) {
        return cb(err);
      });
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    db.run('MATCH (s:' + collP + ' {_key:{key}})-->(n:' + collP + ') RETURN n._key', {key: id}).then(
      function (result) {
        result = result.records;
        if (result.length === undefined) cb(null, 1);
        else cb(null, result.length);
      }).catch(function (err) {
        return cb(err);
      });
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    db.run('MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:' + collP + ') RETURN DISTINCT n._key', {key: id}).then(
      function (result) {
        result = result.records;
        if (result.map === undefined) {
          result = [result.get('n._key')];
        } else {
          result = result.map(function (x) { return x.get('n._key'); });
        }
        if (result.indexOf(id) === -1) {
          cb(null, result.length);
        } else {
          cb(null, result.length - 1);
        }
      }).catch(function (err) {
        return cb(err);
      });
  },

  neighbors2data: function (db, collP, collR, id, i, cb) {
    db.run('MATCH (s:' + collP + ' {_key:{key}})-[*1..2]->(n:' + collP + ') RETURN DISTINCT n._key, n', {key: id}).then(
      function (result) {
        result = result.records;
        if (result.map === undefined) {
          result = [result.get('n._key')];
        } else {
          result = result.map(function (x) { return x.get('n._key'); });
        }
        if (result.indexOf(id) === -1) {
          cb(null, result.length);
        } else {
          cb(null, result.length - 1);
        }
      }).catch(function (err) {
        return cb(err);
      });
  },
  
  shortestPath: function (db, collP, collR, path, i, cb) {
    db.run('MATCH (s:' + collP + ' {_key:{from}}),(t:'
             + collP + ' {_key:{to}}), p = shortestPath((s)-[*..15]->(t)) RETURN [x in nodes(p) | x._key] as path',
             {from: path.from, to: path.to}).then(
              function (result) {
                result = result.records;
                if (result.length === 0) {
                  cb(null, 0);
                } else {
                  cb(null, (result[0].get('path').length - 1));
                }
              }).catch(function (err) {
                return cb(err);
              });
  }
};
