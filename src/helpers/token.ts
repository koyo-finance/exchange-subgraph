import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../generated/Vault/ERC20";

export function getTokenDecimals(tokenAddress: Address): i32 {
  let token = ERC20.bind(tokenAddress);
  let decimalsTried = token.try_decimals();

  return decimalsTried.reverted ? 0 : decimalsTried.value;
}

export function tokenToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();

  return amount.toBigDecimal().div(scale);
}
