#!/bin/bash
# Copy a directory tree to a remote server using ssh and cpio.
# Expects:
#   Arguments:
#
#     Arg 1 - IP or DNS name of server to copy to.
#
#   Environment variables:
#
#     LOCALDIR   - Directory to copy from.
#     REMOTEDIR  - Directory to copy to.
#     PRIVKEYB64 - Private key for accessing server over ssh.
#     REMOTEUSER - User to connect to remote server as.
#     MOUNTDEV   - Optional. Device to mount.
#     MOUNTDIR   - Optional. Directory to mount MOUNTDIR on.
#     UMOUNTDIR  - Optional. Unmount after copy.

export PATH=/sbin:/usr/sbin:$PATH

# For priming ssh
KNOWNHOSTS=~/.ssh/known_hosts
TMPKEYFILE=~/.rsyncbackup-copyfiles.key
SUDO=sudo

# ---------------------------------------------------------------------------
# SANITY CHECKS
# ---------------------------------------------------------------------------

DESTSRV=$1
[[ -z $DESTSRV ]] && {
  echo "Arg 1, the destination server, must be set."
  exit 1
}

[[ -z $LOCALDIR ]] && {
  echo -n "LOCALDIR environment variable must be set."
  echo -n " LOCALDIR is the directory that will be copied"
  echo " to the remote server, $DESTSRV."
  exit 1
}

[[ -z $REMOTEDIR ]] && {
  echo -n "REMOTEDIR environment variable must be set."
  echo -n " REMOTEDIR is the directory on the remote server"
  echo ", $DESTSRV, where the files will be copied to."
  exit 1
}

[[ -z $PRIVKEYB64 ]] && {
  echo -n "PRIVKEYB64 environment variable must be set."
  echo -n " PRIVKEYB64 is the ssh private key needed to access"
  echo " the remote server, $DESTSRV. The key should be base64"
  echo " encoded, for example, 'base64 -w 0 awskey.pem'."
  exit 1
}

[[ -z $REMOTEUSER ]] && {
  echo -n "REMOTEUSER environment variable must be set."
  echo -n " REMOTEUSER is the user that will be used to connect"
  echo "to the remote server, $DESTSRV, over SSH."
  exit 1
}

# XOR
[[ ( -n $MOUNTDIR || -n $MOUNTDEV ) && \
   ! ( -n $MOUNTDIR && -n $MOUNTDEV ) ]] && {
  echo -n "MOUNTDIR and MOUNTDEV environment variables must"
  echo -n " either both be set, or neither set. These specify"
  echo -n " the device and mount point that will be mounted on"
  echo -n " $DESTSRV.It will not be unmounted after the copy"
  echo " unless UMOUNTDIR environment variable is \"true\"."
  exit 1
}

for binary in grep cpio ssh ssh-keyscan base64 sudo gzip; do
    if ! which $binary >& /dev/null; then
        echo "ERROR: $binary binary not found in PATH. Aborting."
        exit 1
    fi
done

# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
ssh_cmd() {
# ---------------------------------------------------------------------------
# Run a remote command and exit 1 on failure.
# Arguments: arg1 - server to connect to
#            arg2 - "savestdout" then save output in LAST_STDOUT
#            arg3 - Command and arguments to run
# Returns: Nothing

    [[ $DEBUG -eq 1 ]] && echo "In ssh_cmd()"

    local -i retval=0 t=0 n=0
    local tmpout="/tmp/tmprsyncbackupout_$$.out"
    local tmperr="/tmp/tmprsyncbackuperr_$$.out"
    local tmpret="/tmp/tmprsyncbackupret_$$.out"
    local tmpechod="/tmp/tmprsyncbackupechod_$$.out"

    if [[ $2 == "savestdout" ]]; then
        trap : INT
        echo "> Running remotely: $3"
        ( ssh -i "$TMPKEYFILE" "$REMOTEUSER@$DESTSRV" "$3" \
          >$tmpout 2>$tmperr;
          echo $? >$tmpret) & waiton=$!;
        ( t=0;n=0
          while true; do
            [[ $n -eq 2 ]] && {
                echo -n "> Waiting ";
                touch $tmpechod;
            }
            [[ $n -gt 2 ]] && echo -n ".";
            sleep $t;
            t=1; n+=1
          done 2>/dev/null;
        ) & killme=$!
        wait $waiton &>/dev/null
        kill $killme &>/dev/null
        wait $killme 2>/dev/null
        [[ -e $tmpechod ]] && {
            rm -f $tmpechod &>/dev/null
            echo
        }
        retval=`cat $tmpret`
        LAST_STDOUT=`cat $tmpout`
        trap - INT
    else
        LAST_STDOUT=
        trap : INT
        echo "> Running remotely: $3"
        ( ssh -i "$TMPKEYFILE" "$REMOTEUSER@$DESTSRV" "$3" \
          >$tmpout 2>$tmperr;
          echo $? >$tmpret) & waiton=$!;
        ( t=0;n=0
          while true; do
            [[ $n -eq 2 ]] && {
                echo -n "> Waiting ";
                touch $tmpechod;
            }
            [[ $n -gt 2 ]] && echo -n ".";
            sleep $t;
            t=1; n+=1
          done 2>/dev/null;
        ) & killme=$!
        wait $waiton &>/dev/null
        kill $killme &>/dev/null
        wait $killme 2>/dev/null
        [[ -e $tmpechod ]] && {
            rm -f $tmpechod &>/dev/null
            echo
        }
        retval=`cat $tmpret`
        trap - INT
    fi

    [[ $retval -ne 0 ]] && {
        echo
        echo -e "${R}ERROR$N: Command failed on '$1'. Command was:"
        echo
        echo "  $3"
        echo
        echo "OUTPUT WAS:"
        echo "  $LAST_STDOUT"
        echo "  $(cat $tmperr | sed 's/^/  /')"
        echo
        echo "Cannot continue. Aborting."
        echo
        exit 1
    }
}

