import ncp = require('child_process')
import path = require('path');
import os = require('os')
import fs = require('fs-extra')
import semver = require('semver');
import yargs = require('yargs/yargs');
import common = require('./common');
import AdmZip from 'adm-zip';
import { AzureDevOpsTaskDef } from "./task";

const vstsFiles = ['task.json', 'task.loc.json', 'package.json', 'package-lock.json', 'icon.png', 'lib.json', 'Strings']

function updateExtension(extParams: {
    extensionPath: string;
    publisher: string;
    extensionName: string;
    extensionVersion: string
}) {
    const zip = new AdmZip(extParams.extensionPath);
    const tempVsix = fs.mkdtempSync(path.join(os.tmpdir(), 'vsix-'));
    const tasksFolder = path.join(tempVsix, 'Tasks');

    // Extract vsix on temporary folder
    zip.extractAllTo(tempVsix);
    // Read tasks folder
    const taskList = fs.readdirSync(tasksFolder);
    // Foreach on all tasks folder
    taskList.forEach(function (task) {
        const taskPath = path.join(tasksFolder, task);
        const taskDefPath = path.join(taskPath, 'task.json');
        const taskDef:AzureDevOpsTaskDef = JSON.parse(fs.readFileSync(taskDefPath, 'utf-8'));
        let taskTarget = taskDef.execution?.Node16?.target;
        if(taskTarget === undefined) {
            taskTarget = taskDef.execution?.Node10?.target;
        }
        if(taskTarget === undefined) {
            throw new Error("Execution target not found on task.json");
        }

        // We also need lib.json from azure pipelines task lib or else localization will not work properly
        const libJsonPath = path.join(taskPath, 'node_modules', 'azure-pipelines-task-lib', 'lib.json')
        fs.copyFileSync(libJsonPath, path.join(taskPath, 'lib.json'))

        // Clean
        cleanTask(taskPath, taskTarget);

        // Update task.json
        if (semver.valid(extParams.extensionVersion)) {
            const version = semver.parse(extParams.extensionVersion);
            taskDef.version!.Major = version!.major;
            taskDef.version!.Minor = version!.minor;
            taskDef.version!.Patch = version!.patch;
        } else {
            throw new Error("Supplied ExtensionVersion must matching semver format");
        }

        fs.writeFileSync(taskDefPath, JSON.stringify(taskDef));
    });

    // Repackage extension
    const newExtension = new AdmZip();
    newExtension.addLocalFolder(tempVsix);
    newExtension.writeZip(extParams.extensionPath);
}

function cleanTask(taskPath:string, taskTarget:string) {
    // Read content of every task folder
    const taskFiles = fs.readdirSync(taskPath);
    // Whitelist
    const filesWhiteList = vstsFiles.slice();
    filesWhiteList.push(taskTarget);
    filesWhiteList.push(taskTarget + '.LICENSE.txt');
    // Foreach every file inside a task folder
    taskFiles.forEach(function (file) {
        // Remove unnecessary files
        if (!filesWhiteList.includes(file) && file != taskTarget) {
            fs.removeSync(path.join(taskPath, file));
        }
    });
}

function packageExtension() {
    console.group("Package extension");
    try {
        const vssExtension = JSON.parse(fs.readFileSync('vss-extension.json', 'utf-8'));
        const argv = yargs(process.argv.slice(2))
            .default('outputPath', 'package')
            .default('publisher', ""+vssExtension.publisher)
            .default('extensionName', ""+vssExtension.name)
            .default('extensionVersion', ""+vssExtension.version)
            .alias("publisher", "p")
            .alias("extensionName", "n")
            .alias("extensionVersion", "v")
            .parseSync();

        const binName = os.platform() === 'win32' ? `tfx.cmd` : 'tfx';
        const tfx = path.join('node_modules', '.bin', binName);
        const args: string[] = ['extension', 'create', '--json', '--no-color'];

        args.push('--root', '.');
        args.push('--manifests', 'vss-extension.json');
        args.push('--publisher', argv.publisher);
        args.push('--output-path', argv.outputPath);
        args.push('--override', JSON.stringify({
            name: argv.extensionName,
            version: argv.extensionVersion
        }));

        console.log('Packaging with:' + `${tfx} ${args.join(' ')}`);

        ncp.execFileSync(tfx, args, {stdio: 'pipe'});
        const outputStream = new common.TfxJsonOutputStream(console.log);
        outputStream.writeAll(ncp.execFileSync(tfx, args, { stdio: 'pipe' }));
        const json = JSON.parse(outputStream.jsonString);

        updateExtension({
            extensionPath: json.path,
            publisher: argv.publisher,
            extensionName: argv.extensionName,
            extensionVersion: argv.extensionVersion
        });

        console.log('Packaging successful');
        console.log(json);
    } catch (err) {
        console.error(`Error packaging extension: ${err}.`);
        throw err;
    }
}

packageExtension();