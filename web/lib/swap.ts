// unknown0 swap — Uniswap v3 on Robinhood Chain. Addresses verified on-chain.
import { formatUnits, parseUnits, maxUint256, type Address } from 'viem';

export const SWAP_ROUTER_02: Address = '0xCaf681a66D020601342297493863E78C959E5cb2';
export const POOL_UNK0_WETH: Address = '0x18061BEf6657B0081855D9E4Eb187B064269C6b3';
export const POOL_FEE = 10000; // 1% tier (verified fee())

export interface Token {
  address: Address; // for ETH this is WETH's address (the pool/quote token)
  symbol: string;
  decimals: number;
  isNative?: boolean; // true for native ETH (no approval; value in / unwrap out)
}

export const WETH: Token = {
  address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73',
  symbol: 'WETH',
  decimals: 18,
};
export const UNK0: Token = {
  address: '0x745c1c97551204f10cd5eb51c1b6902fece13b0e',
  symbol: 'UNK0',
  decimals: 18,
};
// Native ETH — swaps via the WETH pool; the router wraps (in) / unwraps (out).
export const ETH: Token = {
  address: WETH.address,
  symbol: 'ETH',
  decimals: 18,
  isNative: true,
};

// Pool ordering (verified): token0 = WETH, token1 = UNK0.
export const TOKEN0 = WETH;
export const TOKEN1 = UNK0;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'v', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

export const POOL_ABI = [
  {
    type: 'function',
    name: 'slot0',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
] as const;

// SwapRouter02.exactInputSingle — note: no `deadline` in the struct (v2 router).
export const ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  // For token -> native ETH: swap to WETH into the router, then unwrap to ETH.
  {
    type: 'function',
    name: 'unwrapWETH9',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountMinimum', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'multicall',
    stateMutability: 'payable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
] as const;

// Spot price token1-per-token0 (human), from the v3 sqrtPriceX96. Math verified
// against the pool tick. token0/token1 are 18 decimals so no decimal adjustment.
export function unk0PerWeth(sqrtPriceX96: bigint): number {
  const sp = Number(sqrtPriceX96) / 2 ** 96;
  return sp * sp; // UNK0 per 1 WETH
}

// Estimate output (human units), spot-price based, NET of the pool fee (MVP).
// The v3 fee is taken off the input before the swap, so we must subtract it or
// the amountOutMinimum is too optimistic and the swap reverts ("Too little
// received"). Real price impact on top is covered by the user's slippage.
export function estimateOut(amountIn: string, fromToken: Token, sqrtPriceX96: bigint): number {
  const amt = Number(amountIn);
  if (!isFinite(amt) || amt <= 0) return 0;
  const afterFee = amt * (1 - POOL_FEE / 1_000_000); // 1% tier -> ×0.99
  const p = unk0PerWeth(sqrtPriceX96);
  // token0 side = WETH/ETH (same pool address); token0 -> token1 multiplies by p.
  const isToken0 = fromToken.address.toLowerCase() === WETH.address.toLowerCase();
  return isToken0 ? afterFee * p : afterFee / p;
}

export function toRaw(amountHuman: string, decimals: number): bigint {
  if (!amountHuman || Number(amountHuman) <= 0) return 0n;
  return parseUnits(amountHuman as `${number}`, decimals);
}

export function minOutRaw(estOutHuman: number, decimals: number, slippagePct: number): bigint {
  const min = estOutHuman * (1 - slippagePct / 100);
  if (min <= 0) return 0n;
  return parseUnits(min.toFixed(decimals) as `${number}`, decimals);
}

export function fmt(raw: bigint | undefined, decimals: number, maxFrac = 6): string {
  if (raw === undefined) return '—';
  const n = Number(formatUnits(raw, decimals));
  return n.toLocaleString('en-US', { maximumFractionDigits: maxFrac });
}

export const MAX_UINT = maxUint256;
