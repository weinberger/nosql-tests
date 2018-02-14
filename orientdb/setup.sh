#!/bin/bash

BENCHMARK=${1-`pwd`}
DB=${2-`pwd`/databases}/orientdb
TMPDIR=${3-/tmp}
DOWNLOADS=$TMPDIR/downloads
TMPZIP=$DOWNLOADS/orientZip

if [ ! -d $DB ] 
then
  ## OrientDB
  wget http://bit.ly/orientdb-ce-imps-2-2-29 -O $DOWNLOADS/orientdb-community.zip
  ## Zip cannot remove top-dir
  unzip -d "$TMPZIP" "$DOWNLOADS/orientdb-community.zip" && f=("$TMPZIP"/*) && mv "$TMPZIP"/*/* "$TMPZIP" && rmdir "${f[@]}"
  mv $TMPZIP $DB
  rm -rf $DOWNLOADS/orientdb-community.zip
  # We need to increase the heap space defined in oetl.sh, as the relations require more than the one given
  sed -i.bak -e s/JAVA_OPTS=-Xmx512m/JAVA_OPTS=-Xmx4g/g $DB/bin/oetl.sh
  # we have to change the root pw under 'config/orientdb-server-config.xml' to root
  sed -i.bak -e "N;s/.*<users>\n.*<\/users>/<users>\n<user resources=\"\*\" password=\".*\" name=\"root\"\/>\n<\/users>/g" -e "s/<user resources=\"\*\" password=\".*\" name=\"root\"\/>/<user resources=\"*\" password=\"root\" name=\"root\"\/>/g" $DB/config/orientdb-server-config.xml
fi

START=`date +%s`
$BENCHMARK/orientdb/import.sh "$DB/databases/pokec" $DB $BENCHMARK
END=`date +%s`
echo "Import took: $((END - START)) seconds"

