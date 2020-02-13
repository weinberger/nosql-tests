#!/bin/bash

DB=${1}
TEST_IP=${2-localhost}
LOOP_COUNT=${3-5}
BENCHMARK=${4-`pwd`}
DBFOLDER=${5-`pwd`/databases}
RUSER=${6-ubuntu}

sudo bash -c "
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
echo 1 > /proc/sys/net/ipv4/tcp_fin_timeout
echo 0 > /proc/sys/net/ipv4/tcp_tw_recycle
echo 1 > /proc/sys/net/ipv4/tcp_tw_reuse
"

ulimit -n 65000

start_database() {
  ssh -n -T ${RUSER}@${TEST_IP} ${BENCHMARK}/startdb.sh $DB $RESOURCE_USAGE_PATH $DBFOLDER
}

stop_database() {
 ssh -n -T ${RUSER}@${TEST_IP} ${BENCHMARK}/stopdb.sh $DBFOLDER
}

TODAY=`date +%Y.%m.%d`
TESTS_INCLUDE_WARMUP=warmup
TESTS_EXCLUDE_WARMUP=shortest,neighbors,neighbors2,singleRead,singleWrite,singleWriteSync,aggregation,hardPath,neighbors2data

BASE_FN=${DB}_${TODAY}
RESULT_PATH=${BENCHMARK}/results/
FILENAME=${BASE_FN}

mkdir -p $RESULT_PATH

i=0
while test -f ${RESULT_PATH}${FILENAME}.csv; do
    i=$(($i+1))
    FILENAME=${BASE_FN}_$i
done

case $DB in
    # arangodb*) MATCH_PS="arangod;" ;;
    # neo4j*)    MATCH_PS="java;" ;;
    mongodb*)  MATCH_PS="mongod;" ;;
    # orientdb*) MATCH_PS="java;";;
    # postgresql*) MATCH_PS="postgres;";;
    *) echo "unknown database $DB"; exit 1
esac


RESOURCE_USAGE_FILE="${FILENAME}_CPU_1.csv"
RESOURCE_USAGE_PATH=/tmp/${RESOURCE_USAGE_FILE}
start_database

for i in `seq 0 ${LOOP_COUNT}`; do
    # RESOURCE_USAGE_FILE="${FILENAME}_CPU_$i.csv"
    # RESOURCE_USAGE_PATH=/tmp/${RESOURCE_USAGE_FILE}
    cd ${BENCHMARK}

    rm -f /tmp/testrundata.txt
    echo "RUN #$i"
   
    if [ $i -eq 0 ]
    then
      TESTS=${TESTS_INCLUDE_WARMUP}
      PADDING=""
    else
      TESTS=${TESTS_EXCLUDE_WARMUP}
      PADDING="0; "
    fi

    node benchmark ${DB} -a ${TEST_IP} -t ${TESTS} | tee /tmp/testrundata.txt

    scp ${RUSER}@${TEST_IP}:${RESOURCE_USAGE_PATH} ${RESULT_PATH}

    MAX_RSS="`sort -n -t ';' -k 5 < ${RESULT_PATH}${RESOURCE_USAGE_FILE} | fgrep $MATCH_PS | fgrep -v "<defunct>;" | tail -n 1 | awk '-F;' '{print $5}'`"
    MAX_PCPU="`sort -n -t ';' -k 6 < ${RESULT_PATH}${RESOURCE_USAGE_FILE} | fgrep $MATCH_PS | fgrep -v "<defunct>;" | tail -n 1 | awk '-F;' '{print $6}'`"
    MAX_TIME="`cat ${RESULT_PATH}${RESOURCE_USAGE_FILE} | fgrep $MATCH_PS | fgrep -v "<defunct>;" | tail -n 1 | awk '-F;' '{print $3 \";\" $4}'`"

    (echo -n "$PADDING"; cat /tmp/testrundata.txt | \
        sed -e "s/.*does not implement.*/Total: 0 ms/" | \
        grep Total |\
        sed -e "s/.*: //" -e "s/ ms/;/" | \
        sed ':a;N;$!ba;s/\n/ /g' | \
        sed -e "s/\(.*\)/\1${MAX_TIME};${MAX_PCPU};${MAX_RSS}/") >> ${RESULT_PATH}${FILENAME}.csv
    rm -f ${RESULT_PATH}${RESOURCE_USAGE_FILE}
done

stop_database

echo "wrote ${FILENAME}.csv"
cat ${RESULT_PATH}${FILENAME}.csv
