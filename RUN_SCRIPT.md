### OLD SCHOOL FOR DEV MODE

> mongod -f /usr/local/etc/mongod.conf --fork

> tail -f /usr/local/var/log/mongodb/mongo.log

> nodemon app

### START DEMON AND LOGS

> mongod -f /usr/local/etc/mongod.conf --fork

> tail -f /usr/local/var/log/mongodb/mongo.log

### RUNNING APP BY MODE

> NODE_ENV=development nodemon app

or

> NODE_ENV=production pm2 start app.js --name "core"

