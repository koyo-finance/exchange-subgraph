import { BigInt } from "@graphprotocol/graph-ts";
import { decimal, integer } from "@protofire/subgraph-toolkit";
import { ERC20 as ERC20Contract } from "../../../generated/GaugeController/ERC20";
import {
  AddType,
  GaugeController,
  NewGauge,
  NewGaugeWeight,
  NewTypeWeight,
  VoteForGauge
} from "../../../generated/GaugeController/GaugeController";
import {
  Gauge,
  GaugeTotalWeight,
  GaugeType,
  GaugeTypeWeight,
  GaugeWeight,
  GaugeWeightVote
} from "../../../generated/schema";
import { Gauge as GaugeTemplate } from "../../../generated/templates";
import { GAUGE_TOTAL_WEIGHT_PRECISION } from "../../constants";
import { getOrRegisterAccount } from "../../services/accounts";
import { getGaugeType, registerGaugeType } from "../../services/gauge-types";
import { findOrRegisterVault } from "../../services/vault";

const WEEK = integer.fromNumber(604800);

export function handleAddType(event: AddType): void {
  const gaugeController = GaugeController.bind(event.address);
  const nextWeek = nextPeriod(event.block.timestamp, WEEK);

  // Add gauge type
  const gaugeType = registerGaugeType(
    event.params.type_id.toString(),
    event.params.name
  );
  gaugeType.save();

  // Save gauge type weight
  const typeWeight = new GaugeTypeWeight(nextWeek.toString());
  typeWeight.type = gaugeType.id;
  typeWeight.time = nextWeek;
  typeWeight.weight = decimal.fromBigInt(
    gaugeController.points_type_weight(event.params.type_id, nextWeek)
  );
  typeWeight.save();

  // Save total weight
  const totalWeight = new GaugeTotalWeight(nextWeek.toString());
  totalWeight.time = nextWeek;
  totalWeight.weight = decimal.fromBigInt(
    gaugeController.points_total(nextWeek),
    GAUGE_TOTAL_WEIGHT_PRECISION
  );
  totalWeight.save();

  const vault = findOrRegisterVault();
  vault.gaugeTypeCount = integer.increment(vault.gaugeTypeCount);
  vault.save();
}

export function handleNewGauge(event: NewGauge): void {
  const gaugeController = GaugeController.bind(event.address);
  const gaugeERC20Contract = ERC20Contract.bind(event.params.addr);
  const nextWeek = nextPeriod(event.block.timestamp, WEEK);
  // Get or register gauge type
  let gaugeType = getGaugeType(event.params.gauge_type.toString());

  if (gaugeType === null) {
    gaugeType = registerGaugeType(
      event.params.gauge_type.toString(),
      gaugeController.gauge_type_names(event.params.gauge_type)
    );
  }

  gaugeType.gaugeCount = gaugeType.gaugeCount.plus(integer.ONE);
  gaugeType.save();

  // Add gauge instance
  const gauge = new Gauge(event.params.addr.toHexString());
  gauge.address = event.params.addr;
  gauge.type = gaugeType.id;
  gauge.killed = false;

  gauge.created = event.block.timestamp;
  gauge.createdAtBlock = event.block.number;
  gauge.createdAtTransaction = event.transaction.hash;

  const gaugeNameTried = gaugeERC20Contract.try_name();
  gauge.name = gaugeNameTried.reverted ? "" : gaugeNameTried.value;
  const gaugeSymbolTried = gaugeERC20Contract.try_symbol();
  gauge.symbol = gaugeSymbolTried.reverted ? "" : gaugeSymbolTried.value;

  gauge.save();

  // Save gauge weight
  const gaugeWeight = new GaugeWeight(gauge.id + "-" + nextWeek.toString());
  gaugeWeight.gauge = gauge.id;
  gaugeWeight.time = nextWeek;
  gaugeWeight.weight = decimal.fromBigInt(event.params.weight);
  gaugeWeight.save();

  // Save total weight
  const totalWeight = new GaugeTotalWeight(nextWeek.toString());
  totalWeight.time = nextWeek;
  totalWeight.weight = decimal.fromBigInt(
    gaugeController.points_total(nextWeek),
    GAUGE_TOTAL_WEIGHT_PRECISION
  );
  totalWeight.save();

  const vault = findOrRegisterVault();
  vault.gaugeCount = integer.increment(vault.gaugeCount);
  vault.save();

  // Start indexing gauge events
  GaugeTemplate.create(event.params.addr);
}

