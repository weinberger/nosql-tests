#!/bin/bash
set -e

echo "Usage [pokec.db] [path-to-neo4j] [path-to-benchmark]"
NEO=${2-databases}
DB=$NEO/data/databases/${1-pokec.db}
BENCHMARK=${3-`pwd`}
TMP=/tmp/nosqlbenchmark
DOWNLOADS=$TMP/downloads

PROFILES_IN=$DOWNLOADS/soc-pokec-profiles.txt.gz
PROFILES_OUT=$DOWNLOADS/soc-pokec-profiles-neo4j.txt.gz
PROFILES_HEADER=$DOWNLOADS/profiles_header.txt

RELATIONS_IN=$DOWNLOADS/soc-pokec-relationships.txt.gz
RELATIONS_OUT=$DOWNLOADS/soc-pokec-relationships-neo4j.txt.gz
RELATIONS_HEADER=$DOWNLOADS/relations_header.txt

echo "DATABASE: $DB"
echo "NEO4J DIRECTORY: $NEO"
echo "BENCHMARK DIRECTORY: $BENCHMARK"
echo "DOWNLOAD DIRECTORY: $DOWNLOADS"

$BENCHMARK/downloadData.sh


if [ ! -f $PROFILES_OUT ]; then
  echo "Removing NULL values"
  gzip -dc $PROFILES_IN | sed -e 's/null//g' -e 's~^~P~' | sort -k1 --parallel=10 -S 5G | gzip > $PROFILES_OUT
fi

if [ ! -f $RELATIONS_OUT ]; then
  echo "Converting RELATIONS"
  gzip -dc $RELATIONS_IN | awk -F"\t" '{print "P" $1 "\tP" $2}' | gzip > $RELATIONS_OUT
fi

echo "_key:ID	public:INT	completion_percentage	gender:INT	region	last_login	registration	AGE:INT	body	I_am_working_in_field	spoken_languages	hobbies	I_most_enjoy_good_food	pets	body_type	my_eyesight	eye_color	hair_color	hair_type	completed_level_of_education	favourite_color	relation_to_smoking	relation_to_alcohol	sign_in_zodiac	on_pokec_i_am_looking_for	love_is_for_me	relation_to_casual_sex	my_partner_should_be	marital_status	children	relation_to_children	I_like_movies	I_like_watching_movie	I_like_music	I_mostly_like_listening_to_music	the_idea_of_good_evening	I_like_specialties_from_kitchen	fun	I_am_going_to_concerts	my_active_sports	my_passive_sports	profession	I_like_books	life_style	music	cars	politics	relationships	art_culture	hobbies_interests	science_technologies	computers_internet	education	sport	movies	travelling	health	companies_brands	more" > $PROFILES_HEADER

echo ':START_ID	:END_ID' > $RELATIONS_HEADER

export IDTYPE=string #actual
rm -rf $DB

echo "Starting IMPORT"
$NEO/bin/neo4j-import --into $DB --id-type $IDTYPE --delimiter TAB --quote Ö  --nodes:PROFILES $PROFILES_HEADER,$PROFILES_OUT --relationships:RELATIONS $RELATIONS_HEADER,$RELATIONS_OUT

echo "Creating INDEX"
$NEO/bin/neo4j start

sleep 10

JAVA_OPTS="-Xmx12G -Xmn2G" $NEO/bin/neo4j-shell -host localhost -port 1337 -c 'create index on :PROFILES(_key);'

echo "Wait for the index to be populated"
sleep 30

$NEO/bin/neo4j stop

