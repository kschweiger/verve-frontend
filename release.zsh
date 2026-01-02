#!/bin/sh
OLD_VERSION=$(bun -e 'console.log(require("./package.json").version)')

echo "Bumping Version"

bun run release -- --type="$@"

if [[ $? != 0 ]]; then
  echo "Bumping version failed. Exiting..."
  exit 1
fi

VERSION=$(bun -e 'console.log(require("./package.json").version)')

echo $VERSION

uvx git-changelog --bump ${VERSION}

git add package.json CHANGELOG.md VERSION bun.lock

git commit -n -m "build: Bumping ${OLD_VERSION} -> ${VERSION} 🔖"

git tag ${VERSION}

echo "Pushing"
git push

echo "Pushing tag"
git push --tag
