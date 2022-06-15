import { Address } from "@graphprotocol/graph-ts";
import { integer } from "@protofire/subgraph-toolkit";
import { PoolToken, Token } from "../../../generated/schema";
import { ERC20 } from "../../../generated/Vault/ERC20";
import { ONE_BD, ZERO, ZERO_BD } from "../../constants";

export function getOrRegisterToken(tokenAddress: Address): Token {
  let tokenId = tokenAddress.toHexString();
  let token = Token.load(tokenId);

  if (token == null) {
    token = new Token(tokenId);
    let erc20token = ERC20.bind(tokenAddress);

    let nameTried = erc20token.try_name();
    let symbolTried = erc20token.try_symbol();
    let decimalsTried = erc20token.try_decimals();

    token.name = nameTried.reverted ? "" : nameTried.value;
    token.symbol = symbolTried.reverted ? "" : symbolTried.value;
    token.decimals = decimalsTried.reverted ? 0 : decimalsTried.value;
    token.totalBalanceUSD = ZERO_BD;
    token.totalBalanceNotional = ZERO_BD;
    token.totalSwapCount = ZERO;
    token.totalVolumeUSD = ZERO_BD;
    token.totalVolumeNotional = ZERO_BD;
    token.address = tokenAddress.toHexString();

    token.save();
  }

  return token;
}

export function getPoolTokenId(poolId: string, tokenAddress: Address): string {
  return poolId.concat("-").concat(tokenAddress.toHexString());
}

export function getOrRegisterPoolToken(
  poolId: string,
  tokenAddress: Address
): PoolToken {
  let poolTokenId = getPoolTokenId(poolId, tokenAddress);
  let poolToken = PoolToken.load(poolTokenId);

  if (poolToken == null) {
    poolToken = new PoolToken(poolTokenId);
    let token = ERC20.bind(tokenAddress);
    let tokenEntity = getOrRegisterToken(tokenAddress);

    let nameTried = token.try_name();
    let symbolTried = token.try_symbol();
    let decimalTried = token.try_decimals();

    poolToken.poolId = poolId;
    poolToken.address = tokenAddress.toHexString();

    poolToken.name = nameTried.reverted ? '' : nameTried.value;
    poolToken.symbol = symbolTried.reverted ? '' : symbolTried.value;
    poolToken.decimals = decimalTried.reverted ? 18 : decimalTried.value;

    poolToken.balance = ZERO_BD;
    poolToken.balanceRaw = integer.ZERO;
    poolToken.invested = ZERO_BD;
    poolToken.priceRate = ONE_BD;
    poolToken.token = tokenEntity.id;

    poolToken.save();
  }

  return poolToken;
}
