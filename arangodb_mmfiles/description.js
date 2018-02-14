'use strict';

var Database = require('arangojs');
var opts = {
  maxSockets: 25, 
  keepAlive: true, 
  keepAliveMsecs: 1000
};
var Agent = require('http').Agent;

module.exports = {
  name: 'ArangoDB',

  startup: function (host, cb) {
    var db = new Database({
      url: 'http://' + host + ':8529',
      agent: new Agent(opts),
      fullDocument: false
    });

    cb(db);
  },

  warmup: function (db, cb) {
    module.exports.getCollection(db, 'profiles', function (err, coll) {
      if (err) return cb(err);
      coll.load(function (err, result) {
        if (err) return cb(err);
        console.log('INFO step 1/3 done');
        module.exports.getCollection(db, 'relations', function (err, coll2) {
          if (err) return cb(err);
            coll2.load(function (err, result) {
            if (err) return cb(err);
            console.log('INFO step 2/3 done');
            var warmupIds = require('../data/warmup1000');
            var goal = 1000;
            var total = 0;
            for (var i = 0; i < goal; i++) {
              module.exports.getDocument(db, coll, warmupIds[i], function (err, result) {
                if (err) return cb(err);

                ++total;
                if (total === goal) {
                  console.log('INFO step 3/3 done');
                  console.log('INFO warmup done');
                  return cb(null);
                }
              }); 
            }  
          });
        });
      });
    });
  },

  getCollection: function (db, name, cb) {
    cb(undefined, db.collection(name));
  },

  dropCollection: function (db, name, cb) {
    db.collection(name).drop(cb);
  },

  createCollection: function (db, name, cb) {
    db.collection(name).create(cb);
  },

  createCollectionSync: function (db, name, cb) {
    db.collection(name).create({waitForSync: true}, cb);
  },

  getDocument: function (db, coll, id, cb) {
    coll.document(id, cb);
  },

  saveDocument: function (db, coll, doc, cb) {
    coll.save(doc, cb);
  },

  saveDocumentSync: function (db, coll, doc, cb) {
    coll.save(doc, cb);
  },

  aggregate: function (db, coll, cb) {
    db.query('FOR x IN ' + coll.name + ' COLLECT age = x.AGE WITH COUNT INTO counter RETURN {age: age, amount: counter}', cb);
  },

  aggregate2: function (db, coll, coll2, cb) {
    db.query('LET tmp = (FOR y IN ' + coll.name + ' FOR x IN ' + coll2.name + ' FILTER x._from == CONCAT("' + coll.name + '", y._key) OR x._to == CONCAT("' + coll.name + '", y._key) COLLECT a=1 WITH COUNT INTO counter RETURN {amount: counter}) RETURN LENGTH(tmp)', cb);
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    db.query('FOR v IN OUTBOUND @key ' + collR.name + ' OPTIONS {bfs: true, uniqueVertices: "global"} RETURN v._id',
      {key: collP.name + '/' + id},
      function (err, result) {
        if (err) return cb(err);

        result.all(function (err, v) {
          if (err) return cb(err);

          cb(null, v.length);
        });
      }
    );
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    db.query('FOR v IN 1..2 OUTBOUND @key ' + collR.name + ' OPTIONS {bfs: true, uniqueVertices: "global"} RETURN v._id',
      {key: collP.name + '/' + id},
      function (err, result) {
        if (err) return cb(err);

        result.all(function (err, v) {
          if (err) return cb(err);

          cb(null, v.length);
        });
      }
    );
  },

  neighbors2data: function (db, collP, collR, id, i, cb) {
    db.query('FOR v IN 1..2 OUTBOUND @key ' + collR.name + ' OPTIONS {bfs: true, uniqueVertices: "global"} RETURN v',
             {key: collP.name + '/' + id},
      function (err, result) {
        if (err) return cb(err);

        result.all(function (err, v) {
          if (err) return cb(err);

          cb(null, v.length);
        });
      }
    );
  },

  shortestPath: function (db, collP, collR, path, i, cb) {
    db.query('FOR v IN OUTBOUND SHORTEST_PATH @from TO @to ' + collR.name + ' RETURN v._id', 
       {from: 'profiles/' + path.from, to: 'profiles/' + path.to}, function (err, result) {
        if (err) return cb(err);

        result.all(function (err, v) {
          if (err) return cb(err);

          cb(null, (v.length === 0) ? 0 : (v.length - 1));
        });
      }
    );
  }
};
