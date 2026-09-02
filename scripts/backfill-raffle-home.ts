import { backfillRaffleHomeFromChain } from "../lib/raffle/snapshot";

async function main() {
  await backfillRaffleHomeFromChain();
  console.log("Raffle home snapshots backfilled from chain.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
