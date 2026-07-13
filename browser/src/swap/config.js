// unknown0 in-browser swap — Robinhood Chain (Uniswap v3) configuration.
// All addresses VERIFIED on-chain 2026-07-13 (factory() matched to the live
// UNK0/WETH pool). Chain id 4663.

export const CHAIN = {
  id: 4663,
  name: 'Robinhood Chain',
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  explorer: 'https://robinhoodchain.blockscout.com',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
};

// Uniswap v3 deployment that owns the $UNK0 pool.
export const UNISWAP = {
  factory: '0x1f7d7550b1b028f7571e69a784071f0205fd2efa', // verified: pool.factory()
  swapRouter02: '0xCaf681a66D020601342297493863E78C959E5cb2', // verified: router.factory() == factory
  // No canonical QuoterV2 found for this factory. MVP quotes come from the pool's
  // slot0() (v3 spot price) — math verified against tick (see quote.js) — and the
  // user's slippage tolerance sets amountOutMinimum for on-chain protection.
  quoterV2: null,
};

// Tokens (Robinhood Chain). Decimals verified on-chain via decimals().
export const TOKENS = {
  UNK0: { address: '0x745c1c97551204f10cd5eb51c1b6902fece13b0e', symbol: 'UNK0', decimals: 18 }, // verified
  WETH: { address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73', symbol: 'WETH', decimals: 18 }, // wrapped native
  USDG: { address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', symbol: 'USDG', decimals: 6 }, // verified
};

// The live pool we anchor on. Others route through WETH (2 hops) in a later pass.
export const POOLS = [
  {
    address: '0x18061BEf6657B0081855D9E4Eb187B064269C6b3',
    token0: TOKENS.WETH.address, // verified token0()
    token1: TOKENS.UNK0.address, // verified token1()
    fee: 10000, // 1% tier — verified fee()
  },
];

// WalletConnect / Reown project id (same one the website already uses on 4663).
export const WALLETCONNECT_PROJECT_ID = '1a550cdeb3f7480bd41f7f57347e894d';

// MVP swap list: what the picker offers on day one.
export const SWAP_TOKENS = [TOKENS.UNK0, TOKENS.WETH, TOKENS.USDG];
