import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'dependency-check-build-task.js');
let tr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tr.setInput('enableVerbose', 'true');
tr.setInput('projectName', 'Example Project Name');
tr.setInput('scanPath', '**/*.jar');
tr.setInput('format', 'HTML,SARIF');
tr.setInput('enableExperimental', 'false');
tr.setInput('enableRetired', 'false');
tr.setInput('uploadReports', 'true');
tr.setInput('uploadSARIFReport', 'true');
tr.setInput('warnOnCVSSViolation', 'true');
tr.setInput('reportsDirectory', "data");

// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{};
//a.checkPath[path.join(__dirname, "data")] = true;
//a.checkPath[path.join(__dirname, "data", "dependency-check")] = true;
tr.setAnswers(a);

tr.run();