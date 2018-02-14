'use strict';

var MongoClient = require('mongodb').MongoClient;

module.exports = {
  name: 'MongoDB',

  startup: function (host, cb) {
    MongoClient.connect('mongodb://' + host + ':27017/pokec', {
      autoReconnect: true,
      poolSize: 25,
      keepAlive: 1
    }, function (err, client) {
      if (err) return console.log(err);

      cb(client.db('pokec'));
    });
  },

  warmup: function (db, cb) {
    module.exports.getCollection(db, 'profiles', function (err, coll) {
      if (err) return cb(err);

      coll.aggregate([{$group: {_id: '$AGE', count: {$sum: 1}}}], function (err, result) {
        if (err) return cb(err);

        console.log('INFO step 1/3 done');

        module.exports.getCollection(db, 'relations', function (err, coll) {
          if (err) return cb(err);

          coll.count({_from: {$gt: ''}}, function (err, result) {
            if (err) return cb(err);

            console.log('INFO step 2/3 done');

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

  createCollectionSync: function (db, name, cb) {
    db.createCollection(name, cb);
  },

  getDocument: function (db, coll, id, cb) {
    coll.findOne({_id: id}, cb);
  },

  saveDocument: function (db, coll, doc, cb) {
    coll.insert(doc, {w: 1}, cb);
  },

  saveDocumentSync: function (db, coll, doc, cb) {
    coll.insert(doc, {w: 1, j: true}, cb);
  },

  aggregate: function (db, coll, cb) {
    coll.aggregate([{$group: {_id: '$AGE', count: {$sum: 1}}}]).toArray(function (err, result) {
      if (err) return cb(err);

      cb(null, result.length);
    });
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    collR.aggregate([
      {$match: {_from: id}},
      {$lookup: {
        from: collP.s.name,
        localField: '_to',
        foreignField: '_id',
        as: 'profile'
      }},
      {$project: {_id: 0, "profile._id": 1}}
    ]).toArray(function (err, result) {
      if (err) return cb(err);

      cb(null, result.length);
    });
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    collR.aggregate([
      {$match: {_from: id}},
      {$lookup: {from: collR.s.name, localField: '_to', foreignField: '_from', as: 'n2'}},
      {$project: {_id: 0, temp: {$concatArrays: [['$_to'], '$n2._to']}}},
      {$unwind: '$temp'},
      {$group: {_id: null, n2Set: {$addToSet: '$temp'}}},
      {$project: {_id: 0, n2List: {$setDifference: ['$n2Set', [id]]}}},
      {$unwind: '$n2List'},
      {$lookup: {from: collP.s.name, localField: 'n2List', foreignField: '_id', as: 'profile'}},
      {$project: {_id: 0, "profile._id": 1}}
    ]).toArray(function (err, result) {
      if (err) return cb(err);

      cb(null, result.length);
    });
  },

  neighbors2data: function (db, collP, collR, id, i, cb) {
    collR.aggregate([
      {$match: {_from: id}},
      {$lookup: {from: collR.s.name, localField: '_to', foreignField: '_from', as: 'n2'}},
      {$project: {_id: 0, temp: {$concatArrays: [['$_to'], '$n2._to']}}},
      {$unwind: '$temp'},
      {$group: {_id: null, n2Set: {$addToSet: '$temp'}}},
      {$project: {_id: 0, n2List: {$setDifference: ['$n2Set', [id]]}}},
      {$unwind: '$n2List'},
      {$lookup: {from: collP.s.name, localField: 'n2List', foreignField: '_id', as: 'profile'}}
    ]).toArray(function (err, result) {
      if (err) return cb(err);

      cb(null, result.length);
    });
  }

};
