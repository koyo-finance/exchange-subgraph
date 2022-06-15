import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { JoinExit, Pool } from "../../../generated/schema";
import {
  InternalBalanceChanged,
  PoolBalanceChanged
} from "../../../generated/Vault/Vault";
import { ZERO } from "../../constants";
import { isPricingAsset, valueInUSD } from "../../helpers/pricing";
import { scaleDown } from "../../helpers/scaling";
import { getTokenDecimals, tokenToDecimal } from "../../helpers/token";
import {
  getOrRegisterAccount,
  getOrRegisterAccountInternalBalance
} from "../../services/accounts";
import {
  getOrRegisterPoolToken,
  getOrRegisterToken
} from "../../services/pool/tokens";
import { updatePoolLiquidity } from "../../services/pricing";

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
