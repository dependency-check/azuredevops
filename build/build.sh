#!/bin/bash

# refresh the data files for the build artifact
./src/Tasks/dependency-check-build-task/dependency-check/bin/dependency-check.sh --updateonly

# build the extension
npm install
npm run build