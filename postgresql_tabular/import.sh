#!/bin/bash

set -e

DB=${1-pokec_tabular}
POSTGRES=${2-databases/postgresql}
BENCHMARK=${3-`pwd`}
TMP=/tmp/nosqlbenchmark
DOWNLOADS=$TMP/downloads

PROFILES_IN=$DOWNLOADS/soc-pokec-profiles.txt.gz
RELATIONS_IN=$DOWNLOADS/soc-pokec-relationships.txt.gz
PROFILES_OUT=$DOWNLOADS/soc-pokec-profiles-postgres-tabular.txt
RELATIONS_OUT=$DOWNLOADS/soc-pokec-relationships-postgres-tabular.txt

echo "DATABASE: $DB"
echo "PostGresql DIRECTORY: $POSTGRES"
echo "BENCHMARK DIRECTORY: $BENCHMARK"
echo "DOWNLOAD DIRECTORY: $DOWNLOADS"

$BENCHMARK/downloadData.sh

if [ ! -f $PROFILES_OUT ]; then
  echo "Converting PROFILES"
  echo '_key	public	completion_percentage	gender	region	last_login	registration	AGE	body	I_am_working_in_field	spoken_languages	hobbies	I_most_enjoy_good_food	pets	body_type	my_eyesight	eye_color	hair_color	hair_type	completed_level_of_education	favourite_color	relation_to_smoking	relation_to_alcohol	sign_in_zodiac	on_pokec_i_am_looking_for	love_is_for_me	relation_to_casual_sex	my_partner_should_be	marital_status	children	relation_to_children	I_like_movies	I_like_watching_movie	I_like_music	I_mostly_like_listening_to_music	the_idea_of_good_evening	I_like_specialties_from_kitchen	fun	I_am_going_to_concerts	my_active_sports	my_passive_sports	profession	I_like_books	life_style	music	cars	politics	relationships	art_culture	hobbies_interests	science_technologies	computers_internet	education	sport	movies	travelling	health	companies_brands	more'  > $PROFILES_OUT
  gzip -dc $PROFILES_IN | sed -e 's~^~P~' > $PROFILES_OUT
fi

if [ ! -f $RELATIONS_OUT ]; then
  echo "Converting RELATIONS"
  echo '_from	_to' > $RELATIONS_OUT
  gzip -dc $RELATIONS_IN | awk -F"\t" '{print "P" $1 "\tP" $2}' > $RELATIONS_OUT
fi

DBNAME="pokec_tabular"

echo "Import"

sudo -u postgres $POSTGRES/bin/psql -c "CREATE TABLESPACE $DBNAME LOCATION '$DB';"
sudo -u postgres $POSTGRES/bin/psql -c "CREATE DATABASE $DBNAME TABLESPACE $DBNAME;"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "CREATE TABLE profiles (
  _key text PRIMARY KEY, public text, completion_percentage text, gender text, region text, last_login text,
  registration text, AGE integer, body text, I_am_working_in_field text, spoken_languages text, hobbies text,
  I_most_enjoy_good_food text, pets text, body_type text, my_eyesight text, eye_color text, hair_color text,
  hair_type text, completed_level_of_education text, favourite_color text, relation_to_smoking text, relation_to_alcohol text,
  sign_in_zodiac text, on_pokec_i_am_looking_for text, love_is_for_me text, relation_to_casual_sex text, my_partner_should_be text,
  marital_status text, children text, relation_to_children text, I_like_movies text, I_like_watching_movie text,
  I_like_music text, I_mostly_like_listening_to_music text, the_idea_of_good_evening text, I_like_specialties_from_kitchen text, fun text,
  I_am_going_to_concerts text, my_active_sports text, my_passive_sports text, profession text, I_like_books text, life_style text,
  music text, cars text, politics text, relationships text, art_culture text, hobbies_interests text, science_technologies text,
  computers_internet text, education text, sport text, movies text, travelling text, health text, companies_brands text,
  more text
); CREATE TABLE relations (_from text, _to text);"
echo "Importing Profiles"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "COPY profiles FROM '$PROFILES_OUT' WITH DELIMITER E'\t' CSV HEADER NULL AS 'null';"
echo "Importing Relations"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "COPY relations FROM '$RELATIONS_OUT' WITH DELIMITER E'\t' CSV HEADER;"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "CREATE INDEX _fromid ON relations (_from); CREATE INDEX _toid ON relations (_to);"
echo "Done"
