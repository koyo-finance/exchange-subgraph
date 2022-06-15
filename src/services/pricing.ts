import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  LatestPrice,
  Pool,
  PoolHistoricalLiquidity,
  TokenPrice
} from "../../generated/schema";
import { ONE_BD, ZERO_BD } from "../constants";
import {
  getLatestPriceId,
  getPoolHistoricalLiquidityId,
  valueInUSD
} from "../helpers/pricing";
import { getOrRegisterToken, getPoolToken } from "./pool/tokens";
import { findOrRegisterVault } from "./vault";

export function updatePoolLiquidity(
  poolId: string,
  block: BigInt,
  pricingAsset: Address
): boolean {
  let pool = Pool.load(poolId);
  if (pool == null) return false;

  let tokensList: Bytes[] = pool.tokensList;
  if (tokensList.length < 2) return false;

  let poolValue: BigDecimal = ZERO_BD;

  for (let j: i32 = 0; j < tokensList.length; j++) {
    let tokenAddress: Address = Address.fromString(tokensList[j].toHexString());

    let poolToken = getPoolToken(poolId, tokenAddress);
    if (poolToken == null) continue;

    if (tokenAddress == pricingAsset) {
      poolValue = poolValue.plus(poolToken.balance);
      continue;
    }
    let poolTokenQuantity: BigDecimal = poolToken.balance;

    let price: BigDecimal = ZERO_BD;
    let latestPriceId = getLatestPriceId(tokenAddress, pricingAsset);
    let latestPrice = LatestPrice.load(latestPriceId);

    // note that we can only meaningfully report liquidity once assets are traded with
    // the pricing asset
    if (latestPrice) {
      // value in terms of priceableAsset
      price = latestPrice.price;
    }

    if (price.gt(ZERO_BD)) {
      let poolTokenValue = price.times(poolTokenQuantity);
      poolValue = poolValue.plus(poolTokenValue);
    }
  }

  let oldPoolLiquidity: BigDecimal = pool.totalLiquidity;
  let newPoolLiquidity: BigDecimal =
    valueInUSD(poolValue, pricingAsset) || ZERO_BD;
  let liquidityChange: BigDecimal = newPoolLiquidity.minus(oldPoolLiquidity);

  // If the pool isn't empty but we have a zero USD value then it's likely that we have a bad pricing asset
  // Don't commit any changes and just report the failure.
  if (poolValue.gt(ZERO_BD) != newPoolLiquidity.gt(ZERO_BD)) {
    return false;
  }

  // Take snapshot of pool state
  let phlId = getPoolHistoricalLiquidityId(poolId, pricingAsset, block);
  let phl = new PoolHistoricalLiquidity(phlId);

  phl.poolId = poolId;
  phl.pricingAsset = pricingAsset;
  phl.block = block;
  phl.poolTotalShares = pool.totalShares;
  phl.poolLiquidity = poolValue;
  phl.poolShareValue = pool.totalShares.gt(ZERO_BD)
    ? poolValue.div(pool.totalShares)
    : ZERO_BD;

  phl.save();

  // Update pool stats
  pool.totalLiquidity = newPoolLiquidity;

  pool.save();

  // Update global stats
  let vault = findOrRegisterVault();

  vault.totalLiquidity = vault.totalLiquidity.plus(liquidityChange);

  vault.save();

  return true;
}

export function updateLatestPrice(tokenPrice: TokenPrice): void {
  let tokenAddress = Address.fromString(tokenPrice.asset.toHexString());
  let pricingAsset = Address.fromString(tokenPrice.pricingAsset.toHexString());

  let latestPriceId = getLatestPriceId(tokenAddress, pricingAsset);
  let latestPrice = LatestPrice.load(latestPriceId);

  if (latestPrice == null) {
    latestPrice = new LatestPrice(latestPriceId);
    latestPrice.asset = tokenPrice.asset;
    latestPrice.pricingAsset = tokenPrice.pricingAsset;
  }

  latestPrice.block = tokenPrice.block;
  latestPrice.poolId = tokenPrice.poolId;
  latestPrice.price = tokenPrice.price;
  latestPrice.priceUSD = tokenPrice.priceUSD;
  latestPrice.save();

  let token = getOrRegisterToken(tokenAddress);

  token.latestPrice = latestPrice.id;

  token.save();
}
