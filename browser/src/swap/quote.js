// unknown0 swap — Uniswap v3 quoting from the pool's slot0 (spot price).
//
// MVP note: this is a SPOT-price estimate. It does not simulate price impact
// across ticks (that needs QuoterV2, not deployed for our factory). For the
// thin-liquidity MVP the estimate is shown as "≈" and the actual trade is
// protected on-chain by amountOutMinimum derived from the user's slippage.
// The math is verified: priceFromSqrtX96() matches the pool's tick (see the
// Day-2 check — sqrtPriceX96 and 1.0001^tick agree to <0.1%).

const Q96 = 2 ** 96;

// price = token1 per token0, decimal-adjusted to human units.
// v3: sqrtPriceX96 = sqrt(token1/token0 in raw units) * 2^96.
export function priceFromSqrtX96(sqrtPriceX96, decimals0, decimals1) {
  const sp = Number(sqrtPriceX96) / Q96;
  const raw = sp * sp; // token1_wei per token0_wei
  return raw * 10 ** (decimals0 - decimals1); // token1 per token0 (human)
}

// Estimated output for swapping `amountIn` (human) of tokenIn -> tokenOut.
// `tokenInIsToken0` says which side of the pool tokenIn is.
export function estimateOut({ amountIn, decIn, decOut, sqrtPriceX96, tokenInIsToken0 }) {
  const amt = Number(amountIn);
  if (!isFinite(amt) || amt <= 0) return 0;
  // p = token1 per token0 (human units), computed with the two tokens' decimals.
  const dec0 = tokenInIsToken0 ? decIn : decOut;
  const dec1 = tokenInIsToken0 ? decOut : decIn;
  const p = priceFromSqrtX96(sqrtPriceX96, dec0, dec1);
  // token0 -> token1 multiplies by p; token1 -> token0 divides by p.
  return tokenInIsToken0 ? amt * p : amt / p;
}

// amountOutMinimum in the OUT token's smallest units, given a slippage % (e.g. 1).
export function minOutRaw(estimatedOut, decOut, slippagePct) {
  const factor = 1 - Math.max(0, Number(slippagePct)) / 100;
  const min = estimatedOut * factor;
  return BigInt(Math.floor(min * 10 ** decOut));
}

// amountIn in the IN token's smallest units.
export function toRaw(amountHuman, decimals) {
  return BigInt(Math.floor(Number(amountHuman) * 10 ** decimals));
}
