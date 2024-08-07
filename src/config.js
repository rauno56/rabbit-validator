import { strict as assert } from 'node:assert';

const isInRange = (value, min, max) => {
	return min <= value && value <= max;
};

function getListFromEnv(envVar, sep = ',') {
	assert(typeof envVar, 'string');
	if (!process.env[envVar]) {
		return [];
	}
	return process.env[envVar]
		.split(sep);
}

/**
 * @param {string} envVar
 * @param {number} defaultValue
 * @returns {number}
 */
function getFloatFromEnv(envVar, defaultValue) {
	return parseFloat(process.env[envVar]) || defaultValue;
}

/**
 * @param {string} envVar
 * @param {number} defaultValue
 * @returns {number}
 */
function getIntFromEnv(envVar, defaultValue) {
	return parseInt(process.env[envVar]) || defaultValue;
}

/**
 * @param {string} envVar
 * @param {RegExp | null} defaultValue
 * @returns {RegExp | null}
 */
function getRegexpFromEnv(envVar, defaultValue = null) {
	const value = process.env[envVar];
	if (!value) {
		return defaultValue;
	}
	return new RegExp(value);
}

const defaultPattern = getRegexpFromEnv('RABVAL_PATTERN');
const defaultAllowList = getListFromEnv('RABVAL_STRING_ALLOW', ',');

const C = {
	requestDelay: getIntFromEnv('RABVAL_REQUEST_DELAY', 9),
	unusedFailureThreshold: {
		vhost: getFloatFromEnv('RABVAL_UNUSED_FAIL_THRESHOLD_VHOST', 0.3),
		exchange: getFloatFromEnv('RABVAL_UNUSED_FAIL_THRESHOLD_EXCHANGE', 0.3),
		queue: getFloatFromEnv('RABVAL_UNUSED_FAIL_THRESHOLD_QUEUE', 0.3),
	},
	pattern: {
		vhosts: getRegexpFromEnv('RABVAL_PATTERN_VHOSTS', defaultPattern),
		users: getRegexpFromEnv('RABVAL_PATTERN_USERS', defaultPattern),
		policies: getRegexpFromEnv('RABVAL_PATTERN_POLICIES', defaultPattern),
		queues: getRegexpFromEnv('RABVAL_PATTERN_QUEUES', defaultPattern),
		exchanges: getRegexpFromEnv('RABVAL_PATTERN_EXCHANGES', defaultPattern),
	},
	normalStringAllowList: defaultAllowList,
	nameAllowList: {
		vhosts: defaultAllowList.concat(getListFromEnv('RABVAL_PATTERN_ALLOW_VHOSTS', ',')),
		users: defaultAllowList.concat(getListFromEnv('RABVAL_PATTERN_ALLOW_USERS', ',')),
		queues: defaultAllowList.concat(getListFromEnv('RABVAL_PATTERN_ALLOW_QUEUES', ',')),
		exchanges: defaultAllowList.concat(getListFromEnv('RABVAL_PATTERN_ALLOW_EXCHANGES', ',')),
	},
};

assert(isInRange(C.unusedFailureThreshold.vhost, 0, 1), 'Unused failure ratio out of bounds [0, 1]');
assert(isInRange(C.unusedFailureThreshold.exchange, 0, 1), 'Unused failure ratio out of bounds [0, 1]');
assert(isInRange(C.unusedFailureThreshold.queue, 0, 1), 'Unused failure ratio out of bounds [0, 1]');

export default C;
