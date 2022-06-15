import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { LatestPrice } from "../../generated/schema";
import { PRICING_ASSETS, USD_STABLE_ASSETS, WETH, ZERO_BD } from "../constants";

export function valueInETH(
  value: BigDecimal,
  pricingAsset: Address
): BigDecimal {
  let ethValue = ZERO_BD;

  let pricingAssetInETH = LatestPrice.load(
    getLatestPriceId(pricingAsset, WETH)
  );

  if (pricingAssetInETH != null) {
    ethValue = value.times(pricingAssetInETH.price);
  }

  return ethValue;
}

export function valueInUSD(
  value: BigDecimal,
  pricingAsset: Address
): BigDecimal {
  let usdValue = ZERO_BD;

  if (isUSDStable(pricingAsset)) {
    usdValue = value;
  } else {
    // convert to USD
    for (let i: i32 = 0; i < USD_STABLE_ASSETS.length; i++) {
      let pricingAssetInUSD = LatestPrice.load(
        getLatestPriceId(pricingAsset, USD_STABLE_ASSETS[i])
      );
      if (pricingAssetInUSD != null) {
        usdValue = value.times(pricingAssetInUSD.price);
        break;
      }
    }
  }

  // if there's no price in USD
  if (usdValue.equals(ZERO_BD)) {
    // try to convert it first to ETH
    const ethValue = valueInETH(value, pricingAsset);

    if (ethValue.gt(ZERO_BD)) {
      // then convert value in ETH to USD
      usdValue = valueInUSD(ethValue, WETH);
    }
  }

  return usdValue;
}

export function isUSDStable(asset: Address): boolean {
  for (let i: i32 = 0; i < USD_STABLE_ASSETS.length; i++) {
    if (USD_STABLE_ASSETS[i] == asset) return true;
  }
  return false;
}

export function isPricingAsset(asset: Address): boolean {
  for (let i: i32 = 0; i < PRICING_ASSETS.length; i++) {
    if (PRICING_ASSETS[i] == asset) return true;
  }
  return false;
}

export function getLatestPriceId(
  tokenAddress: Address,
  pricingAsset: Address
): string {
  return tokenAddress
    .toHexString()
    .concat("-")
    .concat(pricingAsset.toHexString());
}

export function getPoolHistoricalLiquidityId(poolId: string, tokenAddress: Address, block: BigInt): string {
  return poolId.concat('-').concat(tokenAddress.toHexString()).concat('-').concat(block.toString());
}

