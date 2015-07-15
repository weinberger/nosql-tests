# NoSQL Performance Tests

This repository contains the performance tests described in my [blog](https://www.arangodb.com/2015/06/multi-model-benchmark/). Please feel free to improve the various database test drivers. If you see any optimization I have missed, please issue a pull request.

The files are structured as follows:

`benchmark.js` contains the test driver and all the test cases. Currently, the following tests are implemented: `shortest`, `neighbors`, `neighbors2`, `singleRead`, `singleWrite`, and `aggregation`. Use `all` to run all tests inclusive warmup.

`arangodb`, `neo4j`, and `mongodb` are directories containing a single file `description.js`. This description file implements the database specific parts of the tests.

`data` contains the test data used for the read and write tests and the start and end vertices for the shortest path.

## Installation

```
git clone https://github.com/weinberger/nosql-tests.git
npm install .
npm run data
```

The last step will uncompress the test data file.

## Example

```
node benchmark arangodb -a 1.2.3.4 -t all
```

runs all tests against an ArangoDB server running on host 1.2.3.4.

## Usage

```
node benchmark -h
Usage: benchmark <command> [options]

Commands:
  arangodb  ArangoDB benchmark
  mongodb   MongoDB benchmark
  neo4j     neo4j benchmark

Options:
  -t, --tests      tests to run separated by comma: shortest, neighbors,
                   neighbors2, singleRead, singleWrite, aggregation
                                                       [string] [default: "all"]
  -s, --restrict   restrict to that many elements (0=no restriction)
[default: 0]
  -l, --neighbors  look at that many neighbors [default: 500]
  -a, --address    server host                   [string] [default: "127.0.0.1"]
  -h               Show help                                           [boolean]
```

## Start Parameters

We have used the following parameters to start the databases.

**ArangoDB**

```
./bin/arangod  /mnt/data/arangodb/data-2.7 --server.threads 16 --scheduler.threads 8 --wal.sync-interval 1000  --config etc/relative/arangod.conf --javascript.v8-contexts 17
```

Admin interface: http://107.178.210.238:8529/


**MongoDB**


```
./bin/mongod --storageEngine wiredTiger --syncdelay 1 --dbpath /mnt/data/mongodb/wired2/
```

**OrientDB**

```
./bin/server.sh -Xmx28G -Dstorage.wal.maxSize=28000
```

**Neo4J**

```
./bin/neo4j start
```

Admin interface: http://107.178.210.238:7474/
