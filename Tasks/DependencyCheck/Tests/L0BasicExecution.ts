import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const taskPath = path.join(__dirname, '..', 'dependency-check-build-task.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('enableVerbose', 'true');
tmr.setInput('projectName', 'Example Project Name');
tmr.setInput('scanPath', '**/*.jar');
tmr.setInput('format', 'HTML,SARIF');
tmr.setInput('enableExperimental', 'false');
tmr.setInput('enableRetired', 'false');
tmr.setInput('uploadReports', 'true');
tmr.setInput('uploadSARIFReport', 'true');
tmr.setInput('warnOnCVSSViolation', 'true');
tmr.setInput('reportsDirectory', "data");

// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{};
//a.checkPath[path.join(__dirname, "data")] = true;
//a.checkPath[path.join(__dirname, "data", "dependency-check")] = true;
tmr.setAnswers(a);

tmr.run();