#!/bin/sh

if [ "${TRAVIS_PULL_REQUEST}" != "false" ]; then
  echo "This is a PR, skip push."
  exit 0
fi

# Set for all push in this script.
git config --global user.name "Travis-CI"
git config --global user.email "zordius@yahoo-inc.com"

cd generated
git init
git add .
git commit -m "Auto deployed to Github Pages from @${TRAVIS_COMMIT} [ci skip]"
git push --force --quiet "https://${GHTK}@github.com/zordius/HandlebarsCookbook.git" master:gh-pages > /dev/null 2>&1
