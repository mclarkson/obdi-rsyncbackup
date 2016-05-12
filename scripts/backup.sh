#!/bin/bash
#
# Blame: Mark Clarkson
# Date: 5 Jan 2016
#

export PATH="/bin:/usr/bin:/sbin"

# ===========================================================================
# Defaults - Change as necessary
# ===========================================================================

# Default configuration file. If empty then the following environment
# variables are expected to have been exported: PROTOCOL, RSYNC_OPTS, PRE,
# INCL, POST.
#CONF=backup.conf
CONF=

# Root of the backup tree
#DEFAULT_BASEDIR=/backup/servers
#DEFAULT_BASEDIR=/backup/servers-lessfs
DEFAULT_BASEDIR=

# Ssh known_hosts file location, for pre-seeding
DEFAULT_KNOWNHOSTS=~/.ssh/known_hosts

# Number of periods in a day
DEFAULT_NUMPERIODS=1

# Rsync timeout
DEFAULT_TIMEOUT=0

# Write directories with more than DEFAULT_MAXFILES files to
# a separate filesystem area. 0 = disabled.
#MAXFILES=5000
DEFAULT_MAXFILES=0

# ===========================================================================
# Globals - Don't touch anything below
# ===========================================================================

SNAPDIR=
EXCLOPTS=
SNAPSHOTS=0
VERBOSE=0

CMDLINE="$@"
VERSION="0.1.0"
ME=$0

# ===========================================================================
# Functions
# ===========================================================================

