'use strict';

var _ = require('underscore');
var MongoClient = require('mongodb').MongoClient;

module.exports = {
  name: 'MongoDB',

  startup: function (host, cb) {
    MongoClient.connect('mongodb://' + host + ':27017/pokec', {
      server: {
              auto_reconnect: true,
              poolSize: 25,
              socketOptions: {keepAlive: 1}
      }
    }, function (err, db) {
      if (err) return console.log(err);
      cb(db);
    });
  },

  warmup: function (db, cb) {
    module.exports.getCollection(db, 'profiles', function (err, coll) {
      if (err) return cb(err);
      coll.aggregate([{$group: {_id: '$AGE', count: {$sum: 1}}}], function (err, result) {
        if (err) return cb(err);
        console.log('INFO step 1/2 done');

        module.exports.getCollection(db, 'relations', function (err, coll) {
          if (err) return cb(err);
          coll.count({_from: {$gt: ''}}, function (err, result) {
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
    cb(null, db.collection(name));
  },

  dropCollection: function (db, name, cb) {
    db.dropCollection(name, cb);
  },

  createCollection: function (db, name, cb) {
    db.createCollection(name, cb);
  },

  getDocument: function (db, coll, id, cb) {
    coll.findOne({_id: id}, cb);
  },

  saveDocument: function (db, coll, doc, cb) {
    coll.insert(doc, {w: 1}, cb);
  },

  aggregate: function (db, coll, cb) {
    coll.aggregate([{$group: {_id: '$AGE', count: {$sum: 1}}}], cb);
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    collR.find({_from: 'P/' + id}).toArray(function (err, result) {
      if (err) return cb(err);

      result = result.map(function (e) { return e._to.substr(2); });
      cb(null, result.length);
    });
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    collR.find({_from: 'P/' + id}).toArray(function (err, result) {
      if (err) return cb(err);

      result = result.map(function (e) { return e._to; });

      collR.find({_from: {$in: result}}).toArray(function (err, result2) {
        if (err) return cb(err);

        result = result.map(function (e) { return e.substr(2); });
        result2 = result2.map(function (e) { return e._to.substr(2); });

        result2 = _.union(result, result2);

        if (result2.indexOf(id) === -1) {
          cb(null, result2.length);
        }
        else {
          cb(null, result2.length - 1);
        }
      });
    });
  }
};
