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
	"strconv"
)

// The format of the json sent by the client in a POST request
type PostedData struct {
	Id          int64
	TaskId      int64
	Protocol    string
	Pre         string
	Repeat      bool
	RepeatPre   string
	RepeatPost  string
	RsyncOpts   string
	BaseDir     string
	KnownHosts  string
	NumPeriods  int64
	Timeout     int64
	Verbose     bool
	SshKeyFile  string
	SshUid      string
	SshSudo     string
	SshNotProcs string
}

// Name of the sqlite3 database file
const DBFILE = "rsyncbackup.db"

// ***************************************************************************
// DATABASE FUNCS
// ***************************************************************************

// The 'settings' table
type Setting struct {
	Id          int64
	TaskId      int64
	Protocol    string
	Pre         string
	Repeat      bool
	RepeatPre   string
	RepeatPost  string
	RsyncOpts   string
	BaseDir     string
	KnownHosts  string
	NumPeriods  int64
	Timeout     int64
	Verbose     bool
	SshKeyFile  string
	SshUid      string
	SshSudo     string
	SshNotProcs string
}

// Create tables and indexes in InitDB
func (gormInst *GormDB) InitDB(dbname string) error {

	db := gormInst.db // shortcut

	// Create the Setting table
	if err := db.AutoMigrate(Setting{}).Error; err != nil {
		txt := fmt.Sprintf("AutoMigrate Setting table failed: %s", err)
		return ApiError{txt}
	}

	// Add any indexes
	db.Model(Setting{}).AddIndex("idx_settings_task_id", "task_id")

	return nil
}

// ***************************************************************************
// GO RPC PLUGIN
// ***************************************************************************

func (t *Plugin) GetRequest(args *Args, response *[]byte) error {

	// GET requests don't change state, so, don't change state

	// task_id is required, '?task_id=xxx'

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'task_id' must be set", response)
		return nil
	}

	task_id_str := args.QueryString["task_id"][0]

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

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

	// Get settings for this task_id

	db := gormdb.DB() // for convenience
	settings := []Setting{}
	Lock()
	if err = db.Find(&settings, "task_id = ?", task_id_str).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	// Create a map of the query result

	u := make([]map[string]interface{}, len(settings))
	for i := range settings {
		u[i] = make(map[string]interface{})
		u[i]["Id"] = settings[i].Id
		u[i]["TaskId"] = settings[i].TaskId
		u[i]["Protocol"] = settings[i].Protocol
		u[i]["Pre"] = settings[i].Pre
		u[i]["Repeat"] = settings[i].Repeat
		u[i]["RepeatPre"] = settings[i].RepeatPre
		u[i]["RepeatPost"] = settings[i].RepeatPost
		u[i]["RsyncOpts"] = settings[i].RsyncOpts
		u[i]["BaseDir"] = settings[i].BaseDir
		u[i]["KnownHosts"] = settings[i].KnownHosts
		u[i]["NumPeriods"] = settings[i].NumPeriods
		u[i]["Timeout"] = settings[i].Timeout
		u[i]["Verbose"] = settings[i].Verbose
		u[i]["SshKeyFile"] = settings[i].SshKeyFile
		u[i]["SshUid"] = settings[i].SshUid
		u[i]["SshSudo"] = settings[i].SshSudo
		u[i]["SshNotProcs"] = settings[i].SshNotProcs
	}

	// JSONify the query result

	TempJsonData, err := json.Marshal(u)
	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}

	// Put the query result in the reply.Text field

	reply := Reply{
		JobId:        0,
		Text:         string(TempJsonData),
		PluginReturn: SUCCESS,
		PluginError:  "",
	}
	jsondata, err := json.Marshal(reply)
	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}

	// Set the response argument to the JSON. It will be returned
	// to the caller.

	*response = jsondata

	return nil
}

func (t *Plugin) PostRequest(args *Args, response *[]byte) error {

	// POST requests can change state

	// task_id is required, '?task_id=xxx'

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'task_id' must be set", response)
		return nil
	}

	task_id_str := args.QueryString["task_id"][0]
	task_id_i64, _ := strconv.ParseInt(task_id_str, 10, 64)

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

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

	// Decode the post data into struct

	var postdata PostedData

	if err := json.Unmarshal(args.PostData, &postdata); err != nil {
		txt := fmt.Sprintf("Error decoding JSON ('%s')"+".", err.Error())
		ReturnError("Error decoding the POST data ("+
			fmt.Sprintf("%s", args.PostData)+"). "+txt, response)
		return nil
	}

	// Delete any existing entries

	Lock()
	if err = db.Delete(Setting{}, "task_id = ?", task_id_str).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	// The following Setting will be written to the db

	setting := Setting{
		Id:          0,
		TaskId:      task_id_i64,
		Protocol:    postdata.Protocol,
		Pre:         postdata.Pre,
		Repeat:      postdata.Repeat,
		RepeatPre:   postdata.RepeatPre,
		RepeatPost:  postdata.RepeatPost,
		RsyncOpts:   postdata.RsyncOpts,
		BaseDir:     postdata.BaseDir,
		KnownHosts:  postdata.KnownHosts,
		NumPeriods:  postdata.NumPeriods,
		Timeout:     postdata.Timeout,
		Verbose:     postdata.Verbose,
		SshKeyFile:  postdata.SshKeyFile,
		SshUid:      postdata.SshUid,
		SshSudo:     postdata.SshSudo,
		SshNotProcs: postdata.SshNotProcs,
	}

	// Add the Setting entry

	Lock()
	if err := db.Save(&setting).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// JSONify the setting

	TempJsonData, err := json.Marshal(setting)
	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}

	// Save the JSON in the reply.Text field

	reply := Reply{
		JobId:        0,
		Text:         string(TempJsonData),
		PluginReturn: SUCCESS,
		PluginError:  "",
	}

	// JSONify the whole reply
	jsondata, err := json.Marshal(reply)
	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}

	// Set the response argument to the JSON. It will be returned
	// to the caller.

	*response = jsondata

	return nil
}

