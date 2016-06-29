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
	//"sort"
	"strconv"
	"strings"
)

// Name of the sqlite3 database file
const DBFILE = "rsyncbackup.db"

// The 'tasks' table
type Task struct {
	Id       int64
	TaskDesc string
	CapTag   string
	DcId     int64 // Data centre name
	EnvId    int64 // Environment name
}

// The 'includes' table
type Include struct {
	Id     int64
	TaskId int64
	Host   string
	Base   string // Data centre name
}

// The 'excludes' table
type Exclude struct {
	Id        int64
	IncludeId int64
	Path      string
}

// The 'settings' table
type Setting struct {
	Id         int64
	TaskId     int64
	Protocol   string
	Pre        string
	RsyncOpts  string
	BaseDir    string
	KnownHosts string
	NumPeriods int64
	Timeout    int64
	Verbose    bool
}

// Create tables and indexes in InitDB
func (gormInst *GormDB) InitDB(dbname string) error {

	// We just read the database so empty

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

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

	// task_id is required, '?task_id=xxx'

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'task_id' must be set", response)
		return nil
	}

	task_id_str := args.QueryString["task_id"][0]

	// items is optional, '?items=1,2,3'

	var items []int64
	has_item_list := false
	if len(args.QueryString["items"]) > 0 {
		has_item_list = true
		s := strings.Split(args.QueryString["items"][0], ",")
		for i := range s {
			itemid, _ := strconv.ParseInt(s[i], 10, 64)
			items = append(items, itemid)
		}
	}
	//logit(fmt.Sprintf("%#v",items))

	// Check if the user is allowed to access the environment
	var err error
	if _, err = t.GetAllowedEnv(args, env_id_str, response); err != nil {
		// GetAllowedEnv wrote the error
		return nil
	}

	// We got this far so access is allowed.

	// Setup/Open the local database

	var gormdb *GormDB
	if gormdb, err = NewDB(args, DBFILE); err != nil {
		txt := "NewDB open error for '" + config.DBPath() + DBFILE + "'. " +
			err.Error()
		ReturnError(txt, response)
		return nil
	}

	db := gormdb.DB() // for convenience

	// Set up the environment variables

	/* envvars := `PROTOCOL=rsyncd PRE=create_zfs_snapshot BASEDIR=/backup/servers-zfs/ INCL="phhlapphot001 backup /var/log/** /hcom/scripts/** /hcom/work/** /hcom/docker_volumes/**
	phhlapphot002 backup /var/log/** /hcom/scripts/** /hcom/work/** /hcom/docker_volumes/**"`
	*/

	// The string of environment variables
	var env_vars_str string

	// Get settings

	var setting Setting

	Lock()
	if err = db.First(&setting, "task_id = ?", task_id_str).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	var space string

	if len(setting.Protocol) > 0 {
		env_vars_str += space + "PROTOCOL=" + setting.Protocol
		space = " "
	}
	if len(setting.Pre) > 0 {
		env_vars_str += space + "PRE=" + setting.Pre
		space = " "
	}
	if len(setting.RsyncOpts) > 0 {
		env_vars_str += space + "RSYNC_OPTS=" + `"` + setting.RsyncOpts + `"`
		space = " "
	}
	if len(setting.BaseDir) > 0 {
		env_vars_str += space + "BASEDIR=" + `"` + setting.BaseDir + `"`
		space = " "
	}
	if len(setting.KnownHosts) > 0 {
		env_vars_str += space + "KNOWNHOSTS=" + `"` + setting.KnownHosts + `"`
		space = " "
	}
	env_vars_str += space + "NUMPERIODS=" + strconv.FormatInt(setting.NumPeriods, 10)
	space = " "
	env_vars_str += space + "TIMEOUT=" + strconv.FormatInt(setting.Timeout, 10)

	// Command arguments

	var cmdargs string
	if setting.Verbose {
		cmdargs = "-V"
	}

	// Get all includes for this task

	includes := []Include{}
	Lock()
	if err = db.Find(&includes, "task_id = ?", task_id_str).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	// Get excludes

	var newline string

	env_vars_str += space + "INCL=\""

	var notInItemsList = func(id int64) bool {
		if !has_item_list {
			return false
		}
		for i := range items {
			if id == items[i] {
				return false
			}
		}
		return true
	}

OUTER:
	for i := range includes {

		if notInItemsList(includes[i].Id) {
			continue OUTER
		}

		env_vars_str += newline + includes[i].Host + " " + includes[i].Base + " "

		excludes := []Exclude{}
		Lock()
		if err = db.Find(&excludes, "include_id = ?", includes[i].Id).Error; err != nil {
			Unlock()
			ReturnError("Query error. "+err.Error(), response)
			return nil
		}
		Unlock()

		var space string
		for j := range excludes {
			env_vars_str += space + excludes[j].Path
			space = " "
		}

		newline = "\n"
	}

	env_vars_str += "\""

	//logit(env_vars_str)

	// Run the backup script.

	// Get the task to get the CapabilityTag
	task := Task{}
	Lock()
	if err = db.First(&task, "id = ?", task_id_str).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	sa := ScriptArgs{
		// The name of the script to send an run
		ScriptName: "rsyncbackup-backup.sh",
		// The arguments to use when running the script
		CmdArgs: cmdargs,
		// Environment variables to pass to the script
		EnvVars: env_vars_str,
		// Name of an environment capability (where isworkerdef == true)
		// that can point to a worker other than the default.
		EnvCapDesc: task.CapTag,
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

	// Sets the global config var, needed for PluginDatabasePath
	NewConfig()

	// Create a lock file to use for synchronisation
	config.Port = 49995
	config.Portlock = NewPortLock(config.Port)

	plugin := new(Plugin)
	rpc.Register(plugin)

	listener, err := net.Listen("tcp", ":"+os.Args[1])
	if err != nil {
		txt := fmt.Sprintf("Listen error. %s", err)
		logit(txt)
	}

	//logit("Plugin listening on port " + os.Args[1])

	if conn, err := listener.Accept(); err != nil {
		txt := fmt.Sprintf("Accept error. %s", err)
		logit(txt)
	} else {
		//logit("New connection established")
		rpc.ServeConn(conn)
	}
}
