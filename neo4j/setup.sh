#!/bin/bash

BENCHMARK=${1-`pwd`}
DB=${2-`pwd`/databases}/neo4j
TMPDIR=${3-/tmp}
DOWNLOADS=$TMPDIR/downloads
TMPZIP=$DOWNLOADS/neo4jTar

if [ ! -d $DB ]
then
  # https://neo4j.com/download/other-releases/
  wget https://neo4j.com/artifact.php?name=neo4j-community-3.3.1-unix.tar.gz -O $DOWNLOADS/neo4j-community.tar.gz
  mkdir -p $TMPZIP/neo4j
  tar -zxvf $DOWNLOADS/neo4j-community.tar.gz -C $TMPZIP/neo4j --strip-components=1
  mv $TMPZIP/* $DB
  rm -rf $DOWNLOADS/neo4j-community.tar.gz

  sed -i.bak \
     -e 's/#\(dbms\.active_database=\)graph.db/\1pokec.db/g' \
     -e 's/#\(dbms\.security\.auth_enabled=false\)/\1/g' \
     -e 's/#\(dbms\.connectors\.default_listen_address=0\.0\.0\.0\)/\1/g' \
     -e 's/#\(dbms.shell.enabled=true\)/\1/g' \
     $DB/conf/neo4j.conf
fi

START=`date +%s`
$BENCHMARK/neo4j/import.sh "pokec.db" $DB $BENCHMARK
END=`date +%s`
echo "Import took: $((END - START)) seconds"

