import { Address, Bytes } from "@graphprotocol/graph-ts";
import { OracleWeightedPool } from "../../../../generated/OracleWeightedPoolFactory/OracleWeightedPool";
import { PoolCreated } from "../../../../generated/OracleWeightedPoolFactory/OracleWeightedPoolFactory";
import { Vault } from "../../../../generated/OracleWeightedPoolFactory/Vault";
import { PoolType } from "../../../helpers/pool";
import { getOrRegisterAccount } from "../../../services/accounts";
import { handleNewPool, updatePoolWeights } from "../../../services/pool/pools";
import { getOrRegisterPoolToken } from "../../../services/pool/tokens";
import { findOrRegisterVault } from "../../../services/vault";

function createOracleWeightedPool(
  event: PoolCreated,
  poolType: string
): string {
  let poolAddress: Address = event.params.pool;
  let poolContract = OracleWeightedPool.bind(poolAddress);

  let poolId = poolContract.try_getPoolId().value;
  let swapFee = poolContract.try_getSwapFeePercentage().value;
  let owner = poolContract.try_getOwner().value;

  let account = getOrRegisterAccount(owner);

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = poolType;
  pool.factory = event.address;
  pool.owner = account.id;

  let vaultContract = Vault.bind(Address.fromBytes(findOrRegisterVault().address));
  let tokensTried = vaultContract.try_getPoolTokens(poolId);

  if (!tokensTried.reverted) {
    let tokens = tokensTried.value.value0;
    pool.tokensList = changetype<Bytes[]>(tokens);

    for (let i: i32 = 0; i < tokens.length; i++) {
      getOrRegisterPoolToken(poolId.toHexString(), tokens[i]);
    }
  }
  pool.save();

  // Load pool with initial weights
  updatePoolWeights(poolId.toHexString());

  return poolId.toHexString();
}

export function handleNewOracleWeightedPool(event: PoolCreated): void {
  createOracleWeightedPool(event, PoolType.Weighted);
}
