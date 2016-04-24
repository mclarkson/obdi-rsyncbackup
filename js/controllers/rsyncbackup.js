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

// ------------------------------------------------------------------------
// AngularJS Controller
// ------------------------------------------------------------------------

mgrApp.controller("rsyncBackup", function ($scope,$http,$uibModal,$log,
      $timeout,baseUrl,$rootScope) {

  // Data
  $scope.environments = [];
  $scope.env = {};
  $scope.tasks = "";
  $scope.newitem = {};
  $scope.newitem.Text = "";

  // Pages
  $scope.mainview = true;

  // Alerting
  $scope.message = "";
  $scope.mainmessage = "";
  $scope.okmessage = "";
  $scope.login.error = false;

  // Hiding/Showing
  $scope.btnsayhellodisabled = true;
  $scope.btnsayhellopressed = false;
  $scope.btnenvlistdisabled = false;
  $scope.showkeybtnblockhidden = false;
  $scope.page_result = false;
  $scope.envchosen = false;
  $scope.backuptasks = true;
  $scope.settings = false;
  $scope.status = {};

  // Fixes
  $scope.spacing = 20;

  // Disable the search box
  $rootScope.$broadcast( "searchdisabled", true );

  // ----------------------------------------------------------------------
  $scope.$on( "search", function( event, args ) {
  // ----------------------------------------------------------------------
  // Not used since search is disabled

    if( $scope.grainsview.show == false ) {
      $scope.hostfilter = args;
      $scope.checkbox_allnone = false;
      for( var i=0; i < $scope.servernames.length; i=i+1 ) {
        $scope.servernames[i].Selected = false;
      }
      ReviewBtnStatus();
    } else {
      $scope.grainfilter = args;
    }
  });

  // ----------------------------------------------------------------------
  var clearMessages = function() {
  // ----------------------------------------------------------------------
    $scope.message = "";
    $scope.mainmessage = "";
    $scope.okmessage = "";
    $scope.login.error = false;
    $scope.error = false;
  }

  // ----------------------------------------------------------------------
  $scope.Restart = function() {
  // ----------------------------------------------------------------------
    clearMessages();
    $scope.btnsayhellodisabled = true;
    $scope.btnenvlistdisabled = false;
    $scope.showkeybtnblockhidden = false;
    $scope.page_result = false;
    $scope.envchosen = false;
    $scope.spacing = 20;
  };

  // ----------------------------------------------------------------------
  $scope.envChoice = function( envobj, $event ) {
  // ----------------------------------------------------------------------
    clearMessages();
    $event.preventDefault();
    $event.stopPropagation();
    $scope.envchosen = true;
    $scope.btnenvlistdisabled = true;
    $scope.env = envobj;
    $scope.btnsayhellodisabled = false;
    $scope.status.isopen = !$scope.status.isopen; //close the dropdown
  };

  // ----------------------------------------------------------------------
  $scope.ConfigureIncludes = function(index) {
  // ----------------------------------------------------------------------

    $scope.curtask = $scope.tasks[index];

    $scope.backuptasks = false;
    $scope.settings = true;

    FillIncludesTables( $scope.curtask.Id )
  }

  // ----------------------------------------------------------------------
  $scope.Back = function() {
  // ----------------------------------------------------------------------
    $scope.backuptasks = true;
    $scope.settings = false;
  }

  // ----------------------------------------------------------------------
  FillIncludesTables = function( taskid ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/includes?env_id=" + $scope.env.Id
           + "&task_id=" + taskid
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.includes = data;
      if( data.length == 0 ) {
        $scope.serverlist_empty = true;
        $scope.btnenvlistdisabled = true;
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.mainmessage = "Server said: " + data['Error'];
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.FillEnvironmentsTable = function() {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/envs?writeable=1"
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.environments = data;
      if( data.length == 0 ) {
        $scope.serverlist_empty = true;
        $scope.btnenvlistdisabled = true;
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.mainmessage = "Server said: " + data['Error'];
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // Get the list of environments straight away
  $scope.FillEnvironmentsTable();

  // REST functions

  // ----------------------------------------------------------------------
  $scope.ShowTasks = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    //$scope.page_result = false;
    //$scope.tasks = "";

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/tasks?env_id="
           + $scope.env.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.tasks = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
        $scope.message_jobid = id;
      }

      $scope.spacing = 0;
      $scope.page_result = true;
      $scope.showkeybtnblockhidden = true;

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.DeleteItem = function( TaskDesc, Id ) {
  // ----------------------------------------------------------------------

    var modalInstance = $uibModal.open({
      templateUrl: 'DeleteTask.html',
      controller: $scope.ModalDeleteInstanceCtrl,
      size: 'sm',
      resolve: {
        // the loginname variable is passed to the ModalInstanceCtrl
        TaskDesc: function () {
          return TaskDesc;
        },
        Id: function () {
          return Id;
        }
      }
    });

    modalInstance.result.then(function () {
      $scope.DeleteItemRest(Id);
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  }

  // --------------------------------------------------------------------
  $scope.ModalDeleteInstanceCtrl = function ($scope, $uibModalInstance,
      TaskDesc, Id) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.TaskDesc = TaskDesc;
    $scope.Id = Id;

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

  // ----------------------------------------------------------------------
  $scope.DeleteItemRest = function( id ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $http({
      method: 'DELETE',
      data: {Id:0,Text:$scope.newitem.Text},
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/tasks/" + id
           + "?env_id=" + $scope.env.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

       // Refresh the table
       $scope.ShowTasks();

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.AddTaskRest = function( newitem ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'POST',
      data: {Id:0,TaskDesc:newitem.TaskDesc,CapTag:newitem.CapTag},
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/tasks?env_id="
           + $scope.env.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

       // Refresh the table
       $scope.ShowTasks();

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // --------------------------------------------------------------------
  $scope.AddTask = function () {
  // --------------------------------------------------------------------

    $scope.TaskDesc = "";
    $scope.CapTag = "RSYNCBACKUP_WORKER_1";

    var modalInstance = $uibModal.open({
      templateUrl: 'NewBackupTask.html',
      controller: $scope.Add_TaskModalCtrl,
      size: 'md',
      resolve: {
	// these variables are passed to the ModalInstanceCtrl
	TaskDesc: function () {
	  return $scope.TaskDesc;
	},
	CapTag: function () {
	  return $scope.CapTag;
	}
      }
    });

    modalInstance.result.then(function (result) {

      var newitem = {};
      newitem.TaskDesc = result.TaskDesc;
      newitem.CapTag = result.CapTag;

      return $scope.AddTaskRest(newitem);
    });

  };

  // --------------------------------------------------------------------
  $scope.Add_TaskModalCtrl = function ($scope, $uibModalInstance,
                                TaskDesc, CapTag) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.TaskDesc = TaskDesc;
    $scope.CapTag = CapTag;

    $scope.ok = function () {
      result = {};
      result.TaskDesc = $scope.TaskDesc;
      result.CapTag = $scope.CapTag;

      $uibModalInstance.close(result);
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

});
