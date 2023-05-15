import { strict as assert } from 'assert';
import { describe, it } from 'node:test';

import { readJSONSync } from '../src/utils.js';
import assertUsage from '../src/usage.js';

const copy = (obj) => {
	return JSON.parse(JSON.stringify(obj));
};

const valid = readJSONSync('./fixtures/full.json');
const usage = [
	{ vhost: '/', queue: 'defect_queue', exchange: 'anotherex2' },
	{ vhost: '/', queue: 'defect_queue', exchange: 'defect_topic' },
	{ vhost: '/', queue: 'defect_queue', exchange: 'defect_headers' },
	{ vhost: 'isolated', queue: 'defect_queue', exchange: 'isolated_defect_headers' },
];

describe('asserting usage', () => {
	it('fn exists and takes an object and an array', () => {
		const def = copy(valid);
		assertUsage(def, usage);
		assert.throws(() => {
			// should throw if missing arguments
			assertUsage();
		});
		assert.throws(() => {
			// should throw if missing arguments
			assertUsage(def);
		});
	});

	describe('unused resources', () => {
		it('vhosts', () => {
			const def = copy(valid);
			def.vhosts.push({
				name: 'unused_vhost',
			});

			assert.throws(() => {
				assertUsage(def, usage);
			}, /unused_vhost/);
		});

		it('queues', () => {
			const def = copy(valid);
			def.queues.push({
				vhost: '/',
				name: 'unused_queue',
			});

			assert.throws(() => {
				assertUsage(def, usage);
			}, /unused_queue/);
		});

		it('exchanges', () => {
			const def = copy(valid);
			def.exchanges.push({
				vhost: '/',
				name: 'unused_exchange',
			});

			assert.throws(() => {
				assertUsage(def, usage);
			}, /unused_exchange/);
		});
	});
});
