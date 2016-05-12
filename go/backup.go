// Obdi - a REST interface and GUI for deploying software
// Copyright (C) 2014  Mark Clarkson
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/rpc"
	"os"
)

// Create tables and indexes in InitDB
func (gormInst *GormDB) InitDB(dbname string) error {

	return nil
}

// ***************************************************************************
// GO RPC PLUGIN
// ***************************************************************************

/*
 * For running scripts, the script and arguments etc. are sent to the target
 * Obdi worker as an Obdi job. The job ID is returned to the client straight
 * away and then the job is run. The client should poll the jobs table to
 * see when the job finishes. When the job is finished, the output will be
 * available to the client in the outputlines table.
 */

func (t *Plugin) GetRequest(args *Args, response *[]byte) error {

	ReturnError("Internal error: Unimplemented HTTP GET", response)
	return nil
}

func (t *Plugin) PostRequest(args *Args, response *[]byte) error {

	// POST requests can change state.

	// Run the backup script.

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'task_id' must be set", response)
		return nil
	}

	var cmdargs string

	if len(args.QueryString["verbose"]) > 0 {
		cmdargs = "-V"
	}

	// Set up the environment variables

	envvars := `PROTOCOL=rsyncd PRE=create_zfs_snapshot BASEDIR=/backup/servers-zfs/ INCL="phhlapphot001 backup /var/log/** /hcom/scripts/** /hcom/work/** /hcom/docker_volumes/**
phhlapphot002 backup /var/log/** /hcom/scripts/** /hcom/work/** /hcom/docker_volumes/**"`

	sa := ScriptArgs{
		// The name of the script to send an run
		ScriptName: "backup.sh",
		// The arguments to use when running the script
		CmdArgs: cmdargs,
		// Environment variables to pass to the script
		EnvVars: envvars,
		// Name of an environment capability (where isworkerdef == true)
		// that can point to a worker other than the default.
		EnvCapDesc: "RSYNCBACKUP_WORKER_1",
		// Type 1 - User Job - Output is
		//     sent back as it's created
		// Type 2 - System Job - All output
		//     is saved in one single line.
		//     Good for json etc.
		Type: 1,
	}

	var jobid int64
	{
		var err error
		if jobid, err = t.RunScript(args, sa, response); err != nil {
			// RunScript wrote the error so just return
			return nil
		}
	}

	reply := Reply{jobid, "", SUCCESS, ""}
	jsondata, err := json.Marshal(reply)
	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}
	*response = jsondata

	return nil
}

func (t *Plugin) HandleRequest(args *Args, response *[]byte) error {

	// All plugins must have this.

	if len(args.QueryType) > 0 {
		switch args.QueryType {
		case "GET":
			t.GetRequest(args, response)
			return nil
		case "POST":
			t.PostRequest(args, response)
			return nil
		}
		ReturnError("Internal error: Invalid HTTP request type for this plugin "+
			args.QueryType, response)
		return nil
	} else {
		ReturnError("Internal error: HTTP request type was not set", response)
		return nil
	}
}

func main() {

	//logit("Plugin starting")

	plugin := new(Plugin)
	rpc.Register(plugin)

	listener, err := net.Listen("tcp", ":"+os.Args[1])
	if err != nil {
		txt := fmt.Sprintf("Listen error. ", err)
		logit(txt)
	}

	//logit("Plugin listening on port " + os.Args[1])

	if conn, err := listener.Accept(); err != nil {
		txt := fmt.Sprintf("Accept error. ", err)
		logit(txt)
	} else {
		//logit("New connection established")
		rpc.ServeConn(conn)
	}
}
