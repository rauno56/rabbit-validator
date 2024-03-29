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

const C = {
	unusedFailureThreshold: {
		vhost: getFloatFromEnv('RABVAL_UNUSED_FAIL_THRESHOLD_VHOST', 0.3),
		exchange: getFloatFromEnv('RABVAL_UNUSED_FAIL_THRESHOLD_EXCHANGE', 0.3),
		queue: getFloatFromEnv('RABVAL_UNUSED_FAIL_THRESHOLD_QUEUE', 0.3),
	},
	normalStringAllowList: getListFromEnv('RABVAL_STRING_ALLOW', ','),
};

assert(isInRange(C.unusedFailureThreshold.vhost, 0, 1), 'Unused failure ratio out of bounds [0, 1]');
assert(isInRange(C.unusedFailureThreshold.exchange, 0, 1), 'Unused failure ratio out of bounds [0, 1]');
assert(isInRange(C.unusedFailureThreshold.queue, 0, 1), 'Unused failure ratio out of bounds [0, 1]');

export default C;
