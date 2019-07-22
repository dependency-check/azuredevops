#!/bin/bash

# refresh the data files for the build artifact
# Unfortunately can't include cached data in the VSIX, exceeds max size for package upload (booooo).
#./src/Tasks/dependency-check-build-task/dependency-check/bin/dependency-check.sh --updateonly

# build the extension
npm install
npm run build