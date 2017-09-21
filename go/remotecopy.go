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
	"io/ioutil"
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

	// path is required, '?path=xxx'

	if len(args.QueryString["path"]) == 0 {
		ReturnError("'path' must be set.", response)
		return nil
	}

	path_str := args.QueryString["path"][0]

	// mountdev is optional, '?mountdev=xxx'

	var mountdev_str string
	if len(args.QueryString["mountdev"]) > 0 {
		mountdev_str = args.QueryString["mountdev"][0]
	}

	// mountdir is optional, '?mountdir=xxx'

	var mountdir_str string
	if len(args.QueryString["mountdir"]) > 0 {
		mountdir_str = args.QueryString["mountdir"][0]
	}

	// umountdir is optional, '?umountdir=xxx'

	var umountdir_str string
	if len(args.QueryString["umountdir"]) > 0 {
		umountdir_str = args.QueryString["umountdir"][0]
	}

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

	/* Need to set the following environment variables for the script:

	LOCALDIR   - Directory to copy from.
	REMOTEDIR  - Directory to copy to.
	PRIVKEYB64 - Private key for accessing server over ssh.
	REMOTEUSER - User to connect to remote server as.
	MOUNTDEV   - Optional. Device to mount.
	MOUNTDIR   - Optional. Directory to mount MOUNTDIR on.
	UMOUNTDIR  - Optional. Unmount after copy.

	*/

	///////////need it?
	var space string

	// LOCALDIR
	if len(setting.BaseDir) > 0 {
		env_vars_str += space + "LOCALDIR=" + `"` + setting.BaseDir +
			"/" + path_str + `"`
		space = " "
	} else {
		ReturnError("BASEDIR setting is empty. ", response)
		return nil
	}

	// REMOTEDIR
	end := strings.Split(strings.TrimRight(path_str, "/"), "/")
	env_vars_str += space + `REMOTEDIR="/incoming/` + end[len(end)-1] + `"`

	// Get secret data from the AWS_ACCESS_KEY_ID_1 capability using sdtoken

	envcaps := []EnvCap{}
	{
		resp, _ := GET("https://127.0.0.1/api/"+args.PathParams["login"]+
			"/"+args.PathParams["GUID"], "/envcaps?code=AWS_ACCESS_KEY_ID_1")
		if b, err := ioutil.ReadAll(resp.Body); err != nil {
			txt := fmt.Sprintf("Error reading Body ('%s').", err.Error())
			ReturnError(txt, response)
			return nil
		} else {
			json.Unmarshal(b, &envcaps)
		}
	}

	json_objects := []JsonObject{}
	{
		env_cap_id_str := strconv.FormatInt(envcaps[0].Id, 10)

		resp, _ := GET("https://127.0.0.1/api/sduser/"+args.SDToken,
			"/jsonobjects?env_id="+env_id_str+"&env_cap_id="+env_cap_id_str)
		if b, err := ioutil.ReadAll(resp.Body); err != nil {
			txt := fmt.Sprintf("Error reading Body ('%s').", err.Error())
			ReturnError(txt, response)
			return nil
		} else {
			json.Unmarshal(b, &json_objects)
		}
	}

	type AWSData struct {
		Aws_access_key_id     string // E.g. OKLAJX2KN6OXZEFV4B1Q
		Aws_secret_access_key string // E.g. oiwjeg^laGDIUsg@jfa

		// required by obdi-aws-p2ec2

		Aws_obdi_worker_instance_id string // E.g. i-e19ec362
		Aws_obdi_worker_region      string // E.g. us-east-1
		Aws_obdi_worker_url         string // E.g. https://1.2.3.4:4443/
		Aws_obdi_worker_key         string // E.g. secretkey
		Aws_filter                  string // E.g. key-name=itsupkey

		// required by obdi-rsyncbackup/remotecopy

		Aws_shell_ssh_key_b64 string // Must be base64 encoded
		Aws_shell_user_name   string // E.g. ec2-user
		Aws_obdi_worker_ip    string // 52.2.0.138
	}

	awsdata := AWSData{}
	if err := json.Unmarshal([]byte(json_objects[0].Json), &awsdata); err != nil {
		txt := fmt.Sprintf("Error decoding JsonObject ('%s').", err.Error())
		ReturnError(txt, response)
		return nil
	}

	// PRIVKEYB64
	env_vars_str += space + `PRIVKEYB64="` + awsdata.Aws_shell_ssh_key_b64 + `"`

	// REMOTEUSER
	env_vars_str += space + `REMOTEUSER="` + awsdata.Aws_shell_user_name + `"`

	// MOUNTDEV
	env_vars_str += space + `MOUNTDEV="` + mountdev_str + `"`

	// MOUNTDIR
	env_vars_str += space + `MOUNTDIR="` + mountdir_str + `"`

	// UMOUNTDIR
	env_vars_str += space + `UMOUNTDIR="` + umountdir_str + `"`

	// Command arguments

	cmdargs := awsdata.Aws_obdi_worker_ip

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
		ScriptName: "rsyncbackup-copyfiles.sh",
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
