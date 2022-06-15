import { Address } from "@graphprotocol/graph-ts";
import { Koyo } from "../../generated/schema";
import { ZERO, ZERO_BD } from "../constants";

export function findOrRegisterVault(): Koyo {
  let vault = Koyo.load("1");

  if (vault === null) {
    vault = new Koyo("1");

    vault.poolCount = 0;
    vault.totalLiquidity = ZERO_BD;
    vault.totalSwapVolume = ZERO_BD;
    vault.totalSwapFee = ZERO_BD;
    vault.totalSwapCount = ZERO;

    vault.address = Address.fromHexString(
      "0x2A4409Cc7d2AE7ca1E3D915337D1B6Ba2350D6a3"
    );
  }

  return vault;
}
