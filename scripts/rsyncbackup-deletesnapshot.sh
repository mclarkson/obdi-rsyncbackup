#!/bin/bash

DIR=$1

[[ -z $DIR ]] && {
  echo "Argument 1 should be set to DIR."
  exit 1
}

Output=$(zfs destroy $DIR 2>&1)
ret=$?

if [[ $ret -ne 0 ]]; then
    echo
    echo "ERROR: 'zfs destroy' failed."
    echo "Output was:"
    echo "  $Output"
    echo
    exit 1
fi

# Output in JSON format
echo "$Output"

exit 0
