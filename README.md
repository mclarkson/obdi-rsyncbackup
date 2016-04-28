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
  https://$ipport/api/nomen.nescio/$guid/rsyncbackup/tasks?env_id=1

# Delete

$ curl -k -X DELETE \
  https://$ipport/api/nomen.nescio/$guid/rsyncbackup/tasks/1?env_id=1
```

Includes:

```
# Log in

$ ipport="127.0.0.1:443"

$ guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Create

$ curl -k -d '{"Host":"host1.local","Base":"backup"}' \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/includes?env_id=1&task_id=1"

# Read

$ curl -k "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/includes?env_id=1&task_id=1"

# Update

$ curl -k -d '{"Id":1,"Host":"host2.local"}' -X PUT \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/includes?env_id=1&task_id=1"

# Delete

$ curl -k -X DELETE \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/includes/1?env_id=1"
```

Excludes:

```
# Log in

$ ipport="127.0.0.1:443"

$ guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Create

$ curl -k -d '{"Path":"/var/log/**"}' \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/excludes?env_id=1&include_id=1"

# Read

$ curl -k "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/excludes?env_id=1&include_id=1"

# Update

$ curl -k -d '{"Id":1,"Host":"host2.local"}' -X PUT \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/excludes?env_id=1&include_id=1"

# Delete

$ curl -k -X DELETE \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/excludes/1?env_id=1"
```

See [obdi-nettools-repository](https://github.com/mclarkson/obdi-nettools-repository)
for more information about Net plugins.
