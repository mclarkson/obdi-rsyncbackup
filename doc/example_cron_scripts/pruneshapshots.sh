# Log in

# Edit these:

ipport="127.0.0.1:443"

ENVID=1
TASKID=1
USER="nomen.nescio"
PASS="p4ssw0rd"

# Nothing to edit below here

# Log in

guid=`curl -ks -d '{"Login":"'"$USER"'","Password":"'"$PASS"'"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Get list

url="https://$ipport/api/$USER/$guid"

job=$(curl -sk \
    "$url/rsyncbackup/zfslist?env_id=$ENVID&task_id=$TASKID" | \
    sed 's/.*"JobId":\([0-9]\+\).*/\1/' )

# Wait for job to finish

while true; do
    r=$(curl -sk "$url/jobs?job_id=$job")
    if echo "$r" | grep -qs '"Status": 5'; then
        break
    else
        echo "running"
    fi
done

# Get list

snaps=$(curl -sk "$url/outputlines?job_id=$job" |
    grep "Text" |
    tr -d '\\' |
    grep -o '\[.*\]' |
    python -mjson.tool |
    grep -Eo "[0-9]{8,8}\.[0-9]")

amonthago=$(date -d "30 days ago" +%Y%m%d)

for i in $snaps; do [[ ${i%.[0-9]} < $amonthago ]] && delete="$delete $i"; done

# Delete snaps more than 30 days old

for SNAP in $delete ; do
    curl -k -X POST \
        "$url/rsyncbackup/deletesnapshot?env_id=$ENVID&task_id=$TASKID&snapshot=$SNAP"
done

exit 0

