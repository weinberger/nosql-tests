'use strict';

let args = process.argv.slice(2);
if (args.length !== 2) {
  console.log("Usage:");
  console.log("     node toJsonParser.js profiles.csv profiles.json");
  process.exit(0);
}

let profilesIN = args[0];
let profilesOUT = args[1];

let fs = require('fs');
let LineByLineReader = require('line-by-line');

let transform = (name, input, output, header) => {
  let lr = new LineByLineReader(input);

  fs.open(output, 'w', (err, fd) => {
    if (err) {
      throw err;
    }
    let count = 0;

    fs.writeSync(fd, 'id\tdata\r\n');

    lr.on('line', function (line) {
      ++count;
      if (count % 10000 === 0) {
        console.log("Processed:", count, `${name}...`);
      }
      let entries = line.split('\t');
      let doc = '{';
      let first = true;
      for (let i = 0; i < entries.length; ++i) {
        if (entries[i] !== 'null') {
          if (first) {
            first = false;
          } else {
            doc += ",";
          }
          doc += `""${header[i]}"":""${entries[i]}""`;
        }
      }
      doc += '}';
      fs.writeSync(fd, `"${entries[0]}"\t"${doc}"\r\n`);
    });

    lr.on('end', () => {
      fs.close(fd, () => {
        console.log(`${name} done`);
        console.log('Total', count);
      });
    });
  
  });
};

transform('Profiles', profilesIN, profilesOUT, ['_key','public','completion_percentage','gender','region','last_login','registration','AGE','body','I_am_working_in_field','spoken_languages','hobbies','I_most_enjoy_good_food','pets','body_type','my_eyesight','eye_color','hair_color','hair_type','completed_level_of_education','favourite_color','relation_to_smoking','relation_to_alcohol','sign_in_zodiac','on_pokec_i_am_looking_for','love_is_for_me','relation_to_casual_sex','my_partner_should_be','marital_status','children','relation_to_children','I_like_movies','I_like_watching_movie','I_like_music','I_mostly_like_listening_to_music','the_idea_of_good_evening','I_like_specialties_from_kitchen','fun','I_am_going_to_concerts','my_active_sports','my_passive_sports','profession','I_like_books','life_style','music','cars','politics','relationships','art_culture','hobbies_interests','science_technologies','computers_internet','education','sport','movies','travelling','health','companies_brands','more']);
