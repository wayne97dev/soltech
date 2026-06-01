import cron from 'node-cron';
import { prisma } from '../db';
import { checkEligibility } from '../solana';
import { wireguard } from '../wireguard';
import { config } from '../config';

/**
 * Periodically re-checks balances: anyone who dropped below the threshold
 * (sold the token) loses VPN access.
 */
export function startReverifyWorker(): void {
  cron.schedule(config.reverifyCron, async () => {
    const peers = await prisma.vpnPeer.findMany({
      where: { active: true },
      include: { user: true },
    });
    console.log(`[reverify] checking ${peers.length} active peers`);

    for (const peer of peers) {
      try {
        const elig = await checkEligibility(peer.user.wallet);
        if (!elig.eligible) {
          await wireguard.removePeer(peer.publicKey).catch(() => {});
          await prisma.vpnPeer.update({ where: { id: peer.id }, data: { active: false } });
          console.log(
            `[reverify] revoked ${peer.user.wallet} (balance ${elig.balance} < ${elig.required})`,
          );
        } else {
          await prisma.vpnPeer.update({
            where: { id: peer.id },
            data: { lastVerifiedAt: new Date() },
          });
        }
      } catch (e) {
        console.error(`[reverify] error for ${peer.user.wallet}`, e);
      }
    }
  });

  console.log(`[reverify] scheduled (${config.reverifyCron})`);
}
