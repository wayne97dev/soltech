import cron from 'node-cron';
import { prisma } from '../db';
import { checkEligibility } from '../solana';
import { wireguard } from '../wireguard';
import { config } from '../config';

/**
 * Ricontrolla periodicamente i saldi: chi è sceso sotto soglia
 * (ha venduto il token) perde l'accesso alla VPN.
 */
export function startReverifyWorker(): void {
  cron.schedule(config.reverifyCron, async () => {
    const peers = await prisma.vpnPeer.findMany({
      where: { active: true },
      include: { user: true },
    });
    console.log(`[reverify] controllo ${peers.length} peer attivi`);

    for (const peer of peers) {
      try {
        const elig = await checkEligibility(peer.user.wallet);
        if (!elig.eligible) {
          await wireguard.removePeer(peer.publicKey).catch(() => {});
          await prisma.vpnPeer.update({ where: { id: peer.id }, data: { active: false } });
          console.log(
            `[reverify] revocato ${peer.user.wallet} (saldo ${elig.balance} < ${elig.required})`,
          );
        } else {
          await prisma.vpnPeer.update({
            where: { id: peer.id },
            data: { lastVerifiedAt: new Date() },
          });
        }
      } catch (e) {
        console.error(`[reverify] errore per ${peer.user.wallet}`, e);
      }
    }
  });

  console.log(`[reverify] schedulato (${config.reverifyCron})`);
}
