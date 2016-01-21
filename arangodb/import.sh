#!/bin/bash
set -e

ARANGODB=${1-.}

echo "ARANGODB DIRECTORY: $ARANGODB"

# import: POKEC Dataset from Stanford Snap
# https://snap.stanford.edu/data/soc-pokec-readme.txt

if [ ! -f soc-pokec-profiles.txt.gz ]; then
  echo "Downloading PROFILES"
  curl -OL https://snap.stanford.edu/data/soc-pokec-profiles.txt.gz
fi

if [ ! -f soc-pokec-relationships.txt.gz ]; then
  echo "Downloading RELATIONS"
  curl -OL https://snap.stanford.edu/data/soc-pokec-relationships.txt.gz
fi

if [ ! -f soc-pokec-profiles-arangodb.txt ]; then
  echo "Converting PROFILES"
  echo '_key	public	completion_percentage	gender	region	last_login	registration	AGE	body	I_am_working_in_field	spoken_languages	hobbies	I_most_enjoy_good_food	pets	body_type	my_eyesight	eye_color	hair_color	hair_type	completed_level_of_education	favourite_color	relation_to_smoking	relation_to_alcohol	sign_in_zodiac	on_pokec_i_am_looking_for	love_is_for_me	relation_to_casual_sex	my_partner_should_be	marital_status	children	relation_to_children	I_like_movies	I_like_watching_movie	I_like_music	I_mostly_like_listening_to_music	the_idea_of_good_evening	I_like_specialties_from_kitchen	fun	I_am_going_to_concerts	my_active_sports	my_passive_sports	profession	I_like_books	life_style	music	cars	politics	relationships	art_culture	hobbies_interests	science_technologies	computers_internet	education	sport	movies	travelling	health	companies_brands	more'  > soc-pokec-profiles-arangodb.txt
  gunzip < soc-pokec-profiles.txt.gz | sed -e 's/null//g' -e 's~^~P~' -e 's~	$~~' >> soc-pokec-profiles-arangodb.txt
fi

if [ ! -f soc-pokec-relationships-arangodb.txt ]; then
  echo "Converting RELATIONS"
  echo '_from	_to' > soc-pokec-relationships-arangodb.txt
  gzip -dc soc-pokec-relationships.txt.gz | awk -F"\t" '{print "profiles/P" $1 "\tprofiles/P" $2}' >> soc-pokec-relationships-arangodb.txt
fi

INPUT_PROFILES=`pwd`/soc-pokec-profiles-arangodb.txt
INPUT_RELATIONS=`pwd`/soc-pokec-relationships-arangodb.txt

`hash brew 2>/dev/null`
if [ "$?" == 0 ]; then
  `brew ls arangodb | grep -q arango`
  if [ "$?" == 0 ]; then
    usingbrew=true
  else
    usingbrew=false
  fi
else
  usingbrew=false
fi

if [ "$ARANGODB" == "system" ];  then
  ARANGOSH=/usr/bin/arangosh
  ARANGOSH_CONF=/etc/arangodb/arangosh.conf
  ARANGOIMP=/usr/bin/arangoimp
  ARANGOIMP_CONF=/etc/arangodb/arangoimp.conf
  APATH=.
elif [ "$usingbrew" = true ]; then
  ARANGOSH=./bin/arangosh
  ARANGOSH_CONF=./etc/arangodb/arangosh.conf
  ARANGOIMP=./bin/arangoimp
  ARANGOIMP_CONF=./etc/arangodb/arangoimp.conf
  APATH=/usr/local
else
  ARANGOSH=./bin/arangosh
  ARANGOSH_CONF=./etc/relative/arangosh.conf
  ARANGOIMP=./bin/arangoimp
  ARANGOIMP_CONF=./etc/relative/arangoimp.conf
  APATH=$ARANGODB
fi

(
  cd $APATH

  $ARANGOSH -c $ARANGOSH_CONF << 'EOF'
  var db = require("org/arangodb").db;
  db._create("profiles");
  db._createEdgeCollection("relations");
EOF
  $ARANGOIMP -c $ARANGOIMP_CONF --type tsv --collection profiles --file $INPUT_PROFILES
  $ARANGOIMP -c $ARANGOIMP_CONF --type tsv --collection relations --file $INPUT_RELATIONS
)
