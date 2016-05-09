#!/bin/bash
set -e

echo "Usage [pokec.db] [path-to-neo4j]"
DB=${1-pokec.db}
NEO=${2-.}

echo "DATABASE: $DB"
echo "NEO4J DIRECTORY: $NEO"

#Import: POKEC Dataset from Stanford Snap

#https://snap.stanford.edu/data/soc-pokec-readme.txt

if [ ! -f soc-pokec-profiles.txt.gz ]; then
  echo "Downloading PROFILES"
  curl -OL https://snap.stanford.edu/data/soc-pokec-profiles.txt.gz
fi

if [ ! -f soc-pokec-relationships.txt.gz ]; then
  echo "Downloading RELATIONS"
  curl -OL https://snap.stanford.edu/data/soc-pokec-relationships.txt.gz
fi

if [ ! -f soc-pokec-profiles_no_null_sorted.txt.gz ]; then
  echo "Removing NULL values"
  gzip -dc soc-pokec-profiles.txt.gz | sed -e 's/null//g' -e 's~^~P~' | sort -k1 --parallel=10 -S 5G | gzip > soc-pokec-profiles_no_null_sorted.txt.gz
fi

if [ ! -f soc-pokec-relationships_id.txt.gz ]; then
  echo "Converting RELATIONS"
  gzip -dc soc-pokec-relationships.txt.gz | awk -F"\t" '{print "P" $1 "\tP" $2}' | gzip > soc-pokec-relationships_id.txt.gz
fi

echo "_key:ID	public:INT	completion_percentage	gender:INT	region	last_login	registration	AGE:INT	body	I_am_working_in_field	spoken_languages	hobbies	I_most_enjoy_good_food	pets	body_type	my_eyesight	eye_color	hair_color	hair_type	completed_level_of_education	favourite_color	relation_to_smoking	relation_to_alcohol	sign_in_zodiac	on_pokec_i_am_looking_for	love_is_for_me	relation_to_casual_sex	my_partner_should_be	marital_status	children	relation_to_children	I_like_movies	I_like_watching_movie	I_like_music	I_mostly_like_listening_to_music	the_idea_of_good_evening	I_like_specialties_from_kitchen	fun	I_am_going_to_concerts	my_active_sports	my_passive_sports	profession	I_like_books	life_style	music	cars	politics	relationships	art_culture	hobbies_interests	science_technologies	computers_internet	education	sport	movies	travelling	health	companies_brands	more" > profiles_header.txt

echo ':START_ID	:END_ID' > relationships_header.txt

export IDTYPE=string #actual
rm -rf $DB

echo "Starting IMPORT"
$NEO/bin/neo4j-import --into $DB --id-type $IDTYPE --delimiter TAB --quote Ö  --nodes:PROFILES profiles_header.txt,soc-pokec-profiles_no_null_sorted.txt.gz --relationships:RELATIONS relationships_header.txt,soc-pokec-relationships_id.txt.gz

echo "Creating INDEX"
JAVA_OPTS="-Xmx12G -Xmn2G" nohup $NEO/bin/neo4j-shell -path $DB -c 'create index on :PROFILES(_key);' &

echo "Please wait for the index to be populated and kill the neo4j-shell"
sleep 5
tail -f -n 4 "$DB/messages.log"
