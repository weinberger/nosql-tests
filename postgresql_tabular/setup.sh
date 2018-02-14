#!/bin/bash

BENCHMARK=${1-`pwd`}
DB=${2-`pwd`/databases}/postgresql
DBTAB=$DB/pokec_tabular
DBJSON=$DB/pokec_json
TMPDIR=${3-/tmp}
DOWNLOADS=$TMPDIR/downloads
TMPZIP=$DOWNLOADS/postgresZip

if [ ! -d $DB ]
then
  echo "Installing PostgreSQL"
  wget https://get.enterprisedb.com/postgresql/postgresql-10.1-1-linux-x64-binaries.tar.gz -O $DOWNLOADS/postgresql.tar.gz
  mkdir -p $TMPZIP/postgresql
  tar -zxvf $DOWNLOADS/postgresql.tar.gz -C $TMPZIP/postgresql --strip-components=1
  mv $TMPZIP/* $DB
  rm -rf $DOWNLOADS/postgresql.tar.gz
fi

START=`date +%s`
if [ ! -d $DBTAB ]
then
  mkdir -p $DBTAB
  sudo chown -R postgres:postgres $DBTAB
  sudo -u postgres $DB/bin/initdb -d $DBTAB
  sudo -u postgres $DB/bin/pg_ctl start -D $DBTAB
  sleep 5
  sudo $BENCHMARK/postgresql_tabular/import.sh $DBTAB $DB $BENCHMARK
  sudo -u postgres $DB/bin/pg_ctl stop -D $DBTAB
  sleep 5
  sudo sed -i.bak -e "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" $DBTAB/postgresql.conf
  sudo bash -c "echo 'host all all 0.0.0.0/0 trust' >> $DBTAB/pg_hba.conf"
fi
END=`date +%s`
echo "Import took: $((END - START)) seconds"

# for write sync/non-sync
# edit pokec_json/postgresql.conf: fsync on/off

