#!/bin/bash

set -e

DB=${1-pokec_json}
POSTGRES=${2-databases/postgresql}
BENCHMARK=${3-`pwd`}
TMP=/tmp/nosqlbenchmark
DOWNLOADS=$TMP/downloads

PROFILES_IN=$DOWNLOADS/soc-pokec-profiles.txt.gz
RELATIONS_IN=$DOWNLOADS/soc-pokec-relationships.txt.gz
PROFILES_OUT=$DOWNLOADS/soc-pokec-profiles-postgres-json.txt
RELATIONS_OUT=$DOWNLOADS/soc-pokec-relationships-postgres-json.txt
PROFILES_OUT_TMP=$DOWNLOADS/soc-pokec-profiles-postgres-tmp.txt

echo "DATABASE: $DB"
echo "PostGresql DIRECTORY: $POSTGRES"
echo "BENCHMARK DIRECTORY: $BENCHMARK"
echo "DOWNLOAD DIRECTORY: $DOWNLOADS"

$BENCHMARK/downloadData.sh


if [ ! -f $PROFILES_OUT ]; then
# NOTE: We replace every wierd character with .
  gzip -dc $PROFILES_IN | sed -e 's~^~P~' -e 's/[^a-zA-Z0-9+*.,;:_$%()=!§~ \t]/./g' > $PROFILES_OUT_TMP
  npm install line-by-line
  node $BENCHMARK/toJsonParser.js $PROFILES_OUT_TMP $PROFILES_OUT
fi

if [ ! -f $RELATIONS_OUT ]; then
  echo "Converting RELATIONS"
  echo '_from	_to' > $RELATIONS_OUT
  gzip -dc $RELATIONS_IN | awk -F"\t" '{print "P" $1 "\tP" $2}' > $RELATIONS_OUT
fi

DBNAME="pokec_json"

echo "Import"

sudo -u postgres $POSTGRES/bin/psql -c "CREATE TABLESPACE $DBNAME LOCATION '$DB';"
sudo -u postgres $POSTGRES/bin/psql -c "CREATE DATABASE $DBNAME TABLESPACE $DBNAME;"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "CREATE TABLE profiles (
  _key text PRIMARY KEY, data jsonb
) ; CREATE TABLE relations (_from text, _to text);"
echo "Importing Profiles"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "COPY profiles FROM '$PROFILES_OUT' WITH DELIMITER E'\t' CSV HEADER;"
echo "Importing Relations"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "COPY relations FROM '$RELATIONS_OUT' WITH DELIMITER E'\t' CSV HEADER;"
sudo -u postgres $POSTGRES/bin/psql -d "$DBNAME" -c "CREATE INDEX _fromid ON relations (_from); CREATE INDEX _toid ON relations (_to);"
echo "Done"
