import { BigDecimal, BigInt } from '@graphprotocol/graph-ts';

// Number of decimals used for gauge weight
export const GAUGE_WEIGHT_PRECISION = 18;

// Number of decimals used for total weight
export const GAUGE_TOTAL_WEIGHT_PRECISION = GAUGE_WEIGHT_PRECISION * 2;

export let ZERO = BigInt.fromI32(0);
export let ZERO_BD = BigDecimal.fromString('0');
export let ONE_BD = BigDecimal.fromString('1');
