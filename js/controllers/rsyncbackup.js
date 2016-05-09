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
  $scope.includes = [];
  $scope.settings = {};
  $scope.excludes = [];
  $scope.env = {};
  $scope.tasks = "";
  $scope.newitem = {};
  $scope.newitem.Text = "";
  $scope.checkbox_allnone = false;
  $scope.btnbackupdisabled = true;

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
  $scope.editincludes = false;
  $scope.editsettings = false;
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
    $scope.editincludes = false;
    $scope.editsettings = false;
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
  $scope.SelectAllNone = function( ) {
  // ----------------------------------------------------------------------

    if( $scope.checkbox_allnone == false ) {
      // Select all
      $scope.checkbox_allnone = true;
      for( i=0; i < $scope.includes.length; i=i+1 ) {
        $scope.includes[i].Selected = true;
      }
    } else {
      // Select none
      $scope.checkbox_allnone = false;
      for( i=0; i < $scope.includes.length; i=i+1 ) {
        $scope.includes[i].Selected = false;
      }
    }
    ShouldRunBackupButtonBeEnabled();
  }

  // ----------------------------------------------------------------------
  $scope.Selected = function( incl_index ) {
  // ----------------------------------------------------------------------

    ShouldRunBackupButtonBeEnabled();
  }

  // ----------------------------------------------------------------------
  function ShouldRunBackupButtonBeEnabled() {
  // ----------------------------------------------------------------------

    $scope.btnbackupdisabled = true;

    // Show the Review button if something is selected
    for( i=0; i < $scope.includes.length; ++i ) {
      if( $scope.includes[i].Selected == true ) {
        $scope.btnbackupdisabled = false;
        break;
      }
    }
  }

  // ----------------------------------------------------------------------
  $scope.GetExcludes = function() {
  // ----------------------------------------------------------------------

    var excludes = {};

    for( var i=0; i<$scope.includes.length; i++ ) {

      $http({
        method: 'GET',
        params: {
                 include_id:$scope.includes[i].Id,
                 env_id:$scope.env.Id,
                 time:new Date().getTime().toString()
                },
        url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
             + "/rsyncbackup/excludes"
      }).success( function(data, status, headers, config) {

        try {
          excludes = $.parseJSON(data.Text);
        } catch (e) {
          clearMessages();
          $scope.message = "Error: " + e;
          $scope.message_jobid = id;
        }

        if( excludes.length != 0 ) {
          for( var j=0; j<$scope.includes.length; j++ ){
            if( $scope.includes[j].Id == excludes[0].IncludeId ) {
              $scope.includes[j].Excludes = excludes;
              break;
            }
          }
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
    }
  }

  // ----------------------------------------------------------------------
  $scope.ConfigureSettings = function(index) {
  // ----------------------------------------------------------------------

    $scope.curtask = $scope.tasks[index];
    $scope.includes = [];

    $scope.settings = { protocol:"rsyncd",
                        pre:"create_zfs_snapshot",
                        rsync_opts:"--sparse",
                        base_dir:"/backup/servers-zfs/",
                        known_hosts:"",
                        num_periods:1,
                        timeout:0 };

    $scope.backuptasks = false;
    $scope.editsettings = true;
    $scope.editincludes = false;

    $scope.FillIncludesArray( $scope.curtask.Id )
  }

  // ----------------------------------------------------------------------
  $scope.ConfigureIncludes = function(index) {
  // ----------------------------------------------------------------------

    $scope.curtask = $scope.tasks[index];
    $scope.includes = [];

    $scope.backuptasks = false;
    $scope.editsettings = false;
    $scope.editincludes = true;

    $scope.FillIncludesArray( $scope.curtask.Id )
  }

  // ----------------------------------------------------------------------
  $scope.Back = function() {
  // ----------------------------------------------------------------------
    $scope.backuptasks = true;
    $scope.editincludes = false;
    $scope.editsettings = false;
  }

  // ----------------------------------------------------------------------
  $scope.FillIncludesArray = function( taskid ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/includes?env_id=" + $scope.env.Id
           + "&task_id=" + taskid
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.includes = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
        $scope.message_jobid = id;
      }

      if( data.length == 0 ) {
        $scope.serverlist_empty = true;
        $scope.btnenvlistdisabled = true;
      }

      // Backfill the excludes
      $scope.GetExcludes();

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
  $scope.FillEnvironmentsArray = function() {
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
  $scope.FillEnvironmentsArray();

  // REST functions

  // ----------------------------------------------------------------------
  $scope.ShowTasks = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    //$scope.page_result = false;
    //$scope.tasks = "";

    clearMessages();
    $scope.checkbox_allnone = false;

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

  // --------

  // ----------------------------------------------------------------------
  $scope.DeleteInclude = function( Host, Base, Id ) {
  // ----------------------------------------------------------------------

    var modalInstance = $uibModal.open({
      templateUrl: 'DeleteInclude.html',
      controller: $scope.ModalDeleteIncludeCtrl,
      size: 'sm',
      resolve: {
        // the loginname variable is passed to the ModalInstanceCtrl
        Host: function () {
          return Host;
        },
        Base: function () {
          return Base;
        },
        Id: function () {
          return Id;
        }
      }
    });

    modalInstance.result.then(function () {
      $scope.DeleteIncludeRest(Id);
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  }

  // --------------------------------------------------------------------
  $scope.ModalDeleteIncludeCtrl = function ($scope, $uibModalInstance,
      Host, Base, Id) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.Host = Host;
    $scope.Base = Base;
    $scope.Id = Id;

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

  // ----------------------------------------------------------------------
  $scope.DeleteIncludeRest = function( id ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $http({
      method: 'DELETE',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/includes/" + id
           + "?env_id=" + $scope.env.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

       // Refresh the table
       $scope.FillIncludesArray( $scope.curtask.Id );

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

  // --------

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

  // --------

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
        },
        Title: function () {
          return "New Backup Task";
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
                                TaskDesc, CapTag, Title) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.TaskDesc = TaskDesc;
    $scope.CapTag = CapTag;
    $scope.Title = Title

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

  // ----------------------------------------------------------------------
  $scope.EditTaskRest = function( newitem ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'PUT',
      data: newitem,
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
  $scope.EditTask = function (TaskDesc, CapTag, Id) {
  // --------------------------------------------------------------------

    $scope.TaskDesc = TaskDesc;
    $scope.CapTag = CapTag;

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
        },
        Title: function () {
          return "Edit Backup Task";
        }
      }
    });

    modalInstance.result.then(function (result) {

      var newitem = {};
      newitem.TaskDesc = result.TaskDesc;
      newitem.CapTag = result.CapTag;
      newitem.Id = Id;

      return $scope.EditTaskRest(newitem);
    });

  };

  // --------

  // ----------------------------------------------------------------------
  $scope.AddIncludeRest = function( newitem ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'POST',
      data: {Id:0,Host:newitem.Host,Base:newitem.Base},
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/includes?env_id=" + $scope.env.Id
           + "&task_id=" + $scope.curtask.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

       // Refresh the table
       $scope.FillIncludesArray( $scope.curtask.Id );

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
  $scope.EditIncludeRest = function( newitem ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'PUT',
      data: newitem,
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/includes?env_id=" + $scope.env.Id
           + "&task_id=" + $scope.curtask.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

       // Refresh the table
       $scope.FillIncludesArray( $scope.curtask.Id );

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
  $scope.AddInclude = function () {
  // --------------------------------------------------------------------

    $scope.Host = "";
    $scope.Base = "";

    var modalInstance = $uibModal.open({
      templateUrl: 'NewInclude.html',
      controller: $scope.Add_IncludeModalCtrl,
      size: 'md',
      resolve: {
        // these variables are passed to the ModalInstanceCtrl
        Host: function () {
          return $scope.Host;
        },
        Base: function () {
          return $scope.Base;
        },
        Title: function () {
          return "New Host Include";
        }
      }
    });

    modalInstance.result.then(function (result) {

      var newitem = {};
      newitem.Host = result.Host;
      newitem.Base = result.Base;

      return $scope.AddIncludeRest(newitem);
    });

  };

  // --------------------------------------------------------------------
  $scope.EditInclude = function (Host,Base,Id) {
  // --------------------------------------------------------------------

    $scope.Host = Host;
    $scope.Base = Base;

    var modalInstance = $uibModal.open({
      templateUrl: 'NewInclude.html',
      controller: $scope.Add_IncludeModalCtrl,
      size: 'md',
      resolve: {
        // these variables are passed to the ModalInstanceCtrl
        Host: function () {
          return $scope.Host;
        },
        Base: function () {
          return $scope.Base;
        },
        Title: function () {
          return "Edit Host Include";
        }
      }
    });

    modalInstance.result.then(function (result) {

      var newitem = {};
      newitem.Host = result.Host;
      newitem.Base = result.Base;
      newitem.Id = Id;

      return $scope.EditIncludeRest(newitem);
    });

  };

  // --------------------------------------------------------------------
  $scope.Add_IncludeModalCtrl = function ($scope, $uibModalInstance,
                                Host, Base, Title) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.Host = Host;
    $scope.Base = Base;
    $scope.Title = Title;

    $scope.ok = function () {
      result = {};
      result.Host = $scope.Host;
      result.Base = $scope.Base;

      $uibModalInstance.close(result);
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

  // Excludes

  // ----------------------------------------------------------------------
  $scope.GetExclude = function(i) {
  // ----------------------------------------------------------------------
  // Just update one

    var excludes = {};

    $http({
      method: 'GET',
      params: {
               include_id:$scope.includes[i].Id,
               env_id:$scope.env.Id,
               time:new Date().getTime().toString()
              },
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/excludes"
    }).success( function(data, status, headers, config) {

      try {
        excludes = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
        $scope.message_jobid = id;
      }

      if( excludes.length != 0 ) {
        for( var j=0; j<$scope.includes.length; j++ ){
          if( $scope.includes[j].Id == excludes[0].IncludeId ) {
            $scope.includes[j].Excludes = excludes;
            break;
          }
        }
      } else {
        $scope.includes[i].Excludes = [];
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
  }

  // ----------------------------------------------------------------------
  $scope.NewExcludeRest = function( newitem, index ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'POST',
      data: {Id:0,Path:newitem.Path},
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/excludes?env_id=" + $scope.env.Id
           + "&include_id=" + newitem.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

       // Refresh the row
       $scope.GetExclude( index );

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
  $scope.NewExclude = function( Id, index ) {
  // ----------------------------------------------------------------------

    var modalInstance = $uibModal.open({
      templateUrl: 'NewExclude.html',
      controller: $scope.ModalNewExclude,
      size: 'sm',
      resolve: {
        // the loginname variable is passed to the ModalInstanceCtrl
        Id: function () {
          return Id;
        }
      }
    });

    modalInstance.result.then(function (result) {

      var newitem = {};
      newitem.Path = result.Path;
      newitem.Id = Id;

      $scope.NewExcludeRest(newitem,index);
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  };

  // --------------------------------------------------------------------
  $scope.ModalNewExclude = function ($scope, $uibModalInstance, Id) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.Path = "";
    $scope.Id = Id;

    $scope.ok = function () {
      result = {};
      result.Path = $scope.Path;
      result.Id = Id;

      $uibModalInstance.close(result);
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

  // ----------------------------------------------------------------------
  $scope.DeleteExclude = function( Path, Id, IncludeId ) {
  // ----------------------------------------------------------------------

    var modalInstance = $uibModal.open({
      templateUrl: 'DeleteExclude.html',
      controller: $scope.ModalDeleteExclude,
      size: 'sm',
      resolve: {
        // the loginname variable is passed to the ModalInstanceCtrl
        Path: function () {
          return Path;
        },
        Id: function () {
          return Id;
        }
      }
    });

    modalInstance.result.then(function () {
      $scope.DeleteExcludeRest(Id, IncludeId);
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  }

  // ----------------------------------------------------------------------
  $scope.DeleteExcludeRest = function( id, includeid ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $http({
      method: 'DELETE',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/excludes/" + id
           + "?env_id=" + $scope.env.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

       // Refresh the row
       for( var i=0; i<$scope.includes.length; ++i ) {
         if( $scope.includes[i].Id == includeid ) {
           $scope.GetExclude( i );
           break;
         }
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
  $scope.ModalDeleteExclude = function ($scope, $uibModalInstance,
      Path, Id) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.Path = Path;
    $scope.Id = Id;

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

});