# ---------------------------------------------------------------------------
main() {
# ---------------------------------------------------------------------------
# It all starts here

    local i j src excl server spc="" failed_servers="" path=
    local -i errors=0 exitval=0

    set -f # Disable pathname expansion

    trap leave INT

    parse_options
    init_vars
    sanity_checks

    # If env var, INCL, was not 'export'ed then source the config file
    [[ -z $INCL ]] && source $CONF

    # PRE

    set +f # Enable pathname expansion

    while read i; do
        [[ -z $i ]] && continue
        [[ $i == '#'* ]] && continue
        set -- $i
        option="$1"
        shift
        args="$@"
        case $option in
            create_snapshot_dir) create_snapshot_dir $args
            ;;
            create_zfs_snapshot) create_zfs_snapshot $args
            ;;
        esac
    done <<<"$PRE"

    set -f # Disable pathname expansion

    # Do the backup (INCL)

    [[ $VERBOSE -eq 1 ]] && v=v

    proto=":"
    slash="/"
    [[ $PROTOCOL == "rsyncd" ]] && {
        proto="::"
        slash="/"
    }

    while read i; do
        [[ -z $i ]] && continue
        [[ $i == '#'* ]] && continue
        set -- $i
        server="$1"
        src="$server$proto$2"
        dir="${2#/}"
        [[ $proto == "::" ]] && dir=
        shift; shift
        echo "Log for server $server STARTS"
        date
        build_excl_option $@
        echo "mkdir -p $SNAPDIR/$server$dir"
        mkdir -p $SNAPDIR/$server$dir
        if ! grep -qs $server $KNOWNHOSTS; then
            # Add the server to known_hosts
            echo "ssh-keyscan $server >> $KNOWNHOSTS"
            ssh-keyscan $server >> $KNOWNHOSTS
        fi

        # FOR BIND MOUNTING
        [[ $MAXFILES -gt 0 ]] && {
            filelist="/var/tmp/filelist.$$"
            processlist="/var/tmp/processlist.$$"
            echo "rsync $RSYNC_OPTS --timeout=$TIMEOUT --delete -a${v} --delete-excluded \\"
            echo "    $EXCLOPTS $src $SNAPDIR/$server$dir --list-only"
            rsync $RSYNC_OPTS --timeout=$TIMEOUT --delete -a${v} --delete-excluded \
                $EXCLOPTS $src$slash $SNAPDIR/$server$dir/ --list-only >$filelist
            # Process the list of files
            sed '/^d/{d};s#^[^ ]\+ \+[^ ]\+ \+[^ ]\+ \+[^ ]\+##;s#/[^/]*$##' $filelist \
                | sort | uniq -c | \
                while read a b; do \
                    [[ $a -gt $MAXFILES ]] && echo $b; \
                done | tee $processlist
            # Exclude subdirs of mount
            restart=1
            while [[ $restart -eq 1 ]]; do
                restart=0
                :>$processlist.new
                while read a; do
                    if [[ `grep -c "^$a" $processlist` -eq 1 ]]; then
                        echo "$a" >>$processlist.new
                    else grep -v "^$a" $processlist>$processlist.new
                        echo "$a" >>$processlist.new
                        mv -f $processlist.new $processlist
                        restart=1
                        break
                    fi
                done<$processlist
            done
            rm $filelist
            while read a; do
                mkdir -p /binds/$server/$a $SNAPDIR/$server$dir/$a
                if mountpoint $SNAPDIR/$server$dir/$a; then continue; fi
                mount --bind /binds/$server/$a $SNAPDIR/$server$dir/$a
            done <$processlist
            rm $processlist
        }

        path=
        [[ $PROTOCOL == rsyncd ]] && {
            [[ $src == */* ]] && {
                path=${src#*/}$slash
                mkdir -p "$SNAPDIR/$server$dir/$path"
            }
        }

        echo "rsync $RSYNC_OPTS --timeout=$TIMEOUT --delete -a${v} \\"
        echo "    $EXCLOPTS $src$slash $SNAPDIR/$server$dir/$path"
        rsync $RSYNC_OPTS --timeout=$TIMEOUT --delete -a${v} \
            $EXCLOPTS $src$slash $SNAPDIR/$server$dir/$path
        [[ $? -ne 0 ]] && {
            echo
            echo "ERROR: 'rsync' exited with non-zero status."
            echo
            errors+=1
            failed_servers+="$spc$server"
            spc=" "
        }
        date
        echo "Log for server $server ENDS"
        echo
    done <<<"$INCL"

    # POST

    set +f # Enable pathname expansion

    while read i; do
        [[ -z $i ]] && continue
        [[ $i == '#'* ]] && continue
        set -- $i
        option="$1"
        shift
        args="$@"
        case $option in
            snap_subdir_delete) snap_subdir_delete $args
            ;;
        esac
    done <<<"$POST"

    # Report

    echo
    echo "Number of errors: $errors"

    if [[ $errors -ne 0 ]]; then
        echo
        echo "Failed servers BEGIN:"
        for i in $failed_servers; do
            echo "    $i"
        done
        echo "Failed servers END:"
        echo
        exitval=1
    else
        echo
        echo "All backups completed successfully."
        echo
        exitval=0
    fi

    exit $exitval
}

# ---------------------------------------------------------------------------
parse_options()
# ---------------------------------------------------------------------------
# Purpose: Parse program options and set globals.
# Arguments: None
# Returns: Nothing
{
    set -- $CMDLINE
    while true
    do
    case $1 in
            -p) NUMPERIODS="$2"
                shift
            ;;
            -n) SNAPSHOTS=0
            ;;
            -V) VERBOSE=1
            ;;
            -v) echo "Version: $VERSION"
                exit 0
            ;;
            -h) usage
                exit 0
            ;;
            ?*) usage
                echo -e "\nInvalid option '$1'\n"
                exit 4
            ;;
        esac
    shift 1 || break
    done
}

# ---------------------------------------------------------------------------
usage() {
# ---------------------------------------------------------------------------
# Arguments: None
# Returns: Nothing

    local script=`basename $ME`

    echo
    echo "$script - One-way Rsync from one or more servers to this server."
    echo
    echo "Usage: $script [options]"
    echo
    echo "Options:"
    echo
    echo " -p NUM   : Number of periods to split the day into."
    echo "            This option has no meaning if snapshots are disabled."
    echo " -n       : Disable snapshotting. All backups will be saved"
    echo "            into a directory named 'nosnap/'."
    echo " -h       : This help text."
    echo " -V       : Be verbose. Show files that were rsync'd."
    echo " -v       : Version of this program."
    echo
    echo "Notes:"
    echo "Examples:"
    echo
}

