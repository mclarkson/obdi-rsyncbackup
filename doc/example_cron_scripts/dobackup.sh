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
