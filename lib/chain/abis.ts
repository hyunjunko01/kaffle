export const kaffleVaultAbi = [
  {
    type: "function",
    name: "token",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "reserved",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "unallocated",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "prizeOf",
    stateMutability: "view",
    inputs: [{ name: "raffle", type: "address" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "claimed", type: "bool" },
      { name: "attached", type: "bool" },
    ],
  },
] as const;

export const kaffleFactoryAbi = [
  {
    type: "function",
    name: "createRaffle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "duration", type: "uint64" },
      { name: "prizeAmount", type: "uint256" },
    ],
    outputs: [{ name: "raffle", type: "address" }],
  },
  {
    type: "function",
    name: "currentRaffle",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "RaffleCreated",
    inputs: [
      { name: "raffle", type: "address", indexed: true },
      { name: "startTime", type: "uint64", indexed: false },
      { name: "endTime", type: "uint64", indexed: false },
      { name: "prizeAmount", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "RaffleActive", inputs: [] },
  { type: "error", name: "InvalidDuration", inputs: [] },
  { type: "error", name: "InvalidPrize", inputs: [] },
  { type: "error", name: "InsufficientFunds", inputs: [] },
] as const;

export const kaffleAbi = [
  {
    type: "function",
    name: "enter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "ticketCount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "startTime",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "endTime",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "isFinished",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "winner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalTickets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nonce",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "requestWinner",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "event",
    name: "WinnerRequested",
    inputs: [{ name: "requestId", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "WinnerSettled",
    inputs: [
      { name: "winner", type: "address", indexed: true },
      { name: "slot", type: "uint256", indexed: false },
      { name: "randomWord", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "RoundClosed", inputs: [] },
  { type: "error", name: "RoundOpen", inputs: [] },
  { type: "error", name: "NoEntries", inputs: [] },
  { type: "error", name: "AlreadySettled", inputs: [] },
  { type: "error", name: "AlreadyRequested", inputs: [] },
  { type: "error", name: "InvalidTicketCount", inputs: [] },
  { type: "error", name: "InvalidSignature", inputs: [] },
  { type: "error", name: "SignatureExpired", inputs: [] },
] as const;

export const mockVrfCoordinatorAbi = [
  {
    type: "function",
    name: "fulfill",
    stateMutability: "nonpayable",
    inputs: [
      { name: "factory", type: "address" },
      { name: "requestId", type: "uint256" },
      { name: "randomWord", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
