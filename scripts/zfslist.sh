#!/bin/bash

export PATH=/sbin:/usr/sbin:$PATH

BASEDIR=$1

[[ -z $BASEDIR ]] && {
  echo "Argument 1 should be set to BASEDIR."
  exit 1
}

Output=$(zfs list -H -r $BASEDIR -t filesystem,snapshot -o name,used,avail,type 2>&1)

# Check number of columns in output
while read name used avail type x; do
    [[ -n $x ]] && {
        echo "Invalid output from zfs command."
        echo "  zfs list -H -r $BASEDIR -t filesystem,snapshot -o name,used,avail,type"
        echo "Produced:"
        echo "  $Output"
        echo "Output should contain exactly 4 columns on each line."
        exit 1
    }
done <<<"$Output"

# Output in JSON format
echo -n "["
while read name used avail type x; do
    echo -n "$comma{"
    echo -n '"name":"'"$name"'",'
    echo -n '"used":"'"$used"'",'
    echo -n '"avail":"'"$avail"'",'
    echo -n '"type":"'"$type"'"'
    echo -n "}"
    comma=","
done <<<"$Output"
echo "]"

exit 0

