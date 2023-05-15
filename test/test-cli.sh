#!/usr/bin/env sh

node cli.js fixtures/empty.json || exit 1
node cli.js fixtures/empty.json fixtures/usage.empty.json || exit 1

node cli.js fixtures/full.json || exit 1
node cli.js fixtures/full.json fixtures/usage.full.json || exit 1

! node cli.js fixtures/full.json fixtures/usage.empty.json && echo "Expected failure: OK" || exit 1

! node cli.js fixtures/full-invalid.json && echo "Expected failure: OK" || exit 1
! node cli.js fixtures/full-invalid-relations.json && echo "Expected failure: OK" || exit 1