func (t *Plugin) PutRequest(args *Args, response *[]byte) error {

	// task_id is required, '?task_id=xxx'

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'task_id' must be set", response)
		return nil
	}

	task_id_str := args.QueryString["task_id"][0]
	task_id_i64, _ := strconv.ParseInt(task_id_str, 10, 64)

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

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

	// Decode the post data into struct

	var postdata PostedData

	if err := json.Unmarshal(args.PostData, &postdata); err != nil {
		txt := fmt.Sprintf("Error decoding JSON ('%s')"+".", err.Error())
		ReturnError("Error decoding the POST data ("+
			fmt.Sprintf("%s", args.PostData)+"). "+txt, response)
		return nil
	}

	// Search the settings table for the setting id

	settings := []Setting{}
	Lock()
	if err := db.Find(&settings, "id = ?", postdata.Id).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	if len(settings) == 0 {
		id := strconv.FormatInt(postdata.Id, 10)
		ReturnError("Setting '"+id+"' not found. Can't update.", response)
		return nil
	}

	// The following Setting will be written to the db
	setting := Setting{
		Id:          postdata.Id,
		TaskId:      task_id_i64,
		Protocol:    postdata.Protocol,
		Pre:         postdata.Pre,
		Repeat:      postdata.Repeat,
		RepeatPre:   postdata.RepeatPre,
		RepeatPost:  postdata.RepeatPost,
		RsyncOpts:   postdata.RsyncOpts,
		BaseDir:     postdata.BaseDir,
		KnownHosts:  postdata.KnownHosts,
		NumPeriods:  postdata.NumPeriods,
		Timeout:     postdata.Timeout,
		Verbose:     postdata.Verbose,
		SshKeyFile:  postdata.SshKeyFile,
		SshUid:      postdata.SshUid,
		SshSudo:     postdata.SshSudo,
		SshNotProcs: postdata.SshNotProcs,
	}

	// Update the Setting entry

	Lock()
	if err := db.Save(&setting).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// Output JSON

	TempJsonData, err := json.Marshal(setting)
	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}
	reply := Reply{0, string(TempJsonData), SUCCESS, ""}
	jsondata, err := json.Marshal(reply)

	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}

	*response = jsondata

	return nil
}

func (t *Plugin) DeleteRequest(args *Args, response *[]byte) error {

	// task_id is required, '?task_id=xxx'

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'task_id' must be set", response)
		return nil
	}

	task_id_str := args.QueryString["task_id"][0]
	task_id_i64, _ := strconv.ParseInt(task_id_str, 10, 64)

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

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

	id_str := args.PathParams["id"]
	id_int, _ := strconv.ParseInt(args.PathParams["id"], 10, 64)

	// Search the settings table for the setting id

	settings := []Setting{}
	Lock()
	if err := db.Find(&settings, "id = ?", id_str).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	if len(settings) == 0 {
		ReturnError("Setting '"+id_str+"' not found. Can't delete.", response)
		return nil
	}

	// Set up an Setting with the id to be deleted
	setting := Setting{
		Id:         id_int,
		TaskId:     task_id_i64,
		Protocol:   "",
		Pre:        "",
		Repeat:     false,
		RepeatPre:  "",
		RepeatPost: "",
		RsyncOpts:  "",
		BaseDir:    "",
		KnownHosts: "",
		NumPeriods: 0,
		Timeout:    0,
	}

	// Delete the Setting entry from the DB

	Lock()
	if err := db.Delete(&setting).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// Output JSON

	TempJsonData, err := json.Marshal(setting)
	if err != nil {
		ReturnError("Marshal error: "+err.Error(), response)
		return nil
	}
	reply := Reply{
		JobId:        0,
		Text:         string(TempJsonData),
		PluginReturn: SUCCESS,
		PluginError:  "",
	}

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
		case "PUT":
			t.PutRequest(args, response)
			return nil
		case "DELETE":
			t.DeleteRequest(args, response)
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
		logit("New connection established")
		rpc.ServeConn(conn)
	}
}
