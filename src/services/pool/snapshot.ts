import { Address, ethereum } from "@graphprotocol/graph-ts";
import { TokenSnapshot } from "../../../generated/schema";
import { getOrRegisterToken } from "./tokens";

export function getOrRegisterTokenSnapshot(
  tokenAddress: Address,
  event: ethereum.Event
): TokenSnapshot {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let id = tokenAddress.toHexString() + "-" + dayID.toString();
  let dayData = TokenSnapshot.load(id);

  if (dayData === null) {
    let dayStartTimestamp = dayID * 86400;
    let token = getOrRegisterToken(tokenAddress);
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
