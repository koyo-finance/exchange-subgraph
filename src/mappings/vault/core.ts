import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { JoinExit, Pool, Swap, TokenPrice } from "../../../generated/schema";
import {
  InternalBalanceChanged,
  PoolBalanceChanged,
  Swap as SwapEvent
} from "../../../generated/Vault/Vault";
import {
  MIN_POOL_LIQUIDITY,
  SWAP_IN,
  SWAP_OUT,
  ZERO,
  ZERO_ADDRESS_ADDRESS,
  ZERO_BD
} from "../../constants";
import {
  getPreferentialPricingAsset,
  getTokenPriceId,
  isPricingAsset,
  swapValueInUSD,
  valueInUSD
} from "../../helpers/pricing";
import { scaleDown } from "../../helpers/scaling";
import { getTokenDecimals, tokenToDecimal } from "../../helpers/token";
import {
  getOrRegisterAccount,
  getOrRegisterAccountInternalBalance
} from "../../services/accounts";
import { getPool, updatePoolWeights } from "../../services/pool/pools";
import {
  getOrRegisterPoolToken,
  getOrRegisterToken,
  getPoolToken,
  updateTokenBalances
} from "../../services/pool/tokens";
import { updateLatestPrice, updatePoolLiquidity } from "../../services/pricing";
import { getOrRegisterTradePair } from "../../services/trade";
import { findOrRegisterVault } from "../../services/vault";

export function handleBalanceChange(event: PoolBalanceChanged): void {
  let amounts: BigInt[] = event.params.deltas;

  if (amounts.length === 0) {
    return;
  }
  let total: BigInt = amounts.reduce<BigInt>(
    (sum, amount) => sum.plus(amount),
    new BigInt(0)
  );
  if (total.gt(ZERO)) {
    handlePoolJoined(event);
  } else {
    handlePoolExited(event);
  }
}

export function handleInternalBalanceChange(
  event: InternalBalanceChanged
): void {
  let token = event.params.token;
  let account = getOrRegisterAccount(event.params.user);
  let accountBalance = getOrRegisterAccountInternalBalance(account.id, token);

  let transferAmount = tokenToDecimal(
    event.params.delta,
    getTokenDecimals(token)
  );
  accountBalance.balance = accountBalance.balance.plus(transferAmount);
  accountBalance.balanceRaw = accountBalance.balanceRaw.plus(
    event.params.delta
  );

  accountBalance.save();
}

