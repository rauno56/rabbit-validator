#!/usr/bin/env node

import { strict as assert } from 'node:assert';
import path from 'node:path';
import { inspect } from 'node:util';

import validate from './src/validate.js';
import diff from './src/diff.js';
import deploy from './src/deploy.js';
import apply from './src/apply.js';
import { getOpt, getOptValue, readJSONSync, readIgnoreFileSync, writeJSONSync } from './src/utils.js';
import { resolveDefinitions } from './src/resolveDefinitions.js';

const opts = {
	/* general */
	h: getOpt('-h'),
	help: getOpt('--help'),
	v: getOpt('-v'),
	version: getOpt('--version'),
	/* shared */
	ignoreFile: getOptValue('--ignore-file'),
	/* apply */
	revert: getOpt('--revert'),
	write: getOpt('--write'),
	/* diff */
	json: getOpt('--json'),
	pretty: getOpt('--pretty'),
	limit: parseInt(getOptValue('--limit')),
	summary: getOpt('--summary'),
	/* deploy */
	dryRun: getOpt('--dry-run'),
	noDeletions: getOpt('--no-deletions'),
	recreateChanged: getOpt('--recreate-changed'),
};

const [,, subcommand, ...args] = process.argv;

const unparsedOptions = args.filter((a) => a.startsWith('-'));

if (unparsedOptions.length) {
	console.error(`Unrecognized options: ${unparsedOptions.join(', ')}`);
	process.exit(1);
}

if (opts.v || opts.version) {
	const pkg = readJSONSync('./package.json');
	console.error(`${pkg.name} ${pkg.version}`);
	process.exit(0);
}

if (
	!subcommand
	|| opts.h
	|| opts.help
) {
	console.error('usage: rabbit-validator <COMMAND> <OPTIONS>');
	console.error('Commands:');
	console.error();
	console.error('apply <path/diff.json> <path/definitions.json>');
	console.error('         Applies JSON diff to a definition file.');
	console.error('         Options:');
	console.error('         --revert\tRevert the direction of the diff. Useful when applying diffs to definition files to match them to servers.');
	console.error('         --write\tWrite the result back to file diffed instead of writing to stdout.');
	console.error();
	console.error('validate <path/definitions.json> [<path/usage.json>]');
	console.error('         Validates definition file.');
	console.error('         usage.json is a fail containing array of objects { vhost, exchange, queue } | { vhost, queue } of used RabbitMQ resources.');
	console.error();
	console.error('diff <path/definitions.before.json> <path/definitions.after.json>');
	console.error('         Diffs two definition files or servers.');
	console.error('         Either or both of the arguments can also be paths to a management API: https://username:password@live.rabbit.acme.com');
	console.error('         Options:');
	console.error('         --ignore-file\tPath to ignore file.');
	console.error('         --pretty     \tForce pretty-printed output.');
	console.error('         --json       \tOutput JSON to make parsing the result with another programm easier.');
	console.error('         --limit      \tLimit the number of changes to show for each type.');
	console.error('         --summary    \tOutput summary instead of the full list of differences.');
	console.error();
	console.error('deploy <base url for a management API> <path/definitions.to.deploy.json>');
	console.error('         Connects to a management API and deploys the state in provided definitions file.');
	console.error('         Base url is root url for the management API: http://username:password@dev.rabbitmq.com');
	console.error('         Protocol is required to be http or https.');
	console.error('         Options:');
	console.error('         --ignore-file     \tPath to ignore file.');
	console.error('         --dry-run         \tRun as configured but make all non-GET network calls no-op.');
	console.error('         --no-deletions    \tNever delete any resources.');
	console.error('         --recreate-changed\tSince resources are immutable in RabbitMQ, changing properties requires deletion and recreation.');
	console.error('                           \tBy default changes are not deployed, but this option turns it on.');
	console.error('                           \tUse with caution because it will affect channels actively using those resources.');
	process.exit(1);
}

assert(!opts.pretty || !opts.json, '--pretty and --json options are exclusive.');

const commands = {
	validate: (filePath, usageFilePath) => {
		const fullFilePath = path.resolve(filePath);
		const fullUsageFilePath = usageFilePath && path.resolve(usageFilePath);

		const logFailures = (failures) => {
			assert.equal(Array.isArray(failures), true, `Invalid list of failures: ${failures}`);
			console.error('Failures:');
			console.error(
				failures.map((failure) => {
					if (failure.path) {
						return `At ${failure.path.join('.')}: ${failure.message}`;
					}
					return failure.message;
				}).map((f, idx) => {
					return `${idx + 1}. ${f}`;
				}).join('\n'),
			);
		};

		console.debug(`Validating a definitions file at ${fullFilePath}${fullUsageFilePath ? ' with usage stats from ' + fullUsageFilePath : ''}`);

		// Failure[]
		const failures = validate(fullFilePath, fullUsageFilePath);
		if (failures.length) {
			logFailures(failures);
			process.exit(1);
		} else {
			console.log('OK');
		}
	},
	diff: async (beforeInput, afterInput) => {
		assert.equal(typeof beforeInput, 'string', 'Path or url to before definitions required');
		assert.equal(typeof afterInput, 'string', 'Path or url to after definitions required');

		const [before, after] = await Promise.all([
			resolveDefinitions(beforeInput),
			resolveDefinitions(afterInput),
		]);

		const ignoreList = opts.ignoreFile ? readIgnoreFileSync(opts.ignoreFile) : null;
		const result = diff(before, after, ignoreList);

		if (!opts.pretty && (opts.json || !process.stdout.isTTY)) {
			return console.log(JSON.stringify(result));
		}

		inspect.defaultOptions.depth += 3;
		inspect.defaultOptions.compact = 7;
		inspect.defaultOptions.breakLength = 200;
		inspect.defaultOptions.maxStringLength = Infinity;
		inspect.defaultOptions.maxArrayLength = opts.limit || Infinity;

		console.log(
			Object.fromEntries(
				Object.entries(result)
					.reduce((acc, [op, resources]) => {
						const shaken = Object.entries(resources)
							.filter(([, changes]) => changes.length)
							.map(([key, changes]) => {
								if (opts.summary) {
									return [key, changes.length];
								}
								return [key, changes];
							});
						if (shaken.length) {
							acc.push([op, Object.fromEntries(shaken)]);
						}
						return acc;
					}, [])
			)
		);
	},
	deploy: (serverBaseUrl, definitions) => {
		const {
			noDeletions,
			recreateChanged,
			dryRun,
		} = opts;

		const ignoreList = opts.ignoreFile ? readIgnoreFileSync(opts.ignoreFile) : null;

		return deploy(
			new URL(serverBaseUrl),
			readJSONSync(definitions),
			{ dryRun, noDeletions, recreateChanged, ignoreList }
		);
	},
	apply: (diffPath, definitionsPath) => {
		const { revert, write } = opts;

		const diff = readJSONSync(diffPath);
		const definitions = readJSONSync(definitionsPath);
		const result = apply(diff, definitions, { revert });

		if (write) {
			writeJSONSync(result);
		} else {
			console.log(JSON.stringify(result, null, 2));
		}

		return result;
	},
};

if (typeof commands[subcommand] === 'function') {
	await commands[subcommand](...args);
} else {
	console.error('Running rabbit-validator without subcommand is deprecated');
	commands.validate(subcommand, args[0]);
}
