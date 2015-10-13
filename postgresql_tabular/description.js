'use strict';

// Initializing the library, with optional global settings: 
var pgpLib = require("pg-promise");
var pgp = pgpLib({poolSize: 25});
pgp.pg.defaults.poolSize=25;

var columns = [
    "AGE",
    "I_am_going_to_concerts",
    "I_am_working_in_field",
    "I_like_books",
    "I_like_movies",
    "I_like_music",
    "I_like_specialties_from_kitchen",
    "I_like_watching_movie",
    "I_most_enjoy_good_food",
    "I_mostly_like_listening_to_music",
    "art_culture",
    "body",
    "body_type",
    "cars",
    "children",
    "companies_brands",
    "completed_level_of_education",
    "completion_percentage",
    "computers_internet",
    "education",
    "eye_color",
    "favourite_color",
    "fun",
    "gender",
    "hair_color",
    "hair_type",
    "health",
    "hobbies",
    "hobbies_interests",
    "last_login",
    "life_style",
    "love_is_for_me",
    "marital_status",
    "more",
    "movies",
    "music",
    "my_active_sports",
    "my_eyesight",
    "my_partner_should_be",
    "my_passive_sports",
    "on_pokec_i_am_looking_for",
    "pets",
    "politics",
    "profession",
    "public",
    "region",
    "registration",
    "relation_to_alcohol",
    "relation_to_casual_sex",
    "relation_to_children",
    "relation_to_smoking",
    "relationships",
    "science_technologies",
    "sign_in_zodiac",
    "spoken_languages",
    "sport",
    "the_idea_of_good_evening",
    "travelling"
];

function normalizeName(name) {
  return name.toLowerCase();
}

module.exports = {
  name: 'PostgreSQL tabular',
  isPostgreSQL: true,
  server: {},
  singleWriteQuery : "",
  
  startup: function (host, cb) {
    var insertColumns = ['id'];
    var binds = [];

    for (var i in columns) {
      insertColumns.push(columns[i]);
      var j = parseInt(i, 10) + 1;
      binds.push('$'+ j);
    }
    module.exports.singleWriteQuery = "insert into profiles_temp  (" + insertColumns.join(", ") + ") values(nextval('genID'), " + binds.join(", ") + ")";

    var connectionString = 'postgres://mypguser:mypguserpass@' + host + ':5432/pokec_tabular';

    cb(pgp(connectionString));
  },

  warmup: function (db, cb) {
    module.exports.loadRelations(db, 'relations', function (err, table) {
      if (err) return cb(err);

      console.log('INFO warmup 1/2');

      module.exports.aggregate(db, "profiles", function (err, result) {
        if (err)  return cb(err);
        
        console.log('INFO warmup 2/2');
        console.log('INFO warmup done');

        return cb(null);
      });
    });
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

    db.query('create table ' + name + '(id VARCHAR PRIMARY KEY,' + columns.join(" VARCHAR, ") + ' VARCHAR)')
      .then(function () {
        db.query("create sequence genID start 1", [])
          .then(function (result) {cb(null, result);})
          .catch(function (err) {cb(err);});
      })
      .catch(function (err) {cb(err);});
  },

  getDocument: function (db, table, id, cb) {
    db.query('select * from profiles where id=$1',[id])
      .then(function (results) {cb(null, results[0]);})
      .catch(function (err) {cb(err);});
  },
  filter: /\$$/,
  saveDocument: function (db, table, doc, cb) {
    var onecolumn = [];
    for (var i in columns) {
      if (doc.hasOwnProperty(columns[i])) {
        var str = doc[columns[i]];
        onecolumn.push(str);
      }
      else {
        onecolumn.push(null);
      }
    }

    db.query(module.exports.singleWriteQuery, onecolumn)
      .then(function (result) {cb(null, result);})
      .catch(function (err) { 
        console.log(" values " + onecolumn.length);
        console.log(" err " + err);
        console.log(onecolumn);
        console.log(doc);
        
        cb(err);
      });
  },

  aggregate: function (db, table, cb) {
    db.query("select AGE, count(*) from profiles group by AGE", [])
      .then(function (result) {cb(null, result);})
      .catch(function (err) {cb(err);});

  },

  neighbors: function (db, tableP, tableR, id, i, cb) {
    db.query("select distinct _to from relations where _from=$1 limit $2", [id, 1000])
      .then(function (result) {cb(null, result.length);})
      .catch(function (err) {console.log(err); cb(err);});

  },

  neighbors2: function (db, tableP, tableR, id, i, cb) {
    db.query("select _to from relations where _from = $1 union distinct select _to from relations where _to != $1 and _from in (select  _to from relations where _from = $1)", [id])
     .then(function (result) {
       cb(null, result.length);
     })
     .catch(function (err) {cb(err);});
  },

  neighbors2data: function (db, tableP, tableR, id, i, cb) {
    db.query("select * from profiles where id in (select _to from relations where _from = $1 union distinct select _to from relations where _to != $1 and _from in (select  _to from relations where _from = $1))", [id])
     .then(function (result) {
       cb(null, result.length);
     })
     .catch(function (err) {cb(err);});
  },
};
  
