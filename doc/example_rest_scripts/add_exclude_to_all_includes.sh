#!/bin/bash
# This script can be used to add an exclude path to all includes for a task

# The exclude to add
EXCLUDE='logs/**'

ENVID=1
TASKID=1
ipport="127.0.0.1:443"

# Login
guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

if [[ -z $guid ]]; then
  echo "Login failed."
  exit 1
else
  echo "guid=$guid"
fi

set -f

# Cycle through all the includes for the TASKID and add the EXCLUDE
curl -k "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/includes?env_id=$ENVID&task_id=$TASKID" | \
  grep Text | \
  grep -Eo '\[\{.*\}\]' | \
  tr -d '\\' | \
  python -mjson.tool | \
  grep -e "\"Id\"" -e "\"Host\"" | \
  awk '{ print $2; }' | \
  tr -d \", | while read line; do
    if [[ $a -eq 0 ]]; then
      HOST=$line
      a=1
    else
      ID=$line
      a=0
      echo "Adding exclude '$EXCLUDE' to '$HOST' for include_id '$ID'"
      curl -ks -d '{"Path":"'"$EXCLUDE"'"}' \
        "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/excludes?env_id=$ENVID&include_id=$ID"
    echo
    fi
  done

exit 0

