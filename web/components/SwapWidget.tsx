'use client';

import { useMemo, useState } from 'react';
import { encodeFunctionData } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useBalance,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import {
  ERC20_ABI,
  POOL_ABI,
  ROUTER_ABI,
  POOL_UNK0_WETH,
  POOL_FEE,
  SWAP_ROUTER_02,
  ETH,
  UNK0,
  WETH,
  estimateOut,
  fmt,
  minOutRaw,
  toRaw,
  MAX_UINT,
  type Token,
} from '../lib/swap';

const RH_CHAIN_ID = 4663;
const WETH_SIDE = [ETH, WETH]; // token0 side of the UNK0/WETH pool

export default function SwapWidget() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  // Pair is always UNK0 <-> (ETH|WETH). Pick which side you spend.
  const [from, setFrom] = useState<Token>(ETH);
  const [ethSide, setEthSide] = useState<Token>(ETH); // ETH or WETH, when UNK0 is the FROM
  const fromIsWethSide = from.address.toLowerCase() === WETH.address.toLowerCase();
  const to: Token = fromIsWethSide ? UNK0 : ethSide;

  const [amountIn, setAmountIn] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRHChain = chainId === RH_CHAIN_ID;

  const { data: slot0 } = useReadContract({
    address: POOL_UNK0_WETH,
    abi: POOL_ABI,
    functionName: 'slot0',
    query: { enabled: isConnected, refetchInterval: 12000 },
  });
  const sqrtPriceX96 = slot0 ? (slot0 as unknown as bigint[])[0] : undefined;

  // Balance of the FROM token: native for ETH, balanceOf for ERC-20.
  const { data: nativeBal, refetch: refetchNative } = useBalance({
    address,
    query: { enabled: Boolean(address) && Boolean(from.isNative) },
  });
  const { data: erc20Bal, refetch: refetchErc20 } = useReadContract({
    address: from.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && !from.isNative },
  });
  const balance = from.isNative ? nativeBal?.value : (erc20Bal as bigint | undefined);

  // Allowance only matters for ERC-20 inputs.
  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: from.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, SWAP_ROUTER_02] : undefined,
    query: { enabled: Boolean(address) && !from.isNative },
  });

  const amountInRaw = useMemo(() => toRaw(amountIn, from.decimals), [amountIn, from]);
  const estOut = useMemo(
    () => (sqrtPriceX96 ? estimateOut(amountIn, from, sqrtPriceX96) : 0),
    [amountIn, from, sqrtPriceX96],
  );
  const rate = sqrtPriceX96 ? estimateOut('1', from, sqrtPriceX96) : 0;
  const needsApproval =
    !from.isNative && allowance !== undefined && amountInRaw > 0n && (allowance as bigint) < amountInRaw;
  const insufficient = balance !== undefined && amountInRaw > balance;

  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  function refetchBalances() {
    setTimeout(() => {
      refetchNative();
      refetchErc20();
      refetchAllow();
    }, 4000);
  }

  function pickFrom(sym: string) {
    const t = sym === 'UNK0' ? UNK0 : sym === 'WETH' ? WETH : ETH;
    setFrom(t);
    setAmountIn('');
    setTxHash(undefined);
    setError(null);
  }

  async function approve() {
    setError(null);
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        address: from.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SWAP_ROUTER_02, MAX_UINT],
      });
      setTxHash(hash);
    } catch (e) {
      setError(niceError(e));
    } finally {
      setBusy(false);
      setTimeout(() => refetchAllow(), 3000);
    }
  }

  async function swap() {
    if (!address || !sqrtPriceX96) return;
    setError(null);
    setBusy(true);
    const minOut = minOutRaw(estOut, to.decimals, slippage);
    try {
      let hash: `0x${string}`;
      if (to.isNative) {
        // token -> ETH: swap into the router, then unwrap WETH -> ETH to the user.
        const swapData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [
            {
              tokenIn: from.address,
              tokenOut: WETH.address,
              fee: POOL_FEE,
              recipient: SWAP_ROUTER_02,
              amountIn: amountInRaw,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });
        const unwrapData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'unwrapWETH9',
          args: [minOut, address],
        });
        hash = await writeContractAsync({
          address: SWAP_ROUTER_02,
          abi: ROUTER_ABI,
          functionName: 'multicall',
          args: [[swapData, unwrapData]],
        });
      } else {
        // ETH -> token (native in, send value, no approval) OR WETH/UNK0 ERC-20 swap.
        hash = await writeContractAsync({
          address: SWAP_ROUTER_02,
          abi: ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [
            {
              tokenIn: from.address, // WETH's address (works for ETH too)
              tokenOut: to.address,
              fee: POOL_FEE,
              recipient: address,
              amountIn: amountInRaw,
              amountOutMinimum: minOut,
              sqrtPriceLimitX96: 0n,
            },
          ],
          value: from.isNative ? amountInRaw : 0n,
        });
      }
      setTxHash(hash);
    } catch (e) {
      setError(niceError(e));
    } finally {
      setBusy(false);
      refetchBalances();
    }
  }

  return (
    <div className="swapw">
      <div className="swapw-head">
        <h1 className="swapw-title">
          unknown0 <span className="under">swap</span>
        </h1>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>

      <div className="swapw-card">
        <div className="swapw-row">
          <div className="swapw-row-top">
            <span>from</span>
            <span>balance {fmt(balance, from.decimals)}</span>
          </div>
          <div className="swapw-row-mid">
            <input
              className="swapw-amount"
              inputMode="decimal"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <select className="swapw-token" value={from.symbol} onChange={(e) => pickFrom(e.target.value)}>
              <option value="ETH">ETH</option>
              <option value="WETH">WETH</option>
              <option value="UNK0">UNK0</option>
            </select>
          </div>
        </div>

        <div className="swapw-flip">
          <button onClick={() => pickFrom(from.symbol === 'UNK0' ? ethSide.symbol : 'UNK0')} title="Flip">
            ↓↑
          </button>
        </div>

        <div className="swapw-row">
          <div className="swapw-row-top">
            <span>to (estimated)</span>
          </div>
          <div className="swapw-row-mid">
            <input
              className="swapw-amount"
              readOnly
              placeholder="0.0"
              value={estOut ? estOut.toLocaleString('en-US', { maximumFractionDigits: 6 }) : ''}
            />
            {fromIsWethSide ? (
              <span className="swapw-token" style={{ padding: '9px 14px' }}>
                UNK0
              </span>
            ) : (
              <select
                className="swapw-token"
                value={ethSide.symbol}
                onChange={(e) => setEthSide(e.target.value === 'WETH' ? WETH : ETH)}
              >
                <option value="ETH">ETH</option>
                <option value="WETH">WETH</option>
              </select>
            )}
          </div>
        </div>

        <div className="swapw-meta">
          <label>
            slippage{' '}
            <select value={slippage} onChange={(e) => setSlippage(Number(e.target.value))}>
              <option value={0.5}>0.5%</option>
              <option value={1}>1%</option>
              <option value={3}>3%</option>
              <option value={5}>5%</option>
            </select>
          </label>
          {rate > 0 && (
            <span className="swapw-rate">
              1 {from.symbol} ≈ {rate.toLocaleString('en-US', { maximumFractionDigits: 6 })} {to.symbol}
            </span>
          )}
        </div>

        {action()}

        {txHash && (
          <p className="swapw-status">
            {confirming ? 'confirming…' : confirmed ? '✓ done' : 'submitted'} ·{' '}
            <a href={`https://robinhoodchain.blockscout.com/tx/${txHash}`} target="_blank" rel="noreferrer">
              view tx
            </a>
          </p>
        )}
        {error && <p className="swapw-status err">✘ {error}</p>}
        <p className="swapw-foot">uniswap v3 · robinhood chain · spot-price estimate, protected by slippage</p>
      </div>
    </div>
  );

  function action() {
    if (!isConnected) return <p className="swapw-hint">connect your wallet to swap</p>;
    if (!onRHChain)
      return (
        <button className="btn primary swapw-go" onClick={() => switchChain({ chainId: RH_CHAIN_ID })}>
          switch to Robinhood Chain
        </button>
      );
    if (amountInRaw <= 0n)
      return (
        <button className="btn primary swapw-go" disabled>
          enter an amount
        </button>
      );
    if (insufficient)
      return (
        <button className="btn primary swapw-go" disabled>
          insufficient {from.symbol}
        </button>
      );
    if (needsApproval)
      return (
        <button className="btn primary swapw-go" onClick={approve} disabled={busy || confirming}>
          {busy || confirming ? 'approving…' : `approve ${from.symbol}`}
        </button>
      );
    return (
      <button className="btn primary swapw-go" onClick={swap} disabled={busy || confirming}>
        {busy ? 'confirm in wallet…' : confirming ? 'swapping…' : 'swap'}
      </button>
    );
  }
}

function niceError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied/i.test(msg)) return 'rejected in wallet';
  if (/insufficient funds/i.test(msg)) return 'insufficient funds for gas';
  if (/Too little received/i.test(msg)) return 'price moved — raise slippage and retry';
  return msg.split('\n')[0].slice(0, 140);
}