export function handleSwapEvent(event: SwapEvent): void {
  getOrRegisterAccount(event.transaction.from);

  let poolId = event.params.poolId;
  let poolIdString = event.params.poolId.toHexString();
  let account = getOrRegisterAccount(event.transaction.from);
  let pool = getPool(poolIdString);

  if (pool == null) {
    log.warning("Pool not found in handleSwapEvent: {}", [
      poolId.toHexString()
    ]);
    return;
  }

  updatePoolWeights(poolIdString);

  let poolAddress = pool.address;
  let tokenInAddress: Address = event.params.tokenIn;
  let tokenOutAddress: Address = event.params.tokenOut;

  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let blockTimestamp = event.block.timestamp.toI32();

  let poolTokenIn = getPoolToken(poolId.toHexString(), tokenInAddress);
  let poolTokenOut = getPoolToken(poolId.toHexString(), tokenOutAddress);
  if (poolTokenIn == null || poolTokenOut == null) {
    log.warning(
      "PoolToken not found in handleSwapEvent: (tokenIn: {}), (tokenOut: {})",
      [tokenInAddress.toHexString(), tokenOutAddress.toHexString()]
    );
    return;
  }

  let tokenAmountIn: BigDecimal = scaleDown(
    event.params.amountIn,
    poolTokenIn.decimals
  );
  let tokenAmountOut: BigDecimal = scaleDown(
    event.params.amountOut,
    poolTokenOut.decimals
  );

  let swapValueUSD = ZERO_BD;
  let swapFeesUSD = ZERO_BD;

  if (poolAddress != tokenInAddress && poolAddress != tokenOutAddress) {
    let swapFee = pool.swapFee;
    swapValueUSD = swapValueInUSD(
      tokenInAddress,
      tokenAmountIn,
      tokenOutAddress,
      tokenAmountOut
    );
    swapFeesUSD = swapValueUSD.times(swapFee);
  }

  let swapId = transactionHash.toHexString().concat(logIndex.toString());
  let swap = new Swap(swapId);
  swap.tokenIn = tokenInAddress;
  swap.tokenInSym = poolTokenIn.symbol;
  swap.tokenAmountIn = tokenAmountIn;

  swap.tokenOut = tokenOutAddress;
  swap.tokenOutSym = poolTokenOut.symbol;
  swap.tokenAmountOut = tokenAmountOut;

  // TODO - add valueUSD to swap entity
  // swap.valueUSD = swapValueUSD;

  swap.caller = event.transaction.from;
  swap.account = account.id;
  swap.poolId = poolId.toHex();

  swap.timestamp = blockTimestamp;
  swap.tx = transactionHash;
  swap.save();

  // update pool swapsCount
  // let pool = Pool.load(poolId.toHex());
  pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
  pool.totalSwapVolume = pool.totalSwapVolume.plus(swapValueUSD);
  pool.totalSwapFee = pool.totalSwapFee.plus(swapFeesUSD);

  pool.save();

  // update vault total swap volume
  let vault = findOrRegisterVault();

  vault.totalSwapVolume = vault.totalSwapVolume.plus(swapValueUSD);
  vault.totalSwapFee = vault.totalSwapFee.plus(swapFeesUSD);
  vault.totalSwapCount = vault.totalSwapCount.plus(BigInt.fromI32(1));

  vault.save();

  let newInAmount = poolTokenIn.balance.plus(tokenAmountIn);
  poolTokenIn.balance = newInAmount;
  poolTokenIn.save();

  let newOutAmount = poolTokenOut.balance.minus(tokenAmountOut);
  poolTokenOut.balance = newOutAmount;

  poolTokenOut.save();

  // update volume and balances for the tokens
  // updates token snapshots as well
  updateTokenBalances(tokenInAddress, swapValueUSD, tokenAmountIn, SWAP_IN);
  updateTokenBalances(tokenOutAddress, swapValueUSD, tokenAmountOut, SWAP_OUT);

  let tradePair = getOrRegisterTradePair(tokenInAddress, tokenOutAddress);

  tradePair.totalSwapVolume = tradePair.totalSwapVolume.plus(swapValueUSD);
  tradePair.totalSwapFee = tradePair.totalSwapFee.plus(swapFeesUSD);

  tradePair.save();

  if (swap.tokenAmountOut == ZERO_BD || swap.tokenAmountIn == ZERO_BD) {
    return;
  }

  // Capture price
  // TODO: refactor these if statements using a helper function
  let block = event.block.number;
  let tokenInWeight = poolTokenIn.weight;
  let tokenOutWeight = poolTokenOut.weight;
  if (
    isPricingAsset(tokenInAddress) &&
    pool.totalLiquidity.gt(MIN_POOL_LIQUIDITY)
  ) {
    let tokenPriceId = getTokenPriceId(
      poolId.toHex(),
      tokenOutAddress,
      tokenInAddress,
      block
    );
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenOutAddress);
    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.timestamp = blockTimestamp;
    tokenPrice.asset = tokenOutAddress;
    tokenPrice.amount = tokenAmountIn;
    tokenPrice.pricingAsset = tokenInAddress;

    if (tokenInWeight && tokenOutWeight) {
      // As the swap is with a WeightedPool, we can easily calculate the spot price between the two tokens
      // based on the pool's weights and updated balances after the swap.
      tokenPrice.price = newInAmount
        .div(tokenInWeight)
        .div(newOutAmount.div(tokenOutWeight));
    } else {
      // Otherwise we can get a simple measure of the price from the ratio of amount in vs amount out
      tokenPrice.price = tokenAmountIn.div(tokenAmountOut);
    }

    tokenPrice.save();

    updateLatestPrice(tokenPrice);
  }
  if (
    isPricingAsset(tokenOutAddress) &&
    pool.totalLiquidity.gt(MIN_POOL_LIQUIDITY)
  ) {
    let tokenPriceId = getTokenPriceId(
      poolId.toHex(),
      tokenInAddress,
      tokenOutAddress,
      block
    );
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenInAddress);
    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.timestamp = blockTimestamp;
    tokenPrice.asset = tokenInAddress;
    tokenPrice.amount = tokenAmountOut;
    tokenPrice.pricingAsset = tokenOutAddress;

    if (tokenInWeight && tokenOutWeight) {
      // As the swap is with a WeightedPool, we can easily calculate the spot price between the two tokens
      // based on the pool's weights and updated balances after the swap.
      tokenPrice.price = newOutAmount
        .div(tokenOutWeight)
        .div(newInAmount.div(tokenInWeight));
    } else {
      // Otherwise we can get a simple measure of the price from the ratio of amount out vs amount in
      tokenPrice.price = tokenAmountOut.div(tokenAmountIn);
    }

    tokenPrice.save();

    updateLatestPrice(tokenPrice);
  }

  const preferentialToken = getPreferentialPricingAsset([
    tokenInAddress,
    tokenOutAddress
  ]);
  if (preferentialToken != ZERO_ADDRESS_ADDRESS) {
    updatePoolLiquidity(poolId.toHex(), block, preferentialToken);
  }
}

