import { strict as assert } from 'assert';
import { describe, it } from 'node:test';

import { readJSONSync } from '../src/utils.js';
import diff from '../src/diff.js';

const copy = (obj) => {
	return JSON.parse(JSON.stringify(obj));
};

const valid = readJSONSync('./fixtures/full.json');

describe('diff', () => {
	it('fn exists and takes 2 args', () => {
		assert.equal(typeof diff, 'function');
		assert.equal(diff.length, 2);
	});

	it('validates input objects to be definition files', () => {
		diff(valid, valid);
		assert.throws(() => {
			const unvalid = copy(valid);
			unvalid.exchanges = false;
			diff(valid, unvalid);
		});
		assert.throws(() => {
			const unvalid = copy(valid);
			unvalid.exchanges = false;
			diff(unvalid, valid);
		});
	});

	it('catches changes to vhosts', () => {
		const before = copy(valid);
		const after = copy(valid);
		before.vhosts.push({
			name: 'deleted',
		});
		after.vhosts.push({
			name: 'new',
		});
		const { added: { vhosts: added }, deleted: { vhosts: deleted } } = diff(before, after);
		assert.equal(added.length, 1);
		assert.equal(added[0].name, 'new');
		assert.equal(deleted.length, 1);
		assert.equal(deleted[0].name, 'deleted');
	});

	it('catches changes to queues', () => {
		const before = copy(valid);
		const after = copy(valid);
		after.queues.push({
			name: 'new',
			vhost: '/',
			durable: true,
			auto_delete: false,
		});
		before.queues.push({
			name: 'deleted',
			vhost: '/',
			durable: true,
			auto_delete: false,
		});
		const changedItem = after.queues[0];
		changedItem.durable = !changedItem.durable;
		const { added: { queues: added }, deleted: { queues: deleted }, changed: { queues: changed } } = diff(before, after);
		assert.equal(added.length, 1);
		assert.equal(added[0].name, 'new');
		assert.equal(deleted.length, 1);
		assert.equal(deleted[0].name, 'deleted');
		assert.equal(changed.length, 1);
		assert.equal(changed[0].before.name, changedItem.name);
		assert.equal(changed[0].before.durable, !changedItem.durable);
		assert.equal(changed[0].after.name, changedItem.name);
		assert.equal(changed[0].after.durable, changedItem.durable);
	});

	it('catches changes to exchanges', () => {
		const before = copy(valid);
		const after = copy(valid);
		after.exchanges.push({
			name: 'new',
			vhost: '/',
			type: 'topic',
			durable: true,
			auto_delete: false,
		});
		before.exchanges.push({
			name: 'deleted',
			vhost: '/',
			type: 'headers',
			durable: true,
			auto_delete: false,
		});
		const changedItem = after.exchanges[0];
		changedItem.durable = !changedItem.durable;
		const { added: { exchanges: added }, deleted: { exchanges: deleted }, changed: { exchanges: changed } } = diff(before, after);
		assert.equal(added.length, 1);
		assert.equal(added[0].name, 'new');
		assert.equal(deleted.length, 1);
		assert.equal(deleted[0].name, 'deleted');
		assert.equal(changed.length, 1);
		assert.equal(changed[0].before.name, changedItem.name);
		assert.equal(changed[0].before.durable, !changedItem.durable);
		assert.equal(changed[0].after.name, changedItem.name);
		assert.equal(changed[0].after.durable, changedItem.durable);
	});

	it('catches changes to bindings via routing key', () => {
		const before = copy(valid);
		const after = copy(valid);
		// pick first two resource to create bindings between
		const exchange = before.exchanges.find((e) => e.type === 'topic');
		const queue = before.queues.find((q) => q.vhost === exchange.vhost);
		after.bindings.push({
			vhost: exchange.vhost,
			source: exchange.name,
			destination: queue.name,
			destination_type: 'queue',
			routing_key: 'a.b',
		});
		before.bindings.push({
			vhost: exchange.vhost,
			source: exchange.name,
			destination: queue.name,
			destination_type: 'queue',
			routing_key: 'd.e',
		});
		const { added: { bindings: added }, deleted: { bindings: deleted }, changed: { bindings: changed } } = diff(before, after);
		assert.equal(added.length, 1);
		assert.equal(added[0].routing_key, 'a.b');
		assert.equal(deleted.length, 1);
		assert.equal(deleted[0].routing_key, 'd.e');
		assert.equal(changed.length, 0);
	});

	it('catches changes to bindings via args', () => {
		const before = copy(valid);
		const after = copy(valid);
		// pick first two resource to create bindings between
		const exchange = before.exchanges.find((e) => e.type === 'headers');
		const queue = before.queues.find((q) => q.vhost === exchange.vhost);
		after.bindings.push({
			vhost: exchange.vhost,
			source: exchange.name,
			destination: queue.name,
			destination_type: 'queue',
			routing_key: '',
			arguments: {
				'x-match': 'any',
				h1: 'v2',
			},
		});
		before.bindings.push({
			vhost: exchange.vhost,
			source: exchange.name,
			destination: queue.name,
			destination_type: 'queue',
			routing_key: '',
			arguments: {
				'x-match': 'any',
				h1: 'v1',
			},
		});
		const { added: { bindings: added }, deleted: { bindings: deleted }, changed: { bindings: changed } } = diff(before, after);
		assert.equal(added.length, 1);
		assert.equal(added[0].arguments.h1, 'v2');
		assert.equal(deleted.length, 1);
		assert.equal(deleted[0].arguments.h1, 'v1');
		assert.equal(changed.length, 0);
	});
});