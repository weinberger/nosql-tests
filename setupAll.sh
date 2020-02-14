#!/bin/bash

BENCHMARK=${1-`pwd`}
DBFOLDER=${2-`pwd`/databases}
TMP=/tmp/nosqlbenchmark
DOWNLOADS=$TMP/downloads

mkdir -p $DBFOLDER
mkdir -p $DOWNLOADS

## OrientDB
./orientdb/setup.sh $BENCHMARK $DBFOLDER $TMP

## Neo4j
./neo4j/setup.sh $BENCHMARK $DBFOLDER $TMP

## Postgresql
./postgresql_jsonb/setup.sh $BENCHMARK $DBFOLDER $TMP
./postgresql_tabular/setup.sh $BENCHMARK $DBFOLDER $TMP

## MongoDB
# ./mongodb/setup.sh $BENCHMARK $DBFOLDER $TMP

## ArangoDB
./arangodb/setup.sh $BENCHMARK $DBFOLDER $TMP
sleep 5
./arangodb_mmfiles/setup.sh $BENCHMARK $DBFOLDER $TMP

