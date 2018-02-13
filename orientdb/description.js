'use strict';

var OrientDB = require('orientjs');
var Promise = require('bluebird');

function capitalize(a) {
  return a.replace(/(^|\s|_)([a-z])/g, function (m, p1, p2) {return p1 + p2.toUpperCase();});
}

function orientName(name) {
  name = capitalize(name);

  if (name === 'Profiles') name = 'Profile';
  if (name === 'Profiles_Temp') name = 'Profile_Temp';
  if (name === 'Relations') name = 'Relation';

  return name;
}

module.exports = {
  name: 'OrientDB',

  startup: function (host, cb) {
    var server = OrientDB({
      host: host,
      port: 2424,
      username: 'root',
      password: 'root',
      pool: {
        max: 25
      }
    });

    var db = server.use({
      name: 'pokec'
    });
    db.open('admin', 'admin')
      .then(function (db) {
       cb(db);
    });
  },

  initClass: function (db, cb) {
    db.class.list()
      .then(function() {cb();})
      .catch(cb);
  },

  warmup: function (db, cb) {
    module.exports.getCollection(db, 'profiles', function (err, coll) {
      if (err) return cb(err);

      module.exports.aggregate(db, coll, function (err, result) {
        if (err) return cb(err);

        console.log('INFO warmup 1/3');

        var i;
        var j;
        var s = [];

        for (i = 1; i < 50; ++i) {
          for (j = 50; j < 100; ++j) {
            s.push(db.query('select shortestPath($a[0].rid, $b[0].rid, "Out") '
                            + 'LET $a = (select @rid from Profile where _key = "P' + i + '"), '
                            + '$b = (select @rid from Profile where _key = "P' + j + '")', {limit: 10000}));
          }
        }

        Promise.all(s).then(function () {

          console.log('INFO warmup 2/3');

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
                  console.log('INFO warmup 3/3');
                  console.log('INFO warmup done');
                  cb(null);
                }
              });
            }
          });
        }).catch(function (e) {
          cb(e);
        });
      });
    });
  },

  getCollection: function (db, name, cb) {
    cb(null, orientName(name));
  },

  dropCollection: function (db, name, cb) {
    name = orientName(name);

    db.query('drop class ' + name)
    .then(function () {cb();})
    .catch(function (err) {cb(err);});
  },

  createCollection: function (db, name, cb) {
    name = orientName(name);

    db.query('create class ' + name)
    .then(function () {
      module.exports.initClass(db, cb);
    })
    .catch(function (err) {cb(err);});
  },

  getDocument: function (db, coll, id, cb) {
    db.query('select * from ' + coll + ' where _key=:key',
      {params: {key: id}, limit: 1})
    .then(function (results) {cb(null, results[0]);})
    .catch(function (err) {cb(err);});
  },

  saveDocument: function (db, coll, doc, cb) {
    db.class.get(coll).then(function (klass) {
      klass.create(doc).then(function (rec) {
        cb(null, rec);
      }).catch(function (err) {
        cb(err);
      });
    });
  },

  aggregate: function (db, coll, cb) {
    db.query('select AGE,count(*) from ' + coll + ' group by AGE', {limit: 200})
    .then(function (result) {cb(null, result);})
    .catch(function (err) {cb(err);});
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    db.query('select out_' + collR + '._key as out from ' + collP + ' where _key=:key', {params: {key: id}, limit: 1000})
    .then(function (result) {cb(null, result[0].out ? result[0].out.length : 0);})
    .catch(function (err) {cb(err);});
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
    db.query('SELECT set(out_' + collR + '._key, out_' + collR + '.out_' + collR + '._key) FROM ' + collP + ' WHERE _key = :key', {params: {key: id}})
    .then(function (result) {
           var count = 0;
           var seen = {};
           var al = result[0].set;
           var an = al.length;

           seen[id] = true;

           for (var i1 = 0; i1 < an; ++i1) {
             if (!seen.hasOwnProperty(al[i1])) {
               seen[al[i1]] = true;
               ++count;
             }
           }

           cb(null, count);
         })
   .catch(function (err) {cb(err);});
 },

  neighbors2data: function (db, collP, collR, id, i, cb) {
    db.query('SELECT expand(set(out_' + collR + ', out_' + collR + '.out_' + collR + ')) FROM ' + collP + ' WHERE _key = :key', {params: {key: id}})
    .then(function (result) {
           var count = 0;
           var seen = {};
           var an = result.length;

           seen[id] = true;

           for (var i1 = 0; i1 < an; ++i1) {
             if (!seen.hasOwnProperty(result[i1]._key)) {
               seen[result[i1]._key] = true;
               ++count;
             }
           }

           cb(null, count);
         })
    .catch(function (err) {cb(err);});
  },

  shortestPath: function (db, collP, collR, path, i, cb) {
    db.query('select shortestPath($a[0].rid, $b[0].rid, "Out") '
           + 'LET $a = (select @rid from ' + collP + ' where _key = "' + path.from + '"), '
           + '$b = (select @rid from ' + collP + ' where _key = "' + path.to + '")', {limit: 10000})
    .then(function (result) {cb(null, (result[0].shortestPath.length - 1));})
    .catch(function (err) {cb(err);});
  }
};