# ---------------------------------------------------------------------------
cleanup() {
# ---------------------------------------------------------------------------
    rm -f $TMPKEYFILE &>/dev/null
}

# ---------------------------------------------------------------------------
# PRIME SSH
# ---------------------------------------------------------------------------

touch $KNOWNHOSTS
if ! grep -qs $DESTSRV $KNOWNHOSTS; then
    # Add the server to known_hosts
    echo "ssh-keyscan $DESTSRV >> $KNOWNHOSTS"
    ssh-keyscan $DESTSRV >> $KNOWNHOSTS
fi

trap cleanup EXIT

echo "$PRIVKEYB64" | base64 -d >$TMPKEYFILE
chmod 0600 $TMPKEYFILE

# ---------------------------------------------------------------------------
# (MAYBE) MOUNT THE DIRECTORY
# ---------------------------------------------------------------------------

[[ -n $MOUNTDIR && -n $MOUNTDEV ]] && {

    ssh_cmd $DESTSRV savestdout \
        "mountpoint -q $MOUNTDIR && echo mounted || echo notmounted"

    [[ $LAST_STDOUT == "mounted" ]] && {
        echo "ERROR: Directory is already mounted. Cannot continue."
        exit 1
    }

    ssh_cmd $DESTSRV savestdout \
        "ls $MOUNTDEV || echo notok"

    [[ $LAST_STDOUT == "notok" ]] && {

        MOUNTDEV="/dev/xvd${MOUNTDEV#/dev/sd}"

        ssh_cmd $DESTSRV savestdout \
            "ls $MOUNTDEV || echo notok"

        [[ $LAST_STDOUT == "notok" ]] && {
            MOUNTDEV="/dev/hd${MOUNTDEV#/dev/xvd}"

            ssh_cmd $DESTSRV savestdout \
                "ls $MOUNTDEV || echo notok"

            [[ $LAST_STDOUT == "notok" ]] && {
                echo "ERROR: Could not find device $MOUNTDEV. Cannot continue."
                exit 1
            }
        }
    }

    ssh_cmd $DESTSRV savestdout \
        "$SUDO fdisk $MOUNTDEV < <(echo -e 'n\np\n1\n\n\np\nw\nq') || echo notok"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Failed partitioning $MOUNTDEV. Cannot continue."
        exit 1
    }

    MOUNTPART=${MOUNTDEV}1

    ssh_cmd $DESTSRV savestdout \
        "$SUDO mkfs.ext4 -m1 $MOUNTPART || echo notok"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not create ext4 filesystem. Cannot continue."
        exit 1
    }

    ssh_cmd $DESTSRV savestdout \
        "$SUDO mkdir -p $MOUNTDIR"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not create mountpoint, '$MOUNTDIR'. Cannot continue."
        exit 1
    }

    ssh_cmd $DESTSRV savestdout \
        "$SUDO mount $MOUNTPART $MOUNTDIR"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not mount filesystem. Cannot continue."
        exit 1
    }
}

# ---------------------------------------------------------------------------
# COPY FILES
# ---------------------------------------------------------------------------

cd $LOCALDIR
[[ $? -ne 0 ]] && {
    echo "ERROR: Could not change into directory, $LOCALDIR. Cannot continue."
    exit 1
}

echo "> Starting to copy files"

$SUDO find . | \
    $SUDO cpio -v -o -H crc | gzip -c | \
    ssh -i $TMPKEYFILE -c arcfour $REMOTEUSER@$DESTSRV \
      "gunzip - | (cd $REMOTEDIR; $SUDO cpio -idum)"

[[ $? -ne 0 ]] && {
    echo "ERROR: CPIO exited with non-zero exit status. The command run was:"
    echo
    cat <<EnD
$SUDO find . | \
    $SUDO cpio -v -o -H crc | gzip -c | \
    ssh -i $TMPKEYFILE -c arcfour $REMOTEUSER@$DESTSRV \
      "gunzip - | (cd $REMOTEDIR; $SUDO cpio -idum)"
EnD
    echo
    echo "Check Obdi System Jobs logs for more information."

    exit 1
}

# ---------------------------------------------------------------------------
# (MAYBE) UNMOUNT THE DIRECTORY
# ---------------------------------------------------------------------------

[[ -n $UMOUNTDIR ]] && {

    ssh_cmd $DESTSRV savestdout \
        "$SUDO fuser -kma $MOUNTDIR || true"

    ssh_cmd $DESTSRV savestdout \
        "$SUDO umount $MOUNTDIR/* || true"

    ssh_cmd $DESTSRV savestdout \
        "$SUDO umount $MOUNTDIR"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not mount filesystem. Cannot continue."
        exit 1
    }
}

# Output in JSON format
echo "Copy completed successfully."

exit 0
