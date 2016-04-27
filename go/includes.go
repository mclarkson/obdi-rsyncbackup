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
	Host   string
        Base   string
}

// Name of the sqlite3 database file
const DBFILE = "rsyncbackup.db"

// ***************************************************************************
// DATABASE FUNCS
// ***************************************************************************

// The 'includes' table
type Include struct {
	Id       int64
	TaskId   int64
	Host     string
	Base     string // Data centre name
}

// The 'excludes' table
type Exclude struct {
	Id       int64
	IncludeId   int64
	Path     string
}

// Create tables and indexes in InitDB
func (gormInst *GormDB) InitDB(dbname string) error {

	db := gormInst.db // shortcut

	// Create the Include table
	if err := db.AutoMigrate(Include{}).Error; err != nil {
		txt := fmt.Sprintf("AutoMigrate Include table failed: %s", err)
		return ApiError{txt}
	}

	// Create the Exclude table
	if err := db.AutoMigrate(Exclude{}).Error; err != nil {
		txt := fmt.Sprintf("AutoMigrate Exclude table failed: %s", err)
		return ApiError{txt}
	}

	// Add any indexes
	db.Model(Exclude{}).AddIndex("idx_include_id", "include_id")

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

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

	task_id_str := args.QueryString["task_id"][0]

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

	// Get all includes for this task

	db := gormdb.DB() // for convenience
	includes := []Include{}
	Lock()
	if err = db.Find(&includes, "task_id = ?", task_id_str).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	// Create a map of the query result

	u := make([]map[string]interface{}, len(includes))
	for i := range includes {
		u[i] = make(map[string]interface{})
		u[i]["Id"] = includes[i].Id
		u[i]["TaskId"] = includes[i].TaskId
		u[i]["Host"] = includes[i].Host
		u[i]["Base"] = includes[i].Base
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

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

        task_id,_ := strconv.ParseInt(args.QueryString["task_id"][0], 10, 64)

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

	// The following Include will be written to the db

	include := Include{
		Id:       0,
		TaskId: task_id,
		Host:   postdata.Host,
		Base:   postdata.Base,
	}

	// Add the Include entry

	Lock()
	if err := db.Save(&include).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// JSONify the include

	TempJsonData, err := json.Marshal(include)
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

	if len(args.QueryString["task_id"]) == 0 {
		ReturnError("'env_id' must be set", response)
		return nil
	}

        task_id,_ := strconv.ParseInt(args.QueryString["task_id"][0], 10, 64)

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

	// Search the includes table for the include id

	includes := []Include{}
	Lock()
	if err := db.Find(&includes, "id = ?", postdata.Id).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	if len(includes) == 0 {
		id := strconv.FormatInt(postdata.Id, 10)
		ReturnError("Include '"+id+"' not found. Can't update.", response)
		return nil
	}

	// The following Include will be written to the db
	include := Include{
		Id:       postdata.Id,
		TaskId: task_id,
		Host:   postdata.Host,
		Base:   postdata.Base,
	}

	// Update the Include entry

	Lock()
	if err := db.Save(&include).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// Output JSON

	TempJsonData, err := json.Marshal(include)
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
	if _, err = t.GetAllowedEnv(args, env_id_str, response); err != nil {
		// GetAllowedEnv wrote the error
		return nil
	}

	// We got this far so access is allowed.

	id_int, _ := strconv.ParseInt(args.PathParams["id"], 10, 64)

	// Setup/Open the local database

	var gormdb *GormDB
	if gormdb, err = NewDB(args, DBFILE); err != nil {
		txt := "NewDB open error for '" + config.DBPath() + DBFILE + "'. " +
			err.Error()
		ReturnError(txt, response)
		return nil
	}

	db := gormdb.DB() // for convenience

	// Search the includes table for the include id

	includes := []Include{}
	Lock()
	if err := db.Find(&includes, "id = ?", id_int).Error; err != nil {
		Unlock()
		ReturnError("Query error. "+err.Error(), response)
		return nil
	}
	Unlock()

	if len(includes) == 0 {
		id_str := args.PathParams["id"]
		ReturnError("Include '"+id_str+"' not found. Can't delete.", response)
		return nil
	}

	// Set up a Include with the id to be deleted
	include := Include{
		Id:       id_int,
		TaskId: 0,
		Host:   "",
		Base:   "",
	}

	// Delete the Include entry from the DB

	Lock()
	if err := db.Delete(&include).Error; err != nil {
		Unlock()
		ReturnError("Update error: "+err.Error(), response)
		return nil
	}
	Unlock()

	// Output JSON

	TempJsonData, err := json.Marshal(include)
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
