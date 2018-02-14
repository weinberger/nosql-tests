#!/bin/bash
set -e

# import: POKEC Dataset from Stanford Snap
# https://snap.stanford.edu/data/soc-pokec-readme.txt

echo "Usage [pokec.db] [path-to-mongodb] [path-to-benchmark]"
MONGODB=${2-databases}
DB=$MONGODB/data/databases/${1-pokec}
BENCHMARK=${3-`pwd`}
TMP=/tmp/nosqlbenchmark
DOWNLOADS=$TMP/downloads

PROFILES_IN=$DOWNLOADS/soc-pokec-profiles.txt.gz
PROFILES_OUT=$DOWNLOADS/soc-pokec-profiles-mongodb.txt.gz

RELATIONS_IN=$DOWNLOADS/soc-pokec-relationships.txt.gz
RELATIONS_OUT=$DOWNLOADS/soc-pokec-relationships-mongodb.txt.gz

echo "DATABASE: $DB"
echo "MONGODB DIRECTORY: $MONGODB"
echo "BENCHMARK DIRECTORY: $BENCHMARK"
echo "DOWNLOAD DIRECTORY: $DOWNLOADS"

$BENCHMARK/downloadData.sh

if [ ! -f $PROFILES_OUT ]; then
  echo "Converting PROFILES"
  echo '_id	public	completion_percentage	gender	region	last_login	registration	AGE	body	I_am_working_in_field	spoken_languages	hobbies	I_most_enjoy_good_food	pets	body_type	my_eyesight	eye_color	hair_color	hair_type	completed_level_of_education	favourite_color	relation_to_smoking	relation_to_alcohol	sign_in_zodiac	on_pokec_i_am_looking_for	love_is_for_me	relation_to_casual_sex	my_partner_should_be	marital_status	children	relation_to_children	I_like_movies	I_like_watching_movie	I_like_music	I_mostly_like_listening_to_music	the_idea_of_good_evening	I_like_specialties_from_kitchen	fun	I_am_going_to_concerts	my_active_sports	my_passive_sports	profession	I_like_books	life_style	music	cars	politics	relationships	art_culture	hobbies_interests	science_technologies	computers_internet	education	sport	movies	travelling	health	companies_brands	more'  > $PROFILES_OUT
  gunzip < $PROFILES_IN | sed -e 's/null//g' -e 's~^~P~' >> $PROFILES_OUT
fi

if [ ! -f $RELATIONS_OUT ]; then
  echo "Converting RELATIONS"
  echo '_from	_to' > $RELATIONS_OUT
  gzip -dc $RELATIONS_IN | awk -F"\t" '{print "P" $1 "\tP" $2}' >> $RELATIONS_OUT
fi

if [ "$MONGODB" == "system" ];  then
  MONGODB=/usr
fi

${MONGODB}/bin/mongoimport --db=pokec --collection=profiles --headerline --type=tsv $PROFILES_OUT
${MONGODB}/bin/mongoimport --db=pokec --collection=relations --headerline --type=tsv $RELATIONS_OUT

${MONGODB}/bin/mongo << 'EOF'
use pokec
db.relations.ensureIndex({ "_from": "hashed" })
db.relations.ensureIndex({ "_to": "hashed" })
EOF
