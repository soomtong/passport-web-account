mongod -f /usr/local/etc/mongod.conf --fork
tail -f /usr/local/var/log/mongodb/mongo.log   
nodemon app

