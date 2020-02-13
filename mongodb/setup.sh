#!/bin/bash

BENCHMARK=${1-`pwd`}
DB=${2-`pwd`/databases}/mongodb
TMPDIR=${3-/tmp}
DOWNLOADS=$TMPDIR/downloads
TMPZIP=$DOWNLOADS/mongodbTar

if [ ! -d $DB ]
then
  # https://www.mongodb.com/download-center#community
  wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu1604-3.2.22.tgz -O $DOWNLOADS/mongodb-community.tar.gz
  mkdir -p $TMPZIP/mongodb
  tar -zxvf $DOWNLOADS/mongodb-community.tar.gz -C $TMPZIP/mongodb --strip-components=1
  mv $TMPZIP/* $DB
  rm -rf $DOWNLOADS/mongodb-community.tar.gz
fi
mkdir -p $DB/pokec
(cd $DB; ./bin/mongod --dbpath pokec &)

START=`date +%s`
$BENCHMARK/mongodb/import.sh "pokec.db" $DB $BENCHMARK
END=`date +%s`
echo "Import took: $((END - START)) seconds"
sudo pkill mongod