# ---------------------------------------------------------------------------
build_excl_option() {
# ---------------------------------------------------------------------------
# Build the rsync exclude option. Sets the EXCLOPTS global variable.
# Arguments: Arg1 - the server
# Returns: Nothing

    local i j excl spc excludes="lost+found $@"

    spc=""
    excl=""
    for j in $excludes; do
        excl+="${spc}--exclude $j"
        spc=" "
    done

    EXCLOPTS=$excl
}

# ---------------------------------------------------------------------------
init_vars() {
# ---------------------------------------------------------------------------
# Initialise vars, assign DEFAULT_* to vars if empty. This allows environment
# variables to override the default values.
# Arguments: None
# Returns: Nothing

    BASEDIR=${BASEDIR:-$DEFAULT_BASEDIR}
    BASEDIR=${BASEDIR%/} # Strip a trailing slash
    KNOWNHOSTS=${KNOWNHOSTS:-$DEFAULT_KNOWNHOSTS}
    NUMPERIODS=${NUMPERIODS:-$DEFAULT_NUMPERIODS}
    TIMEOUT=${TIMEOUT:-$DEFAULT_TIMEOUT}
    MAXFILES=${MAXFILES:-$MAXFILES}
}

# ---------------------------------------------------------------------------
sanity_checks() {
# ---------------------------------------------------------------------------
# Check obvious things.
# Arguments: None
# Returns: Nothing

    for binary in grep date rsync zfs; do
        if ! which $binary >& /dev/null; then
            echo "ERROR: $binary binary not found in path. Aborting."
            exit 1
        fi
    done

    [[ -z $INCL ]] && [[ -z $CONF || ! -r $CONF ]] && {
        echo
        echo "ERROR: Could not read configuration file, '$CONF'."
        echo 
        exit 1
    }

    [[ -z $BASEDIR || $BASEDIR == "/" ]] && {
        echo
        echo "ERROR: BASEDIR is either not set or is '/'. Cannot continue."
        echo 
        exit 1
    }

}

# ---------------------------------------------------------------------------
leave() {
# ---------------------------------------------------------------------------
    echo
    echo "ERROR: Exiting on user interrupt."
    echo
    exit 1
}

# ===========================================================================
# PRE/POST commands
# ===========================================================================

# ---------------------------------------------------------------------------
create_zfs_snapshot() {
# ---------------------------------------------------------------------------
# Recursively hardlink with 'cp -al'

    local datestr last
    local -i now=0 midnight=0 curperiod=0

    # Using zfs snapshots
    SNAPDIR="$BASEDIR/nosnap"

    # Snapshots are enabled
    now=`date +%s`
    midnight=`date +%s -d "today 00:00"`
    curperiod=$((((now-midnight)/(((60*60*24)/$NUMPERIODS)))+1))
    [[ $curperiod -lt 1 || $curperiod -gt $NUMPERIODS ]] && {
        echo
        echo "ERROR: Internal error in create_snapshot_dir()"
        echo "ERROR: curperiod should be between 1 and $NUMPERIODS"
        echo "ERROR: curperiod=$curperiod"
        echo
        exit 1
    }
    datestr="`date +%Y%m%d`.$curperiod"
    zfs snapshot backup/servers-zfs@$datestr
}

