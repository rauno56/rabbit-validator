import { strict as assert } from 'assert';
import { describe, it } from 'node:test';

import { readJSONSync } from '../src/utils.js';
import assertRelations from '../src/relations.js';

const copy = (obj) => {
	return JSON.parse(JSON.stringify(obj));
};

const valid = readJSONSync('./fixtures/full.json');

describe('asserting relations', () => {
	it('fn exists and takes an object', () => {
		const def = copy(valid);
		assertRelations(def);
		assert.throws(() => {
			assertRelations();
		});
	});

	describe('duplicates', () => {
		it('vhosts', () => {
			const def = copy(valid);
			def.vhosts.push(def.vhosts[0]);

			assert.throws(() => {
				assertRelations(def);
			}, /duplicate.*vhost/i);
		});

		it('queues', () => {
			const def = copy(valid);
			const newQueue = copy(def.queues[0]);
			newQueue.vhost = 'empty_vhost';
			def.queues.push(newQueue);

			// should pass because of the different vhost
			assertRelations(def);

			// should throw because exact duplicate
			def.queues.push(def.queues[0]);
			assert.throws(() => {
				assertRelations(def);
			}, /duplicate.*queue/i);
		});

		it('exchanges', () => {
			const def = copy(valid);
			const newQueue = copy(def.exchanges[0]);
			newQueue.vhost = 'empty_vhost';
			def.exchanges.push(newQueue);

			// should pass because of the different vhost
			assertRelations(def);

			// should throw because exact duplicate
			def.exchanges.push(def.exchanges[0]);
			assert.throws(() => {
				assertRelations(def);
			}, /duplicate.*exchange/i);
		});

		it('bindings', () => {
			const def = copy(valid);
			const newBinding = copy(def.bindings[0]);
			newBinding.arguments.new_header = 'somerandomvalue';
			def.bindings.push(newBinding);

			// should pass because of the different arguments
			assertRelations(def);

			// should throw because exact duplicate
			def.bindings.push(def.bindings[0]);
			assert.throws(() => {
				assertRelations(def);
			}, /duplicate.*binding/i);
		});
	});

	it('exchange does not exist for binding', () => {
		const def = copy(valid);
		const originalLength = def.exchanges.length;
		const BINDING_SOURCE = 'defect_headers';
		const binding = def.bindings.find(({ source }) => source === BINDING_SOURCE);
		assert.ok(binding);

		def.exchanges = def.exchanges.filter(({ name, vhost }) => !(name == BINDING_SOURCE && vhost === binding.vhost));
		assert.equal(originalLength - 1, def.exchanges.length, 'Invalid test: exchange list did not change');

		assert.throws(() => {
			assertRelations(def);
		}, /missing source/i);
	});

	it('queue does not exist for binding', () => {
		const def = copy(valid);
		const originalLength = def.queues.length;
		const BINDING_SOURCE = 'defect_headers';
		const QUEUE_NAME = 'defect_queue';
		const binding = def.bindings.find(({ source, destination }) => source === BINDING_SOURCE && destination === QUEUE_NAME);
		assert.ok(binding);

		def.queues = def.queues.filter((q) => !(q.name == QUEUE_NAME && q.vhost === binding.vhost));
		assert.equal(originalLength - 1, def.queues.length, 'Invalid test: queue list did not change');

		assert.throws(() => {
			assertRelations(def);
		}, /missing.*destination.*queue/i);
	});
});