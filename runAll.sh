#!/bin/bash

TEST_IP=${1-127.0.0.1}
LOOP_COUNT=${2-20}
BENCHMARK=${3-`pwd`}
DBFOLDER=${4-`pwd`/databases}
RUSER=${5-ubuntu}

# ./runTest.sh arangodb $TEST_IP $LOOP_COUNT $BENCHMARK $DBFOLDER $RUSER
# ./runTest.sh arangodb_mmfiles $TEST_IP $LOOP_COUNT $BENCHMARK $DBFOLDER $RUSER
# ./runTest.sh neo4j $TEST_IP $LOOP_COUNT $BENCHMARK $DBFOLDER $RUSER
# ./runTest.sh orientdb $TEST_IP $LOOP_COUNT $BENCHMARK $DBFOLDER $RUSER
# ./runTest.sh postgresql_jsonb $TEST_IP $LOOP_COUNT $BENCHMARK $DBFOLDER $RUSER
# ./runTest.sh postgresql_tabular $TEST_IP $LOOP_COUNT $BENCHMARK $DBFOLDER $RUSER
./runTest.sh mongodb $TEST_IP $LOOP_COUNT $BENCHMARK $DBFOLDER $RUSER

