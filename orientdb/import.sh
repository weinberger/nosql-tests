#!/bin/bash
set -e

DB=${1-pokec}
ORIENTDB=${2-databases/orientdb}
BENCHMARK=${3-`pwd`}
TMP=/tmp/nosqlbenchmark
DOWNLOADS=$TMP/downloads

PROFILES_IN=$DOWNLOADS/soc-pokec-profiles.txt.gz
RELATIONS_IN=$DOWNLOADS/soc-pokec-relationships.txt.gz
PROFILES_OUT=$DOWNLOADS/soc-pokec-profiles-orientdb.txt
RELATIONS_OUT=$DOWNLOADS/soc-pokec-relationships-orientdb.txt

echo "DATABASE: $DB"
echo "ORIENTDB DIRECTORY: $ORIENTDB"
echo "BENCHMARK DIRECTORY: $BENCHMARK"
echo "DOWNLOAD DIRECTORY: $DOWNLOADS"

$BENCHMARK/downloadData.sh

if [ ! -f $PROFILES_OUT ]; then
  echo "Converting PROFILES"
  echo '_key	public	completion_percentage	gender	region	last_login	registration	AGE	body	I_am_working_in_field	spoken_languages	hobbies	I_most_enjoy_good_food	pets	body_type	my_eyesight	eye_color	hair_color	hair_type	completed_level_of_education	favourite_color	relation_to_smoking	relation_to_alcohol	sign_in_zodiac	on_pokec_i_am_looking_for	love_is_for_me	relation_to_casual_sex	my_partner_should_be	marital_status	children	relation_to_children	I_like_movies	I_like_watching_movie	I_like_music	I_mostly_like_listening_to_music	the_idea_of_good_evening	I_like_specialties_from_kitchen	fun	I_am_going_to_concerts	my_active_sports	my_passive_sports	profession	I_like_books	life_style	music	cars	politics	relationships	art_culture	hobbies_interests	science_technologies	computers_internet	education	sport	movies	travelling	health	companies_brands	more'  > $PROFILES_OUT
  gunzip < $PROFILES_IN | sed -e 's/null//g' -e 's~^~P~' >> $PROFILES_OUT
fi

if [ ! -f $RELATIONS_OUT ]; then
  echo "Converting RELATIONS"
  echo '_from	_to' > $RELATIONS_OUT
  gzip -dc $RELATIONS_IN | awk -F"\t" '{print "P" $1 "\tP" $2}' >> $RELATIONS_OUT
fi

sed \
  -e "s:@INPUT_PROFILES@:$PROFILES_OUT:g" \
  -e "s:@INPUT_RELATIONS@:$RELATIONS_OUT:g" \
  -e "s:@DATABASE@:$DB:g" \
  < $BENCHMARK/orientdb/profiles-etl.json > $TMP/profiles-etl.json

sed \
  -e "s:@INPUT_PROFILES@:$PROFILES_OUT:g" \
  -e "s:@INPUT_RELATIONS@:$RELATIONS_OUT:g" \
  -e "s:@DATABASE@:$DB:g" \
  < $BENCHMARK/orientdb/relationships-etl.json > $TMP/relationships-etl.json

cd $ORIENTDB/databases

$ORIENTDB/bin/oetl.sh $TMP/profiles-etl.json
$ORIENTDB/bin/oetl.sh $TMP/relationships-etl.json
