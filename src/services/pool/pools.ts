import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { integer } from "@protofire/subgraph-toolkit";
import { OracleWeightedPool } from "../../../generated/OracleWeightedPoolFactory/OracleWeightedPool";
import { PoolCreated } from "../../../generated/OracleWeightedPoolFactory/OracleWeightedPoolFactory";
import { Pool } from "../../../generated/schema";
import { ERC20 } from "../../../generated/Vault/ERC20";
import { ZERO_BD } from "../../constants";
import { scaleDown } from "../../helpers/scaling";
import { findOrRegisterVault } from "../vault";
import { getOrRegisterPoolToken } from "./tokens";

export function getOrRegisterPool(poolId: string): Pool {
  let pool = Pool.load(poolId);

  if (pool == null) {
    pool = new Pool(poolId);

    pool.vaultID = "2";
    pool.strategyType = i32(parseInt(poolId.slice(42, 46)));
    pool.tokensList = [];
    pool.totalWeight = ZERO_BD;
    pool.totalSwapVolume = ZERO_BD;
    pool.totalSwapFee = ZERO_BD;
    pool.totalLiquidity = ZERO_BD;
    pool.totalShares = ZERO_BD;
    pool.totalSharesRaw = integer.ZERO;
    pool.swapsCount = BigInt.fromI32(0);
    pool.holdersCount = BigInt.fromI32(0);
  }

  return pool;
}

export function handleNewPool(
  event: PoolCreated,
  poolId: Bytes,
  swapFee: BigInt
): Pool {
  let poolAddress: Address = event.params.pool;
  let pool = Pool.load(poolId.toHexString());

  if (pool === null) {
    pool = getOrRegisterPool(poolId.toHexString());

    pool.swapFee = scaleDown(swapFee, 18);
    pool.createTime = event.block.timestamp.toI32();
    pool.address = poolAddress;
    pool.tx = event.transaction.hash;
    pool.swapEnabled = true;

    let bpt = ERC20.bind(poolAddress);

    let nameCall = bpt.try_name();
    if (!nameCall.reverted) {
      pool.name = nameCall.value;
    }

    let symbolCall = bpt.try_symbol();
    if (!symbolCall.reverted) {
      pool.symbol = symbolCall.value;
    }
    pool.save();

    let vault = findOrRegisterVault();
    vault.poolCount += 1;
    vault.save();
  }

  return pool;
}

export function updatePoolWeights(poolId: string): void {
  let pool = Pool.load(poolId);
  if (pool === null) return;

  let poolContract = OracleWeightedPool.bind(changetype<Address>(pool.address));

  let tokensList = pool.tokensList;
  let weightsTried = poolContract.try_getNormalizedWeights();
  if (!weightsTried.reverted) {
    let weights = weightsTried.value;

    if (weights.length == tokensList.length) {
      let totalWeight = ZERO_BD;

      for (let i = 0; i < tokensList.length; i++) {
        let tokenAddress = changetype<Address>(tokensList[i]);
        let weight = weights[i];

        let poolToken = getOrRegisterPoolToken(poolId, tokenAddress);
        if (poolToken != null) {
          poolToken.weight = scaleDown(weight, 18);
          poolToken.save();
        }

        totalWeight = totalWeight.plus(scaleDown(weight, 18));
      }

      pool.totalWeight = totalWeight;
    }
  }

  pool.save();
}
