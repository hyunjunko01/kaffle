// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKaffle {
    error AlreadyInitialized();
    error AlreadyRequested();
    error AlreadySettled();
    error InvalidSignature();
    error InvalidTicketCount();
    error InvalidWindow();
    error NoEntries();
    error OnlyFactory();
    error RoundClosed();
    error RoundOpen();
    error SignatureExpired();
    error ZeroAddress();

    event Entered(address indexed user, uint256 ticketCount, uint256 totalTickets);
    event WinnerRequested(uint256 requestId);
    event WinnerSettled(address indexed winner, uint256 slot, uint256 randomWord);

    function initialize(address factory, address vault, uint64 startTime, uint64 endTime) external;

    function enter(address user, uint256 ticketCount, uint256 deadline, bytes calldata signature) external;

    function requestWinner() external;

    function settle(uint256 randomWord) external;

    function isFinished() external view returns (bool);

    function winner() external view returns (address);

    function factory() external view returns (address);

    function vault() external view returns (address);

    function startTime() external view returns (uint64);

    function endTime() external view returns (uint64);

    function totalTickets() external view returns (uint256);

    function nonce(address user) external view returns (uint256);
}
