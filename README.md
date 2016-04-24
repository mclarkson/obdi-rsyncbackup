# obdi-rsyncbackup

Backup using rsync. Achieves compression and deduplication when using zfs.

## Screenshot

![](images/rsyncbackup.png?raw=true)

## What is it?

blah

## Dev

rsyncbackup.db schema:

![](doc/DB_Schema.png?raw=true)

Backup tasks:

```
# Log in

$ ipport="127.0.0.1:443"

$ guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Create

$ curl -k -d '{"TaskDesc":"Backup task #1","CapTag":"RSYNCBACKUP_WORKER_1"}' \
  https://$ipport/api/nomen.nescio/$guid/rsyncbackup/tasks?env_id=1

# Read

$ curl -k https://$ipport/api/nomen.nescio/$guid/rsyncbackup/tasks?env_id=1

# Update

$ curl -k -d '{"Id":1,"Text":"Hello there"}' -X PUT \
  curl -k https://$ipport/api/nomen.nescio/$guid/rsyncbackup/tasks?env_id=1

# Delete

$ curl -k -X DELETE \
  curl -k https://$ipport/api/nomen.nescio/$guid/rsyncbackup/tasks/1?env_id=1
```

See [obdi-nettools-repository](https://github.com/mclarkson/obdi-net-repository)
for more information about Net plugins.
