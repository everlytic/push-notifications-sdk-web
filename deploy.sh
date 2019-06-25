#!/bin/sh
PACKAGE_VERSION=v$(cat package.json | grep -n version | head -1 | awk -F: '{ print $3 }' | sed 's/[\",]//g' | tr -d '[[:space:]]') && git tag $PACKAGE_VERSION && git push --tags