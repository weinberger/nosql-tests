'use strict';

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
    coll.aggregate([{$group: {_id: '$AGE', count: {$sum: 1}}}], cb);
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    collR.find({_from: id},{_to: true, _id:false}).toArray(function (err, result) {
      if (err) return cb(err);

      cb(null, result.length);
    });
  },

  neighborsData: function (db, collP, collR, id, i, cb) {
    collR.aggregate([
      {$match:{_from: id}},
      {$lookup:{from: collP.s.name, localField: '_to', foreignField: '_id', as: 'profileData'}},
      {$project:{_id:0,_to:1,profileData:1}}
    ]).toArray(function (err, result) {
      if (err) return cb(err);

      cb(null, result.length);
    });
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    collR.aggregate([
      {$match:{_from: id}},
      {$lookup:{from: collR.s.name, localField: '_to', foreignField: '_from', as: 'secDegN'}},
      {$project: {_id:0, temp: {$setUnion: [['$_to'],'$secDegN._to']}}},
      {$unwind: '$temp'},
      {$group: {_id: null, nSet: {$addToSet: '$temp'}}},
      {$project: {_id: 0,  neighbors2:{$setDifference:['$nSet',[id]]}}}
    ]).toArray(function (err, result) {
      if (err) return cb(err);

      if(result.length === 1) {
        cb(null,result[0].neighbors2.length);
      } else {
        cb(null,0);
      }
    });
  },

  neighbors2data: function (db, collP, collR, id, i, cb) {
    collR.aggregate([
      {$match:{_from: id}},
      {$lookup:{from: collR.s.name, localField: '_to', foreignField: '_from', as: 'secDegN'}},
      {$project: {_id:0, temp: {$setUnion: [['$_to'],'$secDegN._to']}}},
      {$unwind: '$temp'},
      {$group: {_id: null, nSet: {$addToSet: '$temp'}}},
      {$project: {_id: 0,  neighbors2:{$setDifference:['$nSet',[id]]}}},
      {$unwind: '$neighbors2'},
      {$lookup: {from: collP.s.name, localField: 'neighbors2', foreignField: '_id', as: 'profileData'}}
    ]).toArray(function (err, result) {
      if (err) return cb(err);

      cb(null,result.length);
    });
  }
};
