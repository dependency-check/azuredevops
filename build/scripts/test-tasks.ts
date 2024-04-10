import path = require('path');
import glob = require('glob');
import common = require('./common');

// common functions
const cd = common.cd;
const run = common.runCommand;
const pwd = common.pwd;

function test() {
    console.group("Test extension");
    try {
        const files = glob.sync("Tasks/*/tsconfig.json");

        const originalDir = pwd();
        files.forEach(function (config: string) {
            const taskDir = path.dirname(config);
            console.group("Test task: " + taskDir)
            cd(path.join(originalDir, taskDir, "Tests"));
            testTask();
            console.groupEnd();
        });
        cd(originalDir);
        console.groupEnd();
    } catch (err) {
        if (err instanceof Error) {
            console.error(err.message);
        } else {
            console.error("Error", err);
        }
        process.exit(1);
    }
}

function testTask() {
    console.log("Test task suite");
    run("mocha L0.js");
}

test();