function handlePoolJoined(event: PoolBalanceChanged): void {
  let poolId: string = event.params.poolId.toHexString();
  let amounts: BigInt[] = event.params.deltas;
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let liquidityProvider = getOrRegisterAccount(event.params.liquidityProvider);

  let pool = Pool.load(poolId);

  if (pool == null) {
    log.warning("Pool not found in handlePoolJoined: {} {}", [
      poolId,
      transactionHash.toHexString()
    ]);
    return;
  }

  let tokenAddresses = pool.tokensList;

  let joinId = transactionHash.toHexString().concat(logIndex.toString());
  let join = new JoinExit(joinId);
  join.sender = event.params.liquidityProvider;
  let joinAmounts = new Array<BigDecimal>(amounts.length);

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(
      tokenAddresses[i].toHexString()
    );
    let poolToken = getOrRegisterPoolToken(poolId, tokenAddress);
    if (poolToken == null) {
      throw new Error("poolToken not found");
    }
    let joinAmount = scaleDown(amounts[i], poolToken.decimals);
    joinAmounts[i] = joinAmount;
  }

  join.type = "Join";
  join.amounts = joinAmounts;
  join.pool = event.params.poolId.toHexString();
  join.account = liquidityProvider.id;
  join.timestamp = blockTimestamp;
  join.tx = transactionHash;

  join.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(
      tokenAddresses[i].toHexString()
    );
    let poolToken = getOrRegisterPoolToken(poolId, tokenAddress);

    let tokenAmountIn = tokenToDecimal(amounts[i], poolToken.decimals);
    let newAmount = poolToken.balance.plus(tokenAmountIn);
    let tokenAmountInUSD = valueInUSD(tokenAmountIn, tokenAddress);

    let token = getOrRegisterToken(tokenAddress);

    token.totalBalanceNotional = token.totalBalanceNotional.plus(tokenAmountIn);
    token.totalBalanceUSD = token.totalBalanceUSD.plus(tokenAmountInUSD);

    token.save();

    poolToken.balance = newAmount;
    poolToken.save();
  }

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(
      tokenAddresses[i].toHexString()
    );
    if (isPricingAsset(tokenAddress)) {
      let success = updatePoolLiquidity(
        poolId,
        event.block.number,
        tokenAddress
      );
      // Some pricing assets may not have a route back to USD yet
      // so we keep trying until we find one
      if (success) {
        break;
      }
    }
  }
}

function handlePoolExited(event: PoolBalanceChanged): void {
  let poolId = event.params.poolId.toHex();
  let amounts = event.params.deltas;
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let liquidityProvider = getOrRegisterAccount(event.params.liquidityProvider);

  let pool = Pool.load(poolId);
  if (pool == null) {
    log.warning("Pool not found in handlePoolExited: {} {}", [
      poolId,
      transactionHash.toHexString()
    ]);
    return;
  }
  let tokenAddresses = pool.tokensList;

  pool.save();

  let exitId = transactionHash.toHexString().concat(logIndex.toString());
  let exit = new JoinExit(exitId);
  exit.sender = event.params.liquidityProvider;
  let exitAmounts = new Array<BigDecimal>(amounts.length);

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(
      tokenAddresses[i].toHexString()
    );
    let poolToken = getOrRegisterPoolToken(poolId, tokenAddress);
    if (poolToken == null) {
      throw new Error("poolToken not found");
    }
    let exitAmount = scaleDown(amounts[i].neg(), poolToken.decimals);
    exitAmounts[i] = exitAmount;
  }

  exit.type = "Exit";
  exit.amounts = exitAmounts;
  exit.pool = event.params.poolId.toHexString();
  exit.account = liquidityProvider.id;
  exit.timestamp = blockTimestamp;
  exit.tx = transactionHash;

  exit.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(
      tokenAddresses[i].toHexString()
    );
    let poolToken = getOrRegisterPoolToken(poolId, tokenAddress);

    // adding initial liquidity
    if (poolToken == null) {
      throw new Error("poolToken not found");
    }

    let tokenAmountOut = tokenToDecimal(amounts[i].neg(), poolToken.decimals);
    let newAmount = poolToken.balance.minus(tokenAmountOut);
    let tokenAmountOutUSD = valueInUSD(tokenAmountOut, tokenAddress);

    poolToken.balance = newAmount;
    poolToken.save();

    let token = getOrRegisterToken(tokenAddress);
    token.totalBalanceNotional = token.totalBalanceNotional.minus(
      tokenAmountOut
    );
    token.totalBalanceUSD = token.totalBalanceUSD.minus(tokenAmountOutUSD);
    token.save();
  }

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(
      tokenAddresses[i].toHexString()
    );
    if (isPricingAsset(tokenAddress)) {
      let success = updatePoolLiquidity(
        poolId,
        event.block.number,
        tokenAddress
      );
      // Some pricing assets may not have a route back to USD yet
      // so we keep trying until we find one
      if (success) {
        break;
      }
    }
  }
}
