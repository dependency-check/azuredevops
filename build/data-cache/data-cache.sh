#!/bin/bash

VERSION=$1
PROFILE=$2
BUCKET_NAME=$3
DISTRIBUTION_ID=$4

#install dep check
curl -sLo ./dependency-check-$VERSION-release.zip https://github.com/jeremylong/DependencyCheck/releases/download/v$VERSION/dependency-check-$VERSION-release.zip
unzip -q ./dependency-check-$VERSION-release.zip

#version check
./dependency-check/bin/dependency-check.sh --version

#load data files
mkdir ./dependency-check/data
./dependency-check/bin/dependency-check.sh --updateonly
ls -la ./dependency-check/data

#to the cloud
cd ./dependency-check/data
aws s3 sync . s3://$BUCKET_NAME/data --profile $PROFILE
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/data/*" --profile $PROFILE

