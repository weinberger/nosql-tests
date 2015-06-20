'use strict';

var Database = require('arangojs');
var opts = {maxSockets: 25, keepAlive: true, keepAliveMsecs: 1000};
var Agent = require('http').Agent;

module.exports = {
  name: 'ArangoDB',

  startup: function (host, cb) {
    var db = new Database({
      url: 'http://' + host + ':8529',
      agent: new Agent(opts),
      fullDocument: false,
      promisify: false,
      promise: false
    });

    cb(db);
  },

  warmup: function (db, cb) {
    module.exports.getCollection(db, 'profiles', function (err, coll) {
      if (err) return cb(err);
      module.exports.aggregate(db, coll, function (err, result) {
        if (err) return cb(err);
        console.log('INFO step 1/2 done');

        module.exports.getCollection(db, 'relations', function (err, coll) {
          if (err) return cb(err);
          module.exports.aggregate2(db, coll, function (err, result) {
            if (err) return cb(err);
            console.log('INFO step 2/2 done');
            console.log('INFO warmup done');
            return cb(null);
          });
        });
      });
    });
  },

  getCollection: function (db, name, cb) {
    db.collection(name, cb);
  },

  dropCollection: function (db, name, cb) {
    db.dropCollection(name, cb);
  },

  createCollection: function (db, name, cb) {
    db.createCollection(name, cb);
  },

  createCollectionSync: function (db, name, cb) {
    db.createCollection({name: name, waitForSync: true}, cb);
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

  aggregate2: function (db, coll, cb) {
    db.query('FOR x IN ' + coll.name + ' FILTER x._from > "" COLLECT a=1 WITH COUNT INTO counter RETURN {amount: counter}', cb);
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    db.query('RETURN {i: ' + i + ', p: NEIGHBORS(' + collP.name
             + ', ' + collR.name + ', @key, "outbound", [], {includeData:false})}', {key: collP.name + '/' + id},
      function (err, result) {
        if (err) return cb(err);

        result.all(function (err, v) {
          if (err) return cb(err);

          cb(null, v[0].p.length);
        });
      }
    );
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    db.query('RETURN {i: ' + i + ', p: NEIGHBORS(' + collP.name
             + ', ' + collR.name + ', @key, "outbound", [], {minDepth:0 , maxDepth: 2, includeData: false})}', {key: collP.name + '/' + id},
      function (err, result) {
        if (err) return cb(err);

        result.all(function (err, v) {
          if (err) return cb(err);

          cb(null, v[0].p.length);
        });
      }
    );
  },

  shortestPath: function (db, collP, collR, path, i, cb) {
    db.query('RETURN {i: ' + i + ', p: SHORTEST_PATH(' + collP.name + ', ' + collR.name
      + ', @from, @to, "outbound", {includeData: false}), from: @from, to: @to}',
      {from: 'profiles/' + path.from, to: 'profiles/' + path.to}, function (err, result) {
        if (err) return cb(err);

        result.all(function (err, v) {
          if (err) return cb(err);

          var p = v[0].p;
          cb(null, (p === null) ? 0 : (p.vertices.length - 1));
        });
      }
    );
  }
};
