#!/bin/bash

which=$1
FN=$2
DBFOLDER=${3-`pwd`/databases}

sudo bash -c "
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
echo 1 > /proc/sys/net/ipv4/tcp_fin_timeout
echo 1 > /proc/sys/net/ipv4/tcp_tw_recycle
echo 1 > /proc/sys/net/ipv4/tcp_tw_reuse
"

ulimit -n 60000

WATCHER_PID=/tmp/watcher.pid

# comm cputime etimes rss pcpu
export AWKCMD='{a[$1] = $1; b[$1] = $2; c[$1] = $3; d[$1] = $4; e[$1] = $5} END {for (i in a) printf "%s; %s; %s; %0.1f; %0.1f\n", a[i], b[i], c[i], d[i], e[i]}'

killPIDFile() {
    PID_FN=$1
    if test -f ${PID_FN}; then
        PID=`cat ${PID_FN}`
        kill ${PID} 2> /dev/null
        count=0
        while test -d /proc/${PID}; do
            echo "."
            sleep 1
            count=$((${count} + 1))
            if test "${count}" -gt 60; then
                kill -9 ${PID}
            fi
        done
        rm -f ${PID_FN}
    fi
}


# stop_ArangoDB() {
#     killPIDFile "/tmp/arangodb.pid"
# }

# start_ArangoDB_mmfiles() {
#     ADB=${DBFOLDER}/arangodb
#     cd ${ADB}
#     ${ADB}/usr/sbin/arangod \
#         ${ADB}/pokec-mmfiles \
#         --pid-file /tmp/arangodb.pid \
#         --log.file /var/tmp/arangodb.log \
#         --temp.path `pwd` \
#         --working-directory `pwd` \
#         --daemon \
#         --configuration ${ADB}/etc/arangodb3/arangod.conf \
#         --server.authentication false \
#         --javascript.app-path ${ADB}/apps \
#         --javascript.startup-directory ${ADB}/usr/share/arangodb3/js \
#         --server.storage-engine mmfiles || (echo "failed" && exit 1)

#     while ! curl http://127.0.0.1:8529/_api/version -fs ; do sleep 1 ; done

#     nohup bash -c "
# while true; do
#     sleep 1
#     echo -n \"`date`; \"
#     ps -p `cat /tmp/arangodb.pid` -o 'comm cputime etimes rss pcpu' --no-headers | \
#         awk '${AWKCMD}'
# done > $FN 2>&1" > /dev/null 2>&1 &

#     echo "$!" > "${WATCHER_PID}"
# }
 
# start_ArangoDB() {
#     ADB=${DBFOLDER}/arangodb
#     cd ${ADB}
#     ${ADB}/usr/sbin/arangod \
#         ${ADB}/pokec-rocksdb \
#         --pid-file /tmp/arangodb.pid \
#         --log.file /var/tmp/arangodb.log \
#         --temp.path `pwd` \
#         --working-directory `pwd` \
#         --daemon \
#         --wal.sync-interval 1000 \
#         --configuration ${ADB}/etc/arangodb3/arangod.conf \
#         --server.authentication false \
#         --javascript.app-path ${ADB}/apps \
#         --javascript.startup-directory ${ADB}/usr/share/arangodb3/js \
#         --server.storage-engine rocksdb || (echo "failed" && exit 1)

#     while ! curl http://127.0.0.1:8529/_api/version -fs ; do sleep 1 ; done

#     nohup bash -c "
# while true; do
#     sleep 1
#     echo -n \"`date`; \"
#     ps -p `cat /tmp/arangodb.pid` -o 'comm cputime etimes rss pcpu' --no-headers | \
#         awk '${AWKCMD}'
# done > $FN 2>&1" > /dev/null 2>&1 &

#     echo "$!" > "${WATCHER_PID}"
# }

stop_MongoDB() {
    killPIDFile "/var/tmp/mongodb.pid"
}

start_MongoDB() {
    numactl --interleave=all \
        ${DBFOLDER}/mongodb/bin/mongod \
        --bind_ip 0.0.0.0 \
        --fork \
        --logpath /var/tmp/mongodb.log \
        --pidfilepath /var/tmp/mongodb.pid \
        --storageEngine wiredTiger \
        --dbpath ${DBFOLDER}/mongodb/pokec

    nohup bash -c "
while true; do
    sleep 1
    echo -n \"`date`; \"
    ps -C mongod -o 'comm cputime etimes rss pcpu' --no-headers | \
        awk '${AWKCMD}'
done  > $FN 2>&1 " > /dev/null 2>&1 &
    echo "$!" > "${WATCHER_PID}"
}

