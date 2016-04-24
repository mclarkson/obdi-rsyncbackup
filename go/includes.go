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
	Id       int64
	TaskDesc string
	CapTag   string
}

// Name of the sqlite3 database file
const DBFILE = "rsyncbackup.db"

// ***************************************************************************
// DATABASE FUNCS
// ***************************************************************************

// The 'tasks' table
type Task struct {
	Id       int64
	TaskDesc string
	CapTag   string
	Dc       string // Data centre name
	Env      string // Environment name
}

// Create tables and indexes in InitDB
func (gormInst *GormDB) InitDB(dbname string) error {

	db := gormInst.db // shortcut

	// Create the Task table
	if err := db.AutoMigrate(Task{}).Error; err != nil {
		txt := fmt.Sprintf("AutoMigrate Task table failed: %s", err)
		return ApiError{txt}
	}

	// Add any indexes
	//db.Model(Task{}).AddIndex("idx_hello_text", "text")

	return nil
}

// ***************************************************************************
// GO RPC PLUGIN
// ***************************************************************************

func (t *Plugin) GetRequest(args *Args, response *[]byte) error {

	// GET requests don't change state, so, don't change state

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

	// Check if the user is allowed to access the environment
	var err error
	var foundenv Env
	if foundenv, err = t.GetAllowedEnv(args, env_id_str, response); err != nil {
		// GetAllowedEnv wrote the error
		return nil
	}

	// We got this far so access is allowed. Get the dc and env text values

	dc := foundenv.DcSysName
	env := foundenv.SysName

	// Setup/Open the local database

	var gormdb *GormDB
	if gormdb, err = NewDB(args, DBFILE); err != nil {
		txt := "NewDB open error for '" + config.DBPath() + DBFILE + "'. " +
			err.Error()
		ReturnError(txt, response)
		return nil
	}

	// Get all tasks for this dc and env

	db := gormdb.DB() // for convenience
	tasks := []Task{}
	Lock()
	if err = db.Find(&tasks, "dc = ? and env = ?", dc, env).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	// Create a map of the query result

	u := make([]map[string]interface{}, len(tasks))
	for i := range tasks {
		u[i] = make(map[string]interface{})
		u[i]["Id"] = tasks[i].Id
		u[i]["TaskDesc"] = tasks[i].TaskDesc
		u[i]["CapTag"] = tasks[i].CapTag
		u[i]["Dc"] = tasks[i].Dc
		u[i]["Env"] = tasks[i].Env
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

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

	// Check if the user is allowed to access the environment
	var err error
	var foundenv Env
	if foundenv, err = t.GetAllowedEnv(args, env_id_str, response); err != nil {
		// GetAllowedEnv wrote the error
		return nil
	}

	// We got this far so access is allowed. Get the dc and env text values

	dc := foundenv.DcSysName
	env := foundenv.SysName

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

	// The following Task will be written to the db

	task := Task{
		Id:       0,
		TaskDesc: postdata.TaskDesc,
		CapTag:   postdata.CapTag,
		Dc:       dc,
		Env:      env,
	}

	// Add the Task entry

	Lock()
	if err := db.Save(&task).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// JSONify the task

	TempJsonData, err := json.Marshal(task)
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

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

	// Check if the user is allowed to access the environment
	var err error
	var foundenv Env
	if foundenv, err = t.GetAllowedEnv(args, env_id_str, response); err != nil {
		// GetAllowedEnv wrote the error
		return nil
	}

	// We got this far so access is allowed. Get the dc and env text values

	dc := foundenv.DcSysName
	env := foundenv.SysName

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

	// Search the tasks table for the task id

	tasks := []Task{}
	Lock()
	if err := db.Find(&tasks, "id = ? and dc = ? and env = ?", postdata.Id,
		dc, env).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	if len(tasks) == 0 {
		id := strconv.FormatInt(postdata.Id, 10)
		ReturnError("Task '"+id+"' not found. Can't update.", response)
		return nil
	}

	// The following Task will be written to the db
	task := Task{
		Id:       postdata.Id,
		TaskDesc: postdata.TaskDesc,
		CapTag:   postdata.CapTag,
		Dc:       dc,
		Env:      env,
	}

	// Update the Task entry

	Lock()
	if err := db.Save(&task).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// Output JSON

	TempJsonData, err := json.Marshal(task)
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

	// env_id is required, '?env_id=xxx'

	if len(args.QueryString["env_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	env_id_str := args.QueryString["env_id"][0]

	// Check if the user is allowed to access the environment
	var err error
	var foundenv Env
	if foundenv, err = t.GetAllowedEnv(args, env_id_str, response); err != nil {
		// GetAllowedEnv wrote the error
		return nil
	}

	// We got this far so access is allowed. Get the dc and env text values

	dc := foundenv.DcSysName
	env := foundenv.SysName

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

	// Search the tasks table for the task id

	tasks := []Task{}
	Lock()
	if err := db.Find(&tasks, "id = ? and dc = ? and env = ?", id_str,
		dc, env).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	if len(tasks) == 0 {
		ReturnError("Task '"+id_str+"' not found. Can't delete.", response)
		return nil
	}

	// Set up an Task with the id to be deleted
	task := Task{
		Id:       id_int,
		TaskDesc: "",
		CapTag:   "",
		Dc:       dc,
		Env:      env,
	}

	// Delete the Task entry from the DB

	Lock()
	if err := db.Delete(&task).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// Output JSON

	TempJsonData, err := json.Marshal(task)
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
		txt := fmt.Sprintf("Listen error. ", err)
		logit(txt)
	}

	//logit("Plugin listening on port " + os.Args[1])

	if conn, err := listener.Accept(); err != nil {
		txt := fmt.Sprintf("Accept error. ", err)
		logit(txt)
	} else {
		logit("New connection established")
		rpc.ServeConn(conn)
	}
}
