#!/bin/bash

export PATH=/sbin:/usr/sbin:$PATH

# First and only argument is the directory to query
DIR="${1%/}/"

[[ -z $DIR ]] && {
  echo "Argument 1 should be set to DIR."
  exit 1
}

# Change DIVISOR to 1024 for binary calculations
declare -i DIVISOR=1000

Output=$(du --apparent-size -hbs $DIR 2>&1)

# Check number of columns in output
# Does NOT handle spaces in filenames, this could be a bug
while read size path x; do
    [[ -n $x ]] && {
        echo "Invalid output from zfs command."
        echo "  du --apparent-size -hbs $DIR"
        echo "Produced:"
        echo "  $Output"
        echo "Output should contain exactly 2 columns on each line."
        exit 1
    }
done <<<"$Output"

# Output in JSON format
#u=(B KiB MiB GiB TiB PiB ZiB)
u=(B KB MB GB TB PB ZB)
echo -n "["
while read size name; do
    sizeb=$size
    let size*=100
    index=0
    while [[ $size -ge $((DIVISOR*100)) ]]; do
        let index+=1
        let size=size/DIVISOR
    done
    sizeh="$(echo $size | awk '{ printf("%.1f", $1/100); }') ${u[index]}"

    echo -n "$comma{"
    echo -n '"name":"'"$name"'",'
    echo -n '"sizeb":"'"$sizeb"'",'
    echo -n '"sizeh":"'"$sizeh"'"'
    echo -n "}"
    comma=","
done <<<"$Output"
echo "]"

exit 0

