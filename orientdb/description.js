'use strict';

var Oriento = require('oriento');

function capitalize(a) {
  return a.replace(/(^|\s|_)([a-z])/g, function (m, p1, p2) {return p1 + p2.toUpperCase();});
}

function orientName(name) {
  name = capitalize(name);

  if (name === 'Profiles') name = 'Profile';
  if (name === 'Profiles_Temp') name = 'Profile_Temp';

  return name;
}

var serversConn = [];
var serversNext = 0;
var serversMax = 25;

function nextServer () {
  if (++serversNext >= serversMax) {
    serversNext -= serversMax;
  }

  return serversConn[serversNext];
}

module.exports = {
  name: 'OrientDB',

  startup: function (host, cb) {
    for (var i = 0; i < serversMax; ++i) {
      var server = Oriento({
	host: host,
        port: 2424,
        username: 'root',
        password: 'abc'
      });

      serversConn.push(server.use('pokec'));
    }

    cb(nextServer);
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
    cb(null, orientName(name));
  },

  dropCollection: function (db, name, cb) {
    name = orientName(name);

    db().query('drop class ' + name)
    .then(function () {cb();})
    .catch(function (err) {cb(err);});
  },

  createCollection: function (db, name, cb) {
    name = orientName(name);

    db().query('create class ' + name)
    .then(function () {cb();})
    .catch(function (err) {cb(err);});
  },

  getDocument: function (db, coll, id, cb) {
    db().query('select * from ' + coll + ' where _key=:key',
             {params: {key: id}, limit: 1})
    .then(function (results) {cb(null, results[0]);})
    .catch(function (err) {cb(err);});
  },

  saveDocument: function (db, coll, doc, cb) {
    if (doc.children < 1) doc.children = 0; // why? OrientDB gives an unmarshalling error for 1e-10

    db().query('insert into ' + coll + ' content :body',
             {params: {body: doc}})
    .then(function (result) {cb(null, result);})
    .catch(function (err) {cb(err);});
  },

  aggregate: function (db, coll, cb) {
    db().query('select AGE,count(*) from ' + coll + ' group by AGE', {limit: 200})
    .then(function (result) {cb(null, result);})
    .catch(function (err) {cb(err);});
  },

  neighbors: function (db, collP, collR, id, i, cb) {
    db().query('select out()._key from ' + collP + ' where _key=:key', {params: {key: id}, limit: 1000})
    .then(function (result) {cb(null, result[0].out.length);})
    .catch(function (err) {cb(err);});
  },

  neighbors2: function (db, collP, collR, id, i, cb) {
   db().query('SELECT set(out()._key, out().out()._key) FROM ' + collP + ' WHERE _key = :key', {params: {key: id}})
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

  shortestPath: function (db, collP, collR, path, i, cb) {
    db().query('select shortestPath($a[0].rid, $b[0].rid, "Out") '
           + 'LET $a = (select @rid from PROFILE where _key = "' + path.from + '"), '
           + '$b = (select @rid from PROFILE where _key = "' + path.to + '")', {limit: 10000})
    .then(function (result) {cb(null, (result[0].shortestPath.length - 1));})
    .catch(function (err) {cb(err);});
  }
};