# ---------------------------------------------------------------------------
create_snapshot_dir() {
# ---------------------------------------------------------------------------
# Recursively hardlink with 'cp -al'

    local datestr last
    local -i now=0 midnight=0 curperiod=0

    if [[ $SNAPSHOTS -eq 0 ]]; then
        # Snaphots are disabled
        SNAPDIR="$BASEDIR/nosnap"
    else
        # Snapshots are enabled
        now=`date +%s`
        midnight=`date +%s -d "today 00:00"`
        curperiod=$((((now-midnight)/(((60*60*24)/$NUMPERIODS)))+1))
        [[ $curperiod -lt 1 || $curperiod -gt $NUMPERIODS ]] && {
            echo
            echo "ERROR: Internal error in create_snapshot_dir()"
            echo "ERROR: curperiod should be between 1 and $NUMPERIODS"
            echo "ERROR: curperiod=$curperiod"
            echo
            exit 1
        }
        datestr="`date +%Y%m%d`.$curperiod"
        SNAPDIR="$BASEDIR/$datestr"
        # Create hard links from old to new if this is a new period
        [[ ! -e $SNAPDIR ]] && {
            last=`ls $BASEDIR | tail -n 1`
            echo "Linking $BASEDIR/$last to $SNAPDIR"
            cp -al $BASEDIR/$last/ $SNAPDIR/
        }
    fi
}

# ---------------------------------------------------------------------------
snap_subdir_delete()
# ---------------------------------------------------------------------------
# Purpose: Delete directories in snapshots after sync
# Arguments: Arg1 - server name
#            Arg2 - keep NUM snapshots
#            Arg3 to ArgN - directories to delete
# Returns: Nothing
{
    local server=$1 numsnap=$2 delfrom= d i j snapdir=
    shift; shift
    delete="$@"

    [[ $SNAPSHOTS -eq 1 ]] && {
        for i in $delete; do
            echo "Keeping last $numsnap snaphots for directory $i on $server."
            delfrom=`ls -1 $BASEDIR | head -n -2`
            for snapdir in $delfrom; do
                d="$BASEDIR/$snapdir/$server/$i"
                d=${d%/}
                [[ -e $d && -n $d && $d != "/" ]] && {
                    echo "Executing: rm -rf $d/*"
                    rm -rf $d/*
                }
            done
        done
    }
}

# ---------------------------------------------------------------------------
snap_delete()
# ---------------------------------------------------------------------------
# Purpose: Delete directories in snapshots after sync
# Arguments: Arg1 - server name
#            Arg2 - keep NUM snapshots
#            Arg3 to ArgN - directories to delete
# Returns: Nothing
{

    ## TODO ## THIS IS NOT THE IMPLEMENTATION ## TODO ##

    local server=$1 numsnap=$2 delfrom= d i j snapdir=
    shift; shift
    delete="$@"

    [[ $SNAPSHOTS -eq 1 ]] && {
        for i in $delete; do
            echo "Keeping last $numsnap snaphots for server $server."
            echo "Deleting old snapshot directory $i."
            delfrom=`ls -1 $BASEDIR | head -n -2`
            for snapdir in $delfrom; do
                d="$BASEDIR/$snapdir/$server/$i"
                d=${d%/}
                [[ -e $d && -n $d && $d != "/" ]] && {
                    rm -rf $d/*
                }
            done
        done
    }
}

# ---------------------------------------------------------------------------
binds_delete()
# ---------------------------------------------------------------------------
# Purpose: Delete directories that are no longer used in /binds. The /binds
#          directory holds all the directories that will be bind mounted
#          over the lessfs backup directories. This is a POST command so
#          when the backup has completed, all of the directories will have
#          been mounted. Directories that have not been mounted are therefore
#          surplace to requirements and are deleted by binds_delete.
# Arguments: Arg1 - server name
# Returns: Nothing
{

    ## TODO ## THIS IS NOT THE IMPLEMENTATION ## TODO ##

    local server=$1 numsnap=$2 delfrom= d i j snapdir=
    shift; shift
    delete="$@"

    [[ $SNAPSHOTS -eq 1 ]] && {
        for i in $delete; do
            echo "Keeping last $numsnap snaphots for server $server."
            echo "Deleting old snapshot directory $i."
            delfrom=`ls -1 $BASEDIR | head -n -2`
            for snapdir in $delfrom; do
                d="$BASEDIR/$snapdir/$server/$i"
                d=${d%/}
                [[ -e $d && -n $d && $d != "/" ]] && {
                    rm -rf $d/*
                }
            done
        done
    }
}


main "$@"

# vim:ts=4:sw=4:et:si