# stop_OrientDB() {
#     cd ${DBFOLDER}/orientdb
#     ./bin/shutdown.sh > /dev/null 2>&1
# }

# start_OrientDB() {
#     cd ${DBFOLDER}/orientdb
#     ./bin/server.sh -Xmx28G -Dstorage.wal.maxSize=28000 > /var/tmp/orientdb.log 2>&1 &
#     sleep 3
#     ORIENTDB_PID=`pidof java`

#     nohup bash -c "
# while true; do
#     sleep 1
#     echo -n \"`date`; \"
#     ps -p $ORIENTDB_PID -o 'comm cputime etimes rss pcpu' --no-headers | \
#         awk '${AWKCMD}'
# done  > $FN 2>&1 " > /dev/null 2>&1 &
#     echo "$!" > "${WATCHER_PID}"
# }

# stop_Neo4j() {
#   ${DBFOLDER}/neo4j/bin/neo4j stop
# }

# start_Neo4j() {
#     cd ${DBFOLDER}/neo4j
#     ./bin/neo4j start
#     NEO4J_PID=`pidof java`

#     nohup bash -c "
# while true; do
#     sleep 1
#     echo -n \"`date`; \"
#     ps -p $NEO4J_PID -o 'comm cputime etimes rss pcpu' --no-headers | \
#         awk '${AWKCMD}'
# done  > $FN 2>&1 " > /dev/null 2>&1 &
#     echo "$!" > "${WATCHER_PID}"

#     sleep 60
# }

stop_Postgresql() {
  sudo -u postgres ${DBFOLDER}/postgresql/bin/pg_ctl stop -D ${DBFOLDER}/postgresql/pokec_json
  sudo -u postgres ${DBFOLDER}/postgresql/bin/pg_ctl stop -D ${DBFOLDER}/postgresql/pokec_tabular
  sudo service collectd stop
}

start_Postgresql_tabular() {
    sudo service collectd start
    sudo -u postgres ${DBFOLDER}/postgresql/bin/pg_ctl start \
        -D ${DBFOLDER}/postgresql/pokec_tabular/ > /var/tmp/postgresql_tabular.log 2>&1 &

    nohup bash -c "
while true; do
    sleep 1
    echo -n \"`date`; \"
    ps -C postgres -o 'comm cputime etimes rss pcpu' --no-headers | \
        awk '${AWKCMD}'
done  > $FN 2>&1 " > /dev/null 2>&1 &
    echo "$!" > "${WATCHER_PID}"

}

start_Postgresql_jsonb() {
    sudo service collectd start
    sudo -u postgres ${DBFOLDER}/postgresql/bin/pg_ctl start \
        -D ${DBFOLDER}/postgresql/pokec_json/ > /var/tmp/postgresql_json.log 2>&1 &

    nohup bash -c "
while true; do
    sleep 1
    echo -n \"`date`; \"
    ps -C postgres -o 'comm cputime etimes rss pcpu' --no-headers | \
        awk '${AWKCMD}'
done  > $FN 2>&1 " > /dev/null 2>&1 &
    echo "$!" > "${WATCHER_PID}"

}

echo "================================================================================"
echo "* stopping databases"
echo "================================================================================"

# stop_ArangoDB
# stop_MongoDB
# stop_OrientDB
# stop_Neo4j
stop_Postgresql

killPIDFile "${WATCHER_PID}"

echo "================================================================================"
echo "* starting: $which $version"
echo "================================================================================"

case "$which" in
# arangodb_mmfiles)
#     start_ArangoDB_mmfiles
#     ;;
# arangodb)
#     start_ArangoDB
#     ;;
# mongodb)
#     start_MongoDB
#     ;;
# rethinkdb)
#     start_RethinkDB
#     ;;
# orientdb)
#     start_OrientDB
#     ;;
# neo4j)
#     start_Neo4j
#     ;;
postgresql_tabular)
    start_Postgresql_tabular
    ;;
postgresql_jsonb)
    start_Postgresql_jsonb
    ;;
*)
    echo "unsupported database: [$which]"
    echo "I know: ArangoDB, ArangoDB_mmfiles, MongoDB, OrientDB, Neo4j, Postgresql_tabular, Postgresql_jsonb"
    exit 1
    ;;
esac

