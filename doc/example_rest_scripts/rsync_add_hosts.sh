#!/bin/bash
# This script will add include entries to a TASKID as per the INCL configuration

TASKID=1
ENVID=1

# INCL format:
# server_name source_file_or_directory_or_rsyncd_name [exclude_file_or_directory]...

INCL="
host001 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host002 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host003 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host004 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host005 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host006 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host007 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host008 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host009 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host010 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host020 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host021 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host022 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host024 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host025 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host026 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host027 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host028 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host029 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host030 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host031 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host032 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host033 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host034 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host035 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host036 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host037 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host038 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host039 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host040 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host042 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host043 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host044 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host045 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host046 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/** /data /opt/data/**
host047 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host048 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host049 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host050 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host051 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host052 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host053 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host054 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host055 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host056 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host057 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host058 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host059 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host060 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host061 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host062 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host063 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host068 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host069 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host070 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host071 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host072 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host073 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host074 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/** /var/lib/docker/devicemapper/
host075 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host076 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host077 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host078 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host079 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host081 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/** /var/lib/libvirt/lxc/**
host082 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host103 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host104 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host105 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host106 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host107 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host108 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host120 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host121 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host181 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host182 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/**
host041 backup /var/log/** /opt/scripts/** /opt/work/** /opt/docker_volumes/** /opt/servers/graphite/storage/whisper/**
"

ipport="127.0.0.1:443"
guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

if [[ -z $guid ]]; then
  echo "Login failed."
  exit 1
else
  echo "guid=$guid"
fi

while read host include excludes; do
  [[ -z $host || $host =~ ^"#" ]] && continue
  id=$( curl -ks -d '{"Host":"'"$host"'","Base":"'"$include"'"}' \
    "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/includes?env_id=$ENVID&task_id=$TASKID" | \
    sed -n 's/.*\\"Id\\":\([0-9]\+\).*/\1/p' )
  [[ -z $id ]] && {
    echo "Failed $host. No id returned for insert."
    continue
  }
  echo "ID=$id"
  echo "Adding excludes '$excludes'"
  set -f
  for exclude in $excludes; do
    curl -ks -d '{"Path":"'"$exclude"'"}' \
      "https://$ipport/api/nomen.nescio/$guid/rsyncbackup/excludes?env_id=$ENVID&include_id=$id"
    echo
  done
done <<<"$INCL"

exit 0
