import { strict as assert } from 'node:assert';
import {
	array,
	assert as assertStructure,
	boolean,
	enums,
	nullable,
	number,
	object,
	optional,
	refine,
	string,
	union,
	validate as validateStructure,
} from 'superstruct';

import C from './config.js';
import { readJSONSync } from './utils.js';

const printableAsciiRegex = /^[a-z0-9": ,{}()\n[\]_./+\-*#%]+$/i;
const validNormalStringRegex = /^[a-z0-9:_./\-*#]+$/i;
const normalString = () => refine(string(), 'normal string', (value) => {
	if (validNormalStringRegex.test(value) || C.normalStringAllowList.includes(value) || value === '') {
		return true;
	}

	const normalized = Array.from(value).map((ch) => {
		if (printableAsciiRegex.test(ch)) {
			return ch;
		}
		return ch.split('').map((cp, idx) => `<0x${ch.codePointAt(idx).toString(16)}>`).join('');
	}).join('');
	return `A string with unexpected characters: "${normalized}" printed as "${value}"`;
});

// root validator config. Extracted for partial validation.
const rootStructure = {
	rabbit_version: optional(string()),
	rabbitmq_version: optional(string()),
	product_name: string(),
	product_version: string(),
	users: array(object({
		name: normalString(),
		password_hash: string(),
		hashing_algorithm: string(),
		tags: array(string()),
		limits: object(),
	})),
	vhosts: array(object({
		name: normalString(),
	})),
	permissions: array(object({
		user: normalString(),
		vhost: normalString(),
		configure: string(),
		write: string(),
		read: string(),
	})),
	topic_permissions: array(object({
		user: normalString(),
		vhost: normalString(),
		exchange: normalString(),
		write: string(),
		read: string(),
	})),
	global_parameters: optional(array(object({
		name: normalString(),
		value: string(),
	}))),
	parameters: array(object({
		vhost: normalString(),
		component: string(),
		name: normalString(),
		value: union([object(), string()]),
	})),
	policies: array(object({
		vhost: normalString(),
		name: normalString(),
		pattern: string(),
		'apply-to': string(),
		definition: object(),
		priority: number(),
	})),
	queues: array(object({
		name: normalString(),
		vhost: normalString(),
		durable: boolean(),
		auto_delete: boolean(),
		arguments: optional(object({
			'x-queue-type': optional(string()),
			'x-message-ttl': optional(number()),
			'x-expires': optional(number()),
			'x-dead-letter-exchange': optional(string()),
			'x-dead-letter-routing-key': optional(string()),
		})),
	})),
	exchanges: array(object(
		{
			name: normalString(),
			vhost: normalString(),
			type: enums(['topic', 'headers', 'direct']),
			durable: boolean(),
			auto_delete: boolean(),
			internal: optional(boolean()),
			arguments: optional(object({
				'alternate-exchange': optional(string()),
			})),
		},
	)),
	bindings: array(object({
		source: normalString(),
		vhost: normalString(),
		destination: normalString(),
		destination_type: enums(['exchange', 'queue']),
		routing_key: nullable(string()),
		arguments: optional(object()),
	})),
};
const root = object(rootStructure);

export const assertPart = (part, partialObj) => {
	assert.equal(typeof part, 'string');
	assert(rootStructure[part], `Missing validation config for part: ${part}. Use one from ${Object.keys(rootStructure).join(', ')}`);
	return assertStructure(partialObj, rootStructure[part]);
};

export const assertRootStructure = (obj) => {
	return assertStructure(obj, root);
};

export const assertFromFile = (path) => {
	return assertRootStructure(readJSONSync(path));
};

export const validatePart = (part, partialObj) => {
	assert.equal(typeof part, 'string');
	assert(rootStructure[part], `Missing validation config for part: ${part}. Use one from ${Object.keys(rootStructure).join(', ')}`);
	return validateStructure(partialObj, rootStructure[part]);
};

export const validateRootStructure = (obj) => {
	const [error] = validateStructure(obj, root);
	return error;
};

export default assertRootStructure;