export function handleNewGaugeWeight(event: NewGaugeWeight): void {
  let gauge = Gauge.load(event.params.gauge_address.toHexString());

  if (gauge !== null) {
    const gaugeController = GaugeController.bind(event.address);
    const nextWeek = nextPeriod(event.params.time, WEEK);

    // Save gauge weight
    const gaugeWeight = new GaugeWeight(gauge.id + "-" + nextWeek.toString());
    gaugeWeight.gauge = gauge.id;
    gaugeWeight.time = nextWeek;
    gaugeWeight.weight = decimal.fromBigInt(event.params.weight);
    gaugeWeight.save();

    // Save total weight
    const totalWeight = new GaugeTotalWeight(nextWeek.toString());
    totalWeight.time = nextWeek;
    totalWeight.weight = decimal.fromBigInt(
      gaugeController.points_total(nextWeek),
      GAUGE_TOTAL_WEIGHT_PRECISION
    );
    totalWeight.save();
  }
}

export function handleNewTypeWeight(event: NewTypeWeight): void {
  let gaugeType = GaugeType.load(event.params.type_id.toString());

  if (gaugeType !== null) {
    const typeWeight = new GaugeTypeWeight(
      gaugeType.id + "-" + event.params.time.toString()
    );
    typeWeight.type = gaugeType.id;
    typeWeight.time = event.params.time;
    typeWeight.weight = decimal.fromBigInt(event.params.weight);
    typeWeight.save();

    const totalWeight = new GaugeTotalWeight(event.params.time.toString());
    totalWeight.time = event.params.time;
    totalWeight.weight = decimal.fromBigInt(
      event.params.total_weight,
      GAUGE_TOTAL_WEIGHT_PRECISION
    );
    totalWeight.save();
  }
}

export function handleVoteForGauge(event: VoteForGauge): void {
  let gauge = Gauge.load(event.params.gauge_addr.toHexString());

  if (gauge !== null) {
    const gaugeController = GaugeController.bind(event.address);
    const nextWeek = nextPeriod(event.params.time, WEEK);

    // Save gauge weight
    const gaugeWeight = new GaugeWeight(gauge.id + "-" + nextWeek.toString());
    gaugeWeight.gauge = gauge.id;
    gaugeWeight.time = nextWeek;
    gaugeWeight.weight = decimal.fromBigInt(
      gaugeController.points_weight(event.params.gauge_addr, nextWeek).bias
    );
    gaugeWeight.save();

    // Save total weight
    const totalWeight = new GaugeTotalWeight(nextWeek.toString());
    totalWeight.time = nextWeek;
    totalWeight.weight = decimal.fromBigInt(
      gaugeController.points_total(nextWeek),
      GAUGE_TOTAL_WEIGHT_PRECISION
    );
    totalWeight.save();

    // Save user's gauge weight vote
    const user = getOrRegisterAccount(event.params.user);

    const vote = new GaugeWeightVote(
      gauge.id + "-" + user.id + "-" + event.params.time.toString()
    );
    vote.gauge = gauge.id;
    vote.user = user.id;
    vote.time = event.params.time;
    vote.weight = decimal.fromBigInt(event.params.weight);
    vote.save();
  }
}

function nextPeriod(timestamp: BigInt, period: BigInt): BigInt {
  const nextPeriod = timestamp.plus(period);
  return nextPeriod.div(period).times(period);
}
