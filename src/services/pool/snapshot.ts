import { Address, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { Pool, PoolSnapshot, TokenSnapshot } from "../../../generated/schema";
import { DAY } from "../../constants";
import { getOrRegisterToken, getPoolToken } from "./tokens";

export function getOrRegisterTokenSnapshot(
  tokenAddress: Address,
  event: ethereum.Event
): TokenSnapshot {
  const timestamp = event.block.timestamp.toI32();
  const dayID = timestamp / 86400;
  const id = tokenAddress.toHexString() + "-" + dayID.toString();
  let dayData = TokenSnapshot.load(id);

  if (dayData === null) {
    const dayStartTimestamp = dayID * 86400;
    const token = getOrRegisterToken(tokenAddress);
    dayData = new TokenSnapshot(id);

    dayData.timestamp = dayStartTimestamp;
    dayData.totalSwapCount = token.totalSwapCount;
    dayData.totalBalanceUSD = token.totalBalanceUSD;
    dayData.totalBalanceNotional = token.totalBalanceNotional;
    dayData.totalVolumeUSD = token.totalVolumeUSD;
    dayData.totalVolumeNotional = token.totalVolumeNotional;
    dayData.token = token.id;

    dayData.save();
  }

  return dayData;
}

export function getOrRegisterPoolSnapshot(pool: Pool, timestamp: i32): void {
  const dayTimestamp = timestamp - (timestamp % DAY); // Todays Timestamp

  const poolId = pool.id;
  if (pool === null || !pool.tokensList) return;

  const snapshotId = poolId + "-" + dayTimestamp.toString();
  let snapshot = PoolSnapshot.load(snapshotId);

  if (!snapshot) {
    snapshot = new PoolSnapshot(snapshotId);
  }

  const tokens = pool.tokensList;
  const amounts = new Array<BigDecimal>(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenAddress = Address.fromString(token.toHexString());
    const poolToken = getPoolToken(poolId, tokenAddress);
    if (poolToken === null) continue;

    amounts[i] = poolToken.balance;
  }

  snapshot.pool = poolId;
  snapshot.amounts = amounts;
  snapshot.totalShares = pool.totalShares;
  snapshot.swapVolume = pool.totalSwapVolume;
  snapshot.swapFees = pool.totalSwapFee;
  snapshot.timestamp = dayTimestamp;
  snapshot.totalLiquidity = pool.totalLiquidity;
  snapshot.totalSwapFee = pool.totalSwapFee;
  snapshot.totalSwapVolume = pool.totalSwapVolume;
  snapshot.swapsCount = pool.swapsCount;
  snapshot.holdersCount = pool.holdersCount;

  snapshot.save();
}
