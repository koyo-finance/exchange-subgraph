import {
    Address,
    BigDecimal,
    BigInt,
    dataSource
} from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "@protofire/subgraph-toolkit";

export class AddressByNetwork {
    public boba_mainnet: string;
    public aurora_mainnet: string;
    public moonriver_mainnet: string;
    public dev: string;
}

const network: string = dataSource.network();

export const DAY = 24 * 60 * 60;

// Number of decimals used for gauge weight
export const GAUGE_WEIGHT_PRECISION = 18;
// Number of decimals used for total weight
export const GAUGE_TOTAL_WEIGHT_PRECISION = GAUGE_WEIGHT_PRECISION * 2;

export const MIN_POOL_LIQUIDITY = BigDecimal.fromString("10");

export const ZERO = BigInt.fromI32(0);
export const ZERO_BD = BigDecimal.fromString("0");
export const ONE_BD = BigDecimal.fromString("1");

export const SWAP_IN = 0;
export const SWAP_OUT = 1;

export const ZERO_ADDRESS_ADDRESS: Address = changetype<Address>(
    Address.fromHexString(ZERO_ADDRESS)
);

export const BPT_DECIMALS = 18;

function forNetwork(
    addressByNetwork: AddressByNetwork,
    network: string
): Address {
    if (network == "boba") {
        return Address.fromString(addressByNetwork.boba_mainnet);
    } else if (network == "aurora") {
        return Address.fromString(addressByNetwork.aurora_mainnet);
    } else if (network == "moonriver") {
        return Address.fromString(addressByNetwork.moonriver_mainnet);
    } else {
        return Address.fromString(addressByNetwork.dev);
    }
}

const vaultAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x2A4409Cc7d2AE7ca1E3D915337D1B6Ba2350D6a3",
    aurora_mainnet: "0x0613ADbD846CB73E65aA474b785F52697af04c0b",
    moonriver_mainnet: "0xEa1E627c12DF4e054D61FD408Ff7186353aC6cA1",
    dev: "0x0000000000000000000000000000000000000000"
};

const wethAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    aurora_mainnet: "0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
    moonriver_mainnet: "0x98878B06940aE243284CA214f92Bb71a2b032B8A",
    dev: "0x0000000000000000000000000000000000000000"
};

const kyoAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x618CC6549ddf12de637d46CDDadaFC0C2951131C",
    aurora_mainnet: "0x0000000000000000000000000000000000000000",
    moonriver_mainnet: "0x0000000000000000000000000000000000000000",
    dev: "0x0000000000000000000000000000000000000000"
};

const usdAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x7562F525106F5d54E891e005867Bf489B5988CD9", // FRAX
    aurora_mainnet: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802", // USDC
    moonriver_mainnet: "0x1A93B23281CC1CDE4C4741353F3064709A16197d", // FRAX
    dev: "0x0000000000000000000000000000000000000000"
};

const fraxAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x7562F525106F5d54E891e005867Bf489B5988CD9",
    aurora_mainnet: "0xE4B9e004389d91e4134a28F19BD833cBA1d994B6",
    moonriver_mainnet: "0x1A93B23281CC1CDE4C4741353F3064709A16197d",
    dev: "0x0000000000000000000000000000000000000000"
};

const daiAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0xf74195Bb8a5cf652411867c5C2C5b8C2a402be35",
    aurora_mainnet: "0xe3520349F477A5F6EB06107066048508498A291b",
    moonriver_mainnet: "0x80A16016cC4A2E6a2CACA8a4a498b1699fF0f844",
    dev: "0x0000000000000000000000000000000000000000"
};

const usdcAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x66a2A913e447d6b4BF33EFbec43aAeF87890FBbc",
    aurora_mainnet: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802",
    moonriver_mainnet: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
    dev: "0x0000000000000000000000000000000000000000"
};

const usdtAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x5DE1677344D3Cb0D7D465c10b72A8f60699C062d",
    aurora_mainnet: "0x4988a896b1227218e4A686fdE5EabdcAbd91571f",
    moonriver_mainnet: "0xFFFFFFfFea09FB06d082fd1275CD48b191cbCD1d",
    dev: "0x0000000000000000000000000000000000000000"
};

export const VAULT_ADDRESS = forNetwork(vaultAddressByNetwork, network);
export const WETH: Address = forNetwork(wethAddressByNetwork, network);
export const KYO: Address = forNetwork(kyoAddressByNetwork, network);
export const USD: Address = forNetwork(usdAddressByNetwork, network);
export const FRAX: Address = forNetwork(fraxAddressByNetwork, network);
export const DAI: Address = forNetwork(daiAddressByNetwork, network);
export const USDC: Address = forNetwork(usdcAddressByNetwork, network);
export const USDT: Address = forNetwork(usdtAddressByNetwork, network);

export const PRICING_ASSETS: Address[] =
    network === "boba" ? [WETH, USDC, FRAX, DAI, KYO] : [WETH, USDC, FRAX, DAI];
export const USD_STABLE_ASSETS: Address[] = [FRAX, USDC, DAI];
