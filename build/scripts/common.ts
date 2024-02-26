import * as stream from "stream";
import * as shell from "shelljs";
import * as ncp from "child_process";
import path = require('path');
import fs = require('fs-extra');
import vm = require('vm');
import esbuild = require('esbuild');
import {AzureDevOpsTaskDef} from "./task";
import {Plugin} from "esbuild";

//------------------------------------------------------------------------------
// shell functions
//------------------------------------------------------------------------------
const shellAssert = function () {
    const errMsg = shell.error();
    if (errMsg) {
        throw new Error(errMsg as string);
    }
}

export function cd(dir:string) {
    shell.cd(dir);
    shellAssert();
}

export function pwd(): string {
    return shell.pwd().toString();
}

//------------------------------------------------------------------------------
// process functions
//------------------------------------------------------------------------------
export function runCommand(command: string): string {
    let output;
    try {
        output = ncp.execSync(command, {
            stdio: 'pipe'
        });
    }
    catch (err) {
        if (err instanceof Error) {
            console.error(err.message);
        } else {
            console.error("Error", err);
        }
        process.exit(1);
    }

    return (output || '').toString().trim();
}

export function createResJson(taskDef: AzureDevOpsTaskDef, taskPath: string): void {
    const resources: any = {}
    if (Object.hasOwnProperty.call(taskDef, 'friendlyName')) {
        resources['loc.friendlyName'] = taskDef.friendlyName
    }

    if (Object.hasOwnProperty.call(taskDef, 'helpMarkDown')) {
        resources['loc.helpMarkDown'] = taskDef.helpMarkDown
    }

    if (Object.hasOwnProperty.call(taskDef, 'description')) {
        resources['loc.description'] = taskDef.description
    }

    if (Object.hasOwnProperty.call(taskDef, 'instanceNameFormat')) {
        resources['loc.instanceNameFormat'] = taskDef.instanceNameFormat
    }

    if (Object.hasOwnProperty.call(taskDef, 'releaseNotes')) {
        resources['loc.releaseNotes'] = taskDef.releaseNotes
    }

    if (Object.hasOwnProperty.call(taskDef, 'groups')) {
        taskDef.groups!.forEach(function(group: any) {
            if (Object.hasOwnProperty.call(group, 'name')) {
                resources[`loc.group.displayName.${group.name}`] = group.displayName
            }
        })
    }

    if (Object.hasOwnProperty.call(taskDef, 'inputs')) {
        taskDef.inputs!.forEach(function(input: any) {
            if (Object.hasOwnProperty.call(input, 'name')) {
                resources[`loc.input.label.${input.name}`] = input.label

                if (Object.hasOwnProperty.call(input, 'helpMarkDown') && input.helpMarkDown) {
                    resources[`loc.input.help.${input.name}`] = input.helpMarkDown
                }
            }
        })
    }

    if (Object.hasOwnProperty.call(taskDef, 'messages')) {
        Object.keys(taskDef.messages!).forEach(function(key) {
            resources[`loc.messages.${key}`] = taskDef.messages![key]
        })
    }

    const resjsonPath = path.join(taskPath, 'Strings', 'resources.resjson', 'en-US', 'resources.resjson')
    fs.mkdirpSync(path.dirname(resjsonPath))
    fs.writeFileSync(resjsonPath, JSON.stringify(resources, undefined, 2))
}

