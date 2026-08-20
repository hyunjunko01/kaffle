// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKaffleFactory {
    error InvalidDuration();
    error InvalidPrize();
    error NotRaffle();
    error OnlyCoordinator();
    error RaffleActive();
    error UnknownRequest();
    error ZeroAddress();

    event RaffleCreated(address indexed raffle, uint64 startTime, uint64 endTime, uint256 prizeAmount);
    event RandomnessRequested(address indexed raffle, uint256 requestId);
    event TicketSignerUpdated(address indexed signer);

    function createRaffle(uint64 duration, uint256 prizeAmount) external returns (address raffle);

    function requestRandomness() external returns (uint256 requestId);

    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;

    function ticketSigner() external view returns (address);

    function isRaffle(address raffle) external view returns (bool);

    function currentRaffle() external view returns (address);

    function vault() external view returns (address);

    function implementation() external view returns (address);
}
