#!/bin/bash

# refresh the data files for the build artifact
# Unfortunately can't include cached data in the VSIX, exceeds max size for package upload (booooo).
#./src/Tasks/dependency-check-build-task/dependency-check/bin/dependency-check.sh --updateonly

srcPath=`pwd`

# build the task
cd ./src/Tasks/dependency-check-build-task/
npm install
npm run build

# build the extension
cd $srcPath
npm install
npm run build
