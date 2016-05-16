# obdi-rsyncbackup

Backup using rsync. Achieves compression and deduplication when using zfs.

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

# Add mount to fstab and mount it
mkdir /backup
echo "/dev/mapper/vg1-backup  /backup                 ext4    defaults        1 2" >>/etc/fstab
mount /backup

# Enable EPEL YUM repository
rpm -ivh https://dl.fedoraproject.org/pub/epel/epel-release-latest-6.noarch.rpm

# Enable Obdi COPR YUM repository
curl -o /etc/yum.repos.d/obdi.repo \
  https://copr.fedorainfracloud.org/coprs/mclarkson/Obdi/repo/epel-6/mclarkson-Obdi-epel-6.repo

# Install Obdi
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

Use the following configuration for `/etc/rsyncd.conf':

```
[backup]
    path = /
    comment = Full system backup
    read only = true
    uid = 0
    gid = 0
    exclude = dev/** proc/** media/** mnt/** selinux/** sys/** tmp/**
```

Lock down access using hosts.allow, hosts.deny and/or iptables.

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

See [obdi-nettools-repository](https://github.com/mclarkson/obdi-nettools-repository)
for more information about Net plugins.
