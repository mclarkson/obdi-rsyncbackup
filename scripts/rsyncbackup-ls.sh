#!/bin/bash

DIR=$1

[[ -z $DIR ]] && {
  echo "Argument 1 should be set to DIR."
  exit 1
}

Output=$(ls --group-directories-first --time-style=long-iso -qlha $DIR 2>&1 |
         grep -v "^total")

# dr-xr-xr-x.   2 root root 4.0K Nov 19  2015 bin

# Check number of columns in output
while read perm links user group size date time name; do
    [[ -z $name ]] && {
        echo "Invalid output from 'ls' command."
        echo "  ls --group-directories-first --time-style=long-iso -qlha $DIR"
        echo "Produced:"
        echo -n "  "
        ls --group-directories-first --time-style=long-iso -qlha $DIR 2>&1
        echo "Output should contain at least 8 columns on each line."
        exit 1
    }
done <<<"$Output"

# Output in JSON format
echo -n "["
while read perm links user group size date time name; do
    echo -n "$comma{"
    echo -n '"name":"'"$name"'",'
    echo -n '"perm":"'"$perm"'",'
    echo -n '"links":"'"$links"'",'
    echo -n '"user":"'"$user"'",'
    echo -n '"group":"'"$group"'",'
    echo -n '"size":"'"$size"'",'
    echo -n '"date":"'"$date"'",'
    echo -n '"type":"'"$(echo $perm | cut -b 1)"'",'
    echo -n '"time":"'"$time"'"'
    echo -n "}"
    comma=","
done <<<"$Output"
echo "]"

exit 0
