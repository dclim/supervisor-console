$(document).ready(function() {
  window.supervisorConsole = {}
  supervisorConsole.pollingRate = 3000
  supervisorConsole.lastOffsetSum = {}

  setInterval(refresh, supervisorConsole.pollingRate)
  refresh()
});

function refresh() {
  $.get('supervisor', function(supervisors) {
    var remaining = supervisors.length
    var responses = {}

    for (var iSupervisor = 0; iSupervisor < supervisors.length; iSupervisor++) {
      $.get('supervisor/' + supervisors[iSupervisor] + '/status', function(data) {
        var taskHeader = '<h2>' + data.dataSource + '</h2>'
        taskHeader += '<div>'
        taskHeader +=   '<span class="task-badge-span">Topic <span class="badge">' + data.topic + '</span></span>'
        taskHeader +=   '<span class="task-badge-span">Partitions <span class="badge">' + data.partitions + '</span></span>'
        taskHeader +=   '<span class="task-badge-span">Replicas <span class="badge">' + data.replicas + '</span></span>'
        taskHeader += '</div>'

        var currentTaskData = '<h4>Current Tasks</h4>'
        currentTaskData += data.activeTasks.length === 0 ? '[No active tasks]' : ''
        for (var i = 0; i < data.activeTasks.length; i++) {
          var summedOffsets = 0
          var offsetHeader = "", startingOffsets = "", currentOffsets = ""
          var task = data.activeTasks[i];
          var percentComplete = task.remainingSeconds === null ? 0 : (data.durationSeconds - task.remainingSeconds) / data.durationSeconds * 100.0
          for (var key in task.startingOffsets) {
            offsetHeader += '<th>' + key + '</th>'
            startingOffsets += '<td>' + task.startingOffsets[key] + '</td>'
            currentOffsets += '<td>' + task.currentOffsets[key] + '</td>'
            summedOffsets += task.currentOffsets[key]
          }

          // this is pretty simplistic, we'd probably want to use a rolling window to calculate the rate
          var ingestionRate = (summedOffsets - supervisorConsole.lastOffsetSum[task.id]) / (supervisorConsole.pollingRate / 1000)
          supervisorConsole.lastOffsetSum[task.id] = summedOffsets

          currentTaskData += '<div><div class="badge right-floating-badge">' + (isNaN(ingestionRate) ? '0.00' : ingestionRate.toFixed(2)) + ' events/sec</div><p>' + task.id + '</p></div>'
          currentTaskData += '<div class="progress"><div class="progress-bar" role="progressbar" aria-valuenow="' + percentComplete + '" aria-valuemin="0" aria-valuemax="100" style="min-width:9em; width: ' + percentComplete + '%;">Remaining: ' + (task.remainingSeconds === null ? '?' : task.remainingSeconds) + ' s</div></div>'
          currentTaskData += '<table class="table table-bordered table-striped table-condensed">'
          currentTaskData +=   '<tr><th>Partition</th>' + offsetHeader + '</tr>'
          currentTaskData +=   '<tr><th>Starting Offset</th>' + startingOffsets + '</tr>'  
          currentTaskData +=   '<tr><th>Current Offset</th>' + currentOffsets + '</tr>'  
          currentTaskData += '</table>'
        }

        var publishingTaskData = '<h4>Publishing Tasks</h4>'
        publishingTaskData += data.publishingTasks.length === 0 ? '[No publishing tasks]' : ''

        for (var i = 0; i < data.publishingTasks.length; i++) {
          var offsetHeader = "", startingOffsets = "", currentOffsets = ""
          var task = data.publishingTasks[i];
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
        
        responses[data.dataSource] = taskHeader + currentTaskData + publishingTaskData

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