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
    public polygon_mainnet: string;
    public dev: string;
}

export class TokensByNetwork {
    public boba_mainnet: Address[];
    public aurora_mainnet: Address[];
    public moonriver_mainnet: Address[];
    public polygon_mainnet: Address[];
    public dev: Address[];
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

function forNetworkAddress(
    addressByNetwork: AddressByNetwork,
    network: string
): Address {
    if (network == "boba")
        return Address.fromString(addressByNetwork.boba_mainnet);
    else if (network == "aurora")
        return Address.fromString(addressByNetwork.aurora_mainnet);
    else if (network == "moonriver")
        return Address.fromString(addressByNetwork.moonriver_mainnet);
    else if (network == "matic")
        return Address.fromString(addressByNetwork.polygon_mainnet);
    else return Address.fromString(addressByNetwork.dev);
}

function forNetworkTokens(
    tokensByNetwork: TokensByNetwork,
    network: string
): Address[] {
    if (network == "boba") return tokensByNetwork.boba_mainnet;
    else if (network == "aurora") return tokensByNetwork.aurora_mainnet;
    else if (network == "moonriver") return tokensByNetwork.moonriver_mainnet;
    else if (network == "matic") return tokensByNetwork.polygon_mainnet;
    else return tokensByNetwork.dev;
}

const vaultAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x2A4409Cc7d2AE7ca1E3D915337D1B6Ba2350D6a3",
    aurora_mainnet: "0x0613ADbD846CB73E65aA474b785F52697af04c0b",
    moonriver_mainnet: "0xEa1E627c12DF4e054D61FD408Ff7186353aC6cA1",
    polygon_mainnet: "0xACf8489ccb47DA2D7306d827bbEDe05bFA6fea1b",
    dev: "0x0000000000000000000000000000000000000000"
};

const wethAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    aurora_mainnet: "0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
    moonriver_mainnet: "0x98878B06940aE243284CA214f92Bb71a2b032B8A",
    polygon_mainnet: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    dev: "0x0000000000000000000000000000000000000000"
};

const kyoAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x618CC6549ddf12de637d46CDDadaFC0C2951131C",
    aurora_mainnet: "0x0000000000000000000000000000000000000000",
    moonriver_mainnet: "0x0000000000000000000000000000000000000000",
    polygon_mainnet: "0x0000000000000000000000000000000000000000",
    dev: "0x0000000000000000000000000000000000000000"
};

const usdAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x66a2A913e447d6b4BF33EFbec43aAeF87890FBbc", // USDC
    aurora_mainnet: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802", // USDC
    moonriver_mainnet: "0x1A93B23281CC1CDE4C4741353F3064709A16197d", // FRAX
    polygon_mainnet: "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89", // FRAX
    dev: "0x0000000000000000000000000000000000000000"
};

const fraxAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x7562F525106F5d54E891e005867Bf489B5988CD9",
    aurora_mainnet: "0xE4B9e004389d91e4134a28F19BD833cBA1d994B6",
    moonriver_mainnet: "0x1A93B23281CC1CDE4C4741353F3064709A16197d",
    polygon_mainnet: "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89",
    dev: "0x0000000000000000000000000000000000000000"
};

const daiAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0xf74195Bb8a5cf652411867c5C2C5b8C2a402be35",
    aurora_mainnet: "0xe3520349F477A5F6EB06107066048508498A291b",
    moonriver_mainnet: "0x80A16016cC4A2E6a2CACA8a4a498b1699fF0f844",
    polygon_mainnet: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    dev: "0x0000000000000000000000000000000000000000"
};

const usdcAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x66a2A913e447d6b4BF33EFbec43aAeF87890FBbc",
    aurora_mainnet: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802",
    moonriver_mainnet: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
    polygon_mainnet: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    dev: "0x0000000000000000000000000000000000000000"
};

const usdtAddressByNetwork: AddressByNetwork = {
    boba_mainnet: "0x5DE1677344D3Cb0D7D465c10b72A8f60699C062d",
    aurora_mainnet: "0x4988a896b1227218e4A686fdE5EabdcAbd91571f",
    moonriver_mainnet: "0xFFFFFFfFea09FB06d082fd1275CD48b191cbCD1d",
    polygon_mainnet: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    dev: "0x0000000000000000000000000000000000000000"
};

export const VAULT_ADDRESS = forNetworkAddress(vaultAddressByNetwork, network);
export const WETH: Address = forNetworkAddress(wethAddressByNetwork, network);
export const KYO: Address = forNetworkAddress(kyoAddressByNetwork, network);
export const USD: Address = forNetworkAddress(usdAddressByNetwork, network);
export const FRAX: Address = forNetworkAddress(fraxAddressByNetwork, network);
export const DAI: Address = forNetworkAddress(daiAddressByNetwork, network);
export const USDC: Address = forNetworkAddress(usdcAddressByNetwork, network);
export const USDT: Address = forNetworkAddress(usdtAddressByNetwork, network);

const pricingAssetsByNetwork: TokensByNetwork = {
    boba_mainnet: [WETH, USDC, DAI, FRAX, USDT, KYO],
    aurora_mainnet: [WETH, USDC, DAI],
    moonriver_mainnet: [WETH, USDC, DAI],
    polygon_mainnet: [WETH, USDC, DAI],
    dev: []
};

const usdStableAssetsByNetwork: TokensByNetwork = {
    boba_mainnet: [USDC, DAI, FRAX, USDT],
    aurora_mainnet: [USDC, DAI],
    moonriver_mainnet: [USDC, DAI],
    polygon_mainnet: [USDC, DAI],
    dev: []
};

export const PRICING_ASSETS: Address[] = forNetworkTokens(
    pricingAssetsByNetwork,
    network
);
export const USD_STABLE_ASSETS: Address[] = forNetworkTokens(
    usdStableAssetsByNetwork,
    network
);