export function generateTaskLoc(taskDef: AzureDevOpsTaskDef, taskPath: string) {
    taskDef.friendlyName = 'ms-resource:loc.friendlyName'
    taskDef.helpMarkDown = 'ms-resource:loc.helpMarkDown'
    taskDef.description = 'ms-resource:loc.description'
    taskDef.instanceNameFormat = 'ms-resource:loc.instanceNameFormat'

    if (Object.hasOwnProperty.call(taskDef, 'releaseNotes')) {
        taskDef.releaseNotes = 'ms-resource:loc.releaseNotes'
    }

    if (Object.hasOwnProperty.call(taskDef, 'groups')) {
        taskDef.groups!.forEach(function(group: any) {
            if (Object.hasOwnProperty.call(group, 'name')) {
                group.displayName = `ms-resource:loc.group.displayName.${group.name}`
            }
        })
    }

    if (Object.hasOwnProperty.call(taskDef, 'inputs')) {
        taskDef.inputs!.forEach(function(input: any) {
            if (Object.hasOwnProperty.call(input, 'name')) {
                input.label = `ms-resource:loc.input.label.${input.name}`

                if (Object.hasOwnProperty.call(input, 'helpMarkDown') && input.helpMarkDown) {
                    input.helpMarkDown = `ms-resource:loc.input.help.${input.name}`
                }
            }
        })
    }

    if (Object.hasOwnProperty.call(taskDef, 'messages')) {
        Object.keys(taskDef.messages!).forEach(function(key) {
            taskDef.messages![key] = `ms-resource:loc.messages.${key}`
        })
    }

    fs.writeFileSync(path.join(taskPath, "task.loc.json"), JSON.stringify(taskDef, undefined, 2))
}

export async function bundleTask(taskFolder:string) {
    let packageDef = JSON.parse(fs.readFileSync(path.join(taskFolder, 'package.json'), 'utf-8'));
    const mainPath = path.join(taskFolder, packageDef.main);

    const bundleShelljsPlugin:Plugin = {
        name: 'bundle-shelljs-plugin',
        setup(build) {
            build.onResolve({ filter: /\.\/commands/ }, args => ({
                path: args.path,
                namespace: 'shelljs-commands',
                pluginData: {
                    resolveDir: args.resolveDir.replace(/\\/g,"/")
                }
            }))

            build.onResolve({ filter: /\.\/src\/.*/, namespace: 'shelljs-commands' }, args => ({
                path: path.join(args.resolveDir, args.path),
                namespace: 'file',
            }))

            build.onLoad({ filter: /.*/, namespace: 'shelljs-commands' }, async (args) => {
                const data = await fs.readFile(path.join(args.pluginData.resolveDir, 'commands.js'));
                const commands:[string] = vm.runInNewContext(data.toString(), { exports: {}, module: {} });
                let contents = "";
                commands.forEach(command => {
                    contents += "require('./src/" + command +".js');";
                });
                contents += 'module.exports = [];';

                return {
                    contents: contents,
                    loader: 'js',
                    resolveDir: args.pluginData.resolveDir
                };
            })
        }
    }

    const result: esbuild.BuildResult = await esbuild.build({
        entryPoints: [mainPath],
        bundle: true,
        platform: 'node',
        target: ['node10'],
        minify: true,
        outfile: mainPath,
        allowOverwrite: true,
        sourcemap: true,
        legalComments: 'external',
        plugins: [bundleShelljsPlugin],
    });
    result.warnings.forEach((warning: esbuild.Message) => console.warn(warning.text));

    if(result.errors.length > 0) {
        result.errors.forEach((error: esbuild.Message) => console.error(error.text));
        throw "Error on build task";
    }
}

/**
 * A writable stream intended to be used with Tfx when using JSON output.
 * This class overcomes the problem of having tfx warnings being displayed
 * in stdout as regular messages, even when using --json switch in tfx.
 */
export class TfxJsonOutputStream extends stream.Writable {

    jsonString = "";
    messages: string[] = [];

    constructor(public out: (message: string) => void) {
        super();
    }

    writeAll(chunk: any, callback?: (error: (Error | null | undefined)) => void): boolean {
        const retValue = super.write(chunk, callback);
        super.end();
        return retValue;
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    _write(chunk: any, enc: string, cb: (Function)) : void {
        const chunkStr: string = chunk.toString();
        if (!this.jsonString && (chunkStr.toString()[0] !== "{" && chunkStr.toString()[0] !== "[")) {
            this.messages.push(chunkStr);
        }
        else {
            this.jsonString += chunkStr;
        }

        cb();
    }
}