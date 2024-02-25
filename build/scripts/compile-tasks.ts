import path = require('path');
import glob = require('glob');
import common = require('./common');

// common functions
const cd = common.cd;
const run = common.runCommand;
const pwd = common.pwd;
const bundleTask = common.bundleTask;

function build() {
    console.group("Building extension");
    try {
        const files = glob.sync("Tasks/*/tsconfig.json");

        const originalDir = pwd();
        files.forEach(function (config: string) {
            const taskDir = path.dirname(config);
            console.group("Building task: " + taskDir)
            cd(path.join(originalDir, taskDir));
            npmInstall();
            compileTask(path.join(originalDir, taskDir));
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

function npmInstall() {
    console.log("Install dependencies");
    run('npm install -no-progress --no-update-notifier --legacy-peer-deps --no-fund');
}

function compileTask(taskFolder: string) {
    buildTaskNode();
    bundleTask(taskFolder);
}

function buildTaskNode() {
    console.log("Building source files");
    run("tsc --project tsconfig.json");
}

build();