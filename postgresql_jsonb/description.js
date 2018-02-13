var _ = require("underscore");
var pgpLib = require("pg-promise");

// Initializing the library, with optional global settings: 
var pgp = pgpLib();

function normalizeName(name) {
  return name.toLowerCase();
}

module.exports = {
  name: 'PostgreSQL',
  isPostgreSQL: true,
  server: {},
  startup: function (host, cb) {
    var results = [];
    const cn = {
      host,
      port: 5432,
      database: 'pokec_json',
      user: 'postgres',
      password: 'postgres',
      min: 0,
      max: 25
    }
    cb(pgp(cn));
  },

  warmup: function (db, cb) {
    module.exports.getVersion(db, "", function (err, result) {
      if (err)  return cb(err);
      
      console.log('INFO version ' + JSON.stringify(result));

      module.exports.loadRelations(db, 'relations', function (err, table) {
        if (err) return cb(err);

        console.log('INFO step 1/3 done');

        module.exports.aggregate(db, "Profiles", function (err, result) {
          if (err)  return cb(err);
        
          console.log('INFO step 2/3 done');

          module.exports.getCollection(db, 'Profiles', function (err, coll) {
            if (err) return cb(err);

            var warmupIds = require('../data/warmup1000');
            var goal = 1000;
            var total = 0;
            for (var i = 0; i < goal; i++) {
              module.exports.getDocument(db, coll, warmupIds[i], function (err, result) {
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

  getVersion: function (db, name, cb) {
    db.query('select version();')
      .then(function (result) {cb(null, result);})
      .catch(function (err) {cb(err);});
  },
  
  loadRelations: function (db, name, cb) {
    db.query('select right(_from, 1) as lastdigit, count(*) from relations group by lastdigit;')
      .then(function () {cb();})
      .catch(function (err) {cb(err);});
  },

  getCollection: function (db, name, cb) {
    cb(null, normalizeName(name));
  },

  dropCollection: function (db, name, cb) {
    name = normalizeName(name);
    
    db.query('drop sequence genID')
      .then(function () {
        db.query('drop table ' + name)
          .then(function () {cb();})
          .catch(function (err) {cb(err);});
      })
      .catch(function (err) {cb(err);});
  },

  createCollection: function (db, name, cb) {
    name = normalizeName(name);

    db.query('create table ' + name + '(id VARCHAR PRIMARY KEY, structure json)')
      .then(function () {
        db.query("create sequence genID start 1", [])
          .then(function (result) {cb(null, result);})
          .catch(function (err) {cb(err);});
      })
      .catch(function (err) {cb(err);});
  },

  getDocument: function (db, table, id, cb) {
    db.query('select * from ' + table + ' where _key=$1', [id])
      .then(function (results) {cb(null, results[0]);})
      .catch(function (err) {cb(err);});
  },

  count: 0,
  saveDocument: function (db, table, doc, cb) {
    db.query("insert into " + table + "  (id, structure) values(nextval('genID'), $1)", [JSON.stringify(doc)])
      .then(function (result) {cb(null, result);})
      .catch(function (err) {cb(err);});
  },

  aggregate: function (db, table, cb) {
    db.query("select data->>'AGE', count(*) from " + table + " group by data->>'AGE'", [])
      .then(function (result) {cb(null, result);})
      .catch(function (err) {cb(err);});
  },

  neighbors: function (db, tableP, tableR, id, i, cb) {
    db.query("select distinct _to from relations where _from=$1 limit $2", [id, 1000])
      .then(function (result) {cb(null, result.length);})
      .catch(function (err) {cb(err);});
  },

  neighbors2: function (db, tableP, tableR, id, i, cb) {
    db.query("select _to from relations where _from = $1 union distinct select _to from relations where _to != ($1) and _from in (select  _to from relations where _from = $1)", [id])
   .then(function (result) {cb(null, result.length);})
   .catch(function (err) {cb(err);});
  },

  neighbors2data: function (db, tableP, tableR, id, i, cb) {
    db.query("select * from profiles where _key in (select _to from relations where _from = $1 union distinct select _to from relations where _to != ($1) and _from in (select  _to from relations where _from = $1))", [id])
   .then(function (result) {cb(null, result.length);})
   .catch(function (err) {cb(err);});
  },
};
