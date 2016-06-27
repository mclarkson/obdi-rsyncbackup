# obdi-rsyncbackup

Backup using rsync. Achieves compression and deduplication when using zfs.

BIG NOTE: This plugin does the rsync and snapshotting. More work is required
to create a consistent backup for databases etc.

# Todo

* Custom per-server 'pre' scripts to do things such as stopping services before
  back-up then starting once complete.
* Scheduling (use cron and rest api for now).
* ~~Viewing and retrieving files and snapshots.~~

## Screenshot

![](images/obdi-rsyncbackup-small.png?raw=true)

## What is it?

A simple backup solution for Linux servers, that achieves deduplication
and compression using the zfs file system.

## Installation

Installation is in three parts, installing the plugin, setting up the server
that will be used for storing the backups, and set up the servers that you
want to back up.

#### Installing the plugin

* Log into the admin interface, 'https://ObdiHost/manager/admin'.
* In Plugins -> Manage Repositories add, 'https://github.com/mclarkson/obdi-nettools-repository.git'
* In Plugins -> Add Plugin, choose 'rsyncbackup' and Install.

#### Server Set-up

Instructions for a CentOS 6 server. Centos 7 should be the same.

```
# CentOS 6

yum install zfs

# Create a 1TB zfs pool on a logical volume

mkdir /backup
modprobe zfs
lvcreate -L1t -n servers-zfs vg1
zpool create backup /dev/vg1/servers-zfs
zfs create -o dedup=on -o compression=gzip backup/servers-zfs

# Disable atime

zfs set atime=off backup/servers-zfs

# List and check settings

zfs list
zpool list
zfs get dedup
zfs get compression
zfs get atime

# Enable EPEL YUM repository
rpm -ivh https://dl.fedoraproject.org/pub/epel/epel-release-latest-6.noarch.rpm

# Enable Obdi COPR YUM repository
curl -o /etc/yum.repos.d/obdi.repo \
  https://copr.fedorainfracloud.org/coprs/mclarkson/Obdi/repo/epel-6/mclarkson-Obdi-epel-6.repo

# Install Obdi Worker
yum -y install obdi-worker
```

In the admin interface -> Environments, edit the environment, switch to the Capabilities
tab, add the RSYNCBACKUP_WORKER_1 capability and click Apply, then add the URL of the new
Obdi worker to the RSYNCBACKUP_WORKER_1 capability.

Obdi can now use this server as a backup server.

#### Setting up the Servers to be Backed Up From

On every server enable rsyncd by ensuring xinetd has disable set to no for `/etc/xinetd.d/rsync'.
For example:

```
service rsync
{
        disable = no
        flags           = IPv6
        socket_type     = stream
        wait            = no
        user            = root
        server          = /usr/bin/rsync
        server_args     = --daemon
        log_on_failure  += USERID
}
```

Supply an rsyncd configuration. For example, use the following configuration
in `/etc/rsyncd.conf' to do be able to do a full system backup:

```
[backup]
    path = /
    comment = Full system backup
    read only = true
    uid = 0
    gid = 0
    exclude = dev/** proc/** media/** mnt/** selinux/** sys/** tmp/**
```

With the above set-up the following settings will work:

* PROTOCOL = rsyncd
* PRE = 'create_zfs_snapshot'.
* RSYNC_OPTS = your options, e.g. "--sparse", "-z".
* BASEDIR = '/backup/servers-zfs/'.
* KNOWNHOSTS = empty.
* NUMPERIODS = 1 or more.
* TIMEOUT = 0 (disabled) or more seconds.
* Verbose = on or off, keep off unless testing.

Lock down access using hosts.allow, hosts.deny and/or iptables.

## Example cron job

This example cron job will start a backup at 06.15 every day:

```
15 06 * * * /home/a_user/cron/dobackup.sh
```

The preceeding cron job will run the dobackup.sh script:

```
#!/bin/bash

ENVID=1
TASKID=1

# Log in

ipport="127.0.0.1:443"

guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Back-up

curl -k -X POST \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/backup?env_id=$ENVID&task_id=$TASKID"
```

Ensure dobackup.sh is executable with 'chmod +x dobackup.sh'.

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

Initiate a backup:

```
# Log in

$ ipport="127.0.0.1:443"

$ guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Back-up

$ curl -k -X POST \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/backup?env_id=1&task_id=1"

# Verbose back-up (verbose paramater can be set to any value)

$ curl -k -X POST \
  "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/backup?env_id=1&task_id=1&verbose=t"

```

List directory contents:

```
$ curl -k "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/ls?env_id=1&task_id=1&path=nosnap/server001"
```

Calculate unpacked, undeduped directory size:

```
$ curl -k "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/dirsize?env_id=1&task_id=1&path=nosnap/server001"
```

See [obdi-nettools-repository](https://github.com/mclarkson/obdi-nettools-repository)
for more information about Net plugins.
