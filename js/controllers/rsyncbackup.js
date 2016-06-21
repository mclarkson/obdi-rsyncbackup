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
  $scope.envcapmaps = [];
  $scope.includes = [];
  $scope.settings = {};
  $scope.excludes = [];
  $scope.env = {};
  $scope.zfslist = [];
  $scope.filelist = [];
  $scope.tasks = "";
  $scope.path = "";
  $scope.newitem = {};
  $scope.newitem.Text = "";
  $scope.checkbox_allnone = false;
  $scope.snapshotdir = "";

  // Pages
  $scope.mainview = true;

  // Alerting
  $scope.message = "";
  $scope.okmessage = "";
  $scope.login.error = false;
  $scope.message_jobid = 0;

  // Hiding/Showing
  $scope.btnshowbackuptasksdisabled = true;
  $scope.btnenvlistdisabled = false;
  $scope.showkeybtnblockhidden = false;
  $scope.task_result = false;
  $scope.tasks_btn_not_pressed = true;
  $scope.tasks_result_in_progress = false;
  $scope.envchosen = false;
  $scope.backuptasks = true;
  $scope.showfiles = false;
  $scope.showfiles_result = false;
  $scope.showfiles_result_in_progress = false;
  $scope.showfiles_files = false;
  $scope.showfiles_root = true;
  $scope.showfiles_files_in_progress = false;
  $scope.showfiles_pathnav_clicked = true;
  $scope.show_p2ec2_button = false;
  $scope.path_arr = [];
  $scope.editincludes = false;
  $scope.editsettings = false;
  $scope.btnbackupdisabled = true;
  $scope.btnapplysettingsdisabled = false;
  $scope.gettingsettings = false;
  $scope.gotsettings = false;
  $scope.includesfilter = "";
  $scope.tasksfilter = "";
  $scope.zfslistfilter = "";
  $scope.filelistfilter = "";
  $scope.status = {};

  // Fixes
  $scope.spacing = 20;

  // Disable the search box
  $rootScope.$broadcast( "searchdisabled", false );

  // ----------------------------------------------------------------------
  $scope.run = function() {
  // ----------------------------------------------------------------------
  // Fill the env array or load saved data if we've come Back here.

    if( typeof $rootScope.outputlines_plugin !== "undefined" &&
        typeof $rootScope.outputlines_plugin.back !== "undefined" ) {

        // Handle viewing job output

        delete $rootScope.outputlines_plugin.back;
        $scope.load();

      } else if( typeof $rootScope.awsp2ec2_plugin !== "undefined" &&
                 typeof $rootScope.awsp2ec2_plugin.back !== "undefined" ) {

        // Handle viewing aws p2ec2

        delete $rootScope.awsp2ec2_plugin.back;
        $scope.load();

      } else {
        // Get the list of environments
        $scope.FillEnvironmentsArray();
      }
  }

  // ----------------------------------------------------------------------
  $scope.save = function() {
  // ----------------------------------------------------------------------

    $rootScope.rsyncbackup = {};

    // Data
    $rootScope.rsyncbackup.environments = $scope.environments;
    $rootScope.rsyncbackup.envcapmaps = $scope.envcapmaps;
    $rootScope.rsyncbackup.includes = $scope.includes;
    $rootScope.rsyncbackup.settings = $scope.settings;
    $rootScope.rsyncbackup.excludes = $scope.excludes;
    $rootScope.rsyncbackup.env = $scope.env;
    $rootScope.rsyncbackup.zfslist = $scope.zfslist;
    $rootScope.rsyncbackup.filelist = $scope.filelist;
    $rootScope.rsyncbackup.tasks = $scope.tasks;
    $rootScope.rsyncbackup.path = $scope.path;
    $rootScope.rsyncbackup.newitem = $scope.newitem;
    $rootScope.rsyncbackup.checkbox_allnone = $scope.checkbox_allnone;
    $rootScope.rsyncbackup.snapshotdir = $scope.snapshotdir;

    // Pages
    $rootScope.rsyncbackup.mainview = $scope.mainview;

    // Alerting
    $rootScope.rsyncbackup.message = $scope.message;
    $rootScope.rsyncbackup.okmessage = $scope.okmessage;
    $rootScope.rsyncbackup.login = $scope.login;
    $rootScope.rsyncbackup.message_jobid = $scope.message_jobid;

    // Hiding/Showing
    $rootScope.rsyncbackup.btnshowbackuptasksdisabled = $scope.btnshowbackuptasksdisabled;
    $rootScope.rsyncbackup.btnenvlistdisabled = $scope.btnenvlistdisabled;
    $rootScope.rsyncbackup.showkeybtnblockhidden = $scope.showkeybtnblockhidden;
    $rootScope.rsyncbackup.task_result = $scope.task_result;
    $rootScope.rsyncbackup.tasks_btn_not_pressed = $scope.tasks_btn_not_pressed;
    $rootScope.rsyncbackup.tasks_result_in_progress = $scope.tasks_result_in_progress;
    $rootScope.rsyncbackup.envchosen = $scope.envchosen;
    $rootScope.rsyncbackup.backuptasks = $scope.backuptasks;
    $rootScope.rsyncbackup.showfiles = $scope.showfiles;
    $rootScope.rsyncbackup.showfiles_result = $scope.showfiles_result;
    $rootScope.rsyncbackup.showfiles_result_in_progress = $scope.showfiles_result_in_progress;
    $rootScope.rsyncbackup.showfiles_files = $scope.showfiles_files;
    $rootScope.rsyncbackup.showfiles_root = $scope.showfiles_root;
    $rootScope.rsyncbackup.showfiles_files_in_progress = $scope.showfiles_files_in_progress;
    $rootScope.rsyncbackup.showfiles_pathnav_clicked = $scope.showfiles_pathnav_clicked;
    $rootScope.rsyncbackup.show_p2ec2_button = $scope.show_p2ec2_button;
    $rootScope.rsyncbackup.path_arr = $scope.path_arr;
    $rootScope.rsyncbackup.editincludes = $scope.editincludes;
    $rootScope.rsyncbackup.editsettings = $scope.editsettings;
    $rootScope.rsyncbackup.btnbackupdisabled = $scope.btnbackupdisabled;
    $rootScope.rsyncbackup.btnapplysettingsdisabled = $scope.btnapplysettingsdisabled;
    $rootScope.rsyncbackup.gettingsettings = $scope.gettingsettings;
    $rootScope.rsyncbackup.gotsettings = $scope.gotsettings;
    $rootScope.rsyncbackup.includesfilter = $scope.includesfilter;
    $rootScope.rsyncbackup.tasksfilter = $scope.tasksfilter;
    $rootScope.rsyncbackup.zfslistfilter = $scope.zfslistfilter;
    $rootScope.rsyncbackup.filelistfilter = $scope.filelistfilter;
    $rootScope.rsyncbackup.curtask = $scope.curtask;
    $rootScope.rsyncbackup.status = $scope.status;

    // Fixes
    $rootScope.rsyncbackup.spacing = $scope.spacing;
  }

  // ----------------------------------------------------------------------
  $scope.load = function() {
  // ----------------------------------------------------------------------

    // Data
    $scope.environments = $rootScope.rsyncbackup.environments;
    $scope.envcapmaps = $rootScope.rsyncbackup.envcapmaps;
    $scope.includes = $rootScope.rsyncbackup.includes;
    $scope.settings = $rootScope.rsyncbackup.settings;
    $scope.excludes = $rootScope.rsyncbackup.excludes;
    $scope.env = $rootScope.rsyncbackup.env;
    $scope.zfslist = $rootScope.rsyncbackup.zfslist;
    $scope.filelist = $rootScope.rsyncbackup.filelist;
    $scope.tasks = $rootScope.rsyncbackup.tasks;
    $scope.path = $rootScope.rsyncbackup.path;
    $scope.newitem = $rootScope.rsyncbackup.newitem;
    $scope.checkbox_allnone = $rootScope.rsyncbackup.checkbox_allnone;
    $scope.snapshotdir = $rootScope.rsyncbackup.snapshotdir;

    // Pages
    $scope.mainview = $rootScope.rsyncbackup.mainview;

    // Alerting
    $scope.message = $rootScope.rsyncbackup.message;
    $scope.okmessage = $rootScope.rsyncbackup.okmessage;
    $scope.login = $rootScope.rsyncbackup.login;
    $scope.message_jobid = $rootScope.rsyncbackup.message_jobid;

    // Hiding/Showing
    $scope.btnshowbackuptasksdisabled = $rootScope.rsyncbackup.btnshowbackuptasksdisabled;
    $scope.btnenvlistdisabled = $rootScope.rsyncbackup.btnenvlistdisabled;
    $scope.showkeybtnblockhidden = $rootScope.rsyncbackup.showkeybtnblockhidden;
    $scope.task_result = $rootScope.rsyncbackup.task_result;
    $scope.tasks_btn_not_pressed = $rootScope.rsyncbackup.tasks_btn_not_pressed;
    $scope.tasks_result_in_progress = $rootScope.rsyncbackup.tasks_result_in_progress;
    $scope.envchosen = $rootScope.rsyncbackup.envchosen;
    $scope.backuptasks = $rootScope.rsyncbackup.backuptasks;
    $scope.showfiles = $rootScope.rsyncbackup.showfiles;
    $scope.showfiles_result = $rootScope.rsyncbackup.showfiles_result;
    $scope.showfiles_result_in_progress = $rootScope.rsyncbackup.showfiles_result_in_progress;
    $scope.showfiles_files = $rootScope.rsyncbackup.showfiles_files;
    $scope.showfiles_root = $rootScope.rsyncbackup.showfiles_root;
    $scope.showfiles_files_in_progress = $rootScope.rsyncbackup.showfiles_files_in_progress;
    $scope.showfiles_pathnav_clicked = $rootScope.rsyncbackup.showfiles_pathnav_clicked;
    $scope.show_p2ec2_button = $rootScope.rsyncbackup.show_p2ec2_button;
    $scope.path_arr = $rootScope.rsyncbackup.path_arr;
    $scope.editincludes = $rootScope.rsyncbackup.editincludes;
    $scope.editsettings = $rootScope.rsyncbackup.editsettings;
    $scope.btnbackupdisabled = $rootScope.rsyncbackup.btnbackupdisabled;
    $scope.btnapplysettingsdisabled = $rootScope.rsyncbackup.btnapplysettingsdisabled;
    $scope.gettingsettings = $rootScope.rsyncbackup.gettingsettings;
    $scope.gotsettings = $rootScope.rsyncbackup.gotsettings;
    $scope.includesfilter = $rootScope.rsyncbackup.includesfilter;
    $scope.tasksfilter = $rootScope.rsyncbackup.tasksfilter;
    $scope.zfslistfilter = $rootScope.rsyncbackup.zfslistfilter;
    $scope.filelistfilter = $rootScope.rsyncbackup.filelistfilter;
    $scope.curtask = $rootScope.rsyncbackup.curtask;
    $scope.status = $rootScope.rsyncbackup.status;

    // Fixes
    $scope.spacing = $rootScope.rsyncbackup.spacing;
  }

  // ----------------------------------------------------------------------
  $scope.$on( "search", function( event, args ) {
  // ----------------------------------------------------------------------
  // Not used since search is disabled

    if( $scope.editincludes ) {
      $scope.includesfilter = args;
      $scope.checkbox_allnone = false;
      for( var i=0; i < $scope.includes.length; i=i+1 ) {
        $scope.includes[i].Selected = false;
      }
      ShouldRunBackupButtonBeEnabled();
    } else if( $scope.showfiles_result ) {
      $scope.zfslistfilter = args;
    } else if( $scope.showfiles_files ) {
      $scope.filelistfilter = args;
    } else {
      $scope.tasksfilter = args;
    } 
  });

  // ----------------------------------------------------------------------
  var clearMessages = function() {
  // ----------------------------------------------------------------------
    $scope.message = "";
    $scope.okmessage = "";
    $scope.login.error = false;
    $scope.error = false;
    $scope.message_jobid = 0;
  }

  // ----------------------------------------------------------------------
  $scope.Restart = function() {
  // ----------------------------------------------------------------------
    clearMessages();
    $scope.btnenvlistdisabled = false;
    $scope.btnshowbackuptasksdisabled = true;
    $scope.showkeybtnblockhidden = false;
    $scope.btnapplysettingsdisabled = false;
    $scope.task_result = false;
    $scope.tasks_btn_not_pressed = true;
    $scope.tasks_result_in_progress = false;
    $scope.envchosen = false;
    $scope.editincludes = false;
    $scope.editsettings = false;
    $scope.gettingsettings = false;
    $scope.showfiles = false;
    $scope.showfiles_result = false;
    $scope.showfiles_files = false;
    $scope.showfiles_root = true;
    $scope.gotsettings = false;
    $scope.spacing = 20;
    $scope.message_jobid = 0;
    $scope.includesfilter = "";
    $scope.tasksfilter = "";
    $scope.checkbox_allnone = false;
    $scope.zfslist = [];
    $scope.filelist = [];
    $scope.show_p2ec2_button = false;
  };

  // ----------------------------------------------------------------------
  $scope.envChoice = function( envobj, $event ) {
  // ----------------------------------------------------------------------
    clearMessages();
    $event.preventDefault();
    $event.stopPropagation();
    $scope.envchosen = true;
    $scope.btnenvlistdisabled = true;
    $scope.btnshowbackuptasksdisabled = false;
    $scope.env = envobj;
    $scope.tasks_btn_not_pressed = true;
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
  $scope.showOutputlines = function( id ) {
  // ----------------------------------------------------------------------

    $scope.save();
    $rootScope.outputlines_plugin = {};
    $rootScope.outputlines_plugin.id = id;
    $rootScope.outputlines_plugin.back = "plugins/rsyncbackup/html/view.html";
    $scope.setView( "plugins/systemjobs/html/outputlines.html" );
  }

  // ----------------------------------------------------------------------
  $scope.Selected = function( incl_index ) {
  // ----------------------------------------------------------------------

    ShouldRunBackupButtonBeEnabled();
  }

  // ----------------------------------------------------------------------
  $scope.RunBackup = function( TaskDesc, index ) {
  // ----------------------------------------------------------------------

    var modalInstance = $uibModal.open({
      templateUrl: 'StartFullBackup.html',
      controller: $scope.ModalRunBackupInstanceCtrl,
      size: 'sm',
      resolve: {
        // the loginname variable is passed to the ModalInstanceCtrl
        TaskDesc: function () {
          return TaskDesc;
        },
        index: function () {
          return index;
        }
      }
    });

    modalInstance.result.then(function () {
      $scope.RunBackupRest(index);
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  }

  // --------------------------------------------------------------------
  $scope.ModalRunBackupInstanceCtrl = function ($scope, $uibModalInstance,
      TaskDesc, index) {
  // --------------------------------------------------------------------

    // So the template can access 'loginname' in this new scope
    $scope.TaskDesc = TaskDesc;
    $scope.index = index;

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

  // ----------------------------------------------------------------------
  $scope.RunBackupSelected = function( ) {
  // ----------------------------------------------------------------------

    var modalInstance = $uibModal.open({
      templateUrl: 'StartSelectedBackup.html',
      controller: $scope.ModalRunSelectedBackupInstanceCtrl,
      size: 'sm',
    });

    modalInstance.result.then(function () {
      $scope.RunBackupRest();
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  }

  // --------------------------------------------------------------------
  $scope.ModalRunSelectedBackupInstanceCtrl = function ($scope,
    $uibModalInstance) {
  // --------------------------------------------------------------------

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

  // ----------------------------------------------------------------------
  $scope.RunBackupRest = function(index) {
  // ----------------------------------------------------------------------

    if( typeof index !== 'undefined' ) $scope.curtask = $scope.tasks[index];

    var itemsprop = "";
    var items = "";
    var comma = "";
    for( var i=0; i<$scope.includes.length; ++i ) {
      if( $scope.includes[i].Selected == true ) {
        itemsprop = "&items=";
        items += comma + $scope.includes[i].Id;
        comma = ",";
      }
    }

    $http({
      method: "POST",
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/backup?env_id=" + $scope.env.Id
           + "&task_id=" + $scope.curtask.Id
           + itemsprop + items
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        //alert(data);
        //var job = $.parseJSON(data);
        var job = data;
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
        return;
      }

      $scope.message_jobid = job.JobId;
      $scope.okmessage = "Backup request sent.";

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
          $scope.message = "Server said: " + data['Error'];
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

    clearMessages();
    $scope.curtask = $scope.tasks[index];
    $scope.includes = [];
    $scope.gettingsettings = true;
    $scope.gotsettings = false;
    $scope.backuptasks = false;
    $scope.editsettings = true;
    $scope.editincludes = false;
    $scope.spacing = 0;

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/settings?env_id=" + $scope.env.Id
           + "&task_id=" + $scope.curtask.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.settings = $.parseJSON(data.Text)[0];
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      if( typeof($scope.settings) == 'undefined' ) {
	$scope.settings = { Id:0,
			    Protocol:"",
			    Pre:"",
			    RsyncOpts:"",
			    BaseDir:"",
			    KnownHosts:"",
			    NumPeriods:1,
			    Timeout:0 };
      }

      $scope.gettingsettings = false;
      $scope.gotsettings = true;

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
  $scope.ApplySettingsRest = function() {
  // ----------------------------------------------------------------------

    clearMessages();
    
    var method = "PUT";
    if( $scope.settings.Id == 0 ) {
      method = "POST";
    }

    $scope.settings.NumPeriods = parseInt($scope.settings.NumPeriods);
    $scope.settings.Timeout = parseInt($scope.settings.Timeout);

    $http({
      method: method,
      data: $scope.settings,
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/settings?env_id=" + $scope.env.Id
           + "&task_id=" + $scope.curtask.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.settings = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      $scope.okmessage = "Settings were updated successfully.";

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
  }

  // ----------------------------------------------------------------------
  $scope.ConfigureIncludes = function(index) {
  // ----------------------------------------------------------------------

    $scope.curtask = $scope.tasks[index];
    $scope.includes = [];

    $scope.backuptasks = false;
    $scope.editsettings = false;
    $scope.editincludes = true;
    $scope.includesfilter = "";
    $scope.tasksfilter = "";
    $scope.checkbox_allnone = false;

    $scope.FillIncludesArray( $scope.curtask.Id );
  }

  // ----------------------------------------------------------------------
  $scope.Back = function() {
  // ----------------------------------------------------------------------
    $scope.backuptasks = true;
    $scope.editincludes = false;
    $scope.editsettings = false;
    $scope.showfiles = false;
    $scope.showfiles_result = false;
    $scope.showfiles_result_in_progress = false;
    $scope.showfiles_files = false;
    $scope.showfiles_files_in_progress = false;
    $scope.showfiles_root = true;
    $scope.spacing = 0;
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
        $scope.message = "Server said: " + data['Error'];
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
        $scope.message = "Server said: " + data['Error'];
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
  $scope.FillEnvCapMapsArray = function() {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/envcapmaps?env_id=" + $scope.env.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.envcapmaps = data;

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

  // REST functions

  // ----------------------------------------------------------------------
  $scope.ShowTasks = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.task_result = false;
    $scope.tasks_btn_not_pressed = false;
    $scope.tasks_result_in_progress = true;
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
      }

      $scope.spacing = 0;
      $scope.task_result = true;
      $scope.tasks_result_in_progress = false;
      $scope.showkeybtnblockhidden = true;

      // Get environment capabilities.
      // We check this later for enabling features from other plugins
      $scope.FillEnvCapMapsArray();

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
  $scope.PollForJobFinish = function( id,delay,count,func ) {
  // ----------------------------------------------------------------------
      $timeout( function() {
        $http({
          method: 'GET',
          url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
               + "/jobs?job_id=" + id
							 + '&time='+new Date().getTime().toString()
        }).success( function(data, status, headers, config) {
          job = data[0];
          if(job.Status == 0 || job.Status == 1 || job.Status == 4) {
            if( count > 120 ) {
              clearMessages();
              $scope.message = "Job took too long. check job ID " +
                               + id + ", then try again.";
              $scope.message_jobid = job['Id'];
            } else {
              // Then retry: capped exponential backoff
              delay = delay < 600 ? delay * 2 : 1000;
              count = count + 1;
              $scope.PollForJobFinish(id,delay,count,func);
            }
          } else if(job.Status == 5) { // Job was successfully completed
            func( id );
          } else { // Some error
            clearMessages();
            $scope.message = "Server said: " + job['StatusReason'];
            $scope.message_jobid = job['Id'];
            if( func == $scope.GetVersionListOutputLine ) {
              $scope.versionlist_error = true;
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
      }, delay );
  };

  // --------

  // ----------------------------------------------------------------------
  $scope.RunP2EC2 = function() {
  // ----------------------------------------------------------------------

    $scope.save();
    $rootScope.awsp2ec2_plugin = {};
    $rootScope.awsp2ec2_plugin.back = "plugins/rsyncbackup/html/view.html";
    $scope.setView( "plugins/aws-p2ec2/html/view.html" );
  }

  // ----------------------------------------------------------------------
  $scope.GetFileListOutputLine = function( id ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/outputlines?job_id=" + id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.filelist = [];
      filelist = [];

      // Extract data into array
      //
      try {
        filelist = $.parseJSON(data[0].Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
        $scope.message_jobid = id;
      }

      for( var i=0; i<filelist.length; ++i ) {
        if( $scope.showfiles_root == true && filelist[i].name == ".." ) {
          continue;
        }
        if( filelist[i].name != "." ) {
          $scope.filelist.push( filelist[i] );
        }
      }

      $scope.showfiles_files = true;
      $scope.showfiles_files_in_progress = false;

      // Check if this is a candidate for P2EC2 (physical to aws ec2 instance)
      for( var i=0; i<$scope.envcapmaps.length; ++i ) {
        if( $scope.envcapmaps[i].EnvCapCode == "HAS_AWS_P2EC2" ) {
          // Obdi P2EC2 is installed, see if this directory is a candidate.
          // A linux candidate should have bin,boot,dev,etc,home,lib,mnt,root,sbin,sys,usr,var.
          // Check filelist for those directories:
          var got = 0
          var dirs = ["bin","boot","dev","etc","home","lib","mnt","root","sbin","sys","usr","var"];
          for( var j=0; j<$scope.filelist.length; ++j ) {
            for( var k=0; k<dirs.length; ++k ) {
              if( $scope.filelist[j].name == dirs[k] ) {
                ++got;
                break;
              }
            }
          }
          if( got == dirs.length ) $scope.show_p2ec2_button = true;
          break;
        }
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
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
  $scope.GetZfsListOutputLine = function( id ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/outputlines?job_id=" + id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.zfslist = [];

      // Extract data into array
      //
      try {
        $scope.zfslist = $.parseJSON(data[0].Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
        $scope.message_jobid = id;
      }

      $scope.showfiles_result = true;
      $scope.showfiles_result_in_progress = false;

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
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
  $scope.ViewSnapDirectory = function( snap_or_fs ) {
  // ----------------------------------------------------------------------

    // snap_or_fs looks like:
    //   backup/servers-zfs                <-- filesystem
    //   backup/servers-zfs@20160224.1     <-- snapshot

    $scope.snapshotdir = snap_or_fs.split("@")[1];

    if( typeof $scope.snapshotdir === "undefined" ) {
      $scope.snapshotdir = "";
    }

    $scope.ViewDirectory()

  };

  // ----------------------------------------------------------------------
  $scope.ViewDirectory = function( path ) {
  // ----------------------------------------------------------------------

    // Reset P2EC2 button for every directory
    $scope.show_p2ec2_button = false;

    // Manipulate Path navigation array
    if( typeof path === 'number' ) {
      // 'path' var is an index value, a click in pathnav
      var index = path;
      var num2del = $scope.path_arr.length-(index+1)
      for( var i=0; i<num2del; ++i ) {
        $scope.path_arr.pop();
      }
      $scope.showfiles_pathnav_clicked = true;
      $scope.showfiles_root = false;
    } else if( typeof path === 'undefined' ) {
      // Bottom of the tree, called by ViewSnapDirectory, resets path
      $scope.showfiles_pathnav_clicked = false;
      $scope.path_arr = [];
      $scope.showfiles_root = true;
    } else if( path == ".." ) {
      // Go up one directory
      if( $scope.showfiles_pathnav_clicked ) {
        $scope.showfiles_pathnav_clicked = false;
      }
      $scope.path_arr.pop();
      if( $scope.path_arr.length == 0 ) {
        $scope.path_arr = [];
        $scope.showfiles_root = true;
      } else {
        $scope.showfiles_root = false;
      }
    } else {
      // Descend into 'path' directory
      $scope.path_arr.push( path );
      $scope.showfiles_root = false;
    }

    // Create path text from path array
    $scope.path = "";
    for( var i=0; i<$scope.path_arr.length; ++i ) {
      $scope.path += "/" + $scope.path_arr[i];
    }

    $scope.showfiles_result = false;
    $scope.showfiles_result_in_progress = false;
    $scope.showfiles_files = false;
    $scope.showfiles_files_in_progress = true;

    clearMessages();

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/ls?env_id=" + $scope.env.Id
           + "&task_id=" + $scope.curtask.Id
           + "&path=" + $scope.path
           + "&snapshot=" + $scope.snapshotdir
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.PollForJobFinish(data.JobId,10,0,$scope.GetFileListOutputLine);

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
  $scope.ShowFilesystemsAndSnapshots = function( index ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.curtask = $scope.tasks[index];
    $scope.backuptasks = false;
    $scope.show_p2ec2_button = false;
    $scope.showfiles = true;
    $scope.showfiles_result = false;
    $scope.showfiles_result_in_progress = true;

    clearMessages();

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/zfslist?env_id=" + $scope.env.Id
           + "&task_id=" + $scope.curtask.Id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.PollForJobFinish(data.JobId,10,0,$scope.GetZfsListOutputLine);

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
  $scope.DeleteBackupTask = function( TaskDesc, Id ) {
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
  $scope.EditBackupTask = function (TaskDesc, CapTag, Id) {
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
        $scope.message = "Server said: " + data['Error'];
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

  $scope.run();

});
