# OWASP Dependency Check Azure DevOps Extension

Let's start with this: We can automate this with a pipeline later and eliminate the craziness below. But, this is the MVP and it works. So let's finish the features first and then we can improve it...

Start by making your changes to the extension. When you are ready to test and release, use the steps below.

## Build Task Version

To release a new version, start by opening the *src/Tasks/dependency-check-build-task/task.json* file. Bump the version number. Keep the major and minor versions in sync with the core Dependency Check CLI. The patch release has to be updated every time you want to change the extension. Even in development. Think of it like a build number. Azure won't update the build task during an update if this value is the same as the currently installed build task in a pipeline. So, we put some 0's on th end to tell us what version of Dependency Check we are using, as well as the build id of the extension itself. Example 5.1.1 = 5.1.\[1000-1999\].

```
"version": {
    "Major": 5,
    "Minor": 2,
    "Patch": 1001
},
```

## Building for DEV

Open the **package.json** file and modify the package line:

Update the package command to use the dev value:

```
"package": "tfx extension create --manifest-globs vss-extension.dev.json",
```

Then, open the *src/Tasks/dependency-check-build-task/task.json* file and modify the id and name for dev. Note the comments for prod are added and comments for dev are removed.

```
//"id": "47EA1F4A-57BA-414A-B12E-C44F42765E72", //PROD
//"name": "dependency-check-build-task", //PROD
"id": "04450B31-9F11-415A-B37A-514D69EF69A1", //DEV
"name": "dependency-check-build-task-dev", //DEV
```

The VSIX file will automatically be created with the new version number in the version number field show in the **vss-extension.dev.json** file:

```
"manifestVersion": 1,
"id": "DependencyCheck-AzureDevOps-Dev",
"version": "5.1.1.000",
"name": "OWASP Dependency Check - DEV",
```

Build the extension using the following command from the repo root:

```
/bin/bash ./build/build.sh
```

A new VSIX file will be created in the repo root directory with this format:

```
dependency-check.azuredevops-dev-5.2.0.000.vsix
```

Upload the the marketplace manually (for now until the release pipeline works)

## Build for PROD

Open the **package.json** file and update the package command to the prod value:

```
"package": "tfx extension create --manifest-globs vss-extension.json",
```

Then, open the *src/Tasks/dependency-check-build-task/task.json* file and modify the id and name for prod. Note the comments for dev are added and comments for prod are removed.

```
"id": "47EA1F4A-57BA-414A-B12E-C44F42765E72", //PROD
"name": "dependency-check-build-task", //PROD
//"id": "04450B31-9F11-415A-B37A-514D69EF69A1", //DEV
//"name": "dependency-check-build-task-dev", //DEV
```

Open the *vss-extension.json* file and set the new version # matching what eventually went into dev:

```
"manifestVersion": 1,
"id": "DependencyCheck-AzureDevOps",
"version": "5.1.1.000",
"name": "OWASP Dependency Check",
```

Build the extension using the following commands.

```
npm install
npm run build
```

A new VSIX file will be created in the repo root directory with this format:

```
DependencyCheck.DependencyCheck-AzureDevOps-5.1.1.000.vsix
```

Upload to the marketplace under the Dependency Check publisher manually (for now until the build / release pipeline works):

[https://marketplace.visualstudio.com/manage/publishers/dependency-check](https://marketplace.visualstudio.com/manage/publishers/dependency-check)
