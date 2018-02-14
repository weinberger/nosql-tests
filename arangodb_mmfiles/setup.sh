#!/bin/bash

BENCHMARK=${1-`pwd`}
DB=${2-`pwd`/databases}/arangodb
TMPDIR=${3-/tmp}
DOWNLOADS=$TMPDIR/downloads
TMPZIP=$DOWNLOADS/arangodbTar


if [ ! -d $DB ]
then
  # https://www.arangodb.com/download-major/ubuntu/
  wget https://download.arangodb.com/arangodb33/xUbuntu_16.04/amd64/arangodb3-3.3.3-1_amd64.deb -O $DOWNLOADS/arangodb-community.deb
  (cd $DOWNLOADS && ar x arangodb-community.deb)
  mkdir -p $TMPZIP/arangodb
  tar -zxvf $DOWNLOADS/control.tar.gz -C $TMPZIP/arangodb --strip-components=1
  tar -xvf $DOWNLOADS/data.tar.xz -C $TMPZIP/arangodb --strip-components=1
  mv $TMPZIP/* $DB
  rm -rf $DOWNLOADS/arangodb-community.deb $DOWNLOADS/control.tar.gz $DOWNLOADS/data.tar.xz $DOWNLOADS/debian-binary
  sed -i.bak -e 's/\(uid = arangodb\)/#\1/g' -e 's/127\.0\.0\.1/0.0.0.0/g' $DB/etc/arangodb3/arangod.conf
  mkdir -p $DB/apps
fi

(cd $DB; ./usr/sbin/arangod pokec-mmfiles --server.storage-engine mmfiles --server.authentication false --javascript.app-path apps --javascript.startup-directory usr/share/arangodb3/js --log.file /var/tmp/arangodb.log &)
sleep 3
START=`date +%s`
$BENCHMARK/arangodb/import.sh "pokec" $DB $BENCHMARK
END=`date +%s`
echo "Import took: $((END - START)) seconds"
sudo pkill arangod

