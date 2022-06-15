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

export function getPool(poolId: string): Pool | null {
  return Pool.load(poolId);
}

export function getOrRegisterPool(poolId: string): Pool {
  let pool = Pool.load(poolId);

  if (pool == null) {
    pool = new Pool(poolId);
    const vault = findOrRegisterVault();

    pool.vault = vault.id;
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
  const poolAddress: Address = event.params.pool;
  let pool = Pool.load(poolId.toHexString());

  if (pool === null) {
    pool = getOrRegisterPool(poolId.toHexString());

    pool.swapFee = scaleDown(swapFee, 18);
    pool.createTime = event.block.timestamp.toI32();
    pool.address = poolAddress;
    pool.tx = event.transaction.hash;
    pool.swapEnabled = true;

    const bpt = ERC20.bind(poolAddress);

    const nameTried = bpt.try_name();
    const symbolTried = bpt.try_symbol();

    pool.name = nameTried.reverted ? null : nameTried.value;
    pool.symbol = symbolTried.reverted ? null : symbolTried.value;

    pool.save();

    const vault = findOrRegisterVault();
    vault.poolCount += 1;
    vault.save();
  }

  return pool;
}

export function updatePoolWeights(poolId: string): void {
  const pool = Pool.load(poolId);
  if (pool === null) return;

  const poolContract = OracleWeightedPool.bind(changetype<Address>(pool.address));

  const tokensList = pool.tokensList;
  const weightsTried = poolContract.try_getNormalizedWeights();
  if (!weightsTried.reverted) {
    const weights = weightsTried.value;

    if (weights.length === tokensList.length) {
      let totalWeight = ZERO_BD;

      for (let i = 0; i < tokensList.length; i++) {
        const tokenAddress = changetype<Address>(tokensList[i]);
        const weight = weights[i];

        const poolToken = getOrRegisterPoolToken(poolId, tokenAddress);
        if (poolToken !== null) {
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
