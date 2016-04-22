$(document).ready(function() {
  window.supervisorConsole = {}
  supervisorConsole.pollingRate = 3000
  supervisorConsole.pastOffsets = {}

  setInterval(refresh, supervisorConsole.pollingRate)
  refresh()
});

function refresh() {
  $.get('supervisor', function(supervisors) {
    var remaining = supervisors.length
    var responses = {}

    for (var iSupervisor = 0; iSupervisor < supervisors.length; iSupervisor++) {
      $.get('supervisor/' + supervisors[iSupervisor] + '/status', function(data) {
        var payload = data.payload
        var taskHeader = '<h2>' + payload.dataSource + '</h2>'
        taskHeader += '<div>'
        taskHeader +=   '<span class="task-badge-span">Topic <span class="badge">' + payload.topic + '</span></span>'
        taskHeader +=   '<span class="task-badge-span">Partitions <span class="badge">' + payload.partitions + '</span></span>'
        taskHeader +=   '<span class="task-badge-span">Replicas <span class="badge">' + payload.replicas + '</span></span>'
        taskHeader +=   '<div class="update-time-div">Updated: ' + new Date(data.generationTime) + '</div>'
        taskHeader += '</div>'

        var currentTaskData = '<h4>Current Tasks</h4>'
        currentTaskData += payload.activeTasks.length === 0 ? '[No active tasks]' : ''
        for (var i = 0; i < payload.activeTasks.length; i++) {
          var summedOffsets = 0
          var offsetHeader = "", startingOffsets = "", currentOffsets = ""
          var task = payload.activeTasks[i];
          var percentComplete = task.remainingSeconds === null ? 0 : (payload.durationSeconds - task.remainingSeconds) / payload.durationSeconds * 100.0
          for (var key in task.startingOffsets) {
            offsetHeader += '<th>' + key + '</th>'
            startingOffsets += '<td>' + task.startingOffsets[key] + '</td>'
            currentOffsets += '<td>' + task.currentOffsets[key] + '</td>'
            summedOffsets += task.currentOffsets[key]
          }

          if (!supervisorConsole.pastOffsets[task.id]) {
            supervisorConsole.pastOffsets[task.id] = [];
          }
          var myPastOffsets = supervisorConsole.pastOffsets[task.id];
          if (myPastOffsets.length >= 10) {
            myPastOffsets.shift();
          }

          var current = {"time": new Date().getTime(), "offsets": summedOffsets};
          myPastOffsets.push(current);

          var ingestionRate = (current.offsets - myPastOffsets[0].offsets) / ((current.time - myPastOffsets[0].time) / 1000);

          currentTaskData += '<div><div class="badge right-floating-badge">' + (isNaN(ingestionRate) ? '0.00' : ingestionRate.toFixed(2)) + ' events/sec</div><p>' + task.id + '</p></div>'
          currentTaskData += '<div class="progress"><div class="progress-bar" role="progressbar" aria-valuenow="' + percentComplete + '" aria-valuemin="0" aria-valuemax="100" style="min-width:9em; width: ' + percentComplete + '%;">Remaining: ' + (task.remainingSeconds === null ? '?' : task.remainingSeconds) + ' s</div></div>'
          currentTaskData += '<table class="table table-bordered table-striped table-condensed">'
          currentTaskData +=   '<tr><th>Partition</th>' + offsetHeader + '</tr>'
          currentTaskData +=   '<tr><th>Starting Offset</th>' + startingOffsets + '</tr>'  
          currentTaskData +=   '<tr><th>Current Offset</th>' + currentOffsets + '</tr>'  
          currentTaskData += '</table>'
        }

        var publishingTaskData = '<h4>Publishing Tasks</h4>'
        publishingTaskData += payload.publishingTasks.length === 0 ? '[No publishing tasks]' : ''

        for (var i = 0; i < payload.publishingTasks.length; i++) {
          var offsetHeader = "", startingOffsets = "", currentOffsets = ""
          var task = payload.publishingTasks[i];
          var summedDeltaOffsets = 0
          for (var key in task.startingOffsets) {
            offsetHeader += '<th>' + key + '</th>'
            startingOffsets += '<td>' + task.startingOffsets[key] + '</td>'
            currentOffsets += '<td>' + task.currentOffsets[key] + '</td>'
            summedDeltaOffsets += (task.currentOffsets[key] - task.startingOffsets[key])
          }

          publishingTaskData += '<div><div class="badge right-floating-badge">' + (isNaN(summedDeltaOffsets) ? '?' : summedDeltaOffsets) + ' events</div><p>' + task.id + '</p></div>'
          publishingTaskData += '<table class="table table-bordered table-striped table-condensed">'
          publishingTaskData +=   '<tr><th>Partition</th>' + offsetHeader + '</tr>'
          publishingTaskData +=   '<tr><th>Starting Offset</th>' + startingOffsets + '</tr>'  
          publishingTaskData +=   '<tr><th>Current Offset</th>' + currentOffsets + '</tr>'  
          publishingTaskData += '</table>'
        }
        
        responses[payload.dataSource] = taskHeader + currentTaskData + publishingTaskData

        if (--remaining === 0) {
          var output = ""
          keys = Object.keys(responses)
          keys.sort()

          for (var i = 0; i < keys.length; i++) {
            output += responses[keys[i]];
          }

          $("#data").html(output)
        }
      });
    }
  });
